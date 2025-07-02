#!/bin/bash

# GStreamer RTSP to KVS Bridge
# RTSPストリームを直接KVSに送信

set -e

# 設定
RTSP_URL="rtsp://192.168.144.25:8554/main.264"
CHANNEL_NAME="${1:-siyi-zr30-channel}"
LOG_DIR="/home/pi/Raspi-Persona/robot/debug/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/gst_rtsp_kvs_$TIMESTAMP.txt"

mkdir -p "$LOG_DIR"

echo "=== GStreamer RTSP to KVS Bridge ===" | tee "$LOG_FILE"
echo "RTSP: $RTSP_URL" | tee -a "$LOG_FILE"
echo "Channel: $CHANNEL_NAME" | tee -a "$LOG_FILE"

# クリーンアップ
cleanup() {
    echo "Stopping stream..." | tee -a "$LOG_FILE"
    pkill -f "gst-launch.*$CHANNEL_NAME" 2>/dev/null || true
    scp "$LOG_FILE" mbp:/Developer/01_A1-Console/grok/ 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# RTSP確認
echo "Testing RTSP connection..." | tee -a "$LOG_FILE"
if ! timeout 5 gst-launch-1.0 rtspsrc location=$RTSP_URL ! fakesink 2>&1 | grep -q "PLAYING"; then
    echo "Error: Cannot connect to RTSP stream" | tee -a "$LOG_FILE"
    exit 1
fi

# AWS認証
export AWS_DEFAULT_REGION=ap-northeast-1

echo "Starting RTSP to KVS stream..." | tee -a "$LOG_FILE"

# RTSPからKVSへ直接ストリーミング（kvssinkを使用）
gst-launch-1.0 -v \
    rtspsrc location=$RTSP_URL latency=100 protocols=tcp ! \
    rtph264depay ! \
    h264parse ! \
    video/x-h264,stream-format=avc,alignment=au ! \
    kvssink stream-name="$CHANNEL_NAME" \
    access-key="$AWS_ACCESS_KEY_ID" \
    secret-key="$AWS_SECRET_ACCESS_KEY" \
    aws-region="$AWS_DEFAULT_REGION" 2>&1 | tee -a "$LOG_FILE"
