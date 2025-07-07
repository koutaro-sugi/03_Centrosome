# 2025-07-06 - Plan Details Integration

## 実装内容
Pre-FlightページにPlanページのレイアウト（PlanDetails）を統合

## 実装詳細

### 1. ビュー切り替え機能
- **Map View**: 従来のPre-Flightレイアウト（MapCard + ForecastPanel）
- **Plan Details**: Planページと同じ詳細レイアウト
- ヘッダーボタンで切り替え可能

### 2. 実装変更点
```typescript
// 状態管理
const [showPlanDetails, setShowPlanDetails] = useLocalStorage('preflight_show_plan_details', false);

// レイアウト切り替え
{showPlanDetails ? (
  <PlanDetails selectedPlanId={selectedPlanId} />
) : (
  // 従来のMap + Forecastレイアウト
)}
```

### 3. UI改善
- 切り替えボタンのハイライト表示
- 設定モードの自動無効化（Plan Details表示時）
- アイコン変更（ViewList ⇔ Map）

## メリット
1. **統一された体験**: 同じプラン詳細をPre-Flightページでも確認可能
2. **効率的な作業**: ページ遷移なしでビュー切り替え
3. **柔軟な使い分け**: 用途に応じてレイアウト選択

## 使い方
1. Pre-Flightページで「Plan Details」ボタンをクリック
2. Planページと同じ詳細レイアウトが表示
3. 「Map View」ボタンで元のレイアウトに戻る

## 技術的ポイント
- LocalStorageで表示状態を保持
- PlanDetailsコンポーネントの再利用
- 条件付きレンダリングで切り替え実装

## 更新内容（2025-07-06 追記）

### PlanDetailsWithForecastコンポーネント作成
- PlanDetailsの拡張版として新規作成
- MapとForecastPanelを横並びに配置
- Forecastは左側に固定配置（ドラッグ不可）
- Mapは右側に配置（Plan Details内では固定）

### 地名表示の改善
- DepartureとDestinationに地名を表示
- Mapbox Geocoding APIで座標から地名を取得
- 座標は小さく下に表示

### レイアウトの違い
1. **Map View**: 
   - MapCardとForecastPanelが独立してドラッグ可能
   - 設定モードで位置とサイズを調整可能
   
2. **Plan Details View**:
   - MapとForecastが固定レイアウト
   - Forecastは左側400px固定
   - Mapは残りスペースを使用
   - ドラッグ不可（整理されたビュー）

## 関連リンク
- [[../Overview|プロジェクト概要へ戻る]]
- [[../Current Tasks|現在のタスクへ戻る]]
- [[2025-07-06_forecast-panel|Forecast Panel実装]]