/**
 * useWeatherData カスタムフック テストファイル
 * useWeatherDataフックの単体テスト
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWeatherData, useCurrentWeatherData, useWeatherHistory, useWeatherStatistics } from '../useWeatherData';
import { weatherApiService } from '../../services/weatherApi';
import { SensorData, SensorStats, StatsPeriod } from '../../types/weather';

// Weather API Serviceのモック
jest.mock('../../services/weatherApi', () => ({
  weatherApiService: {
    getCurrentData: jest.fn(),
    getHistoricalData: jest.fn(),
    getStatistics: jest.fn(),
    subscribeToUpdates: jest.fn(),
    getConnectionStatus: jest.fn(),
    unsubscribeAll: jest.fn()
  }
}));

const mockWeatherApiService = weatherApiService as jest.Mocked<typeof weatherApiService>;

describe('useWeatherData', () => {
  const mockSensorData: SensorData = {
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
      ...mockSensorData,
      timestamp: '2025-01-27T11:00:00.000Z',
      temperature: 24.0
    },
    {
      ...mockSensorData,
      timestamp: '2025-01-27T11:30:00.000Z',
      temperature: 24.8
    },
    mockSensorData
  ];

  const mockStatisticsData: SensorStats = {
    deviceId: 'M-X-001',
    period: 'HOUR',
    startTime: '2025-01-27T11:00:00.000Z',
    endTime: '2025-01-27T12:00:00.000Z',
    temperature: {
      max: 26.0,
      min: 24.0,
      avg: 25.0
    },
    windSpeed: {
      max: 8.5,
      min: 3.2,
      avg: 5.8
    },
    samples: 60
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    mockWeatherApiService.getCurrentData.mockResolvedValue(mockSensorData);
    mockWeatherApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);
    mockWeatherApiService.getStatistics.mockResolvedValue(mockStatisticsData);
    mockWeatherApiService.getConnectionStatus.mockReturnValue('connected');
    mockWeatherApiService.subscribeToUpdates.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本的なデータ取得', () => {
    it('初期化時に全てのデータを取得する', async () => {
      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001' })
      );

      // 初期状態の確認
      expect(result.current.loading).toBe(true);
      expect(result.current.historicalLoading).toBe(true);
      expect(result.current.statisticsLoading).toBe(true);

      // データ取得完了まで待機
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.historicalLoading).toBe(false);
        expect(result.current.statisticsLoading).toBe(false);
      });

      // データの確認
      expect(result.current.data).toEqual(mockSensorData);
      expect(result.current.historicalData).toEqual(mockHistoricalData);
      expect(result.current.statisticsData).toEqual(mockStatisticsData);

      // API呼び出しの確認
      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledWith('M-X-001');
      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 60);
      expect(mockWeatherApiService.getStatistics).toHaveBeenCalledWith('M-X-001', StatsPeriod.HOUR);
    });

    it('カスタムオプションでデータを取得する', async () => {
      const { result } = renderHook(() =>
        useWeatherData({
          deviceId: 'M-X-001',
          historyMinutes: 120,
          statsPeriod: StatsPeriod.DAY
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 120);
      expect(mockWeatherApiService.getStatistics).toHaveBeenCalledWith('M-X-001', StatsPeriod.DAY);
    });
  });

  describe('リアルタイム更新', () => {
    it('リアルタイム更新が有効な場合、サブスクリプションを開始する', async () => {
      const mockUnsubscribe = jest.fn();
      mockWeatherApiService.subscribeToUpdates.mockReturnValue(mockUnsubscribe);

      const { result, unmount } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001', enableRealtime: true })
      );

      await waitFor(() => {
        expect(mockWeatherApiService.subscribeToUpdates).toHaveBeenCalledWith(
          'M-X-001',
          expect.any(Function)
        );
      });

      // アンマウント時にサブスクリプションが停止されることを確認
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('リアルタイムデータ受信時に状態が更新される', async () => {
      let realtimeCallback: (data: SensorData) => void;
      
      mockWeatherApiService.subscribeToUpdates.mockImplementation((deviceId, callback) => {
        realtimeCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001', enableRealtime: true })
      );

      await waitFor(() => {
        expect(mockWeatherApiService.subscribeToUpdates).toHaveBeenCalled();
      });

      // リアルタイムデータの受信をシミュレート
      const newData: SensorData = {
        ...mockSensorData,
        timestamp: '2025-01-27T12:30:00.000Z',
        temperature: 27.0
      };

      act(() => {
        realtimeCallback!(newData);
      });

      expect(result.current.data).toEqual(newData);
      expect(result.current.error).toBeNull();
    });

    it('リアルタイム更新時に履歴データも更新される', async () => {
      let realtimeCallback: (data: SensorData) => void;
      
      mockWeatherApiService.subscribeToUpdates.mockImplementation((deviceId, callback) => {
        realtimeCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001', enableRealtime: true, historyMinutes: 60 })
      );

      await waitFor(() => {
        expect(result.current.historicalData).toHaveLength(3);
      });

      // 新しいリアルタイムデータ
      const newData: SensorData = {
        ...mockSensorData,
        timestamp: '2025-01-27T12:30:00.000Z',
        temperature: 27.0
      };

      act(() => {
        realtimeCallback!(newData);
      });

      // 履歴データに新しいデータが追加されることを確認
      expect(result.current.historicalData).toHaveLength(4);
      expect(result.current.historicalData[3]).toEqual(newData);
    });
  });

  describe('ポーリング', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('リアルタイムが無効な場合、ポーリングを開始する', async () => {
      const { result } = renderHook(() =>
        useWeatherData({
          deviceId: 'M-X-001',
          enableRealtime: false,
          pollingInterval: 5000
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 初回呼び出し
      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(1);

      // 5秒後にポーリングが実行される
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('データ取得エラー時にエラー状態を設定する', async () => {
      const error = new Error('データ取得エラー');
      mockWeatherApiService.getCurrentData.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.data).toBeNull();
    });

    it('自動リトライが有効な場合、エラー時にリトライする', async () => {
      jest.useFakeTimers();

      mockWeatherApiService.getCurrentData
        .mockRejectedValueOnce(new Error('一時的なエラー'))
        .mockResolvedValueOnce(mockSensorData);

      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001', enableAutoRetry: true })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // リトライ実行
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockSensorData);
        expect(result.current.error).toBeNull();
      });

      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(2);
    });

    it('手動リトライ機能が動作する', async () => {
      const error = new Error('データ取得エラー');
      mockWeatherApiService.getCurrentData
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockSensorData);

      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001', enableAutoRetry: false })
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      // 手動リトライ実行
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockSensorData);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('データ再取得', () => {
    it('refetchAllで全データを再取得する', async () => {
      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // API呼び出し回数をリセット
      jest.clearAllMocks();

      // 全データ再取得
      await act(async () => {
        await result.current.refetchAll();
      });

      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledTimes(1);
      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledTimes(1);
      expect(mockWeatherApiService.getStatistics).toHaveBeenCalledTimes(1);
    });

    it('個別のデータ再取得が動作する', async () => {
      const { result } = renderHook(() =>
        useWeatherData({ deviceId: 'M-X-001' })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      jest.clearAllMocks();

      // 履歴データのみ再取得
      await act(async () => {
        await result.current.refetchHistorical();
      });

      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledTimes(1);
      expect(mockWeatherApiService.getCurrentData).not.toHaveBeenCalled();
      expect(mockWeatherApiService.getStatistics).not.toHaveBeenCalled();
    });
  });

  describe('デバイスID変更', () => {
    it('デバイスIDが変更された場合、状態がリセットされる', async () => {
      const { result, rerender } = renderHook(
        ({ deviceId }) => useWeatherData({ deviceId }),
        { initialProps: { deviceId: 'M-X-001' } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockSensorData);
      });

      // デバイスIDを変更
      rerender({ deviceId: 'M-X-002' });

      // 状態がリセットされることを確認
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('特化型フック', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWeatherApiService.getCurrentData.mockResolvedValue({
      deviceId: 'M-X-001',
      timestamp: '2025-01-27T12:00:00.000Z',
      temperature: 25.5
    } as SensorData);
  });

  describe('useCurrentWeatherData', () => {
    it('現在データのみを取得する', async () => {
      const { result } = renderHook(() =>
        useCurrentWeatherData('M-X-001')
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockWeatherApiService.getCurrentData).toHaveBeenCalledWith('M-X-001');
      expect(mockWeatherApiService.subscribeToUpdates).toHaveBeenCalled();
      // 履歴データと統計データは取得しない（historyMinutes: 0のため）
    });
  });

  describe('useWeatherHistory', () => {
    it('履歴データのみを取得する', async () => {
      mockWeatherApiService.getHistoricalData.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useWeatherHistory('M-X-001', 120)
      );

      await waitFor(() => {
        expect(result.current.historicalLoading).toBe(false);
      });

      expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 120);
      // リアルタイム更新は無効
      expect(mockWeatherApiService.subscribeToUpdates).not.toHaveBeenCalled();
    });
  });

  describe('useWeatherStatistics', () => {
    it('統計データのみを取得する', async () => {
      mockWeatherApiService.getStatistics.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useWeatherStatistics('M-X-001', StatsPeriod.DAY)
      );

      await waitFor(() => {
        expect(result.current.statisticsLoading).toBe(false);
      });

      expect(mockWeatherApiService.getStatistics).toHaveBeenCalledWith('M-X-001', StatsPeriod.DAY);
      // リアルタイム更新は無効
      expect(mockWeatherApiService.subscribeToUpdates).not.toHaveBeenCalled();
    });
  });
});