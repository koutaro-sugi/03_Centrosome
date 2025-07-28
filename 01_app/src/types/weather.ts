/**
 * 気象データ関連のTypeScript型定義
 * Weather Dashboard用のインターフェースと列挙型を定義
 */

/**
 * センサーから取得される生の気象データ
 * Madoセンサー（M-X）からの測定値を格納
 */
export interface SensorData {
  /** デバイスID（例: "M-X-001"） */
  deviceId: string;
  
  /** データ取得時刻（ISO 8601形式） */
  timestamp: string;
  
  /** 気温（摂氏） */
  temperature?: number;
  
  /** 湿度（%） */
  humidity?: number;
  
  /** 気圧（hPa） */
  pressure?: number;
  
  /** 風速（m/s） */
  windSpeed?: number;
  
  /** 風向（度、0-359） */
  windDirection?: number;
  
  /** 降水量（mm） */
  rainfall?: number;
  
  /** 照度（lux） */
  illuminance?: number;
  
  /** 視程（km） */
  visibility?: number;
  
  /** 体感温度（摂氏） */
  feelsLike?: number;
}

/**
 * 統計値（最大・最小・平均）
 * 10分間隔で計算される各気象要素の統計情報
 */
export interface StatsValues {
  /** 最大値 */
  max: number;
  
  /** 最小値 */
  min: number;
  
  /** 平均値 */
  avg: number;
}

/**
 * センサーデータの統計情報
 * 指定期間内の気象データから計算される統計値
 */
export interface SensorStats {
  /** デバイスID */
  deviceId: string;
  
  /** 統計期間（"HOUR" | "DAY"） */
  period: string;
  
  /** 統計期間開始時刻（ISO 8601形式） */
  startTime: string;
  
  /** 統計期間終了時刻（ISO 8601形式） */
  endTime: string;
  
  /** 気温の統計値 */
  temperature?: StatsValues;
  
  /** 湿度の統計値 */
  humidity?: StatsValues;
  
  /** 風速の統計値 */
  windSpeed?: StatsValues;
  
  /** 気圧の統計値 */
  pressure?: StatsValues;
  
  /** 風向の統計値 */
  windDirection?: StatsValues;
  
  /** 降水量の統計値 */
  rainfall?: StatsValues;
  
  /** 照度の統計値 */
  illuminance?: StatsValues;
  
  /** 視程の統計値 */
  visibility?: StatsValues;
  
  /** 体感温度の統計値 */
  feelsLike?: StatsValues;
  
  /** サンプル数（統計計算に使用されたデータ点数） */
  samples: number;
}

/**
 * 統計期間の列挙型
 * 統計データの集計期間を指定
 */
export enum StatsPeriod {
  /** 10分 */
  TEN_MINUTES = "TEN_MINUTES",
  
  /** 1時間 */
  HOUR = "HOUR",
  
  /** 1日 */
  DAY = "DAY"
}

/**
 * 気象データタイプの列挙型
 * グラフ表示や分析で使用する気象要素の種類
 */
export enum WeatherDataType {
  /** 気温 */
  TEMPERATURE = "temperature",
  
  /** 湿度 */
  HUMIDITY = "humidity",
  
  /** 気圧 */
  PRESSURE = "pressure",
  
  /** 風速 */
  WIND_SPEED = "windSpeed",
  
  /** 風向 */
  WIND_DIRECTION = "windDirection",
  
  /** 降水量 */
  RAINFALL = "rainfall",
  
  /** 照度 */
  ILLUMINANCE = "illuminance",
  
  /** 視程 */
  VISIBILITY = "visibility",
  
  /** 体感温度 */
  FEELS_LIKE = "feelsLike"
}

/**
 * DynamoDBレコード構造
 * CentraSensorDataテーブルのアイテム構造
 * 設計書に基づく単一テーブル設計
 */
export interface DynamoDBWeatherRecord {
  /** パーティションキー（例: "DEVICE#M-X-001"） */
  PK: string;
  
  /** ソートキー（例: "2025-01-27T12:00:00.000Z#RAW" または "#STATS_10MIN"） */
  SK: string;
  
  /** データタイプ */
  type: "RAW" | "STATS_10MIN";
  
  /** デバイスID */
  deviceId: string;
  
  /** タイムスタンプ（ISO 8601形式） */
  timestamp: string;
  
  /** TTL（Time To Live）- UNIX timestamp
   * RAW: 1時間（3600秒）、STATS_10MIN: 24時間（86400秒）
   */
  ttl: number;
  
  // 生データフィールド（type=RAWの場合）
  /** 温度（℃） */
  temperature?: number;
  /** 湿度（%） */
  humidity?: number;
  /** 気圧（hPa） */
  pressure?: number;
  /** 風速（m/s） */
  windSpeed?: number;
  /** 風向（度） */
  windDirection?: number;
  /** 降水量（mm） */
  rainfall?: number;
  /** 照度（lux） */
  illuminance?: number;
  /** 視程（km） */
  visibility?: number;
  /** 体感温度（℃） */
  feelsLike?: number;
  
  // 統計データフィールド（type=STATS_10MINの場合）
  /** 温度統計 */
  temperatureMax?: number;
  temperatureMin?: number;
  temperatureAvg?: number;
  /** 湿度統計 */
  humidityMax?: number;
  humidityMin?: number;
  humidityAvg?: number;
  /** 風速統計 */
  windSpeedMax?: number;
  windSpeedMin?: number;
  windSpeedAvg?: number;
  /** 気圧統計 */
  pressureMax?: number;
  pressureMin?: number;
  pressureAvg?: number;
  /** 風向統計 */
  windDirectionMax?: number;
  windDirectionMin?: number;
  windDirectionAvg?: number;
  /** 降水量統計 */
  rainfallMax?: number;
  rainfallMin?: number;
  rainfallAvg?: number;
  /** 照度統計 */
  illuminanceMax?: number;
  illuminanceMin?: number;
  illuminanceAvg?: number;
  /** 視程統計 */
  visibilityMax?: number;
  visibilityMin?: number;
  visibilityAvg?: number;
  /** 体感温度統計 */
  feelsLikeMax?: number;
  feelsLikeMin?: number;
  feelsLikeAvg?: number;
  /** サンプル数（統計データの場合） */
  samples?: number;
  
  /** 統計期間情報（統計データの場合） */
  period?: "HOUR" | "DAY";
  startTime?: string;
  endTime?: string;
}

/**
 * TTL計算用のユーティリティ型
 */
export interface TTLConfig {
  /** RAWデータのTTL（秒） */
  RAW_TTL: 3600;  // 1時間
  /** 統計データのTTL（秒） */
  STATS_TTL: 86400;  // 24時間
}

/**
 * DynamoDBキー生成用のユーティリティ型
 */
export interface DynamoDBKeyUtils {
  /** パーティションキー生成 */
  generatePK: (deviceId: string) => string;
  /** ソートキー生成 */
  generateSK: (timestamp: string, type: "RAW" | "STATS_10MIN") => string;
  /** TTL値計算 */
  calculateTTL: (type: "RAW" | "STATS_10MIN") => number;
}

/**
 * WebSocket接続状態
 * リアルタイムデータ受信の接続状態を管理
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'connecting';

/**
 * 気象データフック用の戻り値型
 * useWeatherDataカスタムフックで使用
 */
export interface WeatherDataHookResult {
  /** 現在のセンサーデータ */
  data: SensorData | null;
  
  /** ローディング状態 */
  loading: boolean;
  
  /** エラー情報 */
  error: Error | null;
  
  /** WebSocket接続状態 */
  connectionStatus: ConnectionStatus;
  
  /** 再試行関数 */
  retry: () => void;
}

/**
 * 気象API設定
 * AppSyncクライアントの設定情報
 */
export interface WeatherApiConfig {
  /** GraphQL エンドポイントURL */
  graphqlEndpoint: string;
  
  /** 認証設定 */
  authConfig: {
    type: 'AMAZON_COGNITO_USER_POOLS';
    jwtToken: string;
  };
  
  /** リージョン */
  region: string;
}