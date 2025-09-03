#!/opt/homebrew/bin/fish

# 開発フロー自動化（fish）
# - Backendデプロイ（Amplify Gen 2）
# - amplify_outputs.json を public へ同期
# - React dev server 再起動（任意）

function _echo
  set_color cyan
  echo "==> $argv"
  set_color normal
end

function _err
  set_color red
  echo "[ERROR] $argv"
  set_color normal
end

function _check_node
  set required "v20"
  set current (node -v ^/dev/null)
  if test -z "$current"
    _err "Node.js が見つかりません。nvmで v20 系を有効化してください (.nvmrc あり)"
    exit 1
  end
  if not string match -q "$required*" "$current"
    _err "Node.js $current が使用中。v20系を推奨します (nvm use)"
  end
end

set PROJECT_ROOT (realpath (dirname (status --current-filename))/..)
set APP_DIR "$PROJECT_ROOT"

# .env.fish があれば読み込む
if test -f "$APP_DIR/.env.fish"
  _echo "Loading env: $APP_DIR/.env.fish"
  source "$APP_DIR/.env.fish"
end

# Node バージョンチェック
_check_node

# 必須環境変数チェック（SSMを使う場合はSHEETS_TEMPLATE_ID/GOOGLE_CREDENTIALS_JSONは不要）
set -l missing 0
if test -z "$SHEETS_TEMPLATE_ID"
  _echo "SHEETS_TEMPLATE_ID is empty (OK if provided via SSM)."
end
if test -z "$DRIVE_FOLDER_ID"
  _err "DRIVE_FOLDER_ID is required"
  set missing 1
end
if test -z "$SHARE_WITH_EMAILS"
  _echo "SHARE_WITH_EMAILS is empty (optional)."
end

if test $missing -eq 1
  exit 1
end

_echo "Deploying Amplify backend (sandbox --once)"
pushd "$APP_DIR" >/dev/null
set -x NODE_OPTIONS "--max-old-space-size=8192"
npx ampx sandbox --once
set status_code $status
popd >/dev/null
if test $status_code -ne 0
  _err "Amplify deploy failed"
  exit $status_code
end

_echo "Sync amplify_outputs.json to public/"
cp "$APP_DIR/amplify_outputs.json" "$APP_DIR/public/amplify_outputs.json"

if test (count $argv) -gt 0; and test "$argv[1]" = "--restart"
  _echo "Restarting React dev server"
  pkill -f "react-scripts start"; sleep 2
  pushd "$APP_DIR" >/dev/null
  npm run start >/dev/null 2>&1 &
  popd >/dev/null
  _echo "React dev server started"
end

_echo "Done"

