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
