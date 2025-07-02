#!/bin/bash

# KVS RTSP Low Latency Streaming
# SIYI ZR30などのRTSPカメラ用の低遅延設定

set -e

# 引数
CHANNEL_NAME="${1:-siyi-zr30-channel}"
RTSP_URI="${2:-rtsp://192.168.144.25:8554/main.264}"
LATENCY_MODE="${3:-ultra}"  # ultra, low, normal

# 環境変数
export AWS_DEFAULT_REGION=ap-northeast-1
export AWS_KVS_LOG_LEVEL=${AWS_KVS_LOG_LEVEL:-2}
export GST_DEBUG=${GST_DEBUG:-1}  # 低レベルでパフォーマンス向上

# ログ設定
LOG_DIR="/home/pi/Raspi-Persona/robot/debug/logs"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/kvs_rtsp_low_latency_$TIMESTAMP.txt"
mkdir -p "$LOG_DIR"

echo "=== KVS RTSP Low Latency Streaming ===" | tee "$LOG_FILE"
echo "Channel: $CHANNEL_NAME" | tee -a "$LOG_FILE"
echo "RTSP URI: $RTSP_URI" | tee -a "$LOG_FILE"
echo "Latency Mode: $LATENCY_MODE" | tee -a "$LOG_FILE"

# GStreamerパイプライン最適化の環境変数
case $LATENCY_MODE in
    ultra)
        # 最低遅延設定（50-100ms目標）
        export GST_RTSP_LATENCY=0
        export GST_BUFFER_MODE="none"
        export GST_DROP_ON_LATENCY="true"
        export GST_MAX_LATENESS=20000000  # 20ms
        export GST_QOS="true"
        export GST_SYNC="false"
        echo "Ultra Low Latency Mode: Target 50-100ms" | tee -a "$LOG_FILE"
        ;;
    low)
        # 低遅延設定（100-200ms目標）
        export GST_RTSP_LATENCY=100
        export GST_BUFFER_MODE="auto"
        export GST_DROP_ON_LATENCY="true"
        export GST_MAX_LATENESS=50000000  # 50ms
        export GST_QOS="true"
        export GST_SYNC="true"
        echo "Low Latency Mode: Target 100-200ms" | tee -a "$LOG_FILE"
        ;;
    normal)
        # 標準設定（200-500ms）
        export GST_RTSP_LATENCY=200
        export GST_BUFFER_MODE="auto"
        export GST_DROP_ON_LATENCY="false"
        export GST_MAX_LATENESS=100000000  # 100ms
        export GST_QOS="false"
        export GST_SYNC="true"
        echo "Normal Mode: Target 200-500ms" | tee -a "$LOG_FILE"
        ;;
esac

# カスタムGStreamerパイプライン設定
# RTSPソース用の最適化パラメータ
cat > /tmp/kvs_rtsp_pipeline_config.sh << EOF
#!/bin/bash
# RTSP Pipeline Configuration

# RTSPソースの最適化
export RTSP_PIPELINE_PARAMS="
    latency=\${GST_RTSP_LATENCY:-0}
    buffer-mode=\${GST_BUFFER_MODE:-none}
    drop-on-latency=\${GST_DROP_ON_LATENCY:-true}
    do-rtcp=false
    protocols=tcp
    timeout=5000000
    tcp-timeout=5000000
    retry=3
    ntp-sync=false
    "

# 追加の最適化
export GST_QUEUE_PARAMS="
    max-size-buffers=1
    max-size-bytes=0
    max-size-time=0
    leaky=downstream
    "

# ネットワーク最適化
export GST_NETWORK_PARAMS="
    enable-last-sample=false
    blocksize=1316
    "
EOF

source /tmp/kvs_rtsp_pipeline_config.sh

# TCP最適化（低遅延用）
if [ "$LATENCY_MODE" == "ultra" ]; then
    # TCPノーディレイ設定
    echo 1 | sudo tee /proc/sys/net/ipv4/tcp_nodelay > /dev/null 2>&1 || true
    # TCP輻輳制御アルゴリズムを変更
    echo "bbr" | sudo tee /proc/sys/net/ipv4/tcp_congestion_control > /dev/null 2>&1 || true
fi

# ネットワーク統計情報の記録
echo -e "\n=== Network Statistics ===" | tee -a "$LOG_FILE"
ping -c 3 -W 1 $(echo "$RTSP_URI" | sed -E 's|rtsp://([^:/]+).*|\1|') 2>&1 | tee -a "$LOG_FILE" || true

# SDK実行
cd /home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c/build

echo -e "\n=== Starting Stream ===" | tee -a "$LOG_FILE"

# クリーンアップ関数
cleanup() {
    echo "Cleaning up..." | tee -a "$LOG_FILE"
    rm -f /tmp/kvs_rtsp_pipeline_config.sh
    
    # ログ転送
    if [ -f "$LOG_FILE" ]; then
        scp "$LOG_FILE" mbp:~/Developer/01_A1-Console/grok/ 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

# ストリーム実行（リトライ機能付き）
retry_count=0
max_retries=10

while [ $retry_count -lt $max_retries ]; do
    echo "[$(date)] Starting stream attempt $((retry_count + 1))..." | tee -a "$LOG_FILE"
    
    # KVS WebRTC実行
    ./samples/kvsWebrtcClientMasterGstSample "$CHANNEL_NAME" "video-only" "rtspsrc" "$RTSP_URI" 2>&1 | tee -a "$LOG_FILE"
    
    exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -eq 0 ]; then
        echo "[$(date)] Stream ended normally" | tee -a "$LOG_FILE"
        break
    else
        echo "[$(date)] Stream failed with exit code: $exit_code" | tee -a "$LOG_FILE"
        retry_count=$((retry_count + 1))
        
        if [ $retry_count -lt $max_retries ]; then
            echo "[$(date)] Retrying in 1 second..." | tee -a "$LOG_FILE"
            sleep 1
        else
            echo "[$(date)] Max retries reached. Exiting." | tee -a "$LOG_FILE"
            exit 1
        fi
    fi
done

cleanup