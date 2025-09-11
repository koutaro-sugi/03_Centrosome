# Amplify Gen2 デプロイ手順（本番稼働まで）

このプロジェクトは Amplify Gen2（CDK ベース）で構成されています。`01_app` 内の `amplify/backend.ts` にバックエンド定義があり、フロントは CRA（react-app-rewired）で `npm run build` により `01_app/build` を生成します。ルートの `amplify.yml` により、Amplify コンソール上でバックエンド → フロントの順でビルド/デプロイされます。

## 前提

- Amplify CLI/Gen2 がローカルで利用可能（npx ampx が動作）
- AWS 資格情報は環境変数に設定済み（要求権限は `iam-policy-amplify.json` を参照）
- Google API（Drive/Sheets）用のサービスアカウント資格情報は SSM SecureString に格納済み

## リポジトリ構成のポイント

- `amplify.yml`: Amplify コンソール用ビルド設定（Gen2 対応）。`01_app` 配下で `npx ampx pipeline-deploy` を実行し、その後フロントをビルドして `01_app/build` を成果物として公開します。
- `01_app/amplify/backend.ts`: Gen2 バックエンド定義。`logbook-to-sheets` 関数と DDB テーブル、SSM 連携などを定義。
- `01_app/.env` と ルートの `.env.example`: フロントエンドの `REACT_APP_*` 変数テンプレ。

## 必須環境変数（フロント）

Amplify コンソールの App Settings → Environment variables に以下を設定してください。`REACT_APP_` で始まる値はビルド時にフロントへ注入されます。

- `REACT_APP_MAPBOX_ACCESS_TOKEN`: Mapbox のアクセストークン
- `REACT_APP_AWS_REGION`: 例 `ap-northeast-1`
- `REACT_APP_IOT_ENDPOINT`: IoT Core ATS エンドポイント
- `REACT_APP_APPSYNC_ENDPOINT`: GraphQL エンドポイント（利用している場合）
- `REACT_APP_USER_POOL_ID`, `REACT_APP_USER_POOL_CLIENT_ID`: Cognito 認証情報
- `REACT_APP_DYNAMODB_TABLE`: クライアント直アクセスが必要な場合のみ
- `REACT_APP_WINDY_POINT_FORECAST_KEY`, `REACT_APP_WINDY_MAP_FORECAST_KEY`
- `REACT_APP_LOGBOOK_TO_SHEETS_URL`: `logbook-to-sheets` 関数URL（デプロイ後に出力される URL を設定）

ローカル `.env` から流用せず、必ず Amplify の環境変数に設定してください（秘密情報をリポジトリに含めない）。

## 必須環境変数（バックエンド runtime）

`01_app/amplify/backend.ts` で以下を Lambda の環境変数として参照します。Amplify Gen2 では「ビルド時に設定 → CDK 合成 → デプロイ」で Lambda の環境へ反映されます。

- `SHEETS_TEMPLATE_ID`: Google Sheets テンプレートID
- `DRIVE_FOLDER_ID`: 作成先の共有ドライブ フォルダID
- `PARENT_DRIVE_FOLDER_ID`: 階層管理用の親フォルダID（任意）
- `SHARE_WITH_EMAILS`: 共有先メール（カンマ区切り）
- `SSM_GOOGLE_CREDENTIALS_PATH`: 例 `/shared/google/sa-json`（未設定時は同デフォルトを使用）

Amplify コンソールの Environment variables に上記キーを追加してください。バックエンドで SSM から SecureString を取得するためのアクセス権は `backend.ts` で IAM ポリシー付与済みです。

## Google API 資格情報の管理

- サービスアカウント JSON は Secrets Manager ではなく、SSM Parameter Store の SecureString（KMS 暗号化）で管理します。
- パラメータ名は `SSM_GOOGLE_CREDENTIALS_PATH` に指定したパス（例 `/shared/google/sa-json`）。
- `backend.ts` は `AMPLIFY_SSM_ENV_CONFIG` を設定しており、コールドスタート時に SSM を読んで `GOOGLE_CREDENTIALS_JSON` 環境変数として関数内から参照できます。

## デプロイ手順

1) GitHub リポジトリを Amplify コンソールに接続し、対象ブランチを選択
2) Amplify 環境変数を設定（上記「フロント」「バックエンド」必須項目）
3) Build image は Node 18 以上を選択（CRA + Gen2 互換）
4) 保存してデプロイ開始

Amplify は `amplify.yml` に従って以下を実行します。

- Backend: `cd 01_app && npm ci && npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID`
- Frontend: `npm ci && npm run build` → `01_app/build` を配信

## デプロイ後の確認

- Amplify 出力の中に `logbookToSheetsUrl` が表示されます。この URL をコピーして Amplify の環境変数 `REACT_APP_LOGBOOK_TO_SHEETS_URL` に設定し、再デプロイしてください。
- 主要動作（認証、地図表示、IoT、ログブック→シート作成）を実環境で確認。

## トラブルシュート

- SSM パラメータ未設定: Lambda で `GOOGLE_CREDENTIALS_JSON` が空になります。`/shared/google/sa-json`（または任意のパス）に SecureString を作成してください。
- CORS: 関数URLは `*` で許可済みですが、必要に応じて許可オリジンを絞って `backend.ts` を調整してください。
- フロントのキー漏えい: `.env` をリポジトリにコミットしないでください。`.env.example` のみテンプレとして利用。

## 参考

- `handover_docs/README.md`
- `DEPLOYMENT.md`
- `01_app/amplify/backend.ts`
- `amplify.yml`

