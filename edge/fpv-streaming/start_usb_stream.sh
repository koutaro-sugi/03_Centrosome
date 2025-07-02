#!/bin/bash

# シンプルUSBストリーミング開始スクリプト
# デフォルト設定で即座にUSBカメラストリームを開始

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# デフォルト設定
DEFAULT_REGION="ap-northeast-1"
DEFAULT_USB_DEVICE="/dev/video2"
DEFAULT_CHANNEL="usb-camera-channel"
DEFAULT_CODEC="h264"

# 基本設定
export LOG_DIR="/home/pi/Raspi-Persona/51_robot/debug/logs"
export CONFIG_DIR="/home/pi/Raspi-Persona/51_robot/config"
export SDK_DIR="/home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c"
export BUILD_DIR="$SDK_DIR/build"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ディレクトリ作成
mkdir -p "$CONFIG_DIR" "$LOG_DIR"

# ログ関数
log_message() {
    local level=$1
    shift
    local message="$@"
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_DIR/usb_stream.log"
    
    case $level in
        ERROR) echo -e "${RED}[ERROR] $message${NC}" ;;
        WARN)  echo -e "${YELLOW}[WARN] $message${NC}" ;;
        INFO)  echo -e "${GREEN}[INFO] $message${NC}" ;;
    esac
}

# AWS認証確認
check_aws_auth() {
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        log_message "ERROR" "AWS認証情報が設定されていません"
        echo -e "${RED}AWS認証情報を設定してください:${NC}"
        echo "  export AWS_ACCESS_KEY_ID=your_key"
        echo "  export AWS_SECRET_ACCESS_KEY=your_secret"
        echo "  export AWS_DEFAULT_REGION=$DEFAULT_REGION"
        exit 1
    fi
    
    log_message "INFO" "AWS認証情報確認済み"
}

# デバイス確認
check_device() {
    if [ ! -e "$DEFAULT_USB_DEVICE" ]; then
        log_message "ERROR" "USBカメラデバイス $DEFAULT_USB_DEVICE が見つかりません"
        echo -e "${YELLOW}利用可能なビデオデバイス:${NC}"
        ls -la /dev/video* 2>/dev/null || echo "ビデオデバイスが見つかりません"
        exit 1
    fi
    
    log_message "INFO" "USBカメラデバイス確認済み: $DEFAULT_USB_DEVICE"
}

# SDK確認
check_sdk() {
    if [ ! -d "$BUILD_DIR" ]; then
        log_message "ERROR" "KVS SDK ビルドディレクトリが見つかりません: $BUILD_DIR"
        exit 1
    fi
    
    if [ ! -f "$BUILD_DIR/samples/kvsWebrtcClientMasterGstSample" ]; then
        log_message "ERROR" "KVS サンプル実行ファイルが見つかりません"
        exit 1
    fi
    
    log_message "INFO" "KVS SDK確認済み"
}

# ストリーム停止関数
stop_existing_streams() {
    local stopped_count=0
    
    # PIDファイルから停止
    for pid_file in "$LOG_DIR"/.usb_stream*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file" 2>/dev/null)
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                log_message "INFO" "既存ストリーム停止中 (PID: $pid)"
                kill -TERM "$pid" 2>/dev/null || true
                sleep 2
                if kill -0 "$pid" 2>/dev/null; then
                    kill -KILL "$pid" 2>/dev/null || true
                fi
                stopped_count=$((stopped_count + 1))
            fi
            rm -f "$pid_file"
        fi
    done
    
    # 孤立プロセス清掃
    if pgrep -f "kvsWebrtcClientMaster" > /dev/null; then
        log_message "WARN" "孤立KVSプロセス清掃中"
        pkill -f "kvsWebrtcClientMaster" 2>/dev/null || true
        sleep 1
    fi
    
    if [ $stopped_count -gt 0 ]; then
        log_message "INFO" "既存ストリーム $stopped_count 個を停止しました"
    fi
}

# メインストリーム開始関数
start_usb_stream() {
    log_message "INFO" "USBストリーム開始: チャンネル=$DEFAULT_CHANNEL, デバイス=$DEFAULT_USB_DEVICE, コーデック=$DEFAULT_CODEC"
    
    local log_file="$LOG_DIR/usb_stream_${TIMESTAMP}.log"
    local pid_file="$LOG_DIR/.usb_stream_${DEFAULT_CHANNEL}.pid"
    
    # 環境変数設定
    export GST_V4L2_USE_LIBV4L2=1
    export GST_V4L2SRC_DEVICE="$DEFAULT_USB_DEVICE"
    export SOURCE_TYPE=0
    export AWS_DEFAULT_REGION="$DEFAULT_REGION"
    export AWS_KVS_LOG_LEVEL=2
    export GST_DEBUG=2
    
    cd "$BUILD_DIR" || {
        log_message "ERROR" "SDKディレクトリにアクセスできません: $BUILD_DIR"
        exit 1
    }
    
    echo -e "\n${GREEN}=== USBストリーミング開始 ===${NC}"
    echo "  チャンネル: $DEFAULT_CHANNEL"
    echo "  デバイス: $DEFAULT_USB_DEVICE"
    echo "  コーデック: $DEFAULT_CODEC"
    echo "  ログファイル: $log_file"
    echo -e "${YELLOW}  Ctrl+C で停止${NC}\n"
    
    # 自動リカバリー付きストリーム開始
    (
        local retry_count=0
        
        while true; do
            echo "[$(date)] USB ストリーム開始 (試行 #$((retry_count + 1)))..." >> "$log_file"
            log_message "INFO" "USB ストリーム試行 #$((retry_count + 1)): $DEFAULT_CHANNEL"
            
            ./samples/kvsWebrtcClientMasterGstSample "$DEFAULT_CHANNEL" "video-only" "devicesrc" "opus" "$DEFAULT_CODEC" 2>&1 | tee -a "$log_file"
            
            local exit_code=${PIPESTATUS[0]}
            
            if [ $exit_code -ne 0 ]; then
                retry_count=$((retry_count + 1))
                log_message "WARN" "USB ストリームクラッシュ (終了コード: $exit_code), 試行 #$retry_count"
                
                # 停止リクエストチェック
                if [ -f "$LOG_DIR/.stop_usb_stream" ]; then
                    log_message "INFO" "停止リクエスト受信"
                    rm -f "$LOG_DIR/.stop_usb_stream"
                    break
                fi
                
                echo "[$(date)] ストリームクラッシュ、1秒後に再起動..." >> "$log_file"
                sleep 1
            else
                log_message "INFO" "USB ストリーム正常終了"
                break
            fi
        done
        
        # クリーンアップ
        rm -f "$pid_file"
    ) &
    
    local stream_pid=$!
    echo "$stream_pid" > "$pid_file"
    
    log_message "INFO" "USB ストリーム開始完了: PID=$stream_pid"
    
    # 5秒後に起動確認
    sleep 5
    if kill -0 $stream_pid 2>/dev/null; then
        log_message "INFO" "USB ストリーム正常稼働中"
        echo -e "${GREEN}ストリーム開始成功！${NC}"
        echo -e "${CYAN}Webコンソールでチャンネル '$DEFAULT_CHANNEL' に接続してください${NC}"
    else
        log_message "ERROR" "USB ストリーム起動失敗"
        echo -e "${RED}ストリーム起動に失敗しました。ログを確認してください: $log_file${NC}"
        exit 1
    fi
    
    # 終了まで待機
    wait $stream_pid
}

# シグナルハンドラー
cleanup() {
    log_message "INFO" "終了シグナル受信"
    touch "$LOG_DIR/.stop_usb_stream"
    stop_existing_streams
    exit 0
}

trap cleanup SIGINT SIGTERM

# メイン実行
main() {
    echo -e "${GREEN}=== シンプルUSBストリーミング ===${NC}"
    echo "デフォルト設定でUSBカメラストリームを開始します"
    echo ""
    
    # 事前チェック
    check_aws_auth
    check_device
    check_sdk
    
    # 既存ストリーム停止
    stop_existing_streams
    
    # ストリーム開始
    start_usb_stream
}

# スクリプト実行
main "$@"