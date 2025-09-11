#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   APP_ID=abc BRANCH=main ./scripts/amplify/set-branch-env.sh scripts/amplify/env.sample.json
# or
#   ./scripts/amplify/set-branch-env.sh scripts/amplify/env.sample.json --app-id abc --branch main

JSON_FILE=""
APP_ID="${APP_ID:-}"
BRANCH="${BRANCH:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-id)
      APP_ID="$2"; shift 2 ;;
    --branch)
      BRANCH="$2"; shift 2 ;;
    *)
      JSON_FILE="$1"; shift ;;
  esac
done

if [[ -z "${JSON_FILE}" || -z "${APP_ID}" || -z "${BRANCH}" ]]; then
  echo "Usage: APP_ID=<appId> BRANCH=<branch> $0 <env.json>" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI not found. Install AWS CLI v2." >&2
  exit 1
fi

echo "Updating Amplify branch env: app=${APP_ID} branch=${BRANCH} file=${JSON_FILE}" >&2
aws amplify update-branch \
  --app-id "${APP_ID}" \
  --branch-name "${BRANCH}" \
  --environment-variables file://"${JSON_FILE}"

echo "Done."

