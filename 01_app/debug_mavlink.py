#!/usr/bin/env python3
"""
MAVLink NAV_CONTROLLER_OUTPUT デバッグスクリプト
EC2から直接データを受信して内容を確認
"""

import socket
import struct
import time

def parse_nav_controller_output(data):
    """NAV_CONTROLLER_OUTPUTメッセージをパース"""
    if len(data) < 26:
        return None
    
    # リトルエンディアンでパース
    nav_roll = struct.unpack('<f', data[0:4])[0]
    nav_pitch = struct.unpack('<f', data[4:8])[0]
    nav_bearing = struct.unpack('<h', data[8:10])[0]  # int16
    target_bearing = struct.unpack('<h', data[10:12])[0]  # int16
    wp_dist = struct.unpack('<H', data[12:14])[0]  # uint16
    alt_error = struct.unpack('<f', data[14:18])[0]
    aspd_error = struct.unpack('<f', data[18:22])[0]
    xtrack_error = struct.unpack('<f', data[22:26])[0]
    
    print(f"🎯 NAV_CONTROLLER_OUTPUT:")
    print(f"  nav_roll: {nav_roll:.2f} rad = {nav_roll * 180 / 3.14159:.2f}°")
    print(f"  nav_pitch: {nav_pitch:.2f} rad = {nav_pitch * 180 / 3.14159:.2f}°")
    print(f"  nav_bearing: {nav_bearing} cdeg = {nav_bearing / 100:.2f}°")
    print(f"  target_bearing: {target_bearing} cdeg = {target_bearing / 100:.2f}°")
    print(f"  wp_dist: {wp_dist} m = {wp_dist / 1000:.1f} km")
    print(f"  alt_error: {alt_error:.2f} m")
    print(f"  aspd_error: {aspd_error:.2f} m/s")
    print(f"  xtrack_error: {xtrack_error:.2f} m")
    print(f"  Raw bytes at offset 12-13: {data[12]:02x} {data[13]:02x}")
    print("-" * 50)

def main():
    # UDP受信設定
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', 14557))  # 別ポートで受信
    print("MAVLinkデバッグ受信開始 (ポート 14557)")
    print("SITLで以下を実行: output add YOUR_IP:14557")
    
    while True:
        data, addr = sock.recvfrom(1024)
        
        # MAVLink v2 ヘッダーチェック
        if len(data) > 12 and data[0] == 0xFD:
            msg_id = data[6] | (data[7] << 8) | (data[8] << 16)
            
            # NAV_CONTROLLER_OUTPUT (ID: 62)
            if msg_id == 62:
                payload_start = 12
                payload_length = data[2]
                if len(data) >= payload_start + payload_length:
                    payload = data[payload_start:payload_start + payload_length]
                    parse_nav_controller_output(payload)

if __name__ == "__main__":
    main()