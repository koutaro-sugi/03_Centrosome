/**
 * DynamoDB ユーティリティ関数
 * キーの生成とTTL計算
 */

import { StatsPeriod } from '../types/weather';

/**
 * センサーデータ用のDynamoDBキーを生成
 */
export const createSensorDataKey = (deviceId: string, timestamp: string) => {
  return {
    PK: `DEVICE#${deviceId}`,
    SK: `${timestamp}#RAW`
  };
};

/**
 * 統計データ用のDynamoDBキーを生成
 */
export const createStatsDataKey = (deviceId: string, period: StatsPeriod, timestamp: string) => {
  return {
    PK: `DEVICE#${deviceId}`,
    SK: `${timestamp}#STATS_${period}`
  };
};

/**
 * TTLタイムスタンプを計算
 * @param minutes 有効期限（分）
 * @returns UNIX timestamp
 */
export const calculateTTL = (minutes: number): number => {
  return Math.floor(Date.now() / 1000) + (minutes * 60);
};

/**
 * データタイプに基づいてTTLを決定
 */
export const getTTLForDataType = (dataType: 'RAW' | 'STATS_10MIN'): number => {
  switch (dataType) {
    case 'RAW':
      return calculateTTL(60); // 1時間
    case 'STATS_10MIN':
      return calculateTTL(1440); // 24時間
    default:
      return calculateTTL(60);
  }
};