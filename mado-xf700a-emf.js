exports.handler = async (event) => {
    const data = event;
    const sensorData = data.data;
    
    // デバッグ情報
    console.log(`[DEBUG] Received data at ${data.timestamp} from ${data.device_id}`);
    console.log(`[DEBUG] Sensor status: ${sensorData.status || 'normal'}`);
    
    // MadoOSの仕様：1つのMQTTメッセージを1つのメトリクスとして記録
    const metrics = {
        "_aws": {
            "Timestamp": Date.now(),
            "CloudWatchMetrics": [{
                "Namespace": "Mado/XF700A",
                "Dimensions": [["DeviceId"]],
                "MetricData": [
                    {"MetricName": "WeatherData", "Unit": "Count", "Value": 1}
                ]
            }]
        },
        "DeviceId": data.device_id,
        "WeatherData": 1, // カウンタ値（常に1）
        "sensorTimestamp": data.timestamp,  // ラズパイからの送信時刻
        "cloudwatchTimestamp": new Date().toISOString(), // CloudWatch記録時刻
        "location": data.location?.name || "unknown",
        "sensorStatus": sensorData.status || "normal",
        // 全ての気象データをJSONとして記録（CloudWatch Insightsでパース可能）
        "temperature": sensorData.temperature,
        "humidity": sensorData.humidity,
        "pressure": sensorData.pressure,
        "windSpeed": sensorData.wind_speed,
        "windDirection": sensorData.wind_direction,
        "rainfall": sensorData.rain_1h,
        "illuminance": sensorData.illuminance
    };
    
    console.log(JSON.stringify(metrics));
    return { statusCode: 200, body: JSON.stringify({
        message: 'XF700A weather data logged', 
        sensorTimestamp: data.timestamp,
        sensorStatus: sensorData.status || 'normal'
    }) };
};
