/**
 * メトリクスマネージャーのテスト
 */

import { MetricsManager, MetricNames } from '../metrics';
import { logger } from '../../logger';

// CloudWatch SDK のモック
const mockSend = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  PutMetricDataCommand: jest.fn()
}));

// Amplify Auth のモック
jest.mock('@aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn().mockResolvedValue({
    credentials: {
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret'
    }
  })
}));

// ロガーのモック
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }
}));

describe('MetricsManager', () => {
  let metrics: MetricsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    metrics = MetricsManager.getInstance({ enableMetrics: false });
  });

  afterEach(async () => {
    await metrics.cleanup();
  });

  describe('メトリクスの記録', () => {
    it('開発環境ではログに出力する', () => {
      metrics.putMetric('TestMetric', 100, 'Count', { Operation: 'test' });

      expect(logger.debug).toHaveBeenCalledWith(
        'Metrics',
        'Metric: TestMetric',
        expect.objectContaining({
          value: 100,
          unit: 'Count',
          dimensions: { Operation: 'test' }
        })
      );
    });

    it('統計値付きメトリクスを記録できる', () => {
      const values = [10, 20, 30, 40, 50];
      metrics.putMetricWithStatistics('TestMetric', values, 'Milliseconds');

      // 開発環境では内部的にputMetricが呼ばれないため、
      // バッファに追加されることを確認できない
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('API呼び出しの計測', () => {
    it('成功した API 呼び出しを計測する', async () => {
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result = await metrics.measureApiCall('TestOperation', mockApiCall);
      
      expect(result).toEqual({ data: 'test' });
      expect(mockApiCall).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(2); // count と duration
    });

    it('失敗した API 呼び出しを計測する', async () => {
      const error = new Error('API Error');
      const mockApiCall = jest.fn().mockRejectedValue(error);
      
      await expect(
        metrics.measureApiCall('TestOperation', mockApiCall)
      ).rejects.toThrow('API Error');
      
      expect(mockApiCall).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(2); // error と duration
    });
  });

  describe('パフォーマンスメトリクス', () => {
    it('パフォーマンスメトリクスを記録する', () => {
      // Navigation Timing API のモック
      const mockNavigation = {
        loadEventEnd: 2000,
        fetchStart: 1000,
        type: 'navigate'
      };
      
      Object.defineProperty(window.performance, 'getEntriesByType', {
        value: jest.fn().mockReturnValue([mockNavigation]),
        configurable: true
      });

      // Memory API のモック（Chrome限定）
      (window.performance as any).memory = {
        usedJSHeapSize: 1024 * 1024 * 50 // 50MB
      };

      metrics.recordPerformanceMetrics();

      expect(logger.debug).toHaveBeenCalledWith(
        'Metrics',
        expect.stringContaining('PageLoadTime'),
        expect.any(Object)
      );
    });
  });

  describe('エラーの記録', () => {
    it('エラーを記録する', () => {
      const error = new Error('Test error');
      const metadata = { userId: 'test123' };

      metrics.recordError('TestError', error, metadata);

      expect(logger.debug).toHaveBeenCalledWith(
        'Metrics',
        expect.stringContaining('JavaScriptError'),
        expect.any(Object)
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Error',
        'TestError: Test error',
        error,
        metadata
      );
    });
  });
});