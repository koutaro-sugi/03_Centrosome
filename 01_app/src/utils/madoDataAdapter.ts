/**
 * Mado Data Adapter
 * MadoセンサーデータをCentra Weatherコンポーネント用のフォーマットに変換
 */

import { MadoSensorData } from '../services/madoSensorService';
import { SensorData } from '../types/weather';

/**
 * MadoセンサーデータをCentraのSensorData形式に変換
 */
export function convertMadoToCentraFormat(madoData: MadoSensorData): SensorData {
  return {
    deviceId: madoData.device_id,
    timestamp: madoData.timestamp,
    temperature: madoData.data.temperature,
    humidity: madoData.data.humidity,
    pressure: madoData.data.pressure,
    windSpeed: madoData.data.wind_speed,
    windDirection: madoData.data.wind_direction,
    rainfall: madoData.data.rain_1h,
    illuminance: madoData.data.illuminance,
    visibility: madoData.data.visibility,
    feelsLike: madoData.data.feels_like
  };
}

/**
 * データ品質チェック
 */
export function checkDataQuality(data: MadoSensorData): 'good' | 'warning' | 'error' {
  // 温度範囲チェック
  if (data.data.temperature < -40 || data.data.temperature > 60) {
    return 'error';
  }
  
  // 湿度範囲チェック
  if (data.data.humidity < 0 || data.data.humidity > 100) {
    return 'error';
  }
  
  // 気圧範囲チェック
  if (data.data.pressure < 900 || data.data.pressure > 1100) {
    return 'warning';
  }
  
  // 風速範囲チェック
  if (data.data.wind_speed < 0 || data.data.wind_speed > 100) {
    return 'warning';
  }
  
  return 'good';
}

/**
 * デバイスIDの正規化
 * M-X, M-01, M-02 などのSpaceX風命名を表示用に変換
 */
export function formatDeviceId(deviceId: string): string {
  const deviceNames: Record<string, string> = {
    'M-X': '試作機 (M-X)',
    'M-01': 'メイン気象ステーション',
    'M-02': 'サブ気象ステーション',
    'M-03': 'モバイル気象センサー'
  };
  
  return deviceNames[deviceId] || deviceId;
}

/**
 * 風向をコンパス方向に変換
 */
export function getWindDirectionLabel(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * 体感温度が設定されていない場合の計算
 */
export function calculateFeelsLike(temperature: number, windSpeed: number, humidity: number): number {
  // 簡易的な体感温度計算
  if (temperature <= 10 && windSpeed > 1.3) {
    // 風冷え効果
    return 13.12 + 0.6215 * temperature - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temperature * Math.pow(windSpeed, 0.16);
  } else if (temperature >= 27) {
    // 暑さ指数的な計算
    const heatIndex = temperature + 0.5 * (humidity - 50);
    return heatIndex;
  }
  
  return temperature;
}