#!/bin/bash

# Centra Development Setup Script
# このスクリプトは開発環境のセットアップを自動化します

echo "🚀 Centra 開発環境セットアップを開始します..."

# 環境変数ファイルの確認
if [ ! -f .env ]; then
    echo "📝 .env ファイルを作成します..."
    cp .env.example .env
    echo "⚠️  .env ファイルを編集して、必要なAPI KEYを設定してください"
fi

# 依存関係のインストール
echo "📦 依存関係をインストールしています..."
npm install

# AWS Amplify の確認
if command -v amplify &> /dev/null; then
    echo "✅ AWS Amplify CLI が見つかりました"
else
    echo "❌ AWS Amplify CLI が見つかりません"
    echo "📖 インストール方法: npm install -g @aws-amplify/cli"
fi

# TypeScript の型チェック
echo "🔍 TypeScript の型チェックを実行しています..."
npm run type-check || echo "⚠️  型エラーがあります"

# ESLint チェック
echo "🔍 ESLint チェックを実行しています..."
npm run lint || echo "⚠️  Lintエラーがあります"

# ビルドテスト
echo "🏗️  ビルドテストを実行しています..."
npm run build || echo "❌ ビルドエラーがあります"

echo "✅ セットアップが完了しました！"
echo ""
echo "次のコマンドで開発を開始できます:"
echo "  npm start    - 開発サーバーを起動"
echo "  npm test     - テストを実行"
echo "  npm run lint - コードスタイルをチェック"