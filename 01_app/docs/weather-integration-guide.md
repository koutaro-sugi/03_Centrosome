# Weather Integration Guide

## 概要

CentraアプリケーションでMadoセンサーからの気象データを表示するための統合ガイドです。

## アーキテクチャ

```
[Mado Sensor] → [Raspberry Pi] → [AWS IoT Core] → [API Gateway/Lambda] → [Centra App]
     ↓                                    ↓
[XF700A]                            [DynamoDB]
```

## セットアップ手順

### 1. 開発環境（モックサーバー使用）

```bash
# モックサーバーのインストール
cd mock-server
npm install

# モックサーバーの起動
npm start

# 別ターミナルでCentraアプリを起動
cd ..
npm start
```

### 2. 本番環境（AWS接続）

#### Raspberry Pi側の設定

```bash
# 新しいスクリプトをコピー
scp xf700a_aws_iot_centra.py pi@raspberrypi.local:/home/pi/MadoOS/software/

# Raspberry Piにログイン
ssh pi@raspberrypi.local

# 実行権限を付与
chmod +x /home/pi/MadoOS/software/xf700a_aws_iot_centra.py

# テスト実行
sudo python3 /home/pi/MadoOS/software/xf700a_aws_iot_centra.py

# systemdサービスの更新
sudo systemctl edit xf700a-iot
# ExecStartを新しいスクリプトに変更

sudo systemctl restart xf700a-iot
sudo systemctl status xf700a-iot
```

#### AWS側の設定

1. DynamoDBテーブル作成（aws-iot-setup.md参照）
2. IoT Rule作成
3. Lambda関数デプロイ
4. API Gateway設定

#### Centraアプリの設定

`.env`ファイル:
```
REACT_APP_IOT_API_ENDPOINT=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/prod
```

## データフォーマット

### センサーデータ構造

```json
{
  "device_id": "mado-sensor-01",
  "timestamp": "2024-01-24T12:34:56.789Z",
  "data": {
    "temperature": 22.5,      // 気温（℃）
    "humidity": 60.2,         // 湿度（%）
    "pressure": 1013.25,      // 気圧（hPa）
    "wind_speed": 2.5,        // 風速（m/s）
    "wind_direction": 180,    // 風向（度）
    "rain_1h": 0.0,          // 降水量（mm/h）
    "illuminance": 25.5,      // 照度（KLux）
    "visibility": 10.0,       // 視程（km）
    "feels_like": 21.8       // 体感温度（℃）
  }
}
```

## トピック構成

- 実センサー: `dt/mado/mado-sensor-01/data`
- ダミー1: `dt/mado/mado-dummy-01/data`
- ダミー2: `dt/mado/mado-dummy-02/data`
- ダミー3: `dt/mado/mado-dummy-03/data`

## 動作確認

### モックサーバー

1. http://localhost:8081/devices/mado-sensor-01/latest にアクセス
2. JSONデータが返されることを確認

### Weatherページ

1. Centraアプリのサイドバーから「Weather」をクリック
2. 左側のリストから観測地点を選択
3. リアルタイムデータが1秒ごとに更新されることを確認

## トラブルシューティング

### データが表示されない

1. **開発環境**
   - モックサーバーが起動しているか確認
   - `.env`の`REACT_APP_IOT_API_ENDPOINT`が正しく設定されているか確認

2. **本番環境**
   - Raspberry PiがAWS IoT Coreに接続できているか確認
   - IoT RuleでDynamoDBにデータが書き込まれているか確認
   - API GatewayのCORS設定を確認

### 接続エラー

- ブラウザのコンソールでエラーメッセージを確認
- ネットワークタブでAPIリクエストの状態を確認

## 今後の実装予定

1. **過去データ表示**
   - 時系列グラフ
   - データエクスポート機能

2. **アラート機能**
   - 閾値設定
   - 通知機能

3. **データ分析**
   - 統計情報表示
   - 予測機能