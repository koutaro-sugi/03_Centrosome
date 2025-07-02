#!/bin/bash

# KVS RTSP Environment Variables Wrapper
# test_rtsp_latency.shと同じ低遅延パラメータを環境変数で設定

set -e

# 引数
CHANNEL_NAME="${1:-siyi-zr30-channel}"
RTSP_URI="${2:-rtsp://192.168.144.25:8554/main.264}"

# 基本環境変数
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_KVS_LOG_LEVEL=${AWS_KVS_LOG_LEVEL:-2}
export GST_DEBUG=${GST_DEBUG:-1}

# GStreamer最適化環境変数
export GST_PLUGIN_PATH=/usr/lib/gstreamer-1.0
export LD_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu:$LD_LIBRARY_PATH

# RTSPソース用の環境変数（test_rtsp_latency.shのパラメータと同じ）
export GST_RTSP_SRC_LATENCY=0
export GST_RTSP_SRC_BUFFER_MODE="none"
export GST_RTSP_SRC_DROP_ON_LATENCY="true"
export GST_RTSP_SRC_DO_RTCP="false"
export GST_RTSP_SRC_PROTOCOLS="tcp"
export GST_RTSP_SRC_NTP_SYNC="false"
export GST_RTSP_SRC_TCP_TIMEOUT="5000000"

# パイプライン全体の最適化
export GST_QUEUE_MAX_SIZE_BUFFERS=1
export GST_QUEUE_LEAKY="downstream"
export GST_SYNC="false"

# GStreamerプラグインの優先度変更
export GST_PLUGIN_FEATURE_RANK="rtspsrc:PRIMARY+100"
export GST_REGISTRY_UPDATE="no"

# ネットワーク最適化
export GST_RTSP_LOWER_LATENCY=1

# システムレベルの最適化
echo 1 | sudo tee /proc/sys/net/ipv4/tcp_nodelay > /dev/null 2>&1 || true
echo 1 | sudo tee /proc/sys/net/ipv4/tcp_low_latency > /dev/null 2>&1 || true

# デバッグ情報
echo "=== KVS RTSP Low Latency Stream ==="
echo "Channel: $CHANNEL_NAME"
echo "RTSP URI: $RTSP_URI"
echo "Environment variables set for low latency"
echo ""

# SDK実行
cd /home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c/build

echo "Starting stream..."
exec ./samples/kvsWebrtcClientMasterGstSample \
    "$CHANNEL_NAME" \
    "video-only" \
    "rtspsrc" \
    "$RTSP_URI"