# 03_Centrosome - UAV統合監視システム

**Centrosome**は、ドローン/UAVの統合監視・制御を行うWebベースのコンソールアプリケーションです。映像配信、テレメトリデータ表示、ジンバル制御を統合した次世代プラットフォームを提供します。

## 📋 Table of Contents

- [🎯 プロジェクト概要](#-プロジェクト概要)
- [🏗️ システム構成](#️-システム構成)
- [🚀 クイックスタート](#-クイックスタート)
- [📁 ディレクトリ構造](#-ディレクトリ構造)
- [🛠️ 開発環境](#️-開発環境)
- [📖 技術文書](#-技術文書)

## 🎯 プロジェクト概要

### 主要機能
- **🎥 リアルタイム映像配信**: AWS KVS WebRTCによる低遅延配信
- **📊 テレメトリ表示**: MAVLinkデータのリアルタイム監視
- **🎮 ジンバル制御**: パン・チルト角度のリモート操作
- **📱 ダッシュボード**: ドラッグ&ドロップ対応のカスタマイズ可能UI
- **🔐 セキュア認証**: AWS Cognitoベースの認証システム

### 技術スタック
- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: AWS Amplify Gen2 + Cognito + KVS
- **Edge**: Raspberry Pi 5 + MAVLink + GStreamer
- **Build**: Vite 5 + ESLint + Prettier

## 🏗️ システム構成

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   UAV/Drone     │───▶│ Raspberry Pi 5   │───▶│  AWS Cloud      │
│ - カメラ        │    │ - エッジ処理     │    │ - KVS WebRTC    │
│ - MAVLink       │    │ - 映像配信       │    │ - Cognito Auth  │
│ - ジンバル      │    │ - テレメトリ転送 │    │ - Amplify Gen2  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Centrosome      │
                                               │ Web Console     │
                                               │ - React/TS      │
                                               │ - Material-UI   │
                                               │ - Grid Layout   │
                                               └─────────────────┘
```

## 🚀 クイックスタート

### 前提条件
- Node.js ≥20.0.0
- npm ≥9.0.0
- AWSアカウント（KVS・Cognito利用可能）

### 開発サーバー起動

```bash
# リポジトリクローン
cd /Users/koutarosugi/Developer/03_Centrosome

# Webコンソール開発
cd console
npm install
npm run dev     # http://localhost:5173

# シミュレーター起動（別ターミナル）
cd ../simulator
npm install
npm run dev     # http://localhost:3001
```

### プロダクションビルド

```bash
cd console
npm run build   # TypeScript check + Vite build
npm run preview # プレビューサーバー起動
```

## 📁 ディレクトリ構造

```
03_Centrosome/
├── README.md                    # プロジェクト概要（本ファイル）
├── CORE_REQUIREMENTS.md         # コア機能要件定義
├── CLAUDE.md                    # Claude用プロジェクト設定
├── console/                     # Webコンソールアプリケーション
│   ├── src/
│   │   ├── components/          # Reactコンポーネント
│   │   ├── hooks/              # カスタムフック
│   │   ├── utils/              # ユーティリティ
│   │   └── App.tsx             # メインアプリケーション
│   ├── public/                 # 静的ファイル・レガシーJS
│   ├── package.json
│   ├── vite.config.ts          # Vite設定
│   └── tsconfig.json           # TypeScript設定
├── deleteme_artifact/          # UIサンプル・アーティファクト
│   ├── foreflight-sample-gemini/ # ForeFlight UI完全再現 (React+TS+MUI)
│   ├── ForeFlight_Sample_Claude/ # ForeFlight UI試作版
│   └── Container.json          # Figma デザインデータ
├── edge/                       # Raspberry Pi関連
│   ├── telepath/               # MAVLink通信スクリプト
│   ├── fpv-streaming/          # 映像配信スクリプト
│   └── setup/                  # 初期セットアップ
└── docs/                       # プロジェクト文書
    ├── ARCHITECTURE.md         # アーキテクチャ設計
    ├── DEPLOYMENT.md           # デプロイ手順
    └── API.md                  # API仕様
```

## 🛠️ 開発環境

### 環境変数設定

`console/.env`を作成：

```env
# AWS設定
VITE_AWS_REGION=ap-northeast-1

# KVSチャンネル設定
VITE_KVS_CHANNEL_NAME_FPV=usb-camera-channel
VITE_KVS_CHANNEL_NAME_PAYLOAD=siyi-zr30-channel

# 認証設定
VITE_AWS_USER_POOL_ID=your-user-pool-id
VITE_AWS_USER_POOL_CLIENT_ID=your-client-id
VITE_AWS_IDENTITY_POOL_ID=your-identity-pool-id
```

### 開発コマンド

```bash
# Webコンソール
cd console
npm run dev         # 開発サーバー
npm run build       # プロダクションビルド
npm run preview     # ビルド確認
npm run lint        # ESLint実行
npm run format      # Prettier実行
npm run test        # Jest実行

# シミュレーター
cd simulator
npm run dev         # 開発サーバー（watch mode）
npm start           # 通常起動
npm test            # テスト実行
```

### デバッグ・テスト

```bash
# テストアカウント
# Email: ksugi101@gmail.com
# Password: hm4Prg2exrc4q4@

# 開発用URL
# Webコンソール: http://localhost:5173
# API/Simulator: http://localhost:3001
# WebSocket: ws://localhost:3001/ws
```

## 📖 技術文書

### 🔗 関連ドキュメント
- **[CORE_REQUIREMENTS.md](./CORE_REQUIREMENTS.md)**: 機能要件・非機能要件
- **console/README.md**: Webコンソール詳細仕様
- **simulator/README.md**: シミュレーター仕様

### 🛡️ セキュリティ
- AWS Cognitoによる認証
- 認証情報のハードコード禁止
- HTTPS/WSS通信
- IAM権限最小化

### 🚀 デプロイ
- **開発**: Vite Dev Server
- **ステージング**: AWS Amplify
- **本番**: AWS Amplify + CloudFront

### 📊 監視・ログ
- CloudWatch Logs
- X-Ray分散トレーシング
- KVSメトリクス監視

---

## 🤝 コントリビューション

1. 機能追加前に**CORE_REQUIREMENTS.md**確認
2. **TypeScript**・**ESLint**・**Prettier**遵守
3. **Jest**でテストコード作成
4. **日本語**でコメント・ドキュメント記述

## 📞 サポート

- **プロジェクト**: 03_Centrosome
- **ベースプロジェクト**: 01_A1-Console
- **更新日**: 2025-06-30

---

**Centrosome** - *細胞の中心体のように、UAVシステムの中心となる統合監視プラットフォーム*