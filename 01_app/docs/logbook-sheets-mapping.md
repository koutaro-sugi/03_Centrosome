### Logbook → Google Sheets 転記仕様（確定）

対象テンプレートの前提:

- B2: 機体登録記号（テンプレート側の既存値を使用）
- 00_Template シートは既存前提（コードでの新規作成・移動は行わない）

各記録行（行5〜19）への書き込み定義（毎回転記）:

- B: 飛行年月日（JST, YYYY-MM-DD）
- D: 飛行させた者の氏名
- G: 飛行概要（必要に応じて目的/備考）
- H: 離陸場所（FROM）
- I: 着陸場所（TO）
- L: 離陸時間（JST, HH:mm）
- M: 着陸時間（JST, HH:mm）
- O: 飛行時間（Spreadsheetの関数で自動計算。コードからは未挿入）
- P: 総飛行時間（Spreadsheetの関数で自動計算。コードからは未挿入）
- Q: 飛行の安全に影響のあった事項（SAFETY）

補足:

- B2 は「機体登録記号」。コードからの書き換えは実施しない。
- シートが埋まった場合は、同一ブックに新規シートを作成し、名前は `飛行記録_YYYYMMDD~`（同日複数は `_2~` など連番）とする。
- ブック名は `{機体名}_飛行記録_{機体登録記号}` を用いる。
- ゴミ箱内のブックは無視し、検出した場合は新規ブックを作成する。

### 作成先フォルダの管理（ハードコード禁止）

- **フロントエンド（本番/通常操作）**: `/amplify_outputs.json` の `custom.parentFolderId` を取得し、Sheets同期時に `folderId` として送信。Lambda は `body.folderId` が指定されている場合、`PARENT_DRIVE_FOLDER_ID` 直下に保存（本番用）。
- **CLI/テスト**: `folderId` が未指定の場合、Lambda は `DRIVE_FOLDER_ID` 環境変数を使用し、テスト用サブフォルダに保存。
- **フォルダ構造**:
  - 本番用: `PARENT_DRIVE_FOLDER_ID` 直下（フロントエンド作成）
  - テスト用: `DRIVE_FOLDER_ID`（CLI/テスト作成）
- 本番親フォルダIDは Amplify のビルド環境変数 `PARENT_DRIVE_FOLDER_ID` に設定し、`amplify_outputs.json` の `custom.parentFolderId` に出力される。

#### 設定手順

- ローカル開発（fish）: `01_app/.env.fish` に `set -x PARENT_DRIVE_FOLDER_ID <folderId>` を追加。
- サンドボックス/CI: ビルド環境に `PARENT_DRIVE_FOLDER_ID` を設定。
- テスト用フォルダ: `DRIVE_FOLDER_ID` を Amplify 関数環境変数に設定。

### 時刻とタイムゾーン

- すべて JST で処理
- 書式は HH:mm（例: 15:30）
