#!/bin/bash

# MAVLink転送スクリプト
# FC → EC2への転送

# 設定値
FC_DEVICE="/dev/ttyACM0"
FC_BAUD_RATE="57600"
EC2_IP="52.194.5.104"
EC2_PORT="14555"
LOG_DIR="/home/pi/mavlink_logs"

# ログディレクトリ作成
mkdir -p $LOG_DIR

# デバイス接続確認
check_device() {
    if [ ! -e "$FC_DEVICE" ]; then
        echo "$(date): フライトコントローラーが接続されていません: $FC_DEVICE"
        return 1
    fi
    echo "$(date): フライトコントローラー検出: $FC_DEVICE"
    return 0
}

# MAVProxy起動関数
start_mavproxy() {
    echo "$(date): MAVProxyを起動中..."
    echo "$(date): FC: $FC_DEVICE (baud: $FC_BAUD_RATE)"
    echo "$(date): EC2転送先: $EC2_IP:$EC2_PORT"
    
    mavproxy.py \
        --master=$FC_DEVICE \
        --baudrate=$FC_BAUD_RATE \
        --out=udp:$EC2_IP:$EC2_PORT \
        --state-basedir=$LOG_DIR \
        --logfile=$LOG_DIR/mavlink_$(date +%Y%m%d_%H%M%S).log \
        --daemon \
        --streamrate=10
}

# メイン処理
main() {
    echo "$(date): MAVLink転送サービスを開始します"
    
    while true; do
        if check_device; then
            start_mavproxy
            sleep 5
        else
            echo "$(date): デバイス接続を待機中..."
            sleep 10
        fi
    done
}

# スクリプト実行
main