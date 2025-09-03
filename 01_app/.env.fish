# fish shell env for dev workflow

# Google Sheets template Spreadsheet ID (必須・未入力: あなたのテンプレIDを入れてください)
set -x SHEETS_TEMPLATE_ID "1vF4pcHWpH5MiO_NEwWLJJuu282ffbRcOYHffKY0JS3c"

# Google Drive folder ID to create books in (shared drive folder id)
set -x DRIVE_FOLDER_ID "1hAAeFgYN4v45GubCcxkWVpZf8Rq0C3cH"

# Comma separated emails to share newly created workbooks with (任意)
set -x SHARE_WITH_EMAILS ""

# Optional: SSM path for GOOGLE_CREDENTIALS_JSON (SecureString)
set -x SSM_GOOGLE_CREDENTIALS_PATH "/shared/google/sa-json"
