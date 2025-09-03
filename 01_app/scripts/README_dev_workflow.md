### 開発フロー自動化

実行:

```bash
fish scripts/dev-workflow.fish            # backend更新 + amplify_outputs.json同期
fish scripts/dev-workflow.fish --restart  # 追加でReact dev server再起動
```

環境変数は `01_app/.env.fish` を作成して設定します（例は `.env.fish.example` を参照）。

必要変数:

- SHEETS_TEMPLATE_ID: テンプレのスプレッドシートID
- DRIVE_FOLDER_ID: 作成先の共有ドライブフォルダID
- SHARE_WITH_EMAILS: 共有先メール（カンマ区切り）
- SSM_GOOGLE_CREDENTIALS_PATH: 任意（SSMのSecureStringパス）。設定時はGOOGLE_CREDENTIALS_JSONの直接設定は不要。
