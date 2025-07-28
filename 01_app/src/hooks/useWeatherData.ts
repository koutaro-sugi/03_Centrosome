/**
 * useWeatherData カスタムフック
 * 気象データの取得とリアルタイム更新を管理するReactフック
 * Weather API Serviceを使用してデータ取得、エラーハンドリング、ローディング状態を管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherApiService } from '../services/weatherApi';
import {
  SensorData,
  SensorStats,
  StatsPeriod,
  ConnectionStatus,
  WeatherDataHookResult
} from '../types/weather';

/**
 * useWeatherDataフックのオプション
 */
interface UseWeatherDataOptions {
  /** デバイスID */
  deviceId: string;
  /** リアルタイム更新を有効にするか */
  enableRealtime?: boolean;
  /** 履歴データの取得期間（分） */
  historyMinutes?: number;
  /** 統計データの期間 */
  statsPeriod?: StatsPeriod;
  /** 自動リトライを有効にするか */
  enableAutoRetry?: boolean;
  /** データ取得間隔（ミリ秒、リアルタイムが無効の場合のポーリング間隔） */
  pollingInterval?: number;
}

/**
 * useWeatherDataフックの戻り値
 */
interface UseWeatherDataResult extends WeatherDataHookResult {
  /** 履歴データ */
  historicalData: SensorData[];
  /** 統計データ */
  statisticsData: SensorStats | null;
  /** 履歴データのローディング状態 */
  historicalLoading: boolean;
  /** 統計データのローディング状態 */
  statisticsLoading: boolean;
  /** 履歴データの取得エラー */
  historicalError: Error | null;
  /** 統計データの取得エラー */
  statisticsError: Error | null;
  /** 履歴データの再取得 */
  refetchHistorical: () => Promise<void>;
  /** 統計データの再取得 */
  refetchStatistics: () => Promise<void>;
  /** 全データの再取得 */
  refetchAll: () => Promise<void>;
}

// WeatherApiServiceのインスタンスを作成（テスト時はモックされる）
export let weatherApiService: WeatherApiService;

// 実行環境がテストでない場合のみインスタンスを作成
if (process.env.NODE_ENV !== 'test') {
  weatherApiService = new WeatherApiService();
}

// テスト用のセッター関数
export const setWeatherApiService = (service: WeatherApiService) => {
  weatherApiService = service;
};

/**
 * 気象データ管理用カスタムフック
 * 現在データ、履歴データ、統計データの取得とリアルタイム更新を管理
 */
export const useWeatherData = (options: UseWeatherDataOptions): UseWeatherDataResult => {
  const {
    deviceId,
    enableRealtime = true,
    historyMinutes = 60,
    statsPeriod = StatsPeriod.HOUR,
    enableAutoRetry = true,
    pollingInterval = 30000 // 30秒
  } = options;

  // 現在データの状態
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // 履歴データの状態
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState<boolean>(true);
  const [historicalError, setHistoricalError] = useState<Error | null>(null);

  // 統計データの状態
  const [statisticsData, setStatisticsData] = useState<SensorStats | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState<boolean>(true);
  const [statisticsError, setStatisticsError] = useState<Error | null>(null);

  // 接続状態
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // リトライ回数の管理
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  // サブスクリプションのクリーンアップ関数
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ポーリングタイマーの管理
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 現在データの取得
   */
  const fetchCurrentData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const currentData = await weatherApiService.getCurrentData(deviceId);
      setData(currentData);
      retryCountRef.current = 0; // 成功時はリトライ回数をリセット
    } catch (err) {
      console.error('現在データ取得エラー:', err);
      setError(err as Error);
      
      // 自動リトライが有効で、最大リトライ回数に達していない場合
      if (enableAutoRetry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const retryDelay = 1000 * Math.pow(2, retryCountRef.current - 1); // 指数バックオフ
        
        setTimeout(() => {
          fetchCurrentData();
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId, enableAutoRetry]);

  /**
   * 履歴データの取得
   */
  const fetchHistoricalData = useCallback(async (): Promise<void> => {
    try {
      setHistoricalLoading(true);
      setHistoricalError(null);

      const historical = await weatherApiService.getHistoricalData(deviceId, historyMinutes);
      setHistoricalData(historical);
    } catch (err) {
      console.error('履歴データ取得エラー:', err);
      setHistoricalError(err as Error);
    } finally {
      setHistoricalLoading(false);
    }
  }, [deviceId, historyMinutes]);

  /**
   * 統計データの取得
   */
  const fetchStatisticsData = useCallback(async (): Promise<void> => {
    try {
      setStatisticsLoading(true);
      setStatisticsError(null);

      const statistics = await weatherApiService.getStatistics(deviceId, statsPeriod);
      setStatisticsData(statistics);
    } catch (err) {
      console.error('統計データ取得エラー:', err);
      setStatisticsError(err as Error);
    } finally {
      setStatisticsLoading(false);
    }
  }, [deviceId, statsPeriod]);

  /**
   * 全データの再取得
   */
  const refetchAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      fetchCurrentData(),
      fetchHistoricalData(),
      fetchStatisticsData()
    ]);
  }, [fetchCurrentData, fetchHistoricalData, fetchStatisticsData]);

  /**
   * リアルタイムデータ更新のコールバック
   */
  const handleRealtimeUpdate = useCallback((newData: SensorData) => {
    setData(newData);
    setError(null);
    setLoading(false);
    
    // 履歴データも更新（最新データを追加し、古いデータを削除）
    setHistoricalData(prevData => {
      const updatedData = [...prevData, newData];
      const cutoffTime = new Date(Date.now() - historyMinutes * 60 * 1000);
      
      return updatedData.filter(item => 
        new Date(item.timestamp) > cutoffTime
      ).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [historyMinutes]);

  /**
   * リアルタイム接続の開始
   */
  const startRealtimeConnection = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    try {
      const unsubscribe = weatherApiService.subscribeToUpdates(
        deviceId,
        handleRealtimeUpdate
      );
      
      unsubscribeRef.current = unsubscribe;
      setConnectionStatus('connected');
    } catch (err) {
      console.error('リアルタイム接続エラー:', err);
      setConnectionStatus('disconnected');
      setError(err as Error);
    }
  }, [deviceId, handleRealtimeUpdate]);

  /**
   * ポーリングの開始
   */
  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    pollingTimerRef.current = setInterval(() => {
      fetchCurrentData();
    }, pollingInterval);
  }, [fetchCurrentData, pollingInterval]);

  /**
   * 接続状態の監視
   */
  useEffect(() => {
    const checkConnectionStatus = () => {
      const status = weatherApiService.getConnectionStatus();
      setConnectionStatus(status);
    };

    const interval = setInterval(checkConnectionStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 初期データ取得とリアルタイム接続の設定
   */
  useEffect(() => {
    // 初期データの取得
    refetchAll();

    // リアルタイム更新またはポーリングの開始
    if (enableRealtime) {
      startRealtimeConnection();
    } else {
      startPolling();
    }

    // クリーンアップ
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [deviceId, enableRealtime, refetchAll, startRealtimeConnection, startPolling]);

  /**
   * デバイスIDが変更された場合の処理
   */
  useEffect(() => {
    // 状態をリセット
    setData(null);
    setHistoricalData([]);
    setStatisticsData(null);
    setError(null);
    setHistoricalError(null);
    setStatisticsError(null);
    setLoading(true);
    setHistoricalLoading(true);
    setStatisticsLoading(true);
    retryCountRef.current = 0;
  }, [deviceId]);

  /**
   * 手動リトライ関数
   */
  const retry = useCallback(() => {
    retryCountRef.current = 0;
    setError(null);
    fetchCurrentData();
  }, [fetchCurrentData]);

  return {
    // 現在データ
    data,
    loading,
    error,
    connectionStatus,
    retry,

    // 履歴データ
    historicalData,
    historicalLoading,
    historicalError,
    refetchHistorical: fetchHistoricalData,

    // 統計データ
    statisticsData,
    statisticsLoading,
    statisticsError,
    refetchStatistics: fetchStatisticsData,

    // 全体
    refetchAll
  };
};

/**
 * 単一デバイスの現在データのみを取得する軽量版フック
 */
export const useCurrentWeatherData = (deviceId: string) => {
  return useWeatherData({
    deviceId,
    enableRealtime: true,
    historyMinutes: 0, // 履歴データは取得しない
    enableAutoRetry: true
  });
};

/**
 * 履歴データのみを取得するフック
 */
export const useWeatherHistory = (deviceId: string, minutes: number = 60) => {
  return useWeatherData({
    deviceId,
    enableRealtime: false,
    historyMinutes: minutes,
    enableAutoRetry: true,
    pollingInterval: 60000 // 1分間隔でポーリング
  });
};

/**
 * 統計データのみを取得するフック
 */
export const useWeatherStatistics = (deviceId: string, period: StatsPeriod = StatsPeriod.HOUR) => {
  return useWeatherData({
    deviceId,
    enableRealtime: false,
    historyMinutes: 0,
    statsPeriod: period,
    enableAutoRetry: true,
    pollingInterval: 600000 // 10分間隔でポーリング
  });
};