# デプロイメントガイド

## 概要

このドキュメントは、Centra Weather DashboardのCI/CDパイプラインとデプロイメントプロセスについて説明します。

## CI/CDアーキテクチャ

### GitHub Actions ワークフロー

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - トリガー: Push to main/develop, Pull Request
   - ステージ:
     - Code Quality Check (ESLint, TypeScript)
     - Unit Tests (Jest + Coverage)
     - Integration Tests (DynamoDB Local)
     - Build Verification
     - E2E Tests (Cypress - PR only)
     - Dependency Security Check (Snyk)

2. **Deploy Pipeline** (`.github/workflows/deploy.yml`)
   - トリガー: Push to main, Manual dispatch
   - ステージ:
     - Build and Test
     - Deploy to Staging
     - Deploy to Production (Manual approval)
     - Rollback (自動失敗時)

## 環境構成

### Staging環境
- URL: https://staging.centra-weather.amplifyapp.com
- ブランチ: staging
- 自動デプロイ: mainブランチへのpush時
- 環境変数: `.env.staging`

### Production環境
- URL: https://centra-weather.amplifyapp.com
- ブランチ: main
- 手動デプロイ: GitHub Actions workflow_dispatch
- 環境変数: `.env.production`
- 承認要求: Environment protection rules

## デプロイメントプロセス

### 1. 開発からStagingへ

```bash
# 機能ブランチで開発
git checkout -b feature/weather-alerts

# 変更をコミット
git add .
git commit -m "feat: Add weather alert notifications"

# プルリクエスト作成
git push origin feature/weather-alerts
# GitHub上でPRを作成

# CI Pipelineが自動実行される
# - Code quality checks
# - Unit/Integration tests
# - Build verification
# - E2E tests

# PRマージ後、自動的にStagingへデプロイ
```

### 2. StagingからProductionへ

```bash
# GitHub Actionsページから手動デプロイ
# 1. Actions > Deploy Pipeline > Run workflow
# 2. Environment: production を選択
# 3. Run workflow をクリック

# または、GitHub CLIを使用
gh workflow run deploy.yml -f environment=production
```

### 3. 緊急デプロイ（Hotfix）

```bash
# mainブランチから直接hotfixブランチを作成
git checkout main
git checkout -b hotfix/critical-bug

# 修正を実装
# ...

# mainへ直接PR
git push origin hotfix/critical-bug

# PR承認後、手動でProductionデプロイ
```

## 必要なシークレット設定

### GitHub Secrets

```yaml
# AWS認証情報
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_ACCESS_KEY_ID_PROD
AWS_SECRET_ACCESS_KEY_PROD

# Amplifyアプリケーション
AMPLIFY_APP_ID
AMPLIFY_APP_ID_PROD
DEPLOYMENT_BUCKET

# API Keys
WINDY_API_KEY_STAGING
WINDY_API_KEY_PROD

# 外部サービス
CODECOV_TOKEN
SNYK_TOKEN
```

### 環境変数

各環境で設定される変数:

```bash
# 共通
REACT_APP_AWS_REGION
REACT_APP_VERSION
REACT_APP_ENVIRONMENT

# 環境別
REACT_APP_GRAPHQL_ENDPOINT
REACT_APP_WEBSOCKET_ENDPOINT
REACT_APP_LOG_LEVEL
REACT_APP_CACHE_TTL
```

## ビルド最適化

### パフォーマンス設定

```yaml
# amplify.yml
- ソースマップ生成の無効化（本番）
- Tree shaking有効化
- コード分割の最適化
- アセット圧縮
```

### キャッシュ戦略

- npm packages: `.npm/**/*`
- node_modules: `node_modules/**/*`
- ビルドアーティファクト: 30日間保持

## モニタリングとアラート

### デプロイメント通知

1. **Slack通知**（将来実装）
   - デプロイ開始/完了
   - ビルド失敗
   - テスト失敗

2. **メール通知**
   - Production承認リクエスト
   - デプロイメント失敗

### ヘルスチェック

```bash
# Staging
curl https://staging.centra-weather.amplifyapp.com/health

# Production
curl https://centra-weather.amplifyapp.com/health
```

## ロールバック手順

### 自動ロールバック

Production デプロイが失敗した場合、自動的に前のバージョンにロールバック

### 手動ロールバック

```bash
# AWS CLIを使用
aws amplify start-deployment \
  --app-id $AMPLIFY_APP_ID \
  --branch-name main \
  --source-url s3://$BUCKET/builds/$PREVIOUS_VERSION.zip
```

## トラブルシューティング

### ビルド失敗

1. **依存関係エラー**
   ```bash
   npm ci --force
   npm audit fix
   ```

2. **TypeScriptエラー**
   ```bash
   npx tsc --noEmit
   ```

3. **テスト失敗**
   ```bash
   npm test -- --no-coverage
   ```

### デプロイメント失敗

1. **Amplifyエラー**
   - CloudWatchログを確認
   - amplify.ymlの構文チェック

2. **環境変数の不足**
   - GitHub Secretsの確認
   - Amplify環境変数の確認

## セキュリティ考慮事項

1. **シークレット管理**
   - GitHub Secretsで暗号化保存
   - 環境別に分離
   - 定期的なローテーション

2. **アクセス制御**
   - Production環境は承認制
   - Branch protection rules
   - 最小権限の原則

3. **監査ログ**
   - デプロイメント履歴
   - 承認履歴
   - 変更履歴

## 更新履歴

- 2025-01-27: 初版作成（タスク18実装）