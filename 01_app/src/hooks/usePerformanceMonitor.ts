/**
 * パフォーマンス監視フック
 * コンポーネントのレンダリング時間とメモリ使用量を追跡
 */

import { useEffect, useRef, useCallback } from 'react';
import { metrics, MetricNames } from '../utils/monitoring/metrics';
import { logger } from '../utils/logger';

interface PerformanceMonitorOptions {
  componentName: string;
  trackRenderTime?: boolean;
  trackMemory?: boolean;
  trackApiCalls?: boolean;
  sampleRate?: number; // 0-1の値（1 = 100%サンプリング）
}

/**
 * パフォーマンス監視カスタムフック
 */
export const usePerformanceMonitor = (options: PerformanceMonitorOptions) => {
  const {
    componentName,
    trackRenderTime = true,
    trackMemory = false,
    trackApiCalls = true,
    sampleRate = 1.0
  } = options;

  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);
  const renderCount = useRef(0);

  // サンプリングの判定
  const shouldSample = useCallback(() => {
    return Math.random() < sampleRate;
  }, [sampleRate]);

  // レンダリング時間の計測
  useEffect(() => {
    if (!trackRenderTime || !shouldSample()) return;

    renderCount.current++;
    
    // 初回マウント時
    if (renderCount.current === 1) {
      mountTime.current = performance.now();
      
      // マウント時間の記録
      if (renderStartTime.current) {
        const mountDuration = mountTime.current - renderStartTime.current;
        metrics.putMetric(
          MetricNames.COMPONENT_RENDER_TIME,
          mountDuration,
          'Milliseconds',
          { 
            Operation: `${componentName}.mount`,
            RenderType: 'mount'
          }
        );
        
        logger.debug('Performance', `Component ${componentName} mounted`, {
          duration: mountDuration,
          renderCount: renderCount.current
        });
      }
    } else {
      // 再レンダリング時間の記録
      if (renderStartTime.current) {
        const renderDuration = performance.now() - renderStartTime.current;
        metrics.putMetric(
          MetricNames.COMPONENT_RENDER_TIME,
          renderDuration,
          'Milliseconds',
          { 
            Operation: `${componentName}.rerender`,
            RenderType: 'rerender'
          }
        );
        
        // 頻繁な再レンダリングの警告
        if (renderCount.current > 10) {
          logger.warn('Performance', `Component ${componentName} has rendered ${renderCount.current} times`, {
            renderCount: renderCount.current
          });
        }
      }
    }
  });

  // レンダリング開始時刻の記録
  renderStartTime.current = performance.now();

  // メモリ使用量の追跡
  useEffect(() => {
    if (!trackMemory || !shouldSample()) return;

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
        
        // メモリ使用量が高い場合の警告
        if (usedMemoryMB > 100) {
          logger.warn('Performance', `High memory usage in ${componentName}`, {
            usedMemoryMB,
            totalMemoryMB: memory.totalJSHeapSize / 1024 / 1024
          });
        }
      }
    };

    // 初回チェック
    checkMemory();

    // 定期的なメモリチェック（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(checkMemory, 30000); // 30秒ごと
      return () => clearInterval(interval);
    }
  }, [componentName, trackMemory, shouldSample]);

  // API呼び出しの計測ラッパー
  const measureApiCall = useCallback(async <T,>(
    operationName: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    if (!trackApiCalls || !shouldSample()) {
      return apiCall();
    }

    return metrics.measureApiCall(`${componentName}.${operationName}`, apiCall);
  }, [componentName, trackApiCalls, shouldSample]);

  // パフォーマンスマークの設定
  const markPerformance = useCallback((markName: string) => {
    if (!shouldSample()) return;

    const fullMarkName = `${componentName}.${markName}`;
    performance.mark(fullMarkName);
    
    logger.debug('Performance', `Performance mark set: ${fullMarkName}`);
  }, [componentName, shouldSample]);

  // パフォーマンス測定
  const measurePerformance = useCallback((
    measureName: string,
    startMark: string,
    endMark?: string
  ) => {
    if (!shouldSample()) return;

    const fullMeasureName = `${componentName}.${measureName}`;
    const fullStartMark = `${componentName}.${startMark}`;
    const fullEndMark = endMark ? `${componentName}.${endMark}` : undefined;

    try {
      performance.measure(fullMeasureName, fullStartMark, fullEndMark);
      
      const measures = performance.getEntriesByName(fullMeasureName);
      if (measures.length > 0) {
        const duration = measures[measures.length - 1].duration;
        
        metrics.putMetric(
          MetricNames.COMPONENT_RENDER_TIME,
          duration,
          'Milliseconds',
          { 
            Operation: fullMeasureName,
            RenderType: 'custom'
          }
        );
        
        logger.debug('Performance', `Performance measured: ${fullMeasureName}`, { duration });
      }
    } catch (error) {
      logger.error('Performance', `Failed to measure performance: ${fullMeasureName}`, error as Error);
    }
  }, [componentName, shouldSample]);

  // コンポーネントのアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (mountTime.current && shouldSample()) {
        const totalLifetime = performance.now() - mountTime.current;
        logger.info('Performance', `Component ${componentName} unmounted`, {
          totalLifetime,
          totalRenders: renderCount.current
        });
      }
    };
  }, [componentName, shouldSample]);

  return {
    measureApiCall,
    markPerformance,
    measurePerformance,
    renderCount: renderCount.current
  };
};

/**
 * Reactプロファイラーとの統合
 */
export const ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  _startTime: number,
  _commitTime: number
) => {
  // レンダリングメトリクスの送信
  metrics.putMetric(
    MetricNames.COMPONENT_RENDER_TIME,
    actualDuration,
    'Milliseconds',
    {
      Operation: id,
      RenderType: phase
    }
  );

  // 遅いレンダリングの警告
  if (actualDuration > 16.67) { // 60fps = 16.67ms per frame
    logger.warn('Performance', `Slow render detected in ${id}`, {
      phase,
      actualDuration,
      baseDuration,
      interactionCount: 0
    });
  }
};