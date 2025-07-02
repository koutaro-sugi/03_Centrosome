#!/bin/bash

# KVS USB Camera Wrapper (Debug版)
# 詳細なデバッグ情報を出力

set -e

echo "===== KVS USB Wrapper Debug ====="
echo "時刻: $(date)"

# 引数
CHANNEL_NAME="${1:-usb-camera-channel}"
DEVICE="${2:-/dev/video2}"
CODEC="${3:-h264}"

echo "チャンネル: $CHANNEL_NAME"
echo "デバイス: $DEVICE"
echo "コーデック: $CODEC"

# 環境変数設定
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_KVS_LOG_LEVEL=${AWS_KVS_LOG_LEVEL:-3}
export GST_DEBUG=${GST_DEBUG:-2}

echo "AWS_DEFAULT_REGION: $AWS_DEFAULT_REGION"
echo "AWS_KVS_LOG_LEVEL: $AWS_KVS_LOG_LEVEL"

# USBカメラ用の環境変数
export GST_V4L2_USE_LIBV4L2=1
export GST_V4L2SRC_DEVICE="$DEVICE"
export GST_PLUGIN_PATH=/usr/lib/gstreamer-1.0
export LD_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu:$LD_LIBRARY_PATH

# カスタムGStreamerパイプライン
export GST_PLUGIN_FEATURE_RANK="v4l2src:PRIMARY+100,autovideosrc:NONE"

# デバイスチェック
echo -e "\n1. デバイス確認:"
if [ ! -e "$DEVICE" ]; then
    echo "エラー: デバイス $DEVICE が見つかりません"
    exit 1
else
    echo "デバイス $DEVICE: OK"
    ls -la "$DEVICE"
fi

# H.264サポート確認
echo -e "\n2. H.264サポート確認:"
if v4l2-ctl -d "$DEVICE" --list-formats-ext | grep -q "H264"; then
    echo "H.264 ハードウェアエンコーディング: サポート"
    export USE_HARDWARE_ENCODING=1
else
    echo "H.264 ハードウェアエンコーディング: 非サポート (ソフトウェアを使用)"
    export USE_HARDWARE_ENCODING=0
fi

# AWS認証確認
echo -e "\n3. AWS認証確認:"
if aws sts get-caller-identity > /dev/null 2>&1; then
    echo "AWS認証: OK"
    aws sts get-caller-identity | grep Arn
else
    echo "AWS認証: NG"
    echo "詳細:"
    aws sts get-caller-identity 2>&1
    exit 1
fi

# SDK実行ディレクトリ移動
echo -e "\n4. SDK実行:"
SDK_DIR="/home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c/build"
if [ ! -d "$SDK_DIR" ]; then
    echo "エラー: SDKディレクトリが見つかりません: $SDK_DIR"
    exit 1
fi

cd "$SDK_DIR"
echo "ディレクトリ変更: $SDK_DIR"

# SDK実行ファイル確認
SDK_EXEC="./samples/kvsWebrtcClientMasterGstSample"
if [ ! -f "$SDK_EXEC" ]; then
    echo "エラー: SDK実行ファイルが見つかりません: $SDK_EXEC"
    exit 1
else
    echo "SDK実行ファイル: OK"
    ls -la "$SDK_EXEC"
fi

echo -e "\n5. KVS WebRTC ストリーム開始:"
echo "実行コマンド: $SDK_EXEC \"$CHANNEL_NAME\" \"video-only\" \"devicesrc\" \"opus\" \"$CODEC\""

# 実行（エラーハンドリング付き）
if ! exec "$SDK_EXEC" "$CHANNEL_NAME" "video-only" "devicesrc" "opus" "$CODEC"; then
    echo -e "\nエラー: KVS WebRTC ストリームの起動に失敗しました"
    exit 1
fi