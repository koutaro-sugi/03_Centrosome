# Title: Amplify自動ビルドの有効化

## Date
2024-10-24

## Problem
- GitHubへのpush後、Amplifyが自動的にビルドを開始しない
- フロントエンドに古いビルドファイルが表示される
- `main.59768d48.js`（古いビルド）が配信され続ける

## Root Cause
```bash
aws amplify get-app --app-id d24z2nbfk2cbx8 --query 'app.enableBranchAutoBuild'
# Result: False
```

Amplifyアプリの`enableBranchAutoBuild`が`false`に設定されていた。

## Solution
```bash
aws amplify update-app \
  --app-id d24z2nbfk2cbx8 \
  --enable-branch-auto-build \
  --region ap-northeast-1
```

自動ビルドを有効化し、空のコミットをpushしてビルドをトリガー。

## Verification Steps
1. 自動ビルド有効化の確認
   ```bash
   aws amplify get-app --app-id d24z2nbfk2cbx8 --query 'app.enableBranchAutoBuild'
   # Result: True
   ```

2. ビルドトリガー
   ```bash
   git commit --allow-empty -m "chore: trigger Amplify build"
   git push origin main
   ```

3. ビルド完了後の確認
   - Amplify Console: ビルドステータス
   - フロントエンド: https://oma.41dev.org
   - JavaScriptファイル名の変更確認

## Impact
- ✅ GitHubへのpush後、自動的にビルドが開始される
- ✅ 最新のコードが常にデプロイされる
- ✅ 手動ビルドトリガーが不要になる

## Prevention
- Amplify設定のドキュメント化
- デプロイプロセスのチェックリスト作成
- CI/CD設定の定期確認

## Related Configuration
- `amplify.yml`: ビルド仕様
- Amplify Console: ブランチ設定 → 自動ビルド

## Follow-ups
- [ ] ビルド完了通知の設定（Slack/Email）
- [ ] デプロイログの監視設定
- [ ] ロールバック手順の文書化

