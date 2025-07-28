# DynamoDBテーブル設計実装概要

## 実装完了内容

### 1. CentraSensorDataテーブル設計

設計書に基づく単一テーブル設計を実装しました：

- **テーブル名**: CentraSensorData
- **パーティションキー (PK)**: `DEVICE#{deviceId}` 形式
- **ソートキー (SK)**: `{timestamp}#{type}` 形式
- **TTL設定**: 
  - RAWデータ: 1時間（3600秒）
  - 統計データ: 24時間（86400秒）

### 2. Amplify Gen2スキーマ定義

`01_app/amplify/data/resource.ts`にて以下を実装：

- CentraSensorDataモデルの定義
- 生データフィールド（温度、湿度、気圧、風速等）
- 統計データフィールド（各要素のMax/Min/Avg値）
- Global Secondary Index (GSI) 設定

### 3. CDK設定

`01_app/amplify/backend.ts`および`01_app/amplify/backend/dynamodb/resource.ts`にて：

- TTL属性の設定
- Point-in-time recovery有効化
- 削除保護設定
- CloudWatchアラーム設定

### 4. TypeScript型定義

`01_app/src/types/weather.ts`を更新：

- DynamoDBWeatherRecord型の詳細定義
- TTLConfig型の追加
- DynamoDBKeyUtils型の追加

### 5. ユーティリティ関数

`01_app/src/utils/dynamodbUtils.ts`を作成：

- `generatePK()`: パーティションキー生成
- `generateSK()`: ソートキー生成
- `calculateTTL()`: TTL値計算
- `generateBaseRecord()`: 基本レコード生成
- `generateGSIKeys()`: GSIクエリキー生成
- `generateTimeRangeKeys()`: 時間範囲クエリキー生成

### 6. テスト実装

以下のテストファイルを作成・更新：

- `01_app/src/types/__test__/weather.test.ts`: 型定義テスト
- `01_app/src/utils/__test__/dynamodbUtils.test.ts`: ユーティリティ関数テスト

### 7. GraphQLスキーマドキュメント

`01_app/amplify/data/schema.graphql`を更新：

- 統合テーブル設計の仕様文書化
- クエリ例の追加
- GSI使用方法の説明

## データ構造例

### RAWデータレコード
```json
{
  "PK": "DEVICE#M-X-001",
  "SK": "2025-01-27T12:00:00.000Z#RAW",
  "type": "RAW",
  "deviceId": "M-X-001",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "ttl": 1706356800,
  "temperature": 25.5,
  "humidity": 60,
  "windSpeed": 5.2
}
```

### 統計データレコード
```json
{
  "PK": "DEVICE#M-X-001",
  "SK": "2025-01-27T12:00:00.000Z#STATS_10MIN",
  "type": "STATS_10MIN",
  "deviceId": "M-X-001",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "ttl": 1706443200,
  "temperatureMax": 30,
  "temperatureMin": 20,
  "temperatureAvg": 25,
  "samples": 60,
  "period": "HOUR"
}
```

## 要件対応状況

- ✅ **要件7.2**: DynamoDBテーブル設計完了
- ✅ **要件6.5**: TTL設定による自動データ削除実装
- ✅ パーティションキー（PK）とソートキー（SK）の設計実装
- ✅ GSI（Global Secondary Index）設定
- ✅ 単体テスト実装とテスト通過確認

## 次のステップ

このテーブル設計を基に、次のタスクでは：

1. IoTデータ処理Lambda関数の実装
2. 統計データ計算機能の実装
3. Weather API Serviceの実装

が可能になります。