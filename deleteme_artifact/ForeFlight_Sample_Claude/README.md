# ForeFlight Sample Claude

FigmaデザインからTypeScript + MUIで完全再現したForeFlightサイドバーコンポーネント

## Table of Contents
- [概要](#概要)
- [技術スタック](#技術スタック)
- [セットアップ](#セットアップ)
- [使い方](#使い方)
- [コンポーネント仕様](#コンポーネント仕様)
- [カスタマイズ](#カスタマイズ)
- [進捗情報](#進捗情報)

## 概要

このプロジェクトは、Figma Rawプラグインからエクスポートされたデザインデータを基に、ForeFlightアプリケーションのサイドバーUIをMaterial-UIで完全再現したものです。

**✅ 完成状態** - 2025年7月3日時点で100%実装完了

## 技術スタック

- **React** 19.1.0（最新版）
- **TypeScript** 4.9.5（react-scripts互換最新）
- **Material-UI (MUI)** 7.2.0（最新版）
- **@emotion/react** & **@emotion/styled**
- **MUI Icons**

## セットアップ

### 必要な環境
- Node.js 16以上
- npm または yarn

### インストール手順

1. 依存関係のインストール
```bash
npm install
```

2. 開発サーバーの起動
```bash
npm start
```

3. ブラウザで確認
```
http://localhost:3001
```

**注意**: ポート3000はtodokuru（PWA）が使用しているため、3001を使用

## 使い方

### 基本的な使用方法

```tsx
import { ForeFlightSidebar } from './components/ForeFlight';

function App() {
  const [activeItemId, setActiveItemId] = useState('flights');

  const handleItemClick = (itemId: string) => {
    setActiveItemId(itemId);
  };

  return (
    <ForeFlightSidebar
      activeItemId={activeItemId}
      onItemClick={handleItemClick}
    />
  );
}
```

## コンポーネント仕様

### ForeFlightSidebar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menuItems` | `MenuItem[]` | デフォルトメニュー | メニュー項目の配列 |
| `activeItemId` | `string` | `'flights'` | アクティブなメニュー項目のID |
| `onItemClick` | `(itemId: string) => void` | `() => {}` | メニュー項目クリック時のコールバック |
| `width` | `number` | `165` | サイドバーの幅（px） |
| `height` | `number` | `1200` | サイドバーの高さ（px） |

### MenuItem インターフェース

```typescript
interface MenuItem {
  id: string;          // 一意のID
  label: string;       // 表示テキスト
  icon?: string;       // アイコン名
  isActive?: boolean;  // アクティブ状態
  variant?: string;    // バリアント（Figmaデザインの互換性用）
}
```

## カスタマイズ

### テーマのカスタマイズ

`src/components/ForeFlight/theme.ts`でテーマをカスタマイズできます：

```typescript
export const foreFlightTheme = createTheme({
  palette: {
    primary: {
      main: '#1e374f', // メインの背景色
    },
    secondary: {
      main: '#3498db', // アクティブ項目の色
    },
    // ...
  },
});
```

### メニュー項目のカスタマイズ

独自のメニュー項目を定義：

```typescript
const customMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  // ...
];
```

## Figmaデザイン仕様

- **サイドバー幅**: 165px
- **サイドバー高さ**: 1200px  
- **背景色**: #1e374f
- **アクティブ項目色**: #3498db
- **メニュー項目高さ**: 32.41px (Learn & Solveは32px)
- **角丸**: 2px
- **フォント**: Helvetica Neue, 11px
- **アイコンサイズ**: 16px
- **ドロップシャドウ**: 1px 0px 0px rgba(0, 0, 0, 0.2)

完全にFigmaデザインの仕様に合わせて実装されています。

## 進捗情報

詳細な開発進捗は [`PROGRESS.md`](./PROGRESS.md) を参照してください。

### 現在の状態
- **ステータス**: ✅ 完成・動作確認済み
- **最終更新**: 2025年7月3日 02:55
- **動作URL**: http://localhost:3001

### 再開時のコマンド
```bash
cd /Users/koutarosugi/Developer/03_Centrosome/deleteme_artifact/ForeFlight_Sample_Claude
PORT=3001 npm run dev
```