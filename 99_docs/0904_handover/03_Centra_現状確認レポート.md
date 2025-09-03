# 03_Centra 現状確認総合レポート

## Table of Contents
1. [プロジェクト概要](#プロジェクト概要)
2. [アーキテクチャ全体像](#アーキテクチャ全体像)
3. [Weatherページの要件と実装状況](#weatherページの要件と実装状況)
4. [Madoセンサー統合システム](#madoセンサー統合システム)
5. [AWS実装状況詳細](#aws実装状況詳細)
6. [ディレクトリ構造とファイル構成](#ディレクトリ構造とファイル構成)
7. [重要な技術仕様](#重要な技術仕様)
8. [課題と改善点](#課題と改善点)
9. [次のLLMエージェントへの引き継ぎ事項](#次のllmエージェントへの引き継ぎ事項)

---

## プロジェクト概要

### 基本情報
- **プロジェクト名**: Centra (セントラ)
- **種別**: ドローン運航管理システム（Web Application）
- **メイン機能**: 
  - リアルタイム気象データ監視
  - フライトプラン管理
  - ドローンテレメトリ表示
  - Madoセンサー連携による環境モニタリング

### 技術スタック
- **Frontend**: React + TypeScript + Material-UI + Tailwind CSS
- **Backend**: AWS Amplify Gen 2
- **Database**: Amazon DynamoDB
- **IoT**: AWS IoT Core (MQTT over WebSocket)
- **Real-time**: AWS AppSync (GraphQL Subscriptions)
- **Authentication**: Amazon Cognito
- **Weather API**: OpenWeatherMap + 自社IoTセンサー

---

## アーキテクチャ全体像

### データフロー構成
```
[XF700A気象センサー] → [Raspberry Pi] → [AWS IoT Core] 
                                              ↓
[React Dashboard] ← [AppSync GraphQL] ← [Lambda Function] → [DynamoDB]
                                              ↓
                                     [Cognito認証]
```

### システム統合図
1. **Madoセンサー系統**: XF700A → RS485/ModbusRTU → Raspberry Pi → MQTT → AWS IoT Core
2. **データ処理系統**: IoT Rule → Lambda → DynamoDB → AppSync → React
3. **認証系統**: Cognito User Pools → AppSync → React Components

---

## Weatherページの要件と実装状況

### 主要要件（WEATHER_DASHBOARD_REQUIREMENTS.mdより）

#### 機能要件
- **FR-001**: リアルタイムセンサーデータ表示（1Hz更新）
- **FR-002**: WebSocketによる自動更新
- **FR-004**: 過去1時間の履歴データグラフ表示
- **FR-007**: 統計情報（最大瞬間風速等）の表示
- **FR-010**: レスポンシブデザイン対応

#### 非機能要件
- **NFR-001**: 初期ロード < 3秒
- **NFR-002**: データ更新遅延 < 100ms
- **NFR-006**: Cognito認証必須
- **NFR-009**: 月額コスト < $10

### 実装状況
✅ **完了**:
- React Weatherページ実装済み (`src/pages/Weather.tsx`)
- リアルタイムデータカード実装済み (`RealtimeWeatherCardReal.tsx`)
- 履歴チャート実装済み (`WeatherHistoryChartMado.tsx`)
- 統計パネル実装済み (`WeatherStatsPanelMado.tsx`)
- MUI レスポンシブデザイン対応
- パフォーマンス監視機能内蔵

🚧 **進行中/課題**:
- AppSync GraphQLエンドポイント接続（環境変数設定済み）
- Cognito認証フロー統合
- リアルタイムサブスクリプション最適化

---

## Madoセンサー統合システム

### ハードウェア構成
- **センサー**: XF700A 7要素気象センサー
- **通信**: Modbus RTU over RS485
- **ゲートウェイ**: Raspberry Pi
- **データ送信**: MQTT 1Hz頻度

### データスキーマ
```json
{
  "device_id": "M-X",
  "timestamp": "2025-01-27T14:00:00Z",
  "location": {
    "name": "mado-experimental",
    "lat": 35.6762,
    "lon": 139.6503
  },
  "data": {
    "temperature": 25.3,      // ℃
    "humidity": 65.2,         // %
    "pressure": 1013.2,       // hPa
    "wind_speed": 3.5,        // m/s
    "wind_direction": 180,    // degrees
    "rain_1h": 0.0,          // mm
    "illuminance": 45.0,      // klux
    "visibility": 10.0,       // km (計算値)
    "feels_like": 24.5        // ℃ (計算値)
  }
}
```

### MQTTトピック構造
- **テレメトリ**: `mado/centra/{device_id}/telemetry`
- **ステータス**: `mado/centra/{device_id}/status`
- **コマンド**: `mado/centra/{device_id}/command`

### サービス実装
- **MadoSensorService** (`src/services/madoSensorService.ts`): 
  - AWS IoT Core WebSocket接続
  - SigV4署名による認証
  - リアルタイムデータストリーミング
  - 自動再接続機能

---

## AWS実装状況詳細

### 実装済みAWSサービス

#### 1. Amazon Cognito
```
ユーザープール:
- ap-northeast-1_yb6nSfuuE (centra-prod-user-pool)
- ap-northeast-1_5QLR2XnAb (amplifyAuthUserPool-sandbox)
- ap-northeast-1_aMDxA5TeM (amplifyAuthUserPool-sandbox)
```

#### 2. AWS AppSync
```
GraphQL API:
- dzgdre5zsncx3lckqkqgrpjro4 (sandbox環境)
- nxzaxyun7rfb7owcg7vlamobhu (sandbox環境)

エンドポイント:
- GRAPHQL: https://nip3rb2aojdl5keiho2o6rht3m.appsync-api.ap-northeast-1.amazonaws.com/graphql
- REALTIME: wss://nip3rb2aojdl5keiho2o6rht3m.appsync-realtime-api.ap-northeast-1.amazonaws.com/graphql
```

#### 3. Amazon DynamoDB
```
テーブル構成:
- CentraSensorData-dzgdre5zsncx3lckqkqgrpjro4-NONE (生データ保存)
- CentraSensorData-nxzaxyun7rfb7owcg7vlamobhu-NONE (生データ保存)
- Aircraft-*-NONE (機体情報)
- FlightLocation-*-NONE (飛行場所情報)
- FlightLog-*-NONE (フライトログ)
- UASLogbookSheets (飛行記録)
```

#### 4. AWS IoT Core
```
エンドポイント: a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com
IoT Thing: M-X (MadoWeatherStation)
属性:
- model: XF700A
- location: MadoOffice
- firmwareVersion: 1.0.0
- status: active
```

#### 5. AWS Lambda Functions
```
主要な関数:
- centra-list-sensors (センサー一覧取得)
- amplify-*-iotdataprocessorlambda* (IoTデータ処理)
- amplify-*-logbooktosheetslambda* (ログブック → Google Sheets)
```

#### 6. AWS Amplify Apps
```
アプリケーション:
- d24z2nbfk2cbx8 (centra-weather-dashboard)
- d3ncm1gumw60in (03_Centrosome - メイン)
- d1seqkee3p5yqz (03_Centrosome - バックアップ)
```

---

## ディレクトリ構造とファイル構成

### プロジェクト全体構造
```
03_Centra/
├── 01_app/                    # メインアプリケーション
│   ├── src/
│   │   ├── components/weather/ # 気象関連コンポーネント
│   │   ├── services/          # API/IoTサービス層
│   │   ├── hooks/             # カスタムフック
│   │   ├── types/             # TypeScript型定義
│   │   └── pages/             # ページコンポーネント
│   ├── amplify/               # Amplify設定
│   └── docs/                  # アプリ固有ドキュメント
├── 99_docs/                   # プロジェクトドキュメント
│   ├── Human/                 # 人間作成ドキュメント
│   ├── Robot/                 # AI作成ドキュメント
│   └── _archive/              # 過去バージョン
├── edge/                      # エッジデバイス設定
│   └── telepath/              # MAVLink/EC2設定
└── scripts/                   # 自動化スクリプト
```

### 重要なファイル
#### Weather関連実装
- `src/pages/Weather.tsx` - メインWeatherページ
- `src/components/weather/RealtimeWeatherCardReal.tsx` - リアルタイムデータ表示
- `src/components/weather/WeatherHistoryChartMado.tsx` - 履歴チャート
- `src/components/weather/WeatherStatsPanelMado.tsx` - 統計パネル

#### サービス層
- `src/services/madoSensorService.ts` - Madoセンサー接続サービス
- `src/services/weatherApi.ts` - 気象API統合
- `src/hooks/useWeatherData.ts` - 気象データフック

#### 設定ファイル
- `.env` - 環境変数（AWSエンドポイント等）
- `amplify_outputs.json` - Amplify設定出力
- `CLAUDE.md` - プロジェクト開発指針

---

## 重要な技術仕様

### データ処理フロー
1. **センサーデータ取得**: XF700A → Modbus RTU → 1Hz
2. **データ変換**: Raspberry Pi → 単位変換 (÷10処理)
3. **MQTT送信**: JSON形式 → AWS IoT Core
4. **Lambda処理**: データ検証・変換・DynamoDB保存
5. **AppSync配信**: GraphQL Subscription → React

### 認証フロー
1. **Cognito認証**: ユーザー認証
2. **IoT認証**: SigV4署名によるWebSocket接続
3. **AppSync認証**: Cognito JWT + IAM

### パフォーマンス最適化
- **クライアントサイド**: React.memo, useMemo, useCallback
- **サーバーサイド**: DynamoDB TTL, Lambda Cold Start最適化
- **ネットワーク**: WebSocket Keep-Alive, 自動再接続

---

## 課題と改善点

### 技術的課題
1. **データ単位変換**: センサーから異常な値（1000.7℃等）が送信される
   - 現在の対処: クライアント側で ÷10 変換
   - 改善案: サーバーサイド（Lambda）で正規化

2. **リアルタイム接続安定性**: WebSocket切断時の復旧
   - 現状: 自動再接続実装済み
   - 改善案: より短いハートビート間隔

3. **コスト最適化**: 複数のAmplifyアプリが並存
   - 課題: リソース重複によるコスト増
   - 改善案: 統合とクリーンアップ

### 運用課題
1. **環境管理**: .envファイルにシークレット情報
   - 改善案: AWS Systems Manager Parameter Store活用

2. **デプロイメント**: 複数の失敗したデプロイが残存
   - 改善案: CI/CDパイプライン見直し

---

## 次のLLMエージェントへの引き継ぎ事項

### 重要な環境変数
```bash
REACT_APP_AWS_REGION=ap-northeast-1
REACT_APP_IOT_ENDPOINT=a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com
REACT_APP_APPSYNC_ENDPOINT=https://vsfj6mnadvadtbx27ktem3v4z5jc6a.appsync-api.ap-northeast-1.amazonaws.com/graphql
REACT_APP_USER_POOL_ID=ap-northeast-1_yb6nSfuuE
REACT_APP_MADO_SENSOR_TABLE=CentraSensorData-nidyepulsvfwxki45wycbk5ae4-NONE
```

### 開発コマンド
```bash
# 開発サーバー起動
cd 01_app && npm start

# Amplify サンドボックス
npx ampx sandbox

# AWS情報確認
aws sts get-caller-identity
npx ampx info
```

### 認証情報
- **AWSアカウント**: 785197721624
- **IAMユーザー**: Admin
- **リージョン**: ap-northeast-1

### トラブルシューティング
1. **IoT接続エラー**: 
   - エンドポイント確認: `aws iot describe-endpoint`
   - Thing確認: `aws iot list-things`

2. **AppSync接続エラー**:
   - API ID確認: `aws appsync list-graphql-apis`
   - Cognito認証確認

3. **データ表示されない**:
   - DynamoDBテーブル確認: `aws dynamodb scan --table-name [TABLE_NAME] --limit 1`
   - Lambda ログ確認: CloudWatch Logs

### 推奨する次のアクション
1. **リアルタイムデータフローのテスト**: 実際のセンサーデータが正常に表示されるか確認
2. **認証フローの完全性確認**: Cognito → AppSync → React の流れ
3. **パフォーマンス最適化**: 不要なAmplifyアプリのクリーンアップ
4. **セキュリティ改善**: 環境変数の AWS Systems Manager 移行
5. **コスト分析**: AWS Cost Explorer でリソース使用量確認

---

## 付録：参考ドキュメント
- `01_app/docs/WEATHER_DASHBOARD_REQUIREMENTS.md` - 詳細要件定義
- `99_docs/mado-sensor-data-specification.md` - センサーデータ仕様
- `CLAUDE.md` - 開発ガイドライン
- `99_docs/Human/CORE_REQUIREMENTS.md` - プロジェクト要件

---

**作成日**: 2025年9月4日  
**作成者**: Claude Code  
**目的**: 03_Centraプロジェクトの現状確認と他のLLMエージェントへの引き継ぎ