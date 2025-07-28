# Mado センサーデータ仕様書

## 概要
このドキュメントは、MadoセンサーとCentraアプリケーション間のデータ仕様を定義します。

## MQTTトピック構造

### 実際の運用トピック
- テレメトリ: `mado/centra/{device_id}/telemetry`
- ステータス: `mado/centra/{device_id}/status`
- コマンド: `mado/centra/{device_id}/command`

現在のデバイスID: `M-X`

## データペイロード形式

### テレメトリデータ
```json
{
  "device_id": "M-X",
  "timestamp": "2025-01-27T14:00:00Z",
  "location": {
    "name": "mado-experimental",
    "lat": 35.6762,
    "lon": 139.6503
  },
  "data": {
    "temperature": 25.3,      // ℃
    "humidity": 65.2,         // %
    "pressure": 1013.2,       // hPa
    "wind_speed": 3.5,        // m/s
    "wind_direction": 180,    // degrees
    "rain_1h": 0.0,          // mm
    "illuminance": 45.0,      // klux
    "visibility": 10.0,       // km
    "feels_like": 24.3        // ℃
  },
  "metadata": {
    "sensor_model": "XF700A",
    "firmware_version": "1.0.0"
  }
}
```

## センサーデータ処理フロー

### 1. XF700Aセンサー → Raspberry Pi
- Modbus RTU通信
- RS485シリアル接続
- 生データは整数値

### 2. Raspberry Piでの変換
```python
# xf700a_aws_iot_mado.py での変換
wind_speed = raw_value / 10.0  # 風速
temp = raw_value / 10.0        # 温度
humidity = raw_value / 10.0    # 湿度
pressure = raw_value / 10.0    # 気圧
rain = raw_value / 10.0        # 雨量
light = raw_value / 10.0       # 照度（klux）
```

### 3. DynamoDBに保存される値の問題

**現在の問題**: DynamoDBに保存されている値が異常に大きい
- temperature: 1000.7 (期待値の100倍)
- wind_speed: 615.4 (期待値の100倍)
- wind_direction: 5837 (360度を超えている)

**考えられる原因**:
1. IoT RuleまたはLambda関数で誤った変換が行われている
2. センサーからの生データが期待と異なる
3. 複数回の変換が重複して適用されている

## 単位と範囲

| データ項目 | 単位 | 正常範囲 | 現在の値（例） | 問題 |
|-----------|------|----------|--------------|------|
| temperature | ℃ | -40 ~ 60 | 1000.7 | 100倍？ |
| humidity | % | 0 ~ 100 | 3.7 | 正常 |
| pressure | hPa | 900 ~ 1100 | 283.1 | 低すぎる |
| wind_speed | m/s | 0 ~ 50 | 615.4 | 100倍？ |
| wind_direction | degrees | 0 ~ 359 | 5837 | 範囲外 |
| rain_1h | mm | 0 ~ 100 | 0 | 正常 |
| illuminance | klux | 0 ~ 100 | 1.3 | 正常 |
| visibility | km | 0 ~ 20 | 10 | 正常 |
| feels_like | ℃ | -40 ~ 60 | 999.7 | 100倍？ |

## 推奨される修正

### オプション1: センサー側での修正
- `xf700a_aws_iot_mado.py`で正しい変換を確認
- 特に温度、風速、風向の変換ロジックを検証

### オプション2: アプリケーション側での修正
- `weatherApi.ts`でデータ受信時に変換
```typescript
// 例: transformToSensorDataメソッドで変換
temperature: item.data.temperature / 100,
wind_speed: item.data.wind_speed / 100,
wind_direction: item.data.wind_direction % 360,
feels_like: item.data.feels_like / 100
```

### オプション3: IoT Rule/Lambdaでの修正
- データ保存前に正しい値に変換
- 最も影響が少ない方法

## 更新履歴
- 2025-01-27: 初版作成
- 問題: センサーデータの単位変換エラーを発見