# Centra Weather Dashboard 要件定義書

## 1. 概要

### 1.1 目的
AWS IoT Coreに接続されたMadoセンサー（M-X）からのリアルタイム気象データを、Webアプリケーション上で表示・分析するシステムを構築する。

### 1.2 スコープ
- リアルタイムデータ表示
- 短期履歴データ（1時間）の保持と表示
- 統計データ（最大瞬間風速など）の計算と表示
- リロード対応（データ永続化）

### 1.3 制約事項
- 月額コストを$10以下に抑える
- 既存のCentraアプリの他機能に影響を与えない
- 本番環境レベルの品質を保つ

## 2. システムアーキテクチャ

### 2.1 全体構成
```
[Mado Sensor] → [AWS IoT Core] → [IoT Rule] → [Lambda] → [AppSync] → [React App]
                                                    ↓
                                              [DynamoDB]
```

### 2.2 使用サービス
- **AWS IoT Core**: MQTTデータ受信
- **AWS Lambda**: データ処理・集計
- **AWS AppSync**: GraphQL API（リアルタイム配信）
- **Amazon DynamoDB**: 短期データ保存
- **React**: フロントエンド

## 3. データ仕様

### 3.1 入力データ（Madoからの送信）
```json
{
  "device_id": "M-X",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "location": {
    "name": "mado-experimental",
    "lat": 35.6762,
    "lon": 139.6503
  },
  "data": {
    "temperature": 25.5,      // 気温（℃）
    "humidity": 60.5,         // 湿度（%）
    "pressure": 1013.25,      // 気圧（hPa）
    "wind_speed": 15.5,       // 風速（m/s）
    "wind_direction": 180,    // 風向（度）
    "rain_1h": 0.0,          // 降水量（mm）
    "illuminance": 50000,     // 照度（lux）
    "visibility": 10.0,       // 視程（km）
    "feels_like": 24.5        // 体感温度（℃）
  }
}
```

### 3.2 DynamoDBデータ構造
```typescript
// テーブル名: CentraSensorData
{
  // キー
  PK: "DEVICE#M-X",                           // パーティションキー
  SK: "2025-01-27T12:00:00.000Z#RAW",       // ソートキー
  
  // メタデータ
  type: "RAW" | "STATS_10MIN",               // データタイプ
  deviceId: "M-X",
  timestamp: "2025-01-27T12:00:00.000Z",
  
  // 生データ（type=RAW）
  temperature?: 25.5,
  humidity?: 60.5,
  pressure?: 1013.25,
  windSpeed?: 15.5,
  windDirection?: 180,
  rainfall?: 0.0,
  illuminance?: 50000,
  visibility?: 10.0,
  feelsLike?: 24.5,
  
  // 集計データ（type=STATS_10MIN）
  stats?: {
    temperature: { max: 26.0, min: 25.0, avg: 25.5 },
    humidity: { max: 65.0, min: 60.0, avg: 62.5 },
    windSpeed: { max: 18.5, min: 12.0, avg: 15.2 },
    samples: 600
  },
  
  // TTL
  ttl: 1706360400  // RAW: 1時間後, STATS: 24時間後
}
```

## 4. 機能要件

### 4.1 リアルタイムデータ表示
- **FR-001**: 最新のセンサーデータをリアルタイムで表示
- **FR-002**: データ更新頻度は1Hz（1秒ごと）
- **FR-003**: WebSocketによる自動更新（ポーリング不要）

### 4.2 履歴データ表示
- **FR-004**: 過去1時間の生データをグラフ表示
- **FR-005**: ページリロード後もデータを維持
- **FR-006**: 時系列グラフ（温度、湿度、風速など）

### 4.3 統計情報
- **FR-007**: 過去1時間の最大瞬間風速を表示
- **FR-008**: 10分ごとの平均値を表示
- **FR-009**: 各項目の最大・最小・平均値を表示

### 4.4 ユーザーインターフェース
- **FR-010**: レスポンシブデザイン（モバイル対応）
- **FR-011**: ダークモード対応
- **FR-012**: グラフの拡大・縮小機能

## 5. 非機能要件

### 5.1 パフォーマンス
- **NFR-001**: 初期ロード時間 < 3秒
- **NFR-002**: データ更新遅延 < 100ms
- **NFR-003**: 同時接続数: 最大10クライアント

### 5.2 可用性
- **NFR-004**: サービス稼働率 99.9%以上
- **NFR-005**: 自動再接続機能（ネットワーク切断時）

### 5.3 セキュリティ
- **NFR-006**: Cognito認証必須
- **NFR-007**: HTTPSによる暗号化通信
- **NFR-008**: GraphQL Depthリミット設定

### 5.4 コスト
- **NFR-009**: 月額コスト < $10
- **NFR-010**: データ保持期間の自動管理（TTL）

## 6. GraphQL API仕様

### 6.1 スキーマ定義
```graphql
type Query {
  # 最新データ取得
  getCurrentSensorData(deviceId: ID!): SensorData
  
  # 履歴データ取得（最大1時間）
  getRecentSensorData(
    deviceId: ID!
    minutes: Int = 60
  ): [SensorData!]!
  
  # 統計データ取得
  getSensorStats(
    deviceId: ID!
    period: StatsPeriod = HOUR
  ): SensorStats
}

type Mutation {
  # センサーデータ処理（Lambda専用）
  processSensorData(input: SensorDataInput!): ProcessResult!
}

type Subscription {
  # リアルタイムデータ購読
  onSensorDataUpdate(deviceId: ID!): SensorData!
}

type SensorData {
  deviceId: ID!
  timestamp: String!
  temperature: Float
  humidity: Float
  pressure: Float
  windSpeed: Float
  windDirection: Float
  rainfall: Float
  illuminance: Float
  visibility: Float
  feelsLike: Float
}

type SensorStats {
  deviceId: ID!
  period: String!
  startTime: String!
  endTime: String!
  temperature: StatsValues
  humidity: StatsValues
  windSpeed: StatsValues
  samples: Int!
}

type StatsValues {
  max: Float!
  min: Float!
  avg: Float!
}

enum StatsPeriod {
  HOUR
  DAY
}

input SensorDataInput {
  deviceId: ID!
  timestamp: String!
  temperature: Float
  humidity: Float
  pressure: Float
  windSpeed: Float
  windDirection: Float
  rainfall: Float
  illuminance: Float
  visibility: Float
  feelsLike: Float
}

type ProcessResult {
  success: Boolean!
  timestamp: String!
}
```

## 7. 実装優先順位

### Phase 1（必須）
1. AppSync API構築
2. DynamoDBテーブル作成
3. Lambda関数実装（データ保存・配信）
4. 基本的なReactコンポーネント

### Phase 2（推奨）
1. グラフ表示機能
2. 統計情報計算
3. エラーハンドリング強化

### Phase 3（オプション）
1. 複数デバイス対応
2. アラート機能
3. データエクスポート

## 8. 成功基準
- リアルタイムデータが1秒以内に画面反映される
- リロード後も過去1時間のデータが表示される
- 月額コストが$10以下である
- 既存のCentra機能が正常に動作する

## 9. 移行計画

### 9.1 削除対象
- `/src/services/amplifyIotService.ts`
- `/src/services/sensorApi.ts`
- `/src/components/WeatherStationCard.tsx`
- `/src/components/WeatherStationList.tsx`
- `/src/components/WeatherDashboard.tsx`
- `/src/pages/Weather.tsx`

### 9.2 新規作成
- `/src/services/weatherApi.ts` (AppSyncクライアント)
- `/src/components/weather/*` (新Weatherコンポーネント群)
- `/src/pages/Weather.tsx` (新実装)

### 9.3 保持対象
- 認証システム（AuthContextV2）
- 他のページ機能（Flights, Plan等）
- 既存のAPI Gateway設定（センサー管理用）