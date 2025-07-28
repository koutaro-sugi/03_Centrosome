/**
 * useMadoSensorData カスタムフック
 * Madoセンサーデータのリアルタイム取得と管理
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMadoSensorService, MadoSensorData } from '../services/madoSensorService';
import { convertMadoToCentraFormat, checkDataQuality } from '../utils/madoDataAdapter';
import { SensorData, ConnectionStatus } from '../types/weather';

/**
 * useMadoSensorDataフックのオプション
 */
interface UseMadoSensorDataOptions {
  /** デバイスID */
  deviceId: string;
  /** 履歴データの保持時間（分） */
  historyMinutes?: number;
}

/**
 * useMadoSensorDataフックの戻り値
 */
interface UseMadoSensorDataResult {
  /** 現在のセンサーデータ */
  data: SensorData | null;
  /** 履歴データ */
  historicalData: SensorData[];
  /** ローディング状態 */
  loading: boolean;
  /** エラー */
  error: Error | null;
  /** 接続状態 */
  connectionStatus: ConnectionStatus;
  /** 再接続 */
  retry: () => Promise<void>;
  /** データ品質 */
  dataQuality: 'good' | 'warning' | 'error' | null;
}

/**
 * Madoセンサーデータ管理用カスタムフック
 */
export const useMadoSensorData = (options: UseMadoSensorDataOptions): UseMadoSensorDataResult => {
  const {
    deviceId,
    historyMinutes = 60
  } = options;

  // 状態管理
  const [data, setData] = useState<SensorData | null>(null);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [dataQuality, setDataQuality] = useState<'good' | 'warning' | 'error' | null>(null);

  // Refでサービスインスタンスを保持
  const serviceRef = useRef(getMadoSensorService());

  /**
   * リアルタイムデータのハンドリング
   */
  const handleRealtimeData = useCallback((madoData: MadoSensorData) => {
    // debug時: Madoデータ受信

    // データ品質チェック
    const quality = checkDataQuality(madoData);
    setDataQuality(quality);

    // データ変換
    const centraData = convertMadoToCentraFormat(madoData);
    setData(centraData);

    // 履歴データに追加
    setHistoricalData(prevData => {
      const updatedData = [...prevData, centraData];
      const cutoffTime = new Date(Date.now() - historyMinutes * 60 * 1000);
      
      // 古いデータを削除
      return updatedData.filter(item => 
        new Date(item.timestamp) > cutoffTime
      ).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    // エラーをクリア
    setError(null);
    setLoading(false);
  }, [historyMinutes]);

  /**
   * 接続状態のハンドリング
   */
  const handleStatusChange = useCallback((status: 'connected' | 'disconnected' | 'error', err?: Error) => {
    // debug時: 接続状態変更

    setConnectionStatus(status === 'connected' ? 'connected' : 'disconnected');
    
    if (err) {
      setError(err);
    }

    if (status === 'connected') {
      setLoading(false);
    }
  }, []);

  /**
   * 接続と購読の開始
   */
  const connectAndSubscribe = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const service = serviceRef.current;

      // 接続状態リスナーを登録
      service.onStatusChange(handleStatusChange);

      // IoT Coreに接続
      await service.connect();

      // デバイスを購読
      await service.subscribeToDevice(deviceId, handleRealtimeData);
    } catch (err) {
      // Mado接続エラー: err
      setError(err as Error);
      setLoading(false);
      setConnectionStatus('disconnected');
    }
  }, [deviceId, handleRealtimeData, handleStatusChange]);

  /**
   * 再接続
   */
  const retry = useCallback(async () => {
    // debug時: 再接続を実行
    await connectAndSubscribe();
  }, [connectAndSubscribe]);

  /**
   * 初期接続とクリーンアップ
   */
  useEffect(() => {
    const service = serviceRef.current;
    connectAndSubscribe();

    // クリーンアップ
    return () => {
      service.unsubscribeFromDevice(deviceId).catch(() => {
        // エラーを無視
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]); // deviceIdが変更された場合のみ再接続

  /**
   * デバイスID変更時のリセット
   */
  useEffect(() => {
    setData(null);
    setHistoricalData([]);
    setDataQuality(null);
  }, [deviceId]);

  return {
    data,
    historicalData,
    loading,
    error,
    connectionStatus,
    retry,
    dataQuality
  };
};