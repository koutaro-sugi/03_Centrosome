/**
 * useWeatherData カスタムフックのテストファイル
 * 気象データ取得とリアルタイム更新の動作を検証
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeatherData, setWeatherApiService } from '../useWeatherData';
import { WeatherApiService } from '../../services/weatherApi';
import { SensorData, SensorStats, StatsPeriod } from '../../types/weather';

// WeatherApiServiceのモック
jest.mock('../../services/weatherApi', () => ({
  WeatherApiService: jest.fn(),
  WeatherApiError: class WeatherApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'WeatherApiError';
    }
  }
}));

describe('useWeatherData', () => {
  let mockWeatherApiService: jest.Mocked<WeatherApiService>;
  let mockUnsubscribe: jest.Mock;

  // テストデータ
  const mockCurrentData: SensorData = {
    deviceId: 'M-X-001',
    timestamp: '2025-01-27T12:00:00.000Z',
    temperature: 25.5,
    humidity: 60.0,
    pressure: 1013.25,
    windSpeed: 5.2,
    windDirection: 180,
    rainfall: 0.0,
    illuminance: 50000,
    visibility: 10.0,
    feelsLike: 26.0
  };

  const mockHistoricalData: SensorData[] = [
    {
      ...mockCurrentData,
      timestamp: '2025-01-27T11:00:00.000Z',
      temperature: 24.0
    },
    {
      ...mockCurrentData,
      timestamp: '2025-01-27T11:30:00.000Z',
      temperature: 24.5
    }
  ];

  const mockStatsData: SensorStats = {
    deviceId: 'M-X-001',
    period: StatsPeriod.HOUR,
    startTime: '2025-01-27T11:00:00.000Z',
    endTime: '2025-01-27T12:00:00.000Z',
    temperature: {
      max: 26.0,
      min: 24.0,
      avg: 25.0
    },
    humidity: {
      max: 65.0,
      min: 55.0,
      avg: 60.0
    },
    pressure: {
      max: 1014.0,
      min: 1012.5,
      avg: 1013.25
    },
    windSpeed: {
      max: 8.5,
      min: 3.2,
      avg: 5.8
    },
    rainfall: {
      max: 0.0,
      min: 0.0,
      avg: 0.0
    },
    illuminance: {
      max: 60000,
      min: 40000,
      avg: 50000
    },
    visibility: {
      max: 10.0,
      min: 10.0,
      avg: 10.0
    },
    samples: 60
  };

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // モック関数の設定
    mockUnsubscribe = jest.fn();
    mockWeatherApiService = {
      getCurrentData: jest.fn(),
      getHistoricalData: jest.fn(),
      getStatistics: jest.fn(),
      subscribeToUpdates: jest.fn().mockReturnValue(mockUnsubscribe),
      unsubscribeAll: jest.fn(),
      getConnectionStatus: jest.fn().mockReturnValue('connected'),
      getActiveSubscriptionCount: jest.fn().mockReturnValue(0),
      getSubscriptionStatus: jest.fn().mockReturnValue(false),
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        details: {
          connectionStatus: 'connected',
          activeSubscriptions: 0,
          reconnectAttempts: 0
        }
      })
    } as any;

    // コンストラクタのモック
    (WeatherApiService as jest.MockedClass<typeof WeatherApiService>).mockImplementation(() => mockWeatherApiService);
    
    // テスト用のWeatherApiServiceを設定
    setWeatherApiService(mockWeatherApiService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('初期化とデータ取得', () => {
    it('初期状態では全てのデータがnullである', () => {
      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      expect(result.current.data).toBeNull();
      expect(result.current.historicalData).toEqual([]);
      expect(result.current.statisticsData).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('マウント時に全てのデータを取得する', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockCurrentData);
      expect(result.current.historicalData).toEqual(mockHistoricalData);
      expect(result.current.statisticsData).toEqual(mockStatsData);
      expect(result.current.error).toBeNull();

      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledWith('M-X-001');
      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 60);
      expect(mockWeatherApiService.getStatistics).toHaveBeenCalledWith('M-X-001', StatsPeriod.HOUR);
    });

    it('エラーが発生した場合はエラー状態を設定する', async () => {
      const mockError = new Error('API Error');
      mockWeatherApiService.getCurrentData.mockRejectedValue(mockError);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error?.message).toBe('API Error');
      expect(result.current.data).toBeNull();
    });
  });

  describe('リアルタイム更新', () => {
    it('サブスクリプションを開始し、更新を受信する', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // サブスクリプションが開始されたことを確認
      expect(mockWeatherApiService.subscribeToUpdates).toHaveBeenCalled();

      // サブスクリプションコールバックを取得
      const subscriptionCallback = mockWeatherApiService.subscribeToUpdates.mock.calls[0][1];

      // 新しいデータでコールバックを実行
      const updatedData: SensorData = {
        ...mockCurrentData,
        temperature: 26.5,
        timestamp: '2025-01-27T12:05:00.000Z'
      };

      act(() => {
        subscriptionCallback(updatedData);
      });

      // 現在のデータが更新されたことを確認
      expect(result.current.data).toEqual(updatedData);
    });

    it('アンマウント時にサブスクリプションを解除する', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { unmount } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(mockWeatherApiService.subscribeToUpdates).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('履歴時間範囲の設定', () => {
    it('historyMinutesプロパティで履歴時間範囲を設定できる', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001', historyMinutes: 120 }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 120);
    });

    it('履歴データを再取得できる', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 履歴データの再取得を実行
      act(() => {
        result.current.refetchHistorical();
      });

      // データが再取得されたことを確認
      await waitFor(() => {
        expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('ポーリング機能', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('30秒ごとにデータを自動更新する', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);
      mockWeatherApiService.getConnectionStatus.mockReturnValue('disconnected');

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 初回の呼び出しをクリア
      jest.clearAllMocks();

      // 30秒進める
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // データが再取得されたことを確認
      await waitFor(() => {
        expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(1);
        expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledTimes(1);
        expect(mockWeatherApiService.getStatistics).toHaveBeenCalledTimes(1);
      });
    });

    it('WebSocket接続中はポーリングを行わない', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);
      mockWeatherApiService.getConnectionStatus.mockReturnValue('connected');

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 初回の呼び出しをクリア
      jest.clearAllMocks();

      // 30秒進める
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // データが再取得されていないことを確認
      expect(mockWeatherApiService.getCurrentData).not.toHaveBeenCalled();
      expect(mockWeatherApiService.getHistoricalData).not.toHaveBeenCalled();
      expect(mockWeatherApiService.getStatistics).not.toHaveBeenCalled();
    });
  });

  describe('データリフレッシュ', () => {
    it('refetchAllメソッドで手動でデータを更新できる', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 初回の呼び出しをクリア
      jest.clearAllMocks();

      // refetchAllを実行
      await act(async () => {
        await result.current.refetchAll();
      });

      // データが再取得されたことを確認
      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(1);
      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledTimes(1);
      expect(mockWeatherApiService.getStatistics).toHaveBeenCalledTimes(1);
    });
  });

  describe('接続状態', () => {
    it('接続状態を正しく取得できる', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.connectionStatus).toBe('connected');
    });
  });

  describe('複数デバイスの切り替え', () => {
    it('deviceIdが変更された時に新しいデバイスのデータを取得する', async () => {
      mockWeatherApiService.getCurrentData.mockResolvedValue(mockCurrentData);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result, rerender } = renderHook(
        ({ deviceId }) => useWeatherData({ deviceId }),
        {
          initialProps: { deviceId: 'M-X-001' }
        }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // デバイスIDを変更
      rerender({ deviceId: 'M-X-002' });

      // 古いサブスクリプションが解除されたことを確認
      expect(mockUnsubscribe).toHaveBeenCalled();

      // 新しいデバイスのデータが取得されたことを確認
      await waitFor(() => {
        expect(mockWeatherApiService.getCurrentData).toHaveBeenLastCalledWith('M-X-002');
        expect(mockWeatherApiService.getHistoricalData).toHaveBeenLastCalledWith('M-X-002', 60);
      });
    });
  });

  describe('リトライ機能', () => {
    it('エラー時に自動リトライを行う', async () => {
      // 最初の2回はエラー、3回目は成功
      mockWeatherApiService.getCurrentData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockCurrentData);
      
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      jest.useFakeTimers();

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001', enableAutoRetry: true }));

      // 最初のエラー
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // リトライを進める
      act(() => {
        jest.runAllTimers();
      });

      // 最終的に成功することを確認
      await waitFor(() => {
        expect(result.current.data).toEqual(mockCurrentData);
        expect(result.current.error).toBeNull();
      });

      // 3回呼ばれたことを確認
      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(3);
    });

    it('手動リトライができる', async () => {
      const mockError = new Error('API Error');
      mockWeatherApiService.getCurrentData.mockRejectedValueOnce(mockError);
      mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockWeatherApiService.getStatistics.mockResolvedValue(mockStatsData);

      const { result } = renderHook(() => useWeatherData({ deviceId: 'M-X-001', enableAutoRetry: false }));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // 成功するように設定
      mockWeatherApiService.getCurrentData.mockResolvedValueOnce(mockCurrentData);

      // 手動リトライ
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCurrentData);
        expect(result.current.error).toBeNull();
      });
    });
  });
});