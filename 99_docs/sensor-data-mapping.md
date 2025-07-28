# Madoセンサーデータマッピング

## 現在のデータ構造

### MQTTトピック
- 実際のトピック: `mado/centra/M-X/telemetry`
- デバイスID: `M-X`

### DynamoDBに保存されているデータ形式

```json
{
  "device_id": "M-X",
  "timestamp": 1753628279731,
  "data": {
    "temperature": 1000.7,      // 要確認: 単位変換が必要？
    "humidity": 3.7,            // %
    "pressure": 283.1,          // hPa（低い値）
    "wind_speed": 615.4,        // 要確認: 単位変換が必要？
    "wind_direction": 5837,     // 要確認: 0-360度に変換必要？
    "rain_1h": 0,               // mm
    "illuminance": 1.3,         // lux
    "visibility": 10,           // km
    "feels_like": 999.7         // 要確認: 単位変換が必要？
  },
  "location": {
    "lat": 35.6762,
    "lon": 139.6503,
    "name": "mado-experimental"
  },
  "metadata": {
    "sensor_model": "XF700A",
    "firmware_version": "1.0.0"
  }
}
```

## 単位変換の必要性

以下の値が異常なため、単位変換が必要と思われる：

1. **temperature**: 1000.7 → おそらく10で割る必要あり（100.07℃でも高いが）
2. **wind_speed**: 615.4 → おそらく10で割る必要あり（61.54 m/s）
3. **wind_direction**: 5837 → 360で余りを取る必要あり（5837 % 360 = 77度）
4. **feels_like**: 999.7 → temperatureと同様の変換必要

## アプリケーション側での対応

1. weatherApi.tsでデータ変換処理を追加
2. DynamoDB構造（data.temperature）に対応
3. 単位変換の実装