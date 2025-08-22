# Centra 開発ガイド

## Table of Contents
1. [開発環境セットアップ](#開発環境セットアップ)
2. [開発コマンド一覧](#開発コマンド一覧)
3. [コーディング規約](#コーディング規約)
4. [テスト方針](#テスト方針)
5. [トラブルシューティング](#トラブルシューティング)

## 開発環境セットアップ

### 必要なツール
- Node.js (v18以上)
- npm or yarn
- AWS CLI
- AWS Amplify CLI

### 初回セットアップ
```bash
# リポジトリのクローン
git clone [repository-url]
cd 03_Centra

# セットアップスクリプトの実行
./scripts/dev-setup.sh

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要なAPI KEYを設定
```

### AWS Amplify セットアップ
```bash
# Amplify CLI のインストール（未インストールの場合）
npm install -g @aws-amplify/cli

# Amplify 設定
amplify configure

# サンドボックス環境の起動
npx ampx sandbox
```

## 開発コマンド一覧

### 基本コマンド
```bash
# 開発サーバー起動
npm start

# テスト実行
npm test

# ビルド
npm run build

# 型チェック
npm run type-check

# Lintチェック
npm run lint

# Lint自動修正
npm run lint:fix
```

### Amplify コマンド
```bash
# リソース状態確認
npx ampx info

# リソースデプロイ
npx ampx deploy

# サンドボックス起動
npx ampx sandbox

# ログ確認
npx ampx sandbox logs
```

## コーディング規約

### TypeScript
- すべてのファイルで厳格な型定義を使用
- `any`型の使用は禁止
- インターフェースは`I`プレフィックスなし
- 型定義は`types/`ディレクトリに集約

### React
- 関数コンポーネントを使用
- カスタムフックは`use`プレフィックス必須
- コンポーネントファイル名はPascalCase
- 1ファイル1コンポーネント原則

### ファイル構成
```
src/
├── components/
│   └── ComponentName/
│       ├── ComponentName.tsx
│       ├── ComponentName.test.tsx
│       └── index.ts
├── services/
├── hooks/
├── types/
└── utils/
```

### 命名規則
- **コンポーネント**: PascalCase (例: `PreFlightOverview`)
- **関数・変数**: camelCase (例: `getWeatherData`)
- **定数**: UPPER_SNAKE_CASE (例: `API_ENDPOINT`)
- **型・インターフェース**: PascalCase (例: `WeatherData`)

## テスト方針

### テストレベル
1. **単体テスト**: すべてのユーティリティ関数とサービス
2. **コンポーネントテスト**: すべてのReactコンポーネント
3. **統合テスト**: API連携部分

### テスト実行
```bash
# 全テスト実行
npm test

# カバレッジ付きテスト
npm test -- --coverage

# 特定のテストファイル実行
npm test ComponentName.test.tsx

# ウォッチモード
npm test -- --watchAll
```

### テスト記述例
```typescript
describe('ComponentName', () => {
  it('should render without crashing', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## トラブルシューティング

### よくある問題

#### 1. npm install でエラーが出る
```bash
# キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 2. Amplify sandbox でエラーが出る
```bash
# AWS認証情報の確認
aws configure list

# Amplifyのリセット
npx ampx sandbox delete
npx ampx sandbox
```

#### 3. TypeScriptのエラーが出る
```bash
# 型定義の再生成
npm run type-check

# TypeScriptのバージョン確認
npx tsc --version
```

#### 4. ビルドエラー
```bash
# 依存関係の再インストール
rm -rf node_modules
npm install

# ビルドキャッシュのクリア
rm -rf build
npm run build
```

### デバッグ方法

#### React Developer Tools
1. Chrome拡張機能をインストール
2. F12でDevToolsを開く
3. ComponentsタブとProfilerタブを活用

#### VS Code デバッグ
1. `.vscode/launch.json`を設定
2. ブレークポイントを設定
3. F5でデバッグ開始

### ログ確認
```bash
# Amplifyログ
npx ampx sandbox logs

# アプリケーションログ
# ブラウザのコンソールで確認
```

## 参考リンク
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

問題が解決しない場合は、プロジェクトのIssueトラッカーに報告してください。