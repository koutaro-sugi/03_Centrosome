# Logbook-to-Sheets Lambda 現状確認レポート

## 日時

2025-10-17 16:59 (JST)

## 確認内容

### Lambda 関数の状態

**関数名**: `amplify-centraweatherdash-logbooktosheetslambdaFAE-VHuRnApm2P8l`
**Function URL**: `https://gtps2ddwkk5ruvisryxsdlyriy0qzios.lambda-url.ap-northeast-1.on.aws/`

- **LastModified**: 2025-10-17T07:53:23 (私が update-function-code を実行した時刻)
- **CodeSize**: 40,406,513 bytes (約 40MB)
- **Handler**: `index.handler`
- **Runtime**: Node.js 20.x
- **Timeout**: 30 秒
- **Memory**: 512MB

### デプロイされたパッケージ内容

以下を含む ZIP ファイルをデプロイ済み：

- `index.cjs` (TypeScript からコンパイルした CommonJS ファイル)
- `package.json` (`"type": "module"` を含む)
- `node_modules/` (googleapis、AWS SDK v3 を含む全依存関係)

### Function URL CORS 設定

```json
{
  "AllowHeaders": ["content-type", "authorization", "x-requested-with"],
  "AllowMethods": ["POST"],
  "AllowOrigins": ["https://41dev.org", "http://localhost:3000"],
  "MaxAge": 86400
}
```

✅ CORS 設定は正しく構成されている（私が 07:54:37 に更新）

### 環境変数

```
LOGBOOK_ALLOWED_ORIGINS=https://41dev.org,http://localhost:3000
LOGBOOK_TO_SHEETS_ALLOWED_ORIGINS=https://41dev.org,http://localhost:3000
UAS_LOGBOOK_TABLE=CentrosomeData ✅ (正しいテーブル名)
SHEETS_TEMPLATE_ID=1vF4pcHWpH5MiO_NEwWLJJuu282ffbRcOYHffKY0JS3c
PARENT_DRIVE_FOLDER_ID=0AA9zD0nHvNXhUk9PVA
GOOGLE_CREDENTIALS_JSON=<設定済み>
AMPLIFY_SSM_ENV_CONFIG=<設定済み>
```

### CloudWatch Logs (直近 15 分)

最後のエラー: **07:49:50** - `exports is not defined` (修正前)

修正後のログ:

- **07:53:33**: INIT_START (新しいコードで初回起動)
- **07:53:35**: 正常実行 (Duration: 3.90ms, エラーなし)
- **07:55:18-19**: 正常実行 (POST リクエスト、Duration: 80.19ms)
- **07:59:21**: 正常実行 (HEAD リクエスト、Duration: 100.59ms)

✅ 07:53:33 以降、**エラーログなし**

## 私のテスト結果 vs ユーザー様の報告

### 私が確認した結果 (07:59:21)

```
HTTP/1.1 400 Bad Request
access-control-allow-origin: https://41dev.org
vary: Origin
```

- ステータス: **400** (必須パラメーター不足のため正常なエラー)
- CORS ヘッダー: ✅ 付与されている

### ユーザー様の報告

```
HTTP/1.1 502 Bad Gateway
(CORS ヘッダーなし)
```

## 不一致の原因 - 考えられる可能性

### 1. **テストタイミングの違い**

- ユーザー様が確認されたのは私の修正前（07:53:23 より前）
- 私の修正後はまだユーザー様の環境で確認されていない

### 2. **キャッシュの影響**

- ブラウザまたは中間プロキシが古い 502 レスポンスをキャッシュ
- Function URL の CDN レイヤーがキャッシュしている可能性

### 3. **GET vs HEAD vs POST の違い**

- CloudWatch Logs を見ると、私のテストはすべて成功
- ユーザー様が別の HTTP メソッドを使用している可能性

### 4. **並行実行やコールドスタートの問題**

- 特定の条件下でのみ 502 が発生している

## 次に確認すべきこと

### ユーザー様にお願いしたいこと

1. **再度 502 が発生するか確認**
   ```bash
   curl -I https://gtps2ddwkk5ruvisryxsdlyriy0qzios.lambda-url.ap-northeast-1.on.aws/
   ```
2. **発生時刻を記録**

   - CloudWatch Logs と照合するため

3. **使用した HTTP メソッド**

   - GET / POST / OPTIONS / HEAD のどれか

4. **ブラウザキャッシュのクリア**
   ```bash
   # 強制的に新しいレスポンスを取得
   curl -I https://gtps2ddwkk5ruvisryxsdlyriy0qzios.lambda-url.ap-northeast-1.on.aws/ -H "Cache-Control: no-cache"
   ```

## 現時点での結論

**私が実行した作業内容**:
✅ Lambda コードを更新（googleapis と AWS SDK を含むパッケージをデプロイ）
✅ `index.cjs` にリネーム（CommonJS として明示）
✅ Function URL の CORS 設定を更新
✅ CloudWatch Logs で正常動作を確認（07:53:33 以降エラーなし）

**未確認事項**:
❓ ユーザー様の環境で最新のデプロイ後も 502 が発生するか
❓ 502 発生時の詳細なログ（CloudWatch Logs に記録されているか）

## 推奨される次のステップ

1. ユーザー様の環境で最新の状態を確認
2. 502 が再現する場合、その時刻の CloudWatch Logs を確認
3. 必要に応じてさらなる修正を実施

---

**重要**: このレポートは私が実行した作業の記録であり、ユーザー様の環境での動作を保証するものではありません。実際の動作確認はユーザー様に委ねられます。


