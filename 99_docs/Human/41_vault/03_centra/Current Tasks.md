# 03_centra - Current Tasks

## 進行中のタスク

### UI改善
- [ ] UIを英語化（日本語→英語）
  - アラートメッセージ
  - UIラベル
  - コメント（必要に応じて）

### 機能追加・改善
- [ ] 左右上下方向のアラインを左中央揃えにする
- [ ] 見出しの折り返しを防ぐ（枠を広げる）

### Planページ
- [x] サブサイドバーをFlights画面から移植
- [x] Search flightsをSearch flight plansに変更
- [x] FLIGHTS + Add NewをPLANS + Upload Planに変更
- [x] Upload時にMapbox Geocoding APIで地名抽出
- [x] DynamoDBの.planファイル表示（アップロード日時付き）

## 完了タスク（2025-07-06）

### 実装済み機能
- [x] Mapbox Geocoding API連携
- [x] DynamoDB連携（CRUD操作）
- [x] プランファイル自動命名（TAKEOFF - LANDING形式）
- [x] Planページ作成
- [x] PlansSidebarコンポーネント実装
- [x] useFlightPlanStorageフック実装

### UI実装
- [x] サイドバー項目整理（Flights, Plan, Pre-Flight, Aircrafts, Logbook, Track Logs）
- [x] 現在ページのハイライト（#3498db）
- [x] サイドバーdivider削除
- [x] Logout画面下部配置
- [x] カラーパレット定義（サイドバー#1e374f、トップバー#32495f等）

## 実装済み機能（2025-07-06 追加）
- [x] Windy API統合（気象データ表示）
  - [x] Point Forecast API統合
  - [x] ForecastPanel実装（Pre-Flightページ）
  - [x] 離着陸地点の気象データ表示
  - 詳細: [[2025-07-06_forecast-panel|Forecast Panel実装]]
- [x] Pre-FlightページにPlanDetailsビュー追加
  - [x] Map View / Plan Details切り替えボタン
  - [x] PlanページのレイアウトをPre-Flightで利用可能に
  - [x] 設定モード無効化（Plan Details表示時）

## 最近の更新履歴

1. [[Versions/2025-07-06_forecast-panel|2025-07-06 Forecast Panel実装]]
   - Pre-flightページにForecastPanelコンポーネントを追加
   - Windy API統合（Point ForecastとMap Forecast対応）

2. [[Versions/2025-07-06_plan-details-integration|2025-07-06 Plan Details統合]]
   - Pre-FlightページにPlan Detailsビューを追加
   - MapとForecastを統合した新レイアウト

3. [[Versions/2025-07-06_uasport-implementation|2025-07-06 UASポート管理システム]]
   - UASPORTエンティティの新規作成
   - フライトプランの出発地・目的地を明確化
   - 長崎県内10箇所の初期ポートデータ

## 将来的な実装予定
- [ ] 気象データ履歴保存システム
  - DynamoDBへの定期保存
  - Lambda + EventBridgeでの自動収集
  - 履歴データ分析機能
  - 詳細: [[2025-07-06_forecast-panel#将来的な拡張案：気象データ履歴保存|履歴保存提案]]
- [ ] 飛行記録管理アプリ
	- [ ] 飛行記録と日常点検記録の記入アプリ
	スマホ最適化UI
	プルダウン式とチェックボックス中心の記入で、キーボード入力は最低限
	離着陸地点のピン→自動取得

飛行開始終了ボタン

## メモ
- Note to claude.mdは古い情報が含まれているため、このファイルで最新状態を管理
- 作業完了時は必ずVersionsに記録を残す
- 調査結果は個別ファイルに記録してリンクする