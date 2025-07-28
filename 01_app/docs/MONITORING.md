# 監視とログ機能ガイド

## 概要

このドキュメントは、Centra Weather Dashboardアプリケーションの監視とログ機能について説明します。

## 実装されている監視機能

### 1. 統合ロギングシステム

**実装場所**: `src/utils/logger.ts`

機能:
- ログレベル制御（DEBUG, INFO, WARN, ERROR, FATAL）
- 開発環境：コンソール出力
- 本番環境：CloudWatch Logsへの自動送信
- バッチ処理による効率的なログ送信
- ユーザーコンテキストと相関IDの追加

```typescript
// 使用例
import { logger } from './utils/logger';

// 基本的なログ
logger.info('Weather', 'データ取得完了', { deviceId: 'M-X-001' });

// エラーログ
logger.error('API', 'リクエスト失敗', error, { endpoint: '/weather/data' });

// ユーザーコンテキストの設定
logger.setUserContext('user123');
```

### 2. CloudWatchメトリクス

**実装場所**: `src/utils/monitoring/metrics.ts`

収集されるメトリクス:
- APIリクエスト数、レイテンシー、エラー率
- ページロード時間
- コンポーネントレンダリング時間
- メモリ使用量
- カスタムビジネスメトリクス

```typescript
// 使用例
import { metrics } from './utils/monitoring/metrics';

// カウンターメトリクス
metrics.putMetric('WeatherDataFetch', 1, 'Count');

// レイテンシーメトリクス
metrics.putMetric('APIResponseTime', 250, 'Milliseconds');

// API呼び出しの自動計測
const data = await metrics.measureApiCall('GetWeatherData', apiCall);
```

### 3. パフォーマンス監視

**実装場所**: `src/hooks/usePerformanceMonitor.ts`

機能:
- コンポーネントのレンダリング時間計測
- メモリ使用量の追跡
- 頻繁な再レンダリングの検出
- React Profilerとの統合

```typescript
// 使用例
const { measureApiCall, markPerformance } = usePerformanceMonitor({
  componentName: 'WeatherDashboard',
  trackRenderTime: true,
  trackMemory: true
});

// パフォーマンスマークの設定
markPerformance('dataFetchStart');
// ... データ取得処理 ...
measurePerformance('dataFetch', 'dataFetchStart');
```

### 4. エラーレポーティング

**実装場所**: `src/utils/monitoring/errorReporting.ts`

機能:
- グローバルエラーハンドリング
- Promise rejection の捕捉
- React Error Boundaryとの統合
- エラーの自動分類と詳細情報収集

```typescript
// 使用例
import { errorReporter } from './utils/monitoring/errorReporting';

// カスタムエラーの報告
errorReporter.reportCustomError('DataValidation', 'Invalid sensor data');

// APIエラーの報告
errorReporter.reportApiError('GetWeatherData', error, request, response);
```

### 5. ユーザー行動トラッキング

**実装場所**: `src/utils/monitoring/userTracking.ts`

追跡される情報:
- ページビュー
- クリックイベント
- フォーム送信
- 検索クエリ
- カスタムイベント

```typescript
// 使用例
import { userTracker } from './utils/monitoring/userTracking';

// イベントトラッキング
userTracker.track({
  category: 'Weather',
  action: 'device_change',
  label: 'M-X-002'
});

// ページビュー
userTracker.trackPageView({
  path: '/weather',
  title: 'Weather Dashboard'
});
```

## Web Vitalsの監視

**実装場所**: `src/reportWebVitals.ts`

監視される指標:
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- TTFB (Time to First Byte)

閾値:
- CLS: 0.25
- FID: 300ms
- FCP: 3000ms
- LCP: 4000ms
- TTFB: 800ms

## CloudWatchダッシュボード設定

### 推奨ウィジェット

1. **APIパフォーマンス**
   - リクエスト数（時系列）
   - 平均レスポンスタイム
   - エラー率

2. **ユーザーエクスペリエンス**
   - ページロード時間分布
   - Web Vitalsスコア
   - JavaScript エラー数

3. **システムヘルス**
   - メモリ使用量
   - 同時接続数
   - WebSocket接続状態

### アラーム設定例

```json
{
  "MetricName": "APIRequestError",
  "Threshold": 10,
  "ComparisonOperator": "GreaterThanThreshold",
  "EvaluationPeriods": 2,
  "Period": 300
}
```

## 開発環境での使用

開発環境では以下の機能が有効:
- 詳細なコンソールログ出力
- パフォーマンス警告の表示
- エラーの詳細スタックトレース
- リアルタイムメトリクス表示

## プライバシーへの配慮

- 個人識別情報（PII）のログ記録を避ける
- センシティブなデータのマスキング
- ユーザーの同意に基づくトラッキング
- データ保持期間の設定

## トラブルシューティング

### ログが送信されない場合

1. AWS認証情報の確認
2. CloudWatch Logsロググループの存在確認
3. IAMロールの権限確認
4. ネットワーク接続の確認

### メトリクスが記録されない場合

1. メトリクス名前空間の確認
2. ディメンションの正確性確認
3. バッチサイズとフラッシュ間隔の調整
4. CloudWatchの制限事項確認

## 更新履歴

- 2025-01-27: 初版作成（タスク17実装）