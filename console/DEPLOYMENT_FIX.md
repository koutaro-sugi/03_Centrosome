# Amplify Gen2 デプロイ修正ガイド

## 🚨 デプロイ失敗の原因

BUILD.txtの分析により、以下の問題が特定されました：

### 1. 主要エラー

- **amplify_outputs.json ファイルが見つからない** (最重要)
- **NodeJS型定義エラー**
- **Node.jsバージョン不一致**

### 2. 警告

- npm依存関係の非推奨警告
- セキュリティ脆弱性 (3 moderate severity)

---

## 🔧 修正手順

### 即座に修正 (必須)

#### 1. amplify_outputs.json の問題解決

**問題**: `src/amplifyconfigure.ts` が `../amplify_outputs.json` を参照できない

**解決方法A: 相対パス修正**

```typescript
// src/amplifyconfigure.ts を修正
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json'; // 相対パス修正

// Configure Amplify
try {
  Amplify.configure(outputs);
} catch (error) {
  console.error('Amplify configuration error:', error);
  console.info('Please run "amplify push" to create backend resources.');
}
```

**解決方法B: ファイル配置修正**

```bash
# amplify_outputs.json を src/ 配下にコピー
cp amplify_outputs.json src/
```

#### 2. TypeScript設定修正

**tsconfig.json に型定義追加:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "types": ["node", "vite/client"] // 追加
  },
  "include": ["src", "env.d.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**または package.json に型定義追加:**

```json
{
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

#### 3. Node.js バージョン設定

**amplify.yml を修正してNode.js 20を指定:**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        # Node.js 20を明示的に指定
        - nvm install 20
        - nvm use 20
        - cd minimal-viewer
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: minimal-viewer/dist
    files:
      - '**/*'
  cache:
    paths:
      - minimal-viewer/node_modules/**/*
```

---

## 🔧 推奨修正実装

### 修正 1: amplifyconfigure.ts を更新

```typescript
import { Amplify } from 'aws-amplify';

// 環境に応じて設定を動的に読み込み
const loadAmplifyConfig = async () => {
  try {
    // プロダクション環境ではamplify_outputs.jsonを使用
    const outputs = await import('./amplify_outputs.json');
    return outputs.default;
  } catch (error) {
    console.warn('amplify_outputs.json not found, using fallback config');
    // 開発環境用のフォールバック設定
    return {
      version: '1',
      auth: {
        aws_region: 'ap-northeast-1',
        // 他の必要な設定...
      },
    };
  }
};

// Configure Amplify
const configureAmplify = async () => {
  try {
    const config = await loadAmplifyConfig();
    Amplify.configure(config);
  } catch (error) {
    console.error('Amplify configuration error:', error);
  }
};

// 非同期でAmplifyを設定
configureAmplify();
```

### 修正 2: 環境変数の活用

```typescript
// vite.config.ts を更新
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.message?.includes(
            'Module level directives cause errors when bundled'
          ) ||
          warning.message?.includes('"use client"')
        ) {
          return;
        }
        if (
          warning.message?.includes(
            "The CJS build of Vite's Node API is deprecated"
          )
        ) {
          return;
        }
        warn(warning);
      },
      external: [],
    },
  },
  publicDir: 'public',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  resolve: {
    alias: {
      // amplify_outputs.jsonのパスエイリアス
      '@/amplify_outputs': './amplify_outputs.json',
    },
  },
});
```

---

## ⚡ 緊急修正コマンド

以下のコマンドを順次実行：

```bash
# 1. Node.js型定義を追加
cd minimal-viewer
npm install -D @types/node

# 2. amplify_outputs.json をsrcにコピー
cp amplify_outputs.json src/

# 3. セキュリティ脆弱性を修正
npm audit fix

# 4. ローカルビルドテスト
npm run build

# 5. 修正内容をコミット
git add .
git commit -m "Fix: Amplify deployment issues

- Add @types/node for TypeScript support
- Copy amplify_outputs.json to src directory
- Fix security vulnerabilities
- Update build configuration"

# 6. プッシュしてデプロイ再実行
git push origin main
```

---

## 🔍 検証方法

### ローカル検証

```bash
# TypeScriptエラーチェック
npx tsc --noEmit

# ビルド成功確認
npm run build

# プレビューサーバーで動作確認
npm run preview
```

### Amplify Console確認

1. AWS Amplify Consoleでビルドログを確認
2. エラーが解消されているかチェック
3. デプロイ完了後、アプリケーションが正常に動作するか確認

---

## 📋 長期的改善計画

### Phase 1 (即座に実装)

- [ ] amplify_outputs.json パス修正
- [ ] Node.js型定義追加
- [ ] Node.js 20バージョン固定

### Phase 2 (1週間以内)

- [ ] 依存関係の更新
- [ ] セキュリティ脆弱性の完全解決
- [ ] CI/CDパイプラインの改善

### Phase 3 (1ヶ月以内)

- [ ] 環境固有の設定分離
- [ ] ビルド最適化
- [ ] 監視・ログ機能追加

---

## 🎯 成功指標

✅ **修正完了の確認項目:**

- [ ] TypeScriptコンパイルエラー 0件
- [ ] Viteビルド成功
- [ ] Amplifyデプロイ成功
- [ ] アプリケーション正常動作
- [ ] セキュリティ脆弱性 0件

この修正により、Amplify Gen2でのデプロイが成功するはずです。
