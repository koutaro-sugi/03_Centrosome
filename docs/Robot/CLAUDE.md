# CLAUDE.md - 03_Centrosome プロジェクト設定

## 📋 プロジェクト基本情報

**プロジェクト名**: Centrosome - UAV統合監視システム  
**プロジェクト番号**: 03_Centrosome  
**プロジェクトタイプ**: 現行メインプロジェクト（01-09番台）  
**ベースプロジェクト**: 01_A1-Console  

## 🎯 プロジェクト固有指示

### 言語・応答設定
- **CRITICAL**: 必ず日本語で回答すること（英語での回答は絶対禁止）
- **CRITICAL**: コードコメントも日本語で記述すること
- **CRITICAL**: エラーメッセージやUIテキストも日本語で統一すること
- **CRITICAL**: 全ての応答は日本語で行うこと（英語は一切使用禁止）

### 開発ワークフロー
1. **実装前計画**: 必ず計画を立ててユーザーに提示すること
2. **承認制**: ユーザー承認取得後に実行開始
3. **進捗管理**: TodoWriteで作業進捗を必ず管理
4. **日本語統一**: なんJ民スタイルで親しみやすく

### 重要ファイル保護
- **ULTRA-CRITICAL**: CORE_REQUIREMENTS.md（コア機能要件）は削除禁止
- **ULTRA-CRITICAL**: 技術文書・構成情報は慎重に保存・更新
- **ULTRA-CRITICAL**: 実装された重要ファイルの誤削除防止
- **ULTRA-CRITICAL**: ファイル改変前のGit管理必須

## 🏗️ ディレクトリ構造・作業場所

### メインディレクトリ
```
03_Centrosome/
├── console/          # Webコンソール（メイン作業場所）
├── simulator/        # ジンバルシミュレーター
├── edge/            # Raspberry Pi関連
└── docs/            # プロジェクト文書
```

### 開発作業場所
- **Webコンソール開発**: `console/`ディレクトリ内で作業
- **シミュレーター開発**: `simulator/`ディレクトリ内で作業
- **エッジ設定**: `edge/`ディレクトリ内で作業

## 🛠️ 技術スタック・設定

### フロントエンド（console/）
- **React** 18 + **TypeScript** 5
- **Vite** 5（ビルドツール）
- **Material-UI**（UIフレームワーク）
- **react-grid-layout**（ダッシュボード）

### バックエンド・インフラ
- **AWS Amplify Gen2**
- **Amazon Cognito**（認証）
- **Amazon KVS**（WebRTC映像配信）

### 開発ツール
- **ESLint** + **Prettier**（コード品質）
- **Jest** + **React Testing Library**（テスト）
- **GitHub Actions**（CI/CD）

## 🚀 開発コマンド

### Webコンソール開発
```bash
cd /Users/koutarosugi/Developer/03_Centrosome/console
npm run dev         # http://localhost:5173
npm run build       # プロダクションビルド
npm run preview     # ビルド確認
```

### シミュレーター開発
```bash
cd /Users/koutarosugi/Developer/03_Centrosome/simulator
npm run dev         # http://localhost:3001（watch mode）
npm start           # 通常起動
```

## 🔧 環境設定

### 必要な環境変数（console/.env）
```env
VITE_AWS_REGION=ap-northeast-1
VITE_KVS_CHANNEL_NAME_FPV=usb-camera-channel
VITE_KVS_CHANNEL_NAME_PAYLOAD=siyi-zr30-channel
```

### テストアカウント
- **Email**: ksugi101@gmail.com
- **Password**: hm4Prg2exrc4q4@

## 📋 重要な開発ルール

### コード品質
- **TypeScript必須**: 全てのコードはTypeScriptで記述
- **日本語コメント**: コード内コメントは日本語で記述
- **ESLint/Prettier**: 静的解析・フォーマット必須
- **テストコード**: Jest + React Testing Libraryでテスト作成

### Git管理
- **CRITICAL**: ファイル変更前の適切なGit管理必須
- **Conventional Commits**: コミットメッセージ規約遵守
- **セマンティックバージョニング**: バージョン管理厳格遵守

### セキュリティ
- **認証情報ハードコード禁止**: 環境変数使用必須
- **AWSベストプラクティス**: セキュリティガイドライン遵守
- **秘密情報保護**: credディレクトリの取り扱い注意

## 🎮 MCP使用ガイドライン

### 画面サイズ設定
- **必須**: MCPでブラウザを開く際は1920x1080で指定
- **スクリーンショット**: width: 1920, height: 1080指定

### 開発サーバーURL
- **Webコンソール**: http://localhost:5173（Vite dev server）
- **シミュレーター**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws

## 📁 プロジェクト統合情報

### 移行元プロジェクト
- **01_A1-Console**: ベースプロジェクト
  - `dev-web-console/minimal-viewer/` → `console/`
  - `dev-web-console/gimbal-simulator/` → `simulator/`
  - `Raspi-Persona/` → `edge/`

### 統合スケジュール
1. **Phase 1**: 基盤構築・プロジェクト構造確立
2. **Phase 2**: コア機能移行・実装
3. **Phase 3**: 統合・最適化
4. **Phase 4**: 運用準備・デプロイ

## 🔗 関連ドキュメント

- **[CORE_REQUIREMENTS.md](./CORE_REQUIREMENTS.md)**: コア機能要件定義
- **[README.md](./README.md)**: プロジェクト概要
- **console/README.md**: Webコンソール詳細仕様
- **simulator/README.md**: シミュレーター仕様

## 📞 引き継ぎ・ハンドオフ指示

### Claude間引き継ぎ時
1. **詳細な技術的継続性**: 実装状況・未完了作業の詳細記録
2. **重要ファイル一覧**: 削除禁止ファイルの明記
3. **作業進捗状況**: TodoWriteの内容とプロジェクト状況
4. **環境設定情報**: 必要な環境変数・設定の記録

### 緊急時対応
- **プロジェクト**: 03_Centrosome
- **ベース**: 01_A1-Console
- **要件定義**: CORE_REQUIREMENTS.md参照
- **緊急連絡**: GitHubリポジトリのIssue作成

---

**更新履歴:**
- 2025-06-30: 01_A1-Consoleから03_Centrosomeへの統合に伴い新規作成