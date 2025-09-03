# CLAUDE.md - Centra プロジェクト開発指針

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents
1. [プロジェクト固有指針](#プロジェクト固有指針)
2. [プロジェクト概要](#プロジェクト概要)
3. [共通開発コマンド](#共通開発コマンド)
4. [アーキテクチャとコード構造](#アーキテクチャとコード構造)
5. [Git・バージョン管理ルール](#gitバージョン管理ルール)
6. [コミットメッセージ規約](#コミットメッセージ規約)
7. [開発ワークフロー](#開発ワークフロー)
8. [コード品質基準](#コード品質基準)
9. [重要な注意事項](#重要な注意事項)

## プロジェクト固有指針

### 最重要事項（必ず遵守）
1. **Git管理の徹底**: 全ての変更は適切なコミットメッセージと共にコミット
2. **バージョン管理**: セマンティックバージョニング厳格遵守
3. **ドキュメント整備**: README.md、CLAUDE.mdの常時更新
4. **承認制ワークフロー**: 作業前に必ず計画を提示し、ユーザー承認を得る
5. **MCP（Model Context Protocol）最大活用**:
   - フォルダ構造解析には必ずMCPツールを使用
   - コードレビューは複数AIによるペアプログラミング実施
   - Claudeが書いたコードをGemini等でクロスレビュー
   - 並列処理可能なタスクは積極的にバッチ実行

## プロジェクト概要

### 基本情報
- **名称**: Centra (セントラ)
- **種別**: ドローン運航管理システム（Web Application）
- **技術スタック**: 
  - Frontend: React 18.3.1 + TypeScript 5.4.5 + Material-UI 7.2.0
  - Backend: AWS Amplify Gen 2 (1.16.1)
  - Database: Amazon DynamoDB
  - IoT: AWS IoT Core (Mado sensor integration)
  - Charts: Chart.js 4.5.0 + react-chartjs-2 5.3.0
  - State: Zustand + React Context
  - Date: date-fns 4.1.0

### 主要機能
1. **リアルタイム監視**: ドローンのテレメトリデータをリアルタイム表示
2. **フライトプラン管理**: .plan ファイルのアップロード/ダウンロード
3. **環境モニタリング**: Madoセンサーからの気象データ統合
4. **天気予報**: Pre-flight Overview セクションに天気予報テーブル表示

### 統合システム
- **Mado (窓)**: IoT環境モニタリングシステム（XF700A 7要素気象センサー）
  - データ形式: JSON via MQTT (1Hz)
  - トピック: `mado/centra/{device_id}/telemetry`

## 共通開発コマンド

### 開発環境
```bash
# 開発サーバー起動
npm start

# テスト実行
npm test

# ビルド
npm run build

# 型チェック
npm run type-check

# リント実行
npm run lint
```

### AWS Amplify
```bash
# Amplify 設定確認
npx ampx info

# リソースデプロイ
npx ampx deploy

# サンドボックス環境起動
npx ampx sandbox
```

### Git操作
```bash
# 変更確認
git status

# 変更追加とコミット
git add .
git commit -m "feat: 新機能の追加"

# プッシュ
git push origin main
```

## アーキテクチャとコード構造

### ディレクトリ構造
```
03_Centra/
├── 01_app/                # メインアプリケーション
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   │   ├── weather/   # 天気関連（MUI実装）
│   │   │   └── ...        # その他コンポーネント
│   │   ├── services/      # APIサービス層
│   │   │   ├── weatherApi.ts      # 気象API統合
│   │   │   ├── madoSensorService.ts # Madoセンサー接続
│   │   │   └── ...        # その他サービス
│   │   ├── types/         # TypeScript型定義
│   │   ├── hooks/         # カスタムフック
│   │   └── pages/         # ページコンポーネント
│   ├── amplify/           # Amplify Gen2設定
│   ├── public/            # 静的ファイル
│   └── docs/              # アプリ固有ドキュメント
├── 99_docs/               # プロジェクトドキュメント
└── edge/                  # エッジデバイス設定
```

### 重要なファイル（実装確認済み）
- `01_app/src/pages/Weather.tsx` - 気象データダッシュボード（Material-UI実装）
- `01_app/src/services/weatherApi.ts` - 天気API統合
- `01_app/src/services/madoSensorService.ts` - Madoセンサー接続（WebSocket over MQTT）
- `01_app/src/components/weather/RealtimeWeatherCardReal.tsx` - リアルタイム気象表示
- `01_app/src/types/weather.ts` - 天気データ型定義
- `01_app/docs/WEATHER_DASHBOARD_REQUIREMENTS.md` - 詳細要件定義

### データフロー
1. **ドローンテレメトリ**: MAVLink → WebSocket → React Dashboard
2. **Madoセンサー**: RS485/ModbusRTU → AWS IoT Core → DynamoDB → React
3. **天気予報**: OpenWeatherMap API → React Component

## Git・バージョン管理ルール

### セマンティックバージョニング（厳格遵守）
```
MAJOR.MINOR.PATCH
```
- **MAJOR** (1.x.x): 破壊的変更
- **MINOR** (x.1.x): 後方互換性のある機能追加  
- **PATCH** (x.x.1): 後方互換性のあるバグ修正

### ブランチ戦略
- **main**: プロダクション環境
- **develop**: 開発環境  
- **feature/***: 機能開発ブランチ
- **hotfix/***: 緊急修正ブランチ

## コミットメッセージ規約

### Conventional Commits形式（必須）
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Type一覧
- **feat**: 新機能追加
- **fix**: バグ修正
- **docs**: ドキュメント更新
- **style**: コードスタイル（機能影響なし）
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: 雑務（依存関係更新等）

### Scope例
- **dashboard**: ダッシュボード機能
- **flight**: フライト管理機能
- **weather**: 天気機能
- **mado**: Madoセンサー統合
- **auth**: 認証機能

## 開発ワークフロー

### 1. 作業開始前（必須）
```markdown
## 作業計画
1. 具体的なタスク
2. 実装する機能
3. 影響範囲
4. テスト内容

承認をお願いします。
```

### 2. 実装中
- TodoWriteでタスク管理
- 適切な粒度でのコミット
- 並列実行可能なタスクはバッチ処理

### 3. 完了時
- 全機能の動作確認
- ドキュメント更新
- 必須チェック実行

### 必須チェック項目
```bash
# TypeScriptコンパイルチェック
npm run build
# または
npx tsc --noEmit

# ESLintチェック
npm run lint

# テスト実行
npm test -- --watchAll=false
```

## コード品質基準

### TypeScript
- 厳格な型定義必須
- `any`型の使用禁止
- インターフェース優先

### React
- 関数コンポーネント使用
- カスタムフック活用
- 適切なメモ化（useMemo, useCallback）

### Material-UI (MUI)
- Material-UI 7.2.0 準拠
- レスポンシブデザイン必須（Grid Legacy使用）
- テーマシステム活用（useTheme、useMediaQuery）
- 日本語UI統一

### セキュリティ
- 環境変数での秘密情報管理
- API キーの適切な管理
- HTTPS必須

## 重要な注意事項

### 絶対に行わないこと
1. 秘密情報のコミット
2. 破壊的変更の無告知実装
3. テスト未実施でのコミット  
4. コンパイルエラーの放置

### 必ず行うこと  
1. 作業前の計画提示・承認取得
2. 適切なコミットメッセージ作成
3. コード変更後の即座のビルドチェック
4. ドキュメントの同期更新

## ベースCLAUDE.mdからの継承事項

### 時間がかかる処理
- 大量のデータ処理やAPI呼び出しなど、時間がかかる処理は自動実行せず、ユーザーに手動実行を依頼すること

### ドキュメント作成時
- Table of Contentsを必ず含めること
- 技術文書でも親しみやすい口調で説明（なんJ民スタイル）

### コーディング原則
- **YAGNI**: 今必要じゃない機能は作らない
- **DRY**: 重複コードは必ず共通化
- **KISS**: シンプルな実装を優先

### Note to claude.md管理
- タスクリストがある場合はObsidian風チェックボックス形式で管理
- 完了: `[x]`、未完了: `[ ]`

---

**最終更新**: 2025年9月4日
**適用プロジェクト**: 03_Centra
**技術仕様**: IMPLEMENTATION_ANALYSIS.md、CORE_REQUIREMENTS.md準拠