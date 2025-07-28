/**
 * CloudWatchメトリクス送信
 * アプリケーションメトリクスの収集と送信
 */

import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { fetchAuthSession } from '@aws-amplify/auth';
import { logger } from '../logger';

// メトリクス名の定義
export const MetricNames = {
  // APIメトリクス
  API_REQUEST_COUNT: 'APIRequestCount',
  API_REQUEST_DURATION: 'APIRequestDuration',
  API_REQUEST_ERROR: 'APIRequestError',
  
  // パフォーマンスメトリクス
  PAGE_LOAD_TIME: 'PageLoadTime',
  COMPONENT_RENDER_TIME: 'ComponentRenderTime',
  MEMORY_USAGE: 'MemoryUsage',
  
  // ビジネスメトリクス
  WEATHER_DATA_FETCH: 'WeatherDataFetch',
  WEBSOCKET_CONNECTION: 'WebSocketConnection',
  CACHE_HIT_RATE: 'CacheHitRate',
  
  // エラーメトリクス
  JAVASCRIPT_ERROR: 'JavaScriptError',
  NETWORK_ERROR: 'NetworkError',
  AUTHENTICATION_ERROR: 'AuthenticationError'
};

// メトリクスディメンション
export interface MetricDimensions {
  Environment?: string;
  Region?: string;
  Service?: string;
  Operation?: string;
  ErrorType?: string;
  StatusCode?: string;
  RenderType?: string;
  Rating?: string;
  ErrorName?: string;
  [key: string]: string | undefined; // カスタムディメンションを許可
}

// メトリクス設定
interface MetricsConfig {
  namespace: string;
  batchSize: number;
  flushInterval: number;
  enableMetrics: boolean;
  defaultDimensions: MetricDimensions;
}

// デフォルト設定
const defaultConfig: MetricsConfig = {
  namespace: 'Centra/WeatherDashboard',
  batchSize: 20,
  flushInterval: 60000, // 1分
  enableMetrics: process.env.NODE_ENV === 'production',
  defaultDimensions: {
    Environment: process.env.NODE_ENV || 'development',
    Region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    Service: 'WebApplication'
  }
};

/**
 * メトリクスマネージャー
 */
export class MetricsManager {
  private static instance: MetricsManager;
  private config: MetricsConfig;
  private cloudWatchClient?: CloudWatchClient;
  private metricsBuffer: MetricDatum[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initialize();
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(config?: Partial<MetricsConfig>): MetricsManager {
    if (!MetricsManager.instance) {
      MetricsManager.instance = new MetricsManager(config);
    }
    return MetricsManager.instance;
  }

  /**
   * 初期化処理
   */
  private async initialize() {
    if (this.config.enableMetrics) {
      try {
        const session = await fetchAuthSession();
        this.cloudWatchClient = new CloudWatchClient({
          region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
          credentials: session.credentials
        });

        // フラッシュタイマーの開始
        this.startFlushTimer();
        
        this.isInitialized = true;
        logger.info('Metrics', 'CloudWatch metrics initialized');
      } catch (error) {
        logger.error('Metrics', 'Failed to initialize CloudWatch metrics', error as Error);
        this.config.enableMetrics = false;
      }
    }
  }

  /**
   * フラッシュタイマーの開始
   */
  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * メトリクスの記録
   */
  putMetric(
    metricName: string,
    value: number,
    unit: 'Count' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None' = 'None',
    dimensions?: MetricDimensions
  ) {
    if (!this.config.enableMetrics) {
      // 開発環境ではログに出力
      logger.debug('Metrics', `Metric: ${metricName}`, { value, unit, dimensions });
      return;
    }

    const metric: MetricDatum = {
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: this.buildDimensions(dimensions)
    };

    this.metricsBuffer.push(metric);

    // バッチサイズに達したらフラッシュ
    if (this.metricsBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * 統計値付きメトリクスの記録
   */
  putMetricWithStatistics(
    metricName: string,
    values: number[],
    unit: 'Count' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None' = 'None',
    dimensions?: MetricDimensions
  ) {
    if (values.length === 0) return;

    const sum = values.reduce((a, b) => a + b, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const metric: MetricDatum = {
      MetricName: metricName,
      StatisticValues: {
        SampleCount: values.length,
        Sum: sum,
        Minimum: min,
        Maximum: max
      },
      Unit: unit,
      Timestamp: new Date(),
      Dimensions: this.buildDimensions(dimensions)
    };

    this.metricsBuffer.push(metric);
  }

  /**
   * ディメンションの構築
   */
  private buildDimensions(customDimensions?: MetricDimensions) {
    const dimensions = { ...this.config.defaultDimensions, ...customDimensions };
    
    return Object.entries(dimensions)
      .filter(([_, value]) => value !== undefined)
      .map(([name, value]) => ({ Name: name, Value: String(value) }));
  }

  /**
   * CloudWatchへのフラッシュ
   */
  async flush() {
    if (!this.cloudWatchClient || this.metricsBuffer.length === 0) {
      return;
    }

    const metrics = this.metricsBuffer.splice(0, this.config.batchSize);

    try {
      const command = new PutMetricDataCommand({
        Namespace: this.config.namespace,
        MetricData: metrics
      });

      await this.cloudWatchClient.send(command);
      logger.debug('Metrics', `Flushed ${metrics.length} metrics to CloudWatch`);
    } catch (error) {
      logger.error('Metrics', 'Failed to send metrics to CloudWatch', error as Error);
    }
  }

  /**
   * API呼び出しの計測
   */
  async measureApiCall<T>(
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      // 成功メトリクスの記録
      this.putMetric(MetricNames.API_REQUEST_COUNT, 1, 'Count', { Operation: operation });
      this.putMetric(MetricNames.API_REQUEST_DURATION, duration, 'Milliseconds', { Operation: operation });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // エラーメトリクスの記録
      this.putMetric(MetricNames.API_REQUEST_ERROR, 1, 'Count', {
        Operation: operation,
        ErrorType: error instanceof Error ? error.name : 'Unknown'
      });
      this.putMetric(MetricNames.API_REQUEST_DURATION, duration, 'Milliseconds', { Operation: operation });
      
      throw error;
    }
  }

  /**
   * パフォーマンス計測の記録
   */
  recordPerformanceMetrics() {
    if (typeof window !== 'undefined' && window.performance) {
      // Navigation Timing API
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.putMetric(
          MetricNames.PAGE_LOAD_TIME,
          navigation.loadEventEnd - navigation.fetchStart,
          'Milliseconds'
        );
      }

      // メモリ使用量（Chrome限定）
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.putMetric(
          MetricNames.MEMORY_USAGE,
          memory.usedJSHeapSize,
          'Bytes'
        );
      }
    }
  }

  /**
   * エラーの記録
   */
  recordError(errorType: string, error: Error, metadata?: Record<string, any>) {
    this.putMetric(MetricNames.JAVASCRIPT_ERROR, 1, 'Count', {
      ErrorType: errorType,
      ErrorName: error.name
    });

    // エラーログも記録
    logger.error('Error', `${errorType}: ${error.message}`, error, metadata);
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

// デフォルトメトリクスマネージャーのエクスポート
export const metrics = MetricsManager.getInstance();