
## 前提事項
1. ドローン物流・監視飛行におけるサポートアプリです。
	1. フライトプランの確認
	2. Navlogの生成
	3. 気象状況の確認（天気予報API・気象センサーからのテレメトリ）
	4. 遠隔離発着地点の監視（ONVIFカメラ）
	5. 機体情報のリアルタイム捕捉（Mavlink）
	6. 複数機体の同時管理
	7. その他これからも追加予定
2. 詳細は03_Centrosome、01_A1-Console(機体FPV監視のProof of conceptプロジェクト)などからMDファイルを読み込んで解析すること。
3. MUI/Material symbols最新版を利用すること。
   MUIに関しての情報は**絶対に**MUI MCPを必ず使うこと
   https://fonts.google.com/?icon.set=Material+Symbols


## 実装機能アイデア
1. テレメトリ表示：Websocket
	1. Linux SITLでテスト構築着手済み
2. DJI Dock/M3T連携
3. 

## 改変指示
## サイドバー
- [x] 項目数を減らす
	- [x] Flights　定期運行するフライトプラン・また新規プランの追加をする
	- [x] Pre-Flight　天候などをクイックに確認する←名称変更した
	- [x] Aircrafts　システムへ登録された機体の参照・編集
	- [x] Logbook　飛行記録の参照
	- [x] Track Logs　飛行記録をMapに表示
	- [x] 画面下部揃えでLogout
- [x] 各ページはブランクで作成し、サイドバーのクリックで各ページに遷移するように。Flightsの現状の画面のみキープ
- [x] 選択中の現在いるページは#3498dbでハイライト
- [x] サイドバーのdivider削除


## タイポグラフィー
### 共通事項
- [ ] 左右上下方向のアラインは　**左中央揃え**　にすること
- [ ] 見出しに折り返しは使わないこと。収まらないなら枠を広げる。

## その他
- [x] Centrosome横のアイコンは'@mui/icons-material/Hub'で。
- [x] '/Users/koutarosugi/Developer/03_Centrosome/deleteme_artifact/foreflight-sample-gemini/Screenshot 2025-07-03 at 4.33.59.png'を見て、今のhttp://localhost:3000/flightsをさらに近づけられる？主にページコンテンツの部分。本家と違ってカードが複数に分かれてしまっている部分がある（例えばpayload fuel weightsとか。）これらを完璧なコピーにしたいので、最適なMUIコンポーネントを最新版MUIの中から選定して適用すること。
- [x] カラーはサイドバー#1e374f、トップバー#32495f、アクセント#3498db、その他#617185背景#f4f5f7でカラーパレットを定義すること。警告色なども適宜定義に追加すること。
- [x] 現在のカラーで修正が必要なのはトップバー、アクセントカラー。背景色などは良い。白も今のまま定義すること。
- [x] トップバーのCentrosomeとHubアイコンは/Users/koutarosugi/Developer/03_Centrosome/logoに置換すること。

## ページ
### Plan
- [ ] サブサイドバーはFlights画面を移植
	- [ ] Search flightsをSearch flight plansに変更
	- [ ] FLIGHTS + Add NewをPLANS + Upload Planに変更
		- [ ] Upload時には離陸地点と着陸地点の座標からMapbox Geocoding APIで離陸地点→着陸地点の町名を抜き出し、Planfileを自動でリネームして保存。
	- [ ] 日付フィルタは削除
	- [ ] DynamoDBの.planを表示　アップロード日時

### Pre-Flight
- [x] 天気予報テーブルをOverviewセクションに追加（2025-07-07）
	- [x] Windy Point Forecast API統合
	- [x] 離陸・着陸地点の気象データ表示
	- [x] 気温、風速・風向、湿度、視程、気圧、雲量の表示
	- [x] UASポートコード表示（UWAK/URSI等）

### Flights
- [x] サブサイドバーを実装（検索バー、FLIGHTSヘッダー、Add Newボタン、日付グルーピング、フライト項目）
- [x] カラー完全再現（背景#2a4158、ヘッダー#1e374f、選択時#3498db）
- [x] collapsible な日付グルーピング機能


### Pre-Flight 
- [x] .planファイルのマップへの描画
- [x] ローカルファイルから.planファイルを読み込む機能
- [x] 読み込んだ.planファイルの検証機能
- [x] MapCardでフライトプランの可視化

## 新規追加タスク（2025-01-05）
### 全体UI
- [ ] UIを英語化（日本語→英語）
- [x] プランファイル名をFUKUE - NAGASAKI形式に変更

### Planページ
- [x] 新規Planページの作成
- [x] サイドバーにPlanメニューを追加
- [x] Mapbox Geocoding APIを使った逆ジオコーディング機能（英語・大文字）
- [x] プラン一覧表示機能（Upload Date付き）

## 実装済み機能（2025-07-06更新）
### DynamoDB連携
- [x] DynamoDBクライアント設定（dynamodb.ts）
- [x] フライトプランのCRUD操作実装
- [x] useFlightPlanStorageフック実装

### Mapbox連携
- [x] Geocoding API統合（Plan.tsx）
- [x] 座標から地名を取得する逆ジオコーディング
- [x] 英語・大文字での地名取得

### ファイル管理
- [x] プランファイルの自動命名（TAKEOFF - LANDING形式）
- [x] アップロード日時の記録とDynamoDB保存