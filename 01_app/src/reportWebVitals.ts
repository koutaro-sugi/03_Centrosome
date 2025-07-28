import { ReportHandler } from 'web-vitals';
import { metrics } from './utils/monitoring/metrics';
import { logger } from './utils/logger';

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
  
  // CloudWatchメトリクスへの送信
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    const handlePerfEntry = (metric: any) => {
      // メトリクスの送信
      metrics.putMetric(
        `WebVitals.${metric.name}`,
        metric.value,
        metric.name === 'CLS' ? 'None' : 'Milliseconds',
        {
          Operation: metric.name,
          Rating: metric.rating || 'unknown'
        }
      );
      
      // ログの記録
      logger.info('WebVitals', `${metric.name}: ${metric.value}`, {
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id
      });
      
      // パフォーマンスが悪い場合の警告
      if (metric.rating === 'poor') {
        logger.warn('WebVitals', `Poor performance detected for ${metric.name}`, {
          metric: metric.name,
          value: metric.value,
          threshold: getThreshold(metric.name)
        });
      }
    };
    
    getCLS(handlePerfEntry);
    getFID(handlePerfEntry);
    getFCP(handlePerfEntry);
    getLCP(handlePerfEntry);
    getTTFB(handlePerfEntry);
  });
};

// Web Vitalsの闾値を取得
const getThreshold = (metricName: string): number => {
  const thresholds: Record<string, number> = {
    CLS: 0.25,    // Cumulative Layout Shift
    FID: 300,     // First Input Delay (ms)
    FCP: 3000,    // First Contentful Paint (ms)
    LCP: 4000,    // Largest Contentful Paint (ms)
    TTFB: 800     // Time to First Byte (ms)
  };
  return thresholds[metricName] || 0;
};

export default reportWebVitals;
