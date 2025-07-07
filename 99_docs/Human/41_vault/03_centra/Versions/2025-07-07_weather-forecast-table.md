# 2025-07-07 Weather Forecast Table Implementation

## 概要
Pre-flightページのOverviewセクションに天気予報テーブルを実装

## 実装内容

### 1. Windy Point Forecast API統合
- `/src/services/windyApi.ts` - API通信サービス
- 環境変数 `REACT_APP_WINDY_POINT_FORECAST_KEY` 使用
- GFSモデルでリアルタイム気象データ取得

### 2. 気象データ表示
- 離陸地点（Departure）と着陸地点（Destination）の現在の天気
- 表示項目：
  - 気温（Kelvin→Celsius変換）
  - 風速・風向（wind_u/v成分から計算）
  - 湿度
  - 視程（固定値10km）
  - 気圧（Pa→hPa変換）
  - 雲量（低層・中層・上層雲の最大値）

### 3. 位置名表示ロジック
1. UASポートがある場合：`UWAK - 稚内市` 形式
2. UASポートがない場合：Mapbox geocodingの地名
3. どちらもない場合：デフォルト "Departure/Destination"

### 4. 修正したバグ
- Windy APIレスポンスのキー名不一致
  - `temp` → `temp-surface`
  - `wind` → `wind_u-surface`, `wind_v-surface`
  - `pressure` → `pressure-surface` 等
- TypeScript型エラー（TableContainerのprops）
- DynamoDB GSI1インデックスエラーへの対応

### 5. ファイル変更
- `/src/components/PlanDetailsWithForecast.tsx` - メインコンポーネント
- `/src/services/windyApi.ts` - API通信ロジック
- `/src/pages/PreFlight.tsx` - コンポーネント統合

## 今後の改善点
- 視程データの動的取得（現在は固定値）
- 過去3時間降水量の活用
- 突風（gust）データの表示