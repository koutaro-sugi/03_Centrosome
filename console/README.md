# KVS WebRTC Viewer V1

Amazon Kinesis Video Streams (KVS) WebRTCを使用したリアルタイム映像ストリーミング視聴アプリケーションです。UAV（ドローン）カメラからの映像を複数同時に監視できるダッシュボードインターフェースを提供します。

## 🎯 主な機能

### 映像ストリーミング

- **リアルタイム映像視聴**: Amazon KVS WebRTCによる低遅延映像ストリーミング
- **複数チャンネル対応**: FPVカメラとペイロードカメラの同時視聴
- **自動再接続**: 接続エラー時の自動復旧機能

### ダッシュボード

- **ドラッグ&ドロップ**: React Grid Layoutによる自由なウィジェット配置
- **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
- **レイアウト保存**: localStorage による配置状態の永続化

### 認証システム

- **AWS Amplify認証**: セキュアなユーザー認証
- **メール認証**: email/password認証方式
- **自動ログイン維持**: セッション管理機能

### 監視機能

- **接続状態表示**: リアルタイム接続ステータス監視
- **ログ表示**: 接続ログとエラーログの表示
- **ビットレート監視**: ストリーミング品質の表示

## 🏗️ 技術仕様

### フロントエンド

- **React 18** + TypeScript
- **Material-UI (MUI)** - Notion風デザイン
- **Vite 5** - 高速ビルドツール
- **React Grid Layout** - ドラッグ可能ダッシュボード

### バックエンド・インフラ

- **AWS Amplify Gen2** - フルスタック開発プラットフォーム
- **Amazon Cognito** - ユーザー認証
- **Amazon Kinesis Video Streams** - 映像ストリーミング
- **AWS IAM** - KVS権限管理

### 開発ツール

- **TypeScript** - 型安全性
- **ESModules** - モダンJavaScript
- **Hot Reload** - 開発効率化

## 📁 プロジェクト構造

```
minimal-viewer/
├── amplify/                    # AWS Amplify設定
│   ├── auth/resource.ts       # 認証リソース定義
│   └── backend.ts             # バックエンド設定
├── src/
│   ├── components/            # Reactコンポーネント
│   │   ├── AuthComponent.tsx  # 認証UI
│   │   ├── DraggableDashboard.tsx  # ダッシュボード
│   │   ├── VideoViewerWidget.tsx   # 映像表示
│   │   └── LogsWidget.tsx     # ログ表示
│   ├── utils/                 # ユーティリティ
│   └── App.tsx               # メインアプリ
├── public/                    # WebRTC関連JS（レガシー）
│   ├── viewer.js             # WebRTC接続ロジック
│   └── kvs-webrtc.js         # KVS SDK ラッパー
└── amplify_outputs.json      # AWS リソース情報
```

## 🚀 ローカル開発環境セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn
- AWS アカウント
- Git

### 1. リポジトリのクローン

```bash
git clone <このリポジトリのURL>
cd web-viewer/minimal-viewer
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. AWS Amplify CLIのセットアップ

```bash
# Amplify CLIをグローバルインストール（初回のみ）
npm install -g @aws-amplify/cli

# AWS認証情報を設定（初回のみ）
amplify configure
```

### 4. バックエンドリソースのデプロイ

```bash
# 初回デプロイ
amplify push

# またはサンドボックス環境でのテスト
npx ampx sandbox
```

### 5. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成：

```bash
# KVSチャンネル名（実際の値に変更）
VITE_KVS_CHANNEL_NAME_FPV=your-fpv-channel-name
VITE_KVS_CHANNEL_NAME_PAYLOAD=your-payload-channel-name

# AWS設定（Amplifyが自動設定する場合は不要）
VITE_AWS_REGION=ap-northeast-1
```

### 6. 開発サーバーの起動

```bash
# 開発サーバー起動（ポート3000）
npm start

# または Vite デフォルトポート（5173）
npm run dev
```

### 7. ブラウザでアクセス

```
http://localhost:3000
```

## 🔧 本番環境用ビルド

### ビルド実行

```bash
npm run build
```

### ビルド結果の確認

```bash
npm run preview
```

### デプロイ

Amplify Hostingにて自動デプロイまたは手動デプロイ

## 🎮 使用方法

### 1. ユーザー登録・ログイン

- アプリにアクセスしてメールアドレスでアカウント作成
- 確認メールからアカウントを有効化
- ログイン画面からサインイン

### 2. 映像ストリーミングの開始

- ダッシュボードで「接続開始」ボタンをクリック
- FPV・ペイロードチャンネルが自動接続
- 映像が表示されるまで数秒お待ちください

### 3. ダッシュボードの操作

- ウィジェットをドラッグして配置変更
- 右下のハンドルで サイズ変更
- レイアウトは自動保存されます

### 4. ログ・監視

- 接続ログでストリーミング状態を確認
- ビットレート情報で通信品質をチェック

## 🔧 トラブルシューティング

### 映像が表示されない場合

1. KVSチャンネルが作成・起動されているか確認
2. AWS認証情報が正しく設定されているか確認
3. ブラウザの開発者ツールでエラーログを確認

### 認証エラーの場合

1. `amplify_outputs.json` が最新か確認
2. `amplify push` でバックエンドを再デプロイ
3. ブラウザのキャッシュをクリア

### ビルドエラーの場合

1. Node.js バージョンを確認（18以上推奨）
2. `node_modules` を削除して再インストール
3. TypeScript エラーを確認・修正

## 📝 開発メモ

### 重要なファイル

- `public/viewer.js`: WebRTC接続のコアロジック（レガシーJS）
- `src/components/VideoViewerWidget.tsx`: React映像表示コンポーネント
- `amplify/backend.ts`: AWS リソース定義
- `src/App.tsx`: ダッシュボードレイアウト設定

### カスタマイズポイント

- チャンネル名の変更: 環境変数 `VITE_KVS_CHANNEL_NAME_*`
- レイアウト設定: `App.tsx` の `layouts` オブジェクト
- デザインテーマ: `App.tsx` の MUI `theme` オブジェクト

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

Issues や Pull Requests を歓迎します。
