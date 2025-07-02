#!/bin/bash

# KVS USB Camera Wrapper
# 環境変数とGStreamerパイプラインを正しく設定するラッパー

set -e

# 引数
CHANNEL_NAME="${1:-usb-camera-channel}"
DEVICE="${2:-/dev/video2}"
CODEC="${3:-h264}"

# 環境変数設定
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_KVS_LOG_LEVEL=${AWS_KVS_LOG_LEVEL:-2}
export GST_DEBUG=${GST_DEBUG:-2}

# USBカメラ用の環境変数
export GST_V4L2_USE_LIBV4L2=1
export GST_V4L2SRC_DEVICE="$DEVICE"
export GST_PLUGIN_PATH=/usr/lib/gstreamer-1.0
export LD_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu:$LD_LIBRARY_PATH

# カスタムGStreamerパイプライン
# これにより、autovideosrcの代わりにv4l2srcが使用される
export GST_PLUGIN_FEATURE_RANK="v4l2src:PRIMARY+100,autovideosrc:NONE"

# デバイスチェック
if [ ! -e "$DEVICE" ]; then
    echo "Error: Device $DEVICE not found"
    exit 1
fi

# H.264サポート確認
echo "Checking H.264 support on $DEVICE..."
if v4l2-ctl -d "$DEVICE" --list-formats-ext | grep -q "H264"; then
    echo "H.264 hardware encoding supported"
    # ハードウェアエンコーディングを使用
    export USE_HARDWARE_ENCODING=1
else
    echo "H.264 hardware encoding not supported, will use software encoding"
    export USE_HARDWARE_ENCODING=0
fi

# SDK実行
cd /home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c/build

echo "Starting KVS stream..."
echo "Channel: $CHANNEL_NAME"
echo "Device: $DEVICE"
echo "Codec: $CODEC"

# 実行
exec ./samples/kvsWebrtcClientMasterGstSample \
    "$CHANNEL_NAME" \
    "video-only" \
    "devicesrc" \
    "opus" \
    "$CODEC"