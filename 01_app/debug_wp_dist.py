#!/usr/bin/env python3
"""
wp_distの連続性を確認するデバッグスクリプト
"""

import socket
import struct
import time
from collections import deque

def parse_nav_controller_output(data):
    """NAV_CONTROLLER_OUTPUTメッセージをパース"""
    if len(data) < 26:
        return None
    
    wp_dist = struct.unpack('<H', data[12:14])[0]  # uint16
    return wp_dist

def main():
    # 直接EC2からUDPで受信
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    print("EC2のIPアドレスを入力してください (例: 52.194.5.104):")
    ec2_ip = input().strip()
    
    # EC2に直接接続
    sock.sendto(b'', (ec2_ip, 14555))
    
    print(f"EC2 {ec2_ip}:14555 から受信開始...")
    
    # 過去のwp_dist値を保存
    wp_dist_history = deque(maxlen=100)
    last_print_time = time.time()
    
    while True:
        try:
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
                        wp_dist = parse_nav_controller_output(payload)
                        
                        if wp_dist is not None:
                            wp_dist_history.append(wp_dist)
                            
                            # 1秒ごとに統計を表示
                            if time.time() - last_print_time > 1.0:
                                if len(wp_dist_history) > 1:
                                    min_dist = min(wp_dist_history)
                                    max_dist = max(wp_dist_history)
                                    avg_dist = sum(wp_dist_history) / len(wp_dist_history)
                                    variation = max_dist - min_dist
                                    
                                    print(f"[統計] 最小: {min_dist}m, 最大: {max_dist}m, 平均: {avg_dist:.0f}m, 変動幅: {variation}m")
                                    
                                    # 急激な変化を検出
                                    if variation > 10000:  # 10km以上の変動
                                        print(f"⚠️  大きな変動を検出！過去の値: {list(wp_dist_history)[-10:]}")
                                
                                last_print_time = time.time()
                                
        except Exception as e:
            print(f"エラー: {e}")

if __name__ == "__main__":
    main()