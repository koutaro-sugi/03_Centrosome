# 03_Centra 実装解析ドキュメント

**プロジェクト名:** 03_Centra - UAV統合監視システム  
**更新日:** 2025-01-27  
**対象LLM:** 他のLLMが引き継げるよう詳細に記載

## 📋 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システム構成](#2-システム構成)
3. [技術スタック](#3-技術スタック)
4. [主要機能詳細](#4-主要機能詳細)
5. [データモデル](#5-データモデル)
6. [認証・セキュリティ](#6-認証セキュリティ)
7. [Google Sheets連携](#7-google-sheets連携)
8. [開発・デプロイ](#8-開発デプロイ)
9. [設定・環境変数](#9-設定環境変数)
10. [既知の制約・注意点](#10-既知の制約注意点)

## 1. プロジェクト概要

### 1.1 目的

UAV/ドローンの統合監視システムとして、飛行記録管理、Google Sheets連携、天気情報表示を統合したWebアプリケーション。

### 1.2 主要機能

- **飛行記録管理**: 機体・パイロット・飛行ログのCRUD操作
- **Google Sheets連携**: 飛行記録の自動転記（テンプレートベース）
- **天気情報表示**: リアルタイム・履歴・予報の統合表示
- **UASポート管理**: 飛行可能エリアの地理情報管理
- **認証システム**: AWS Cognitoベースのユーザー管理

### 1.3 アーキテクチャパターン

- **フロントエンド**: React + TypeScript + Material-UI
- **バックエンド**: AWS Amplify Gen2 (サーバーレス)
- **データベース**: Amazon DynamoDB
- **認証**: Amazon Cognito
- **外部連携**: Google Sheets API

## 2. システム構成

### 2.1 ディレクトリ構造

```
01_app/
├── amplify/                    # Amplify Gen2 バックエンド
│   ├── auth/                  # 認証設定
│   ├── data/                  # データモデル・GraphQL
│   ├── functions/             # Lambda関数
│   └── backend.ts             # メイン設定
├── src/                       # React フロントエンド
│   ├── components/            # 再利用可能コンポーネント
│   ├── pages/                 # ページコンポーネント
│   ├── hooks/                 # カスタムフック
│   ├── types/                 # TypeScript型定義
│   ├── lib/                   # API・ユーティリティ
│   └── contexts/              # React Context
├── scripts/                   # 開発・デプロイスクリプト
└── docs/                      # プロジェクト文書
```

### 2.2 コンポーネント構成

- **認証**: `AuthComponent`, `AuthWrapper`
- **飛行記録**: `Logbook` (メインページ)
- **天気情報**: `EnhancedWeatherDashboard`, `RealtimeWeatherCard`
- **管理画面**: `AdminPanel`, `UASPortManagement`
- **共通UI**: `Sidebar`, `LocationPicker`, `SlideToConfirm`

## 3. 技術スタック

### 3.1 フロントエンド

- **React** 18.3.1 + **TypeScript** 5.4.5
- **Material-UI** 7.2.0 (MUI)
- **React Router** 7.7.1
- **Chart.js** 4.5.0 + **react-chartjs-2** 5.3.0
- **date-fns** 4.1.0 (日付処理)

### 3.2 バックエンド・インフラ

- **AWS Amplify Gen2** 1.16.1
- **AWS CDK** 2.212.0
- **Amazon Cognito** (認証)
- **Amazon DynamoDB** (データベース)
- **AWS Lambda** (サーバーレス関数)

### 3.3 開発・テスト

- **Vite** (ビルドツール)
- **ESLint** + **Prettier** (コード品質)
- **Jest** + **React Testing Library** (テスト)
- **Cypress** 14.5.3 (E2Eテスト)

### 3.4 外部連携

- **Google Sheets API** (googleapis 140.0.1)
- **Google Drive API**
- **AWS IoT** (将来実装予定)

## 4. 主要機能詳細

### 4.1 飛行記録管理 (Logbook)

#### 4.1.1 機能概要

飛行前点検から記録終了まで、包括的な飛行ログ管理システム。

#### 4.1.2 画面フロー

1. **初期画面**: 機体・パイロット選択、点検項目確認
2. **点検画面**: 8項目の点検チェックリスト
3. **飛行画面**: リアルタイム記録、位置情報管理
4. **記録終了**: データ保存、Google Sheets同期

#### 4.1.3 データ保存

- **DynamoDB**: 飛行記録の永続化
- **Google Sheets**: テンプレートベースの自動転記
- **非同期処理**: UIブロックなしの即座遷移

#### 4.1.4 点検項目

```typescript
const INSPECTION_ITEMS = [
  { id: "general", title: "機体全般", subtitle: "機器の取り付け状態" },
  { id: "propeller", title: "プロペラ", subtitle: "外観、損傷、ゆがみ" },
  { id: "frame", title: "フレーム", subtitle: "外観、損傷、ゆがみ" },
  { id: "communication", title: "通信系統", subtitle: "通信品質の健全性" },
  { id: "propulsion", title: "推進系統", subtitle: "モーター・発動機の健全性" },
  { id: "power", title: "電源系統", subtitle: "電源の健全性" },
  { id: "control", title: "自動制御系統", subtitle: "飛行制御装置の健全性" },
  {
    id: "controller",
    title: "操縦装置",
    subtitle: "スティック・スイッチの健全性",
  },
  {
    id: "battery",
    title: "バッテリー・燃料",
    subtitle: "充電状況・残燃料表示",
  },
];
```

### 4.2 Google Sheets連携

#### 4.2.1 連携フロー

1. **テンプレート複製**: `00_Template`シートをベースに新規ブック作成
2. **データ転記**: 飛行記録を指定セルに自動挿入
3. **シート管理**: 日付別シートの自動作成・管理
4. **フォルダ管理**: 親フォルダIDによる作成先制御

#### 4.2.2 テンプレート仕様

- **B2**: 機体登録記号（固定）
- **B5-19**: 飛行記録行（日付、パイロット、目的、離着陸地、時間、安全事項）
- **O-P列**: 飛行時間（数式自動計算）

#### 4.2.3 セキュリティ

- **SSM Parameter Store**: Google認証情報の安全な管理
- **IAM制限**: 最小権限原則
- **環境変数**: ハードコード禁止

### 4.3 天気情報表示

#### 4.3.1 コンポーネント構成

- **RealtimeWeatherCard**: リアルタイム気象データ
- **WeatherHistoryChart**: 時系列グラフ表示
- **WeatherStatsPanel**: 統計情報パネル
- **ForecastPanel**: 天気予報表示

#### 4.3.2 データソース

- **センサーデータ**: MadoOS統合センサー
- **外部API**: Windy API連携
- **キャッシュ**: ローカルストレージ活用

### 4.4 UASポート管理

#### 4.4.1 機能概要

飛行可能エリアの地理情報管理と飛行計画支援。

#### 4.4.2 データ構造

```typescript
interface UASPort {
  uaport_code: string; // ポートコード
  common_name: string; // 通称名
  full_address: string; // 完全住所
  location: { lat: number; lon: number }; // 座標
  polygon: number[][]; // 飛行可能エリア
  status: "ACTIVE" | "INACTIVE";
}
```

## 5. データモデル

### 5.1 GraphQLスキーマ (Amplify Gen2)

#### 5.1.1 主要モデル

```typescript
// 機体情報
Aircraft: {
  userId: string;           // ユーザーID
  aircraftId: string;       // 機体ID
  name: string;             // 機体名
  registrationNumber: string; // 登録記号
  manufacturer: string;     // 製造者
  model: string;            // モデル
  serialNumber: string;     // シリアル番号
  weight: number;           // 重量
  maxWeight: number;        // 最大重量
  active: boolean;          // アクティブ状態
}

// パイロット情報
Pilot: {
  userId: string;           // ユーザーID
  pilotId: string;          // パイロットID
  name: string;             // 氏名
  licenseNumber: string;    // ライセンス番号
  email: string;            // メールアドレス
  phone: string;            // 電話番号
  active: boolean;          // アクティブ状態
}

// 飛行記録
FlightLog: {
  userId: string;           // ユーザーID
  flightLogId: string;      // 飛行記録ID
  aircraftId: string;       // 機体ID
  pilotId: string;          // パイロットID
  date: Date;               // 飛行日
  takeoffTime: Date;        // 離陸時刻
  landingTime: Date;        // 着陸時刻
  flightDuration: number;   // 飛行時間（分）
  takeoffLocationId: string; // 離陸地点ID
  landingLocationId: string; // 着陸地点ID
  purpose: string;          // 飛行目的
  weatherConditions: string; // 天候条件
  incidentReport: string;   // インシデント報告
}

// 飛行地点
FlightLocation: {
  userId: string;           // ユーザーID
  locationId: string;       // 地点ID
  name: string;             // 地点名
  address: string;          // 住所
  lat: number;              // 緯度
  lon: number;              // 経度
  tags: string[];           // タグ
  usageCount: number;       // 使用回数
  active: boolean;          // アクティブ状態
}

// センサーデータ
CentraSensorData: {
  PK: string;               // パーティションキー: DEVICE#{deviceId}
  SK: string;               // ソートキー: {timestamp}#{type}
  type: 'RAW' | 'STATS_10MIN'; // データタイプ
  deviceId: string;         // デバイスID
  timestamp: string;        // タイムスタンプ
  ttl: number;              // TTL（RAW: 1時間、STATS: 24時間）

  // 生データフィールド
  temperature: number;       // 温度（℃）
  humidity: number;         // 湿度（%）
  pressure: number;         // 気圧（hPa）
  windSpeed: number;        // 風速（m/s）
  windDirection: number;    // 風向（度）
  rainfall: number;         // 降水量（mm）
  illuminance: number;      // 照度（lux）
  visibility: number;       // 視程（km）
  feelsLike: number;        // 体感温度（℃）

  // 統計データフィールド（type=STATS_10MIN）
  temperatureMax: number;   // 最高温度
  temperatureMin: number;   // 最低温度
  temperatureAvg: number;   // 平均温度
  // ... 他の統計フィールド
}
```

#### 5.1.2 インデックス設計

```typescript
// GSI1: デバイスIDとタイムスタンプでのクエリ
index("deviceId").sortKeys(["timestamp"]).queryField("listByDeviceAndTime");

// GSI2: デバイスIDとタイプでのクエリ
index("deviceId").sortKeys(["type"]).queryField("listByDeviceAndType");
```

### 5.2 DynamoDB設計

#### 5.2.1 テーブル構成

- **メインテーブル**: `CentraData` (単一テーブル設計)
- **UASログブックマッピング**: `UASLogbookSheets` (機体別スプレッドシートID管理)

#### 5.2.2 パーティション戦略

- **PK**: エンティティタイプ + ID
- **SK**: タイムスタンプ + データタイプ
- **TTL**: データ保持期間制御

## 6. 認証・セキュリティ

### 6.1 認証システム

#### 6.1.1 Cognito設定

```typescript
export const auth = defineAuth({
  loginWith: {
    email: true, // メールアドレス認証
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
  },
});
```

#### 6.1.2 認証フロー

1. **サインアップ**: メールアドレス + パスワード
2. **サインイン**: 認証情報によるログイン
3. **セッション管理**: JWTトークンによる状態維持
4. **アクセス制御**: 認証済みユーザーのみアクセス可能

### 6.2 セキュリティ設定

#### 6.2.1 IAM権限

```typescript
// Lambda関数の権限設定
backend.logbookToSheets.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ],
    resources: [uasLogbookSheetsTable.tableArn],
  })
);

// SSM Parameter Store アクセス権限
backend.logbookToSheets.resources.lambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ],
    resources: [`arn:aws:ssm:${region}:${accountId}:parameter/shared/google/*`],
  })
);
```

#### 6.2.2 環境変数管理

- **ハードコード禁止**: 全ての機密情報は環境変数経由
- **SSM統合**: Google認証情報の安全な管理
- **環境別設定**: 開発・ステージング・本番の分離

## 7. Google Sheets連携

### 7.1 Lambda関数実装

#### 7.1.1 関数概要

- **名前**: `logbook-to-sheets`
- **ランタイム**: Node.js 20
- **タイムアウト**: 60秒
- **メモリ**: 512MB

#### 7.1.2 主要処理

1. **テンプレート複製**: Google Drive APIでテンプレートをコピー
2. **シート管理**: 日付別シートの自動作成・管理
3. **データ転記**: 飛行記録の指定セルへの挿入
4. **マッピング管理**: DynamoDBでのスプレッドシートID管理

#### 7.1.3 フォルダ管理戦略

```typescript
// フォルダ分岐ロジック:
// - フロントエンド指定時: PARENT_DRIVE_FOLDER_ID 直下（本番用）
// - 未指定時: DRIVE_FOLDER_ID（テスト用サブフォルダ）
const targetFolderId = parentFolderIdOverride
  ? process.env.PARENT_DRIVE_FOLDER_ID // フロントエンド: 本番用親フォルダ直下
  : process.env.DRIVE_FOLDER_ID; // CLI/テスト: テスト用サブフォルダ

// フロントエンドからの指定
const parentFolderIdOverride: string | undefined = body.folderId || undefined;
```

### 7.2 テンプレート仕様

#### 7.2.1 シート構造

- **00_Template**: マスターシート（編集禁止）
- **飛行記録\_YYYYMMDD~**: 日付別シート（自動作成）

#### 7.2.2 データマッピング

```typescript
// セル位置とデータの対応
const dataMapping = [
  { range: `${tabName}!G2`, values: [[registrationNumber]] }, // 機体登録記号
  { range: `${tabName}!B${nextRow}`, values: [[row.date]] }, // 飛行日
  { range: `${tabName}!D${nextRow}`, values: [[row.pilotName]] }, // パイロット名
  { range: `${tabName}!G${nextRow}`, values: [[row.summary]] }, // 飛行概要
  { range: `${tabName}!H${nextRow}`, values: [[row.from]] }, // 離陸地
  { range: `${tabName}!I${nextRow}`, values: [[row.to]] }, // 着陸地
  { range: `${tabName}!L${nextRow}`, values: [[row.off]] }, // 離陸時刻
  { range: `${tabName}!M${nextRow}`, values: [[row.on]] }, // 着陸時刻
  { range: `${tabName}!Q${nextRow}`, values: [[row.safety]] }, // 安全事項
];
```

### 7.3 セキュリティ・認証

#### 7.3.1 Google認証情報管理

```typescript
// SSM Parameter Store からの認証情報取得
const ssmGoogleCredentialsPath =
  process.env.SSM_GOOGLE_CREDENTIALS_PATH || "/shared/google/sa-json";

// Amplify runtime shim による SSM 統合
const amplifySsmEnvConfig = JSON.stringify({
  GOOGLE_CREDENTIALS_JSON: {
    path: ssmGoogleCredentialsPath,
    sharedPath: ssmGoogleCredentialsPath,
  },
});
```

#### 7.3.2 スコープ設定

```typescript
const scopes = [
  "https://www.googleapis.com/auth/spreadsheets", // Sheets API
  "https://www.googleapis.com/auth/drive", // Drive API
];
```

## 8. 開発・デプロイ

### 8.1 開発ワークフロー

#### 8.1.1 開発コマンド

```bash
# 開発サーバー起動
npm run start                    # React開発サーバー
npm run dev:sync                # バックエンド同期
npm run dev:sync:restart        # バックエンド同期 + フロント再起動

# テスト実行
npm run test                    # 単体テスト
npm run test:integration        # 統合テスト
npm run test:coverage           # カバレッジ測定
npm run cypress:open           # E2Eテスト

# コード品質
npm run lint                    # ESLint実行
npm run lint:fix                # 自動修正
npm run typecheck               # TypeScript型チェック
```

#### 8.1.2 開発スクリプト (dev-workflow.fish)

```fish
# 開発フロー自動化
function dev_workflow
  # 環境変数読み込み
  source "$APP_DIR/.env.fish"

  # バックエンドデプロイ
  npx ampx sandbox --once

  # 出力ファイル同期
  cp "$APP_DIR/amplify_outputs.json" "$APP_DIR/public/"

  # フロントエンド再起動（オプション）
  if test "$argv[1]" = "--restart"
    pkill -f "react-scripts start"
    npm run start &
  end
end
```

### 8.2 デプロイプロセス

#### 8.2.1 Amplify Gen2 サンドボックス

```bash
# ローカル開発環境
npx ampx sandbox --once

# 出力ファイル生成
# - amplify_outputs.json: バックエンドリソース情報
# - public/amplify_outputs.json: フロントエンド用
```

#### 8.2.2 本番デプロイ

```bash
# 本番環境へのデプロイ
npx ampx push

# 環境別設定
npm run build:staging          # ステージング用ビルド
npm run build:production       # 本番用ビルド
```

### 8.3 CI/CD設定

#### 8.3.1 GitHub Actions

- **自動テスト**: プルリクエスト時のテスト実行
- **ビルド検証**: TypeScript型チェック・ESLint実行
- **デプロイ**: mainブランチマージ時の自動デプロイ

#### 8.3.2 品質ゲート

```bash
# コミット前チェック
npm run precommit              # lint + typecheck + test
```

## 9. 設定・環境変数

### 9.1 必須環境変数

#### 9.1.1 ローカル開発 (.env.fish)

```fish
# Google Sheets設定
set -x SHEETS_TEMPLATE_ID "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
set -x DRIVE_FOLDER_ID "1j7rb2pCJ9jvSbfgGLPY2QM_TF2r8ynkI"
set -x PARENT_DRIVE_FOLDER_ID "0AA9zD0nHvNXhUk9PVA"

# Google認証情報（SSM使用時は不要）
set -x GOOGLE_CREDENTIALS_JSON "{}"

# 共有設定
set -x SHARE_WITH_EMAILS "user@example.com"

# SSM設定
set -x SSM_GOOGLE_CREDENTIALS_PATH "/shared/google/sa-json"
```

#### 9.1.2 バックエンド環境変数

```typescript
// Lambda関数の環境変数
backend.logbookToSheets.resources.lambda.addEnvironment(
  "SHEETS_TEMPLATE_ID",
  process.env.SHEETS_TEMPLATE_ID || ""
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "DRIVE_FOLDER_ID",
  process.env.DRIVE_FOLDER_ID || ""
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "UAS_LOGBOOK_TABLE",
  uasLogbookSheetsTable.tableName
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "AIRCRAFT_TABLE",
  backend.data.resources.tables["Aircraft"].tableName
);
```

### 9.2 設定ファイル

#### 9.2.1 Amplify設定

```typescript
// backend.ts
export const backend = defineBackend({
  auth, // 認証設定
  data, // データモデル
  logbookToSheets, // Lambda関数
});

// カスタム出力
backend.addOutput({
  custom: {
    awsRegion: { value: region, description: "AWS Region" },
    logbookToSheetsUrl: functionUrl.url,
    parentFolderId: {
      value: process.env.PARENT_DRIVE_FOLDER_ID || "",
      description:
        "Google Drive parent folder ID for frontend-created workbooks",
    },
  },
});
```

#### 9.2.2 フロントエンド設定

```typescript
// amplifyConfig.ts
import { Amplify } from "aws-amplify";
import config from "./amplifyconfiguration";

Amplify.configure(config);
```

### 9.3 外部サービス設定

#### 9.3.1 Google Cloud Platform

- **Service Account**: サーバー間認証用
- **API有効化**: Sheets API, Drive API
- **権限設定**: 最小権限原則

#### 9.3.2 AWS設定

- **リージョン**: ap-northeast-1 (東京)
- **IAMロール**: Lambda実行ロール
- **SSM Parameter Store**: 機密情報管理

## 10. 既知の制約・注意点

### 10.1 技術的制約

#### 10.1.1 フロントエンド

- **React 18**: Strict Mode対応必須
- **TypeScript**: 厳格な型チェック
- **Material-UI**: v7系の破壊的変更対応

#### 10.1.2 バックエンド

- **Amplify Gen2**: ベータ版の制約
- **Lambda**: 60秒タイムアウト制限
- **DynamoDB**: 単一テーブル設計の複雑性

### 10.2 運用上の注意点

#### 10.2.1 Google Sheets連携

- **テンプレート変更**: コード側の対応必須
- **API制限**: クォータ管理が必要
- **エラーハンドリング**: ネットワーク障害への対応

#### 10.2.2 データ管理

- **TTL設定**: データ保持期間の適切な設定
- **バックアップ**: 重要なデータの定期バックアップ
- **監視**: CloudWatch Logsでのログ監視

### 10.3 セキュリティ考慮事項

#### 10.3.1 認証情報

- **環境変数**: ハードコードの禁止
- **SSM統合**: 機密情報の安全な管理
- **IAM最小権限**: 必要最小限の権限設定

#### 10.3.2 データ保護

- **暗号化**: 転送時・保存時の暗号化
- **アクセス制御**: 認証済みユーザーのみアクセス
- **監査ログ**: 操作履歴の記録

---

## 📞 サポート・連絡先

- **プロジェクト**: 03_Centra
- **技術スタック**: React + TypeScript + AWS Amplify Gen2
- **主要機能**: 飛行記録管理 + Google Sheets連携 + 天気情報表示
- **更新日**: 2025-01-27

---

**注意**: このドキュメントは現在の実装状況を反映しています。今後の開発により内容が変更される可能性があります。
