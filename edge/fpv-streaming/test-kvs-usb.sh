#!/bin/bash

# KVS USBテストスクリプト

echo "===== KVS USB接続テスト ====="
echo "時刻: $(date)"

# 環境変数設定
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_KVS_LOG_LEVEL=3
export GST_DEBUG=1

# AWS認証情報の読み込み
if [ -f /home/pi/.aws/credentials ]; then
    export AWS_CONFIG_FILE=/home/pi/.aws/config
    export AWS_SHARED_CREDENTIALS_FILE=/home/pi/.aws/credentials
fi

# AWS認証確認
echo -e "\n1. AWS認証確認:"
if aws sts get-caller-identity > /dev/null 2>&1; then
    echo "AWS認証: OK"
else
    echo "AWS認証: NG"
    echo "詳細:"
    aws sts get-caller-identity 2>&1
fi

# USBカメラ確認
echo -e "\n2. USBカメラ確認:"
if [ -e "/dev/video2" ]; then
    echo "/dev/video2: 存在します"
    v4l2-ctl -d /dev/video2 --list-formats-ext | head -20
else
    echo "/dev/video2: 存在しません"
fi

# KVS SDKビルド確認
echo -e "\n3. KVS SDKビルド確認:"
SDK_PATH="/home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c/build/samples/kvsWebrtcClientMasterGstSample"
if [ -f "$SDK_PATH" ]; then
    echo "SDK実行ファイル: 存在します"
    ls -la "$SDK_PATH"
else
    echo "SDK実行ファイル: 存在しません"
fi

# シンプルなテスト実行
echo -e "\n4. シンプルなKVS起動テスト (5秒間):"
cd /home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c/build

# 直接SDKを実行
echo "実行コマンド: ./samples/kvsWebrtcClientMasterGstSample usb-camera-channel video-only devicesrc opus h264"
timeout 5 ./samples/kvsWebrtcClientMasterGstSample usb-camera-channel video-only devicesrc opus h264 2>&1 | head -50

echo -e "\n===== テスト完了 ======"