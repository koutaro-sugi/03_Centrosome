# Amplify Gen2 デプロイ手順

## 前提条件

- Node.js 18.17.0以上
- AWS CLIがインストール済み
- AWS アカウントとAWS CLIの設定

## デプロイ手順

### 1. Amplify CLIのインストール

```bash
npm install -g @aws-amplify/backend-cli
```

### 2. Amplifyプロジェクトの初期化

```bash
npx amplify sandbox
```

このコマンドで以下が作成されます：

- Cognitoユーザープール
- IAMロール（KVSアクセス権限付き）
- 必要なAWSリソース

### 3. 本番環境へのデプロイ

```bash
npx amplify pipeline-deploy
```

### 4. フロントエンドのビルドとデプロイ

```bash
npm run build
```

ビルドされた`dist`フォルダをAmplifyホスティングにアップロード。

## 環境変数

以下の環境変数が必要です（.envファイルに設定）：

```
VITE_AWS_REGION=ap-northeast-1
VITE_KVS_CHANNEL_NAME_FPV=usb-camera-channel
VITE_KVS_CHANNEL_NAME_PAYLOAD=siyi-zr30-channel
```

## セキュリティ設定

### IAMポリシー

認証済みユーザーには以下のKVS権限が付与されます：

- kinesisvideo:GetSignalingChannelEndpoint
- kinesisvideo:GetICEServerConfig
- kinesisvideo:DescribeSignalingChannel
- kinesisvideo:ListSignalingChannels
- kinesisvideo:GetDataEndpoint
- kinesisvideo:GetHLSStreamingSessionURL
- kinesisvideo:GetDASHStreamingSessionURL
- kinesisvideo:ConnectAsViewer（特定チャンネルのみ）

### チャンネルアクセス制限

`amplify/backend.ts`で特定のチャンネルのみアクセス可能に設定：

- usb-camera-channel
- siyi-zr30-channel

## ユーザー管理

### 新規ユーザー登録

1. アプリケーションにアクセス
2. 「アカウントをお持ちでない方はこちら」をクリック
3. メールアドレスとパスワードを入力
4. 確認コードをメールで受信
5. 確認コードを入力して登録完了

### パスワード要件

- 8文字以上
- 大文字・小文字を含む
- 数字を含む
- 記号を含む

## トラブルシューティング

### amplify_outputs.jsonが見つからない

```bash
npx amplify sandbox
```

を実行して、`amplify_outputs.json`を生成してください。

### 認証エラー

1. Cognitoユーザープールが正しく作成されているか確認
2. IAMロールの権限を確認
3. KVSチャンネル名が正しいか確認
