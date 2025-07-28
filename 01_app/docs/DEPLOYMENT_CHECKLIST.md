# デプロイメントチェックリスト

## Pre-Deployment チェックリスト

### コード品質
- [ ] すべてのテストが通過している
  ```bash
  npm run test:ci
  npm run test:integration
  ```
- [ ] TypeScriptの型エラーがない
  ```bash
  npm run typecheck
  ```
- [ ] ESLintエラーがない
  ```bash
  npm run lint
  ```
- [ ] ビルドが成功する
  ```bash
  npm run build
  ```

### セキュリティ
- [ ] 依存関係の脆弱性チェック
  ```bash
  npm audit
  ```
- [ ] 環境変数にシークレットが含まれていない
- [ ] APIキーがコードにハードコードされていない
- [ ] セキュリティヘッダーが設定されている

### パフォーマンス
- [ ] バンドルサイズが許容範囲内
  ```bash
  npm run analyze
  ```
- [ ] 画像が最適化されている
- [ ] 不要な依存関係が削除されている

### ドキュメント
- [ ] READMEが最新
- [ ] 変更履歴（CHANGELOG）が更新されている
- [ ] APIドキュメントが最新

## Staging デプロイメント

### 事前準備
- [ ] mainブランチが最新
  ```bash
  git checkout main
  git pull origin main
  ```
- [ ] 機能ブランチがmainにマージ済み
- [ ] PRがレビュー承認済み

### デプロイ実行
- [ ] GitHub ActionsでCI Pipelineが成功
- [ ] Staging環境への自動デプロイが完了
- [ ] デプロイメントログにエラーがない

### 検証
- [ ] Staging環境でアプリケーションが起動
- [ ] 主要機能の動作確認
  - [ ] ログイン/ログアウト
  - [ ] リアルタイムデータ表示
  - [ ] 履歴グラフ表示
  - [ ] 統計情報表示
- [ ] エラーログの確認
- [ ] パフォーマンスメトリクスの確認

## Production デプロイメント

### 承認プロセス
- [ ] ステークホルダーへの通知
- [ ] デプロイメント時間の調整
- [ ] ロールバック計画の確認

### バックアップ
- [ ] 現在のProductionバージョンの記録
- [ ] データベースバックアップの確認
- [ ] 設定ファイルのバックアップ

### デプロイ実行
- [ ] GitHub Actions workflow_dispatchから実行
- [ ] Production環境を選択
- [ ] デプロイメント承認を待つ
- [ ] デプロイメントログの監視

### 検証
- [ ] Production環境でアプリケーションが起動
- [ ] ヘルスチェックエンドポイントの確認
  ```bash
  curl https://centra-weather.amplifyapp.com/health.json
  ```
- [ ] 主要機能の動作確認（Staging同様）
- [ ] CloudWatchメトリクスの確認
- [ ] エラー率の監視

### Post-Deployment
- [ ] ユーザーへの通知（必要な場合）
- [ ] 監視ダッシュボードの確認
- [ ] 初期フィードバックの収集

## ロールバック手順

### 問題発生時
1. [ ] 問題の影響範囲を特定
2. [ ] ステークホルダーに通知
3. [ ] ロールバック判断

### ロールバック実行
```bash
# AWS CLIでのロールバック
aws amplify start-deployment \
  --app-id $AMPLIFY_APP_ID \
  --branch-name main \
  --source-url s3://$BUCKET/builds/$PREVIOUS_VERSION.zip
```

### ロールバック後
- [ ] アプリケーションの動作確認
- [ ] インシデントレポートの作成
- [ ] 根本原因の分析
- [ ] 修正計画の策定

## 緊急時対応

### 連絡先
- DevOpsチーム: devops@centra.com
- インシデント管理: incident@centra.com
- AWS サポート: [AWS Support Console]

### エスカレーション
1. L1: アプリケーションエラー → DevOpsチーム
2. L2: インフラ障害 → AWSサポート
3. L3: データ損失リスク → CTO承認

## 月次メンテナンス

### 定期タスク
- [ ] 依存関係の更新
  ```bash
  npm update
  npm audit fix
  ```
- [ ] ログローテーションの確認
- [ ] バックアップの検証
- [ ] セキュリティパッチの適用
- [ ] パフォーマンスレビュー

### コスト最適化
- [ ] AWS使用状況の確認
- [ ] 不要なリソースの削除
- [ ] Reserved Instancesの検討
- [ ] CloudFrontキャッシュ効率の確認