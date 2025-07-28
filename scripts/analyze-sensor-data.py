#!/usr/bin/env python3
"""
MQTTテストクライアントで見たセンサーデータの分析
実際の値と期待値を比較
"""

# MQTTテストクライアントで見えるデータ例
mqtt_data = {
    "device_id": "M-X",
    "timestamp": 1753628279731,
    "data": {
        "temperature": 1000.7,
        "humidity": 3.7,
        "pressure": 283.1,
        "wind_speed": 615.4,
        "wind_direction": 5837,
        "rain_1h": 0,
        "illuminance": 1.3,
        "visibility": 10,
        "feels_like": 999.7
    }
}

print("=== センサーデータ分析 ===\n")

# 各値の分析
print("1. 温度 (temperature)")
print(f"   現在値: {mqtt_data['data']['temperature']}℃")
print(f"   ÷10: {mqtt_data['data']['temperature'] / 10}℃")
print(f"   ÷100: {mqtt_data['data']['temperature'] / 100}℃")
print(f"   (÷100)-40: {(mqtt_data['data']['temperature'] / 100) - 40}℃")
print()

print("2. 風速 (wind_speed)")
print(f"   現在値: {mqtt_data['data']['wind_speed']} m/s")
print(f"   ÷10: {mqtt_data['data']['wind_speed'] / 10} m/s")
print(f"   ÷100: {mqtt_data['data']['wind_speed'] / 100} m/s")
print()

print("3. 風向 (wind_direction)")
print(f"   現在値: {mqtt_data['data']['wind_direction']}°")
print(f"   ÷10: {mqtt_data['data']['wind_direction'] / 10}°")
print(f"   %360: {mqtt_data['data']['wind_direction'] % 360}°")
print()

print("4. 気圧 (pressure)")
print(f"   現在値: {mqtt_data['data']['pressure']} hPa")
print(f"   ×10: {mqtt_data['data']['pressure'] * 10} hPa")
print(f"   +730: {mqtt_data['data']['pressure'] + 730} hPa (標準気圧に近づける)")
print()

print("5. 湿度 (humidity)")
print(f"   現在値: {mqtt_data['data']['humidity']}%")
print(f"   ×10: {mqtt_data['data']['humidity'] * 10}%")
print()

print("\n=== 推測される変換ルール ===")
print("センサーが生データをそのまま送信している可能性：")
print("- 温度: 生値を100で割って-40する必要あり")
print("- 風速: 生値を100で割る必要あり")
print("- 風向: 生値を10で割る必要あり")
print("- 気圧: 不明（値が低すぎる）")
print("- 湿度: 生値を10倍する必要あり？")