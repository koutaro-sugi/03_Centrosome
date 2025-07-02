#!/bin/bash

# モバイルルーター専用KVSストリーミング
# NAT環境に特化した最小構成

set -e

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 設定
CHANNEL="usb-camera-channel"
DEVICE="/dev/video2"
REGION="ap-northeast-1"
SDK_DIR="/home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c"
BUILD_DIR="$SDK_DIR/build"

echo -e "${GREEN}=== モバイルルーター専用KVSストリーミング ===${NC}"

# AWS認証確認
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}AWS認証情報が設定されていません${NC}"
    exit 1
fi

# デバイス確認
if [ ! -e "$DEVICE" ]; then
    echo -e "${RED}カメラデバイスが見つかりません: $DEVICE${NC}"
    exit 1
fi

cd "$BUILD_DIR" || exit 1

# モバイルルーター特化環境変数
export AWS_DEFAULT_REGION="$REGION"
export GST_V4L2_USE_LIBV4L2=1
export GST_V4L2SRC_DEVICE="$DEVICE"
export SOURCE_TYPE=0

# NAT回避設定（全パターン）
export AWS_KVS_LOG_LEVEL=2
export KVS_ICE_FORCE_TURN=1
export AWS_KVS_ICE_FORCE_TURN=1
export FORCE_TURN=1
export KVS_DISABLE_IPV6=1
export AWS_KVS_DISABLE_IPV6=1
export DISABLE_IPV6=1
export KVS_FORCE_TCP_ICE_TRANSPORT=1
export AWS_KVS_FORCE_TCP=1
export FORCE_TCP=1

# システムレベルNAT最適化
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward > /dev/null 2>&1 || true
echo 0 | sudo tee /proc/sys/net/ipv6/conf/all/disable_ipv6 > /dev/null 2>&1 || true

echo -e "${YELLOW}モバイルルーター環境でKVSストリーミング開始...${NC}"
echo "チャンネル: $CHANNEL"
echo "デバイス: $DEVICE"
echo ""

# タイムアウト付き実行
timeout 300 ./samples/kvsWebrtcClientMasterGstSample "$CHANNEL" "video-only" "devicesrc" "opus" "h264"

echo -e "${GREEN}ストリーミング終了${NC}"