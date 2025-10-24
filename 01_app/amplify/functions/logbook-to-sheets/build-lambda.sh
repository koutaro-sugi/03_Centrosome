#!/bin/bash
set -e

echo "=== Lambda関数のビルド開始 ==="

# TypeScriptファイルから型注釈を削除してJavaScriptに変換
# 簡易的な方法: esbuildを使用
npx esbuild handler.ts --bundle --platform=node --target=node20 --outfile=index.cjs --format=cjs --external:@aws-sdk/client-dynamodb --external:@aws-sdk/client-ssm --external:@aws-sdk/lib-dynamodb --external:googleapis

echo "=== JavaScriptファイル作成完了 ==="
ls -lh index.cjs

# 必要なパッケージのみを含む一時ディレクトリを作成
rm -rf /tmp/lambda-build
mkdir -p /tmp/lambda-build/node_modules

# 外部化したパッケージのみをコピー
echo "=== 必要なnode_modulesのみをコピー ==="
cp -R node_modules/@aws-sdk /tmp/lambda-build/node_modules/
cp -R node_modules/@smithy /tmp/lambda-build/node_modules/
cp -R node_modules/googleapis /tmp/lambda-build/node_modules/
cp -R node_modules/googleapis-common /tmp/lambda-build/node_modules/
cp -R node_modules/google-auth-library /tmp/lambda-build/node_modules/
cp -R node_modules/gaxios /tmp/lambda-build/node_modules/
cp -R node_modules/gcp-metadata /tmp/lambda-build/node_modules/
cp -R node_modules/gtoken /tmp/lambda-build/node_modules/
cp -R node_modules/jws /tmp/lambda-build/node_modules/
cp -R node_modules/jwa /tmp/lambda-build/node_modules/
cp -R node_modules/@aws /tmp/lambda-build/node_modules/ 2>/dev/null || true
cp -R node_modules/tslib /tmp/lambda-build/node_modules/ 2>/dev/null || true
cp -R node_modules/google-logging-utils /tmp/lambda-build/node_modules/ 2>/dev/null || true

# その他の依存パッケージ
for pkg in node_modules/*; do
  if [[ -d "$pkg" && ! "$pkg" =~ (esbuild|typescript|@types) ]]; then
    pkgname=$(basename "$pkg")
    if [[ ! -d "/tmp/lambda-build/node_modules/$pkgname" ]]; then
      cp -R "$pkg" /tmp/lambda-build/node_modules/ 2>/dev/null || true
    fi
  fi
done

# ビルド成果物をコピー
cp index.cjs /tmp/lambda-build/
cp package.json /tmp/lambda-build/

# ZIPファイル作成
cd /tmp/lambda-build
rm -f /tmp/lambda-production.zip
zip -r /tmp/lambda-production.zip index.cjs node_modules/ package.json

echo "=== ZIPファイル作成完了 ==="
ls -lh /tmp/lambda-production.zip
