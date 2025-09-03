# 2025-07-06 - Forecast Panel実装

## 実装内容
Pre-FlightページにWindy API統合の気象データパネルを実装

## 実装詳細

### 1. ForecastPanelコンポーネント
- **ファイル**: `src/components/ForecastPanel.tsx`
- **機能**:
  - 離陸・着陸地点の気象データ表示
  - ドラッグ&ドロップで位置調整可能
  - リサイズ可能
  - 折り畳み可能なセクション
  - リアルタイムデータ更新

### 2. Windy API統合
- **ファイル**: `src/services/windyApi.ts`
- **機能**:
  - Point Forecast APIの呼び出し
  - 気象データの処理・変換
  - 単位変換（m/s → knots、Kelvin → Celsius）
  - Mapbox Geocodingとの連携で地名取得

### 3. 表示データ
- 気温（°C）
- 風速・風向（knots、度）
- 湿度（%）
- 視程（km）
- 気圧（hPa）
- 雲量（%）

## 環境設定
```bash
# .envファイルに追加

# Windy API Keys (2 different APIs available)
# Point Forecast API - For detailed weather data at specific coordinates
# Get your key at: https://api.windy.com/point-forecast
REACT_APP_WINDY_POINT_FORECAST_KEY=your_point_forecast_api_key_here

# Map Forecast API - For weather map overlays and visualizations  
# Get your key at: https://api.windy.com/map-forecast
REACT_APP_WINDY_MAP_FORECAST_KEY=your_map_forecast_api_key_here
```

### Windy API 2種類の使い分け
1. **Point Forecast API**
   - 特定座標の詳細気象データ取得
   - ForecastPanelで使用
   - 離着陸地点の気象情報表示

2. **Map Forecast API**
   - 地図上の気象レイヤー表示
   - 将来的にMapCardに統合予定
   - 風、雨、気温等のオーバーレイ

## 将来的な拡張案：気象データ履歴保存

### 背景
- Windy APIは過去データを提供しない
- Meteoblue History APIは高額
- ドローン運航の安全性向上には履歴データが重要

### 実装提案

#### 1. データ収集システム
```typescript
// DynamoDBテーブル構造
WeatherHistory {
  id: string;           // UUID
  locationId: string;   // 地点識別子
  lat: number;
  lon: number;
  timestamp: string;    // ISO 8601
  model: string;        // GFS, ECMWF等
  data: {
    temperature: number;
    windSpeed: number;
    windDirection: number;
    humidity: number;
    pressure: number;
    visibility: number;
    cloudCover: number;
    precipitation: number;
  };
  forecast: Array<{     // 予報データも保存
    time: string;
    temperature: number;
    windSpeed: number;
    // ...
  }>;
}
```

#### 2. 定期実行バッチ
- AWS Lambda + EventBridge
- 6時間ごとに主要地点のデータ取得
- フライトプランの離着陸地点を自動追加

#### 3. データ活用
- 過去の気象傾向分析
- 予報精度の検証
- 季節別・時間帯別の統計
- 危険気象パターンの検出

#### 4. 実装ステップ
1. DynamoDBテーブル作成
2. Lambda関数でデータ収集
3. 履歴表示UI追加
4. 分析ダッシュボード作成

### メリット
- 独自の気象データベース構築
- コスト効率的（APIコール数を最適化）
- ドローン運航に特化した分析が可能
- 将来的にAI予測モデルの学習データとして活用

## 次のステップ
1. 実際のWindy APIキーでテスト
2. エラーハンドリングの強化
3. 複数の気象モデル切り替え機能
4. 履歴保存システムの設計詳細化

## 関連リンク
- [[../Overview|プロジェクト概要へ戻る]]
- [[../Current Tasks|現在のタスクへ戻る]]
- [[2025-07-06 - Windy API調査|Windy API調査結果]]