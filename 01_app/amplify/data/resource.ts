import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Weather Dashboard用のモデル定義
  
  /**
   * CentraSensorData - 統合センサーデータテーブル
   * 設計書に基づく単一テーブル設計
   * PK: "DEVICE#{deviceId}", SK: "{timestamp}#{type}"
   * TTL: RAW=1時間(3600秒), STATS_10MIN=24時間(86400秒)
   */
  CentraSensorData: a.model({
    // パーティションキー: DEVICE#M-X 形式
    PK: a.string().required(),
    // ソートキー: 2025-01-27T12:00:00.000Z#RAW または #STATS_10MIN 形式
    SK: a.string().required(),
    // データタイプ: RAW（生データ）または STATS_10MIN（統計データ）
    type: a.enum(['RAW', 'STATS_10MIN']),
    // デバイスID
    deviceId: a.string().required(),
    // タイムスタンプ（ISO 8601形式）
    timestamp: a.string().required(),
    // TTL（Time To Live）- UNIX timestamp
    // RAW: 1時間（3600秒）、STATS_10MIN: 24時間（86400秒）
    ttl: a.integer().required(),
    
    // 生データフィールド（type=RAWの場合）
    temperature: a.float(),      // 温度（℃）
    humidity: a.float(),         // 湿度（%）
    pressure: a.float(),         // 気圧（hPa）
    windSpeed: a.float(),        // 風速（m/s）
    windDirection: a.float(),    // 風向（度）
    rainfall: a.float(),         // 降水量（mm）
    illuminance: a.float(),      // 照度（lux）
    visibility: a.float(),       // 視程（km）
    feelsLike: a.float(),        // 体感温度（℃）
    
    // 統計データフィールド（type=STATS_10MINの場合）
    // 温度統計
    temperatureMax: a.float(),
    temperatureMin: a.float(),
    temperatureAvg: a.float(),
    // 湿度統計
    humidityMax: a.float(),
    humidityMin: a.float(),
    humidityAvg: a.float(),
    // 風速統計
    windSpeedMax: a.float(),
    windSpeedMin: a.float(),
    windSpeedAvg: a.float(),
    // 気圧統計
    pressureMax: a.float(),
    pressureMin: a.float(),
    pressureAvg: a.float(),
    // 風向統計
    windDirectionMax: a.float(),
    windDirectionMin: a.float(),
    windDirectionAvg: a.float(),
    // 降水量統計
    rainfallMax: a.float(),
    rainfallMin: a.float(),
    rainfallAvg: a.float(),
    // 照度統計
    illuminanceMax: a.float(),
    illuminanceMin: a.float(),
    illuminanceAvg: a.float(),
    // 視程統計
    visibilityMax: a.float(),
    visibilityMin: a.float(),
    visibilityAvg: a.float(),
    // 体感温度統計
    feelsLikeMax: a.float(),
    feelsLikeMin: a.float(),
    feelsLikeAvg: a.float(),
    // サンプル数（統計データの場合）
    samples: a.integer(),
    
    // 統計期間情報（統計データの場合）
    period: a.enum(['HOUR', 'DAY']),
    startTime: a.string(),
    endTime: a.string(),
  })
    .identifier(['PK', 'SK'])
    .authorization(allow => [allow.authenticated()])
    .secondaryIndexes(index => [
      // GSI1: デバイスIDとタイムスタンプでのクエリ用（時系列データ取得）
      index('deviceId').sortKeys(['timestamp']).queryField('listByDeviceAndTime'),
      // GSI2: デバイスIDとタイプでのクエリ用（RAW/STATSの分離、タイムスタンプでソート）
      index('deviceId').sortKeys(['type']).queryField('listByDeviceAndType'),
    ]),

  // 既存のモデル定義
  Aircraft: a.model({
    userId: a.string().required(),
    aircraftId: a.id().required(),
    name: a.string().required(),
    registrationNumber: a.string().required(),
    manufacturer: a.string().required(),
    model: a.string().required(),
    serialNumber: a.string(),
    weight: a.float(),
    maxWeight: a.float(),
    active: a.boolean().default(true),
    notes: a.string(),
  })
    .identifier(['userId', 'aircraftId'])
    .authorization(allow => [allow.owner()]),

  Pilot: a.model({
    userId: a.string().required(),
    pilotId: a.id().required(),
    name: a.string().required(),
    licenseNumber: a.string(),
    email: a.string(),
    phone: a.string(),
    active: a.boolean().default(true),
    notes: a.string(),
  })
    .identifier(['userId', 'pilotId'])
    .authorization(allow => [allow.owner()]),

  FlightLog: a.model({
    userId: a.string().required(),
    flightLogId: a.id().required(),
    aircraftId: a.string().required(),
    pilotId: a.string().required(),
    date: a.date().required(),
    takeoffTime: a.datetime(),
    landingTime: a.datetime(),
    flightDuration: a.integer(),
    takeoffLocationId: a.string(),
    landingLocationId: a.string(),
    purpose: a.string(),
    notes: a.string(),
    weatherConditions: a.string(),
    incidentReport: a.string(),
  })
    .identifier(['userId', 'flightLogId'])
    .authorization(allow => [allow.owner()]),

  FlightLocation: a.model({
    userId: a.string().required(),
    locationId: a.id().required(),
    name: a.string().required(),
    address: a.string().required(),
    lat: a.float().required(),
    lon: a.float().required(),
    tags: a.string().array(),
    usageCount: a.integer().default(0),
    active: a.boolean().default(true),
  })
    .identifier(['userId', 'locationId'])
    .authorization(allow => [allow.owner()]),


});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
  // GraphQLセキュリティ設定
  resolvers: {
    // カスタムリゾルバー設定をここに追加
  },
});