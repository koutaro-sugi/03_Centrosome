# Amplify Gen2 AWS IoT Core統合ガイド

## 概要

このガイドでは、Amplify Gen2を使用してAWS IoT Coreに接続するための設定について説明します。

## 設定内容

### 1. Backend設定（amplify/backend.ts）

以下の設定が追加されています：

- **IAMポリシー**: Cognito認証されたユーザーがIoT Coreにアクセスできるようにポリシーを設定
- **IoTリソース**: Thing Type、Policy、DynamoDB連携用のIoT Ruleを作成
- **環境変数**: IoT Coreエンドポイントと設定情報を出力

### 2. IoTリソース（amplify/backend/iot/resource.ts）

以下のリソースが定義されています：

- **CentraIoTPolicy**: デバイスがIoT Coreに接続するためのポリシー
- **MadoSensorThingType**: センサーデバイス用のThing Type
- **IoTToDynamoDBRole**: IoT RuleがDynamoDBにアクセスするためのIAMロール
- **MadoSensorDataToDynamoDB**: センサーデータをDynamoDBに保存するIoT Rule

### 3. フロントエンド統合（src/services/awsIotService.ts）

AWS IoT Device SDK v2を使用した接続実装：

- Cognito認証を使用したWebSocket接続
- 自動的なフォールバック（モックデータ）機能
- トピックのサブスクリプション管理

## 使用方法

### 1. デプロイ

```bash
npx amplify sandbox
# または本番環境へのデプロイ
npx amplify deploy
```

### 2. フロントエンドでの使用

```typescript
import { awsIotService } from './services/awsIotService';

// 接続
await awsIotService.connect();

// デバイスデータのサブスクライブ
await awsIotService.subscribe('mado-sensor-01', (data) => {
  console.log('Received sensor data:', data);
});

// サブスクリプション解除
await awsIotService.unsubscribe('mado-sensor-01');

// 切断
await awsIotService.disconnect();
```

## トピック構造

- センサーデータ: `dt/mado/{deviceId}/data`
- Thing Shadow: `$aws/things/{thingName}/shadow/*`

## セキュリティ

- Cognito認証されたユーザーのみがIoT Coreにアクセス可能
- クライアントIDにCognito Identity IDを使用
- 各ユーザーは自身のクライアントIDでのみ接続可能

## トラブルシューティング

### 接続エラー

1. Amplifyの設定が正しく読み込まれているか確認
2. Cognito認証が完了しているか確認
3. ブラウザコンソールでエラーメッセージを確認

### データが受信できない

1. デバイスが正しいトピックにパブリッシュしているか確認
2. IoT Coreコンソールでメッセージをモニタリング
3. IoT Ruleが正しく動作しているか確認

## 次のステップ

1. 実デバイスの接続テスト
2. DynamoDBテーブルの作成とデータ確認
3. リアルタイムダッシュボードの実装