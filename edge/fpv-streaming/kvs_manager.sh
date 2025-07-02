#!/bin/bash

# KVS WebRTC Interactive Manager v2.0
# 複数のカメラソースを管理し、デバッグ機能を提供

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color



# 基本設定
export LOG_DIR="/home/pi/Raspi-Persona/51_robot/debug/logs"
export CONFIG_DIR="/home/pi/Raspi-Persona/51_robot/config"
export SDK_DIR="/home/pi/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c"
export BUILD_DIR="$SDK_DIR/build"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 設定ファイル
CONFIG_FILE="$CONFIG_DIR/kvs_config.json"
SETTINGS_FILE="$CONFIG_DIR/kvs_settings.conf"
mkdir -p "$CONFIG_DIR" "$LOG_DIR"

# デフォルト設定
DEFAULT_REGION="ap-northeast-1"
DEFAULT_USB_DEVICE="/dev/video2"
DEFAULT_RTSP_URI="rtsp://192.168.144.25:8554/main.264"
DEFAULT_LOG_ENABLED=true
DEFAULT_LOG_MAX_SIZE="100M"  # 100MB
DEFAULT_LOG_ROTATE_COUNT=5

# 設定読み込み
load_settings() {
    if [ -f "$SETTINGS_FILE" ]; then
        source "$SETTINGS_FILE"
    else
        # デフォルト設定を保存
        cat > "$SETTINGS_FILE" << EOF
# KVS Manager Settings
LOG_ENABLED=$DEFAULT_LOG_ENABLED
LOG_MAX_SIZE=$DEFAULT_LOG_MAX_SIZE
LOG_ROTATE_COUNT=$DEFAULT_LOG_ROTATE_COUNT
AWS_DEFAULT_REGION=$DEFAULT_REGION
DEFAULT_USB_DEVICE=$DEFAULT_USB_DEVICE
DEFAULT_RTSP_URI=$DEFAULT_RTSP_URI
EOF
    fi
    
    # 環境変数として設定
    export LOG_ENABLED=${LOG_ENABLED:-$DEFAULT_LOG_ENABLED}
    export LOG_MAX_SIZE=${LOG_MAX_SIZE:-$DEFAULT_LOG_MAX_SIZE}
    export LOG_ROTATE_COUNT=${LOG_ROTATE_COUNT:-$DEFAULT_LOG_ROTATE_COUNT}
}

# ログ関数
log_message() {
    local level=$1
    shift
    local message="$@"
    
    if [ "$LOG_ENABLED" = "true" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" >> "$LOG_DIR/kvs_manager.log"
    fi
    
    # コンソールにも表示
    case $level in
        ERROR) echo -e "${RED}[ERROR] $message${NC}" ;;
        WARN)  echo -e "${YELLOW}[WARN] $message${NC}" ;;
        INFO)  echo -e "${GREEN}[INFO] $message${NC}" ;;
        DEBUG) [ "$DEBUG" = "true" ] && echo -e "${CYAN}[DEBUG] $message${NC}" ;;
    esac
}

# ログローテーション
rotate_logs() {
    if [ "$LOG_ENABLED" != "true" ]; then
        return
    fi
    
    local log_file="$1"
    local max_size_bytes=$(echo "$LOG_MAX_SIZE" | sed 's/M/*1024*1024/g' | sed 's/G/*1024*1024*1024/g' | bc 2>/dev/null || echo "104857600")
    
    if [ -f "$log_file" ]; then
        local file_size=$(stat -c%s "$log_file" 2>/dev/null || echo "0")
        
        if [ "$file_size" -gt "$max_size_bytes" ]; then
            log_message "INFO" "Rotating log file: $log_file (size: $file_size bytes)"
            
            # ローテーション実行
            for i in $(seq $((LOG_ROTATE_COUNT-1)) -1 1); do
                [ -f "${log_file}.$i" ] && mv "${log_file}.$i" "${log_file}.$((i+1))"
            done
            [ -f "$log_file" ] && mv "$log_file" "${log_file}.1"
            
            # 古いログを削除
            [ -f "${log_file}.$LOG_ROTATE_COUNT" ] && rm -f "${log_file}.$LOG_ROTATE_COUNT"
        fi
    fi
}

# ロゴ表示
show_logo() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════╗"
    echo "║         KVS WebRTC Manager v2.0               ║"
    echo "║         AWS Kinesis Video Streams             ║"
    echo "╚═══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# メインメニュー
show_main_menu() {
    echo -e "${GREEN}=== Main Menu ===${NC}"
    echo "1) Stream Management"
    echo "2) Channel Management"
    echo "3) Debug Settings"
    echo "4) System Status"
    echo "5) Configuration"
    echo "6) Logs Viewer"
    echo "7) Network Diagnostics"
    echo "0) Exit"
    echo -n "Select option: "
}

# ストリーム管理メニュー
stream_management_menu() {
    while true; do
        show_logo
        echo -e "${BLUE}=== Stream Management ===${NC}"
        echo "1) Start USB Camera Stream"
        echo "2) Start RTSP Stream (SIYI ZR30)"
        echo "3) Start Both Streams"
        echo "4) Stop All Streams"
        echo "5) Stream Status"
        echo "0) Back to Main Menu"
        echo -n "Select option: "
        
        read -r choice
        choice=${choice:-0}
        
        case $choice in
            1) start_usb_stream ;;
            2) start_rtsp_stream ;;
            3) start_both_streams ;;
            4) stop_all_streams ;;
            5) show_stream_status ;;
            0) break ;;
            *) 
                log_message "WARN" "Invalid option in stream management: $choice"
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# USBストリーム開始
start_usb_stream() {
    show_logo
    echo -e "${YELLOW}=== Starting USB Camera Stream (DEBUG MODE) ===${NC}"
    
    # デバッグ: 初期環境情報
    echo -e "\n${CYAN}=== DEBUG: Initial Environment ===${NC}"
    echo "Current user: $(whoami)"
    echo "Current groups: $(groups)"
    echo "Current directory: $(pwd)"
    echo "PATH: $PATH"
    echo "LD_LIBRARY_PATH: ${LD_LIBRARY_PATH:-not set}"
    
    # カメラデバイス選択
    echo -e "\n${CYAN}=== DEBUG: Video Device Analysis ===${NC}"
    echo "Available video devices:"
    ls -la /dev/video* 2>/dev/null || echo "No video devices found"
    
    # 各デバイスの詳細情報
    echo -e "\n${CYAN}Video device details:${NC}"
    for dev in /dev/video*; do
        if [ -e "$dev" ]; then
            echo "=== $dev ==="
            v4l2-ctl --device="$dev" --info 2>/dev/null | head -10 || echo "  Cannot access device info"
            echo "  Permissions: $(ls -la "$dev")"
        fi
    done
    
    echo -n "Enter device (default: $DEFAULT_USB_DEVICE): "
    read device
    device=${device:-$DEFAULT_USB_DEVICE}
    
    # デバイスの詳細検証
    echo -e "\n${CYAN}=== DEBUG: Device Validation ===${NC}"
    echo "Selected device: $device"
    
    if [ ! -e "$device" ]; then
        log_message "ERROR" "Device $device not found"
        echo -e "${RED}Error: Device $device not found${NC}"
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read
        return
    fi
    
    # デバイス詳細情報
    echo "Device exists: YES"
    echo "Device permissions: $(ls -la "$device")"
    echo "Device type: $(file "$device" 2>/dev/null || echo "Cannot determine")"
    
    # v4l2デバイス詳細
    echo -e "\n${YELLOW}v4l2 device details:${NC}"
    v4l2-ctl --device="$device" --info 2>/dev/null || echo "Cannot get v4l2 info"
    echo -e "\n${YELLOW}Supported formats:${NC}"
    v4l2-ctl --device="$device" --list-formats-ext 2>/dev/null | head -20 || echo "Cannot get format info"
    
    # チャンネル名入力
    echo -n "Enter channel name (default: usb-camera-channel): "
    read channel
    channel=${channel:-usb-camera-channel}
    
    # コーデック選択
    echo "Select video codec:"
    echo "1) H.264 (default)"
    echo "2) H.265"
    echo -n "Choice: "
    read codec_choice
    codec="h264"
    [ "$codec_choice" = "2" ] && codec="h265"
    
    # デバッグ: 設定確認
    echo -e "\n${CYAN}=== DEBUG: Configuration Summary ===${NC}"
    echo "Device: $device"
    echo "Channel: $channel" 
    echo "Codec: $codec"
    echo "Log enabled: $LOG_ENABLED"
    echo "Log directory: $LOG_DIR"
    echo "Build directory: $BUILD_DIR"
    echo "SDK directory: $SDK_DIR"
    
    # ストリーム開始
    export CAMERA_DEVICE="$device"
    local log_file=""
    
    if [ "$LOG_ENABLED" = "true" ]; then
        log_file="$LOG_DIR/kvs_usb_${TIMESTAMP}.txt"
        rotate_logs "$log_file"
        echo "Log file: $log_file"
    else
        log_file="/dev/null"
        echo "Logging disabled - output to /dev/null"
    fi
    
    # 環境変数でパイプラインを制御
    export GST_V4L2_USE_LIBV4L2=1
    export GST_V4L2SRC_DEVICE="$device"
    export SOURCE_TYPE=0  # 0 = DEVICE_SOURCE
    
    # デバッグ: 環境変数確認
    echo -e "\n${CYAN}=== DEBUG: Environment Variables ===${NC}"
    echo "CAMERA_DEVICE: $CAMERA_DEVICE"
    echo "GST_V4L2_USE_LIBV4L2: $GST_V4L2_USE_LIBV4L2"
    echo "GST_V4L2SRC_DEVICE: $GST_V4L2SRC_DEVICE"
    echo "SOURCE_TYPE: $SOURCE_TYPE"
    echo "AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:+SET}" 
    echo "AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:+SET}"
    echo "AWS_DEFAULT_REGION: ${AWS_DEFAULT_REGION:-not set}"
    echo "GST_DEBUG: ${GST_DEBUG:-not set}"
    echo "AWS_KVS_LOG_LEVEL: ${AWS_KVS_LOG_LEVEL:-not set}"
    
    echo -e "\n${GREEN}Starting stream with:${NC}"
    echo "  Device: $device"
    echo "  Channel: $channel"
    echo "  Codec: $codec"
    echo "  Logging: $LOG_ENABLED"
    
    log_message "INFO" "Starting USB stream - Device: $device, Channel: $channel, Codec: $codec"
    
    # デバッグ: ディレクトリ確認
    echo -e "\n${CYAN}=== DEBUG: Directory Validation ===${NC}"
    echo "LOG_DIR exists: $([ -d "$LOG_DIR" ] && echo "YES" || echo "NO")"
    echo "BUILD_DIR exists: $([ -d "$BUILD_DIR" ] && echo "YES" || echo "NO")"
    echo "SDK_DIR exists: $([ -d "$SDK_DIR" ] && echo "YES" || echo "NO")"
    
    # ストリーム品質モニター用の設定ファイル作成
    local pid_file="$LOG_DIR/.usb_stream_${channel}.pid"
    echo "PID file will be: $pid_file"
    
    # ディレクトリ作成確認
    mkdir -p "$LOG_DIR" 2>/dev/null
    echo "Log directory created/verified: $LOG_DIR"
    
    echo -e "\n${CYAN}=== DEBUG: Changing to build directory ===${NC}"
    echo "Current directory: $(pwd)"
    echo "Target directory: $BUILD_DIR"
    
    cd "$BUILD_DIR" || {
        log_message "ERROR" "Failed to change directory to $BUILD_DIR"
        echo -e "${RED}Error: Cannot access SDK directory${NC}"
        echo -e "${CYAN}Directory contents of parent:${NC}"
        ls -la "$(dirname "$BUILD_DIR")" 2>/dev/null || echo "Cannot list parent directory"
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read
        return
    }
    
    echo "Successfully changed to: $(pwd)"
    echo -e "\n${CYAN}Build directory contents:${NC}"
    ls -la samples/ 2>/dev/null || echo "Cannot list samples directory"
    
    # 実行ファイル確認
    echo -e "\n${CYAN}=== DEBUG: Executable Validation ===${NC}"
    local executable="./samples/kvsWebrtcClientMasterGstSample"
    echo "Executable path: $executable"
    echo "Executable exists: $([ -f "$executable" ] && echo "YES" || echo "NO")"
    echo "Executable permissions: $(ls -la "$executable" 2>/dev/null || echo "Cannot check")"
    
    # コマンドライン確認
    echo -e "\n${CYAN}=== DEBUG: Command Line ===${NC}"
    echo "Full command that will be executed:"
    echo "$executable \"$channel\" \"video-only\" \"devicesrc\" \"opus\" \"$codec\""
    
    # 他のプロセス確認
    echo -e "\n${CYAN}=== DEBUG: Process Check ===${NC}"
    echo "Existing KVS processes:"
    ps aux | grep -i kvs | grep -v grep || echo "No existing KVS processes"
    echo "Processes using video devices:"
    lsof /dev/video* 2>/dev/null || echo "No processes using video devices (or lsof not available)"
    
    # ネットワーク確認
    echo -e "\n${CYAN}=== DEBUG: Network Check ===${NC}"
    echo "Internet connectivity test:"
    ping -c 1 8.8.8.8 >/dev/null 2>&1 && echo "Internet: OK" || echo "Internet: FAILED"
    echo "AWS region test:"
    ping -c 1 kinesisvideo.${AWS_DEFAULT_REGION:-ap-northeast-1}.amazonaws.com >/dev/null 2>&1 && echo "AWS region: OK" || echo "AWS region: FAILED"
    
    echo -e "\n${GREEN}=== STARTING STREAM EXECUTION ===${NC}"
    
    # ストリーム開始（自動リカバリー機能付き）
    (
        local retry_count=0
        local max_retries=0  # 0 = unlimited
        
        while true; do
            echo "[$(date)] Starting stream attempt #$((retry_count + 1))..." | tee -a "$log_file"
            echo -e "${CYAN}[DEBUG] Attempt #$((retry_count + 1)) - Executing KVS sample...${NC}"
            
            # コマンド実行前の最終確認
            echo "[$(date)] Command: ./samples/kvsWebrtcClientMasterGstSample \"$channel\" \"video-only\" \"devicesrc\" \"opus\" \"$codec\"" | tee -a "$log_file"
            echo "[$(date)] Working directory: $(pwd)" | tee -a "$log_file"
            echo "[$(date)] Camera device: $CAMERA_DEVICE" | tee -a "$log_file"
            echo "[$(date)] Environment check:" | tee -a "$log_file"
            env | grep -E "(AWS_|GST_|SOURCE_|CAMERA_)" | tee -a "$log_file"
            
            ./samples/kvsWebrtcClientMasterGstSample "$channel" "video-only" "devicesrc" "opus" "$codec" 2>&1 | \
                if [ "$LOG_ENABLED" = "true" ]; then tee -a "$log_file"; else cat > /dev/null; fi
            
            local exit_code=${PIPESTATUS[0]}
            echo "[$(date)] Stream exited with code: $exit_code" | tee -a "$log_file"
            
            if [ $exit_code -ne 0 ]; then
                retry_count=$((retry_count + 1))
                log_message "WARN" "USB stream crashed (exit code: $exit_code), attempt #$retry_count"
                echo -e "${RED}[DEBUG] Stream failed with exit code $exit_code${NC}"
                
                if [ -f "$LOG_DIR/.stop_${channel}" ]; then
                    log_message "INFO" "Stop requested for $channel"
                    rm -f "$LOG_DIR/.stop_${channel}"
                    echo -e "${YELLOW}[DEBUG] Stop requested, breaking loop${NC}"
                    break
                fi
                
                if [ $max_retries -gt 0 ] && [ $retry_count -ge $max_retries ]; then
                    log_message "ERROR" "Max retries reached for USB stream"
                    echo -e "${RED}[DEBUG] Max retries reached${NC}"
                    break
                fi
                
                echo "[$(date)] Stream crashed, restarting in 1 second..." | tee -a "$log_file"
                echo -e "${YELLOW}[DEBUG] Waiting 1 second before retry...${NC}"
                sleep 1
            else
                log_message "INFO" "USB stream ended normally"
                echo -e "${GREEN}[DEBUG] Stream ended normally${NC}"
                break
            fi
        done
        
        # クリーンアップ
        echo -e "${CYAN}[DEBUG] Cleaning up PID file: $pid_file${NC}"
        rm -f "$pid_file"
    ) &
    
    local stream_pid=$!
    echo "$stream_pid" > "$pid_file"
    
    # デバッグ: プロセス開始確認
    echo -e "\n${CYAN}=== DEBUG: Process Startup Confirmation ===${NC}"
    echo "Stream PID: $stream_pid"
    echo "PID file created: $pid_file"
    
    # プロセス情報を設定ファイルに保存
    local config_file="$LOG_DIR/.stream_${channel}_config"
    cat > "$config_file" << EOF
{
    "channel": "$channel",
    "device": "$device",
    "codec": "$codec",
    "pid": $stream_pid,
    "pid_file": "$pid_file",
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "log_file": "$log_file",
    "type": "usb",
    "debug_mode": true,
    "environment": {
        "CAMERA_DEVICE": "$CAMERA_DEVICE",
        "GST_V4L2_USE_LIBV4L2": "$GST_V4L2_USE_LIBV4L2",
        "GST_V4L2SRC_DEVICE": "$GST_V4L2SRC_DEVICE",
        "SOURCE_TYPE": "$SOURCE_TYPE"
    }
}
EOF
    
    echo "Config file created: $config_file"
    
    # プロセス生存確認
    echo -e "\n${CYAN}=== DEBUG: Initial Process Check ===${NC}"
    sleep 2  # プロセス起動待ち
    
    if kill -0 "$stream_pid" 2>/dev/null; then
        echo -e "${GREEN}Process is running (PID: $stream_pid)${NC}"
        
        # プロセス詳細確認
        echo "Process details:"
        ps -p "$stream_pid" -o pid,ppid,cmd 2>/dev/null || echo "Cannot get process details"
        
        # 5秒後に再確認
        echo -e "\n${CYAN}Monitoring process for 5 seconds...${NC}"
        sleep 5
        
        if kill -0 "$stream_pid" 2>/dev/null; then
            echo -e "${GREEN}Process still running after 5 seconds${NC}"
            
            # ログファイルの最初の数行を確認
            if [ -f "$log_file" ] && [ "$log_file" != "/dev/null" ]; then
                echo -e "\n${CYAN}=== DEBUG: Recent Log Output ===${NC}"
                tail -20 "$log_file" 2>/dev/null || echo "Cannot read log file"
            fi
        else
            echo -e "${RED}Process died within 5 seconds!${NC}"
            
            # 終了コードを確認
            wait "$stream_pid" 2>/dev/null
            local final_exit_code=$?
            echo "Final exit code: $final_exit_code"
            
            # ログファイル確認
            if [ -f "$log_file" ] && [ "$log_file" != "/dev/null" ]; then
                echo -e "\n${RED}=== DEBUG: Error Log ===${NC}"
                tail -50 "$log_file" 2>/dev/null || echo "Cannot read log file"
            fi
        fi
    else
        echo -e "${RED}Process failed to start!${NC}"
    fi
    
    echo -e "\n${GREEN}Stream started with auto-recovery! PID: $stream_pid${NC}"
    echo -e "${YELLOW}Debug mode is enabled - extensive logging active${NC}"
    echo -e "${CYAN}Check log file: $log_file${NC}"
    echo -e "${CYAN}Check config file: $config_file${NC}"
    echo -e "\n${CYAN}Press Enter to return to menu...${NC}"
    read
}

# RTSPストリーム開始（環境変数による低遅延対応）
start_rtsp_stream() {
    show_logo
    echo -e "${YELLOW}=== Starting RTSP Stream ===${NC}"
    
    # RTSP URI入力
    echo -n "Enter RTSP URI (default: $DEFAULT_RTSP_URI): "
    read rtsp_uri
    rtsp_uri=${rtsp_uri:-$DEFAULT_RTSP_URI}
    
    # チャンネル名入力
    echo -n "Enter channel name (default: siyi-zr30-channel): "
    read channel
    channel=${channel:-siyi-zr30-channel}
    
    # 低遅延モードの選択
    echo -e "\n${YELLOW}Select latency mode:${NC}"
    echo "1) Ultra Low Latency (環境変数による最適化)"
    echo "2) Standard"
    echo -n "Choice (default: 1): "
    read mode_choice
    mode_choice=${mode_choice:-1}
    
    # ネットワーク接続確認
    echo -e "\n${YELLOW}Checking RTSP connection...${NC}"
    local host=$(echo "$rtsp_uri" | sed -E 's|rtsp://([^:/]+).*|\1|')
    if ping -c 1 -W 2 "$host" &> /dev/null; then
        echo -e "${GREEN}RTSP host is reachable${NC}"
    else
        log_message "WARN" "RTSP host $host may not be reachable"
        echo -e "${RED}Warning: RTSP host may not be reachable${NC}"
        echo -n "Continue anyway? (y/N): "
        read confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            return
        fi
    fi
    
    local log_file=""
    if [ "$LOG_ENABLED" = "true" ]; then
        log_file="$LOG_DIR/kvs_rtsp_${TIMESTAMP}.txt"
        rotate_logs "$log_file"
    else
        log_file="/dev/null"
    fi
    
    cd "$BUILD_DIR" || {
        log_message "ERROR" "Failed to change directory to $BUILD_DIR"
        echo -e "${RED}Error: Cannot access SDK directory${NC}"
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read
        return
    }
    
    # 環境変数による低遅延設定
    if [ "$mode_choice" = "1" ]; then
        echo -e "${GREEN}Using Ultra Low Latency Mode${NC}"
        log_message "INFO" "RTSP stream using Ultra Low Latency mode"
        
        # GStreamer環境変数設定
        export GST_DEBUG=1
        export GST_PLUGIN_PATH=/usr/lib/gstreamer-1.0
        export LD_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu:$LD_LIBRARY_PATH
        
        # RTSPソース最適化
        export GST_RTSP_LATENCY=0
        export GST_RTSP_BUFFER_MODE="none"
        export GST_RTSP_DROP_ON_LATENCY="true"
        export GST_RTSP_DO_RTCP="false"
        export GST_RTSP_PROTOCOLS="tcp"
        export GST_RTSP_NTP_SYNC="false"
        export GST_RTSP_TCP_TIMEOUT="5000000"
        
        # パイプライン最適化
        export GST_QUEUE_MAX_SIZE_BUFFERS=1
        export GST_QUEUE_LEAKY="downstream"
        export GST_APPSINK_SYNC="false"
        
        # GStreamerプラグインの優先度を変更
        export GST_PLUGIN_FEATURE_RANK="rtspsrc:PRIMARY+100,uridecodebin:NONE"
        
        # システムレベルの最適化
        echo 1 | sudo tee /proc/sys/net/ipv4/tcp_nodelay > /dev/null 2>&1 || true
        echo 1 | sudo tee /proc/sys/net/ipv4/tcp_low_latency > /dev/null 2>&1 || true
        
        # CPUパフォーマンスモード
        echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor > /dev/null 2>&1 || true
    else
        echo -e "${GREEN}Using Standard Mode${NC}"
        log_message "INFO" "RTSP stream using Standard mode"
        export GST_DEBUG=2
    fi
    
    echo -e "\n${GREEN}Starting RTSP stream:${NC}"
    echo "  URI: $rtsp_uri"
    echo "  Channel: $channel"
    echo "  Mode: $([ "$mode_choice" = "1" ] && echo "Ultra Low Latency" || echo "Standard")"
    echo "  Logging: $LOG_ENABLED"
    echo ""
    echo "Starting in 3 seconds..."
    sleep 3
    
    local pid_file="$LOG_DIR/.rtsp_stream_${channel}.pid"
    
    # ストリーム開始（自動リカバリー機能付き）
    (
        local retry_count=0
        local max_retries=0  # 0 = unlimited
        
        while true; do
            echo "[$(date)] Starting RTSP stream (attempt #$((retry_count + 1)))..." >> "$log_file"
            
            if [ "$mode_choice" = "1" ]; then
                echo "[$(date)] Low latency environment variables set" >> "$log_file"
            fi
            
            ./samples/kvsWebrtcClientMasterGstSample "$channel" "video-only" "rtspsrc" "$rtsp_uri" 2>&1 | \
                if [ "$LOG_ENABLED" = "true" ]; then tee -a "$log_file"; else cat > /dev/null; fi
            
            local exit_code=${PIPESTATUS[0]}
            
            if [ $exit_code -ne 0 ]; then
                retry_count=$((retry_count + 1))
                log_message "WARN" "RTSP stream crashed (exit code: $exit_code), attempt #$retry_count"
                
                if [ -f "$LOG_DIR/.stop_${channel}" ]; then
                    log_message "INFO" "Stop requested for $channel"
                    rm -f "$LOG_DIR/.stop_${channel}"
                    break
                fi
                
                if [ $max_retries -gt 0 ] && [ $retry_count -ge $max_retries ]; then
                    log_message "ERROR" "Max retries reached for RTSP stream"
                    break
                fi
                
                echo "[$(date)] Stream crashed, restarting in 1 second..." >> "$log_file"
                sleep 1
            else
                log_message "INFO" "RTSP stream ended normally"
                break
            fi
        done
        
        # クリーンアップ
        rm -f "$pid_file"
    ) &
    
    local stream_pid=$!
    echo "$stream_pid" > "$pid_file"
    
    # プロセス情報を設定ファイルに保存
    cat > "$LOG_DIR/.stream_${channel}_config" << EOF
{
    "channel": "$channel",
    "device": "$rtsp_uri",
    "codec": "h264",
    "pid": $stream_pid,
    "pid_file": "$pid_file",
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "log_file": "$log_file",
    "latency_mode": "$([ "$mode_choice" = "1" ] && echo "Ultra Low" || echo "Standard")",
    "type": "rtsp"
}
EOF
    
    echo -e "\n${GREEN}Stream started! PID: $stream_pid${NC}"
    
    # 5秒間待ってプロセスの状態を確認
    echo "Monitoring output for 5 seconds..."
    sleep 5
    
    if kill -0 $stream_pid 2>/dev/null; then
        echo -e "${GREEN}Stream is running successfully!${NC}"
    else
        log_message "ERROR" "Stream failed to start for channel $channel"
        echo -e "${RED}Stream failed to start. Check log: $log_file${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to return to menu...${NC}"
    read
}

# 両方のストリーム開始
start_both_streams() {
    log_message "INFO" "Starting both USB and RTSP streams"
    start_usb_stream
    sleep 2
    start_rtsp_stream
}

# 全ストリーム停止
stop_all_streams() {
    show_logo
    echo -e "${YELLOW}=== Stopping All Streams ===${NC}"
    log_message "INFO" "Stopping all streams"
    
    local stopped_count=0
    
    # PIDファイルから停止
    for pid_file in "$LOG_DIR"/.*.pid; do
        if [ -f "$pid_file" ]; then
            local pid=$(cat "$pid_file" 2>/dev/null)
            local channel=$(basename "$pid_file" | sed -E 's/\.(usb|rtsp)_stream_(.*)\.pid/\2/')
            
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo "Stopping stream: $channel (PID: $pid)"
                
                # 停止フラグを作成
                touch "$LOG_DIR/.stop_${channel}"
                
                # プロセスに終了シグナルを送信
                kill -TERM "$pid" 2>/dev/null || true
                
                # 最大5秒待機
                local count=0
                while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
                    sleep 1
                    count=$((count + 1))
                done
                
                # まだ生きていたら強制終了
                if kill -0 "$pid" 2>/dev/null; then
                    log_message "WARN" "Force killing process $pid"
                    kill -KILL "$pid" 2>/dev/null || true
                fi
                
                stopped_count=$((stopped_count + 1))
            fi
            
            rm -f "$pid_file"
            rm -f "$LOG_DIR/.stop_${channel}"
            rm -f "$LOG_DIR/.stream_${channel}_config"
        fi
    done
    
    # 念のため全KVSプロセスを停止
    if pgrep -f "kvsWebrtcClientMaster" > /dev/null; then
        log_message "WARN" "Found orphan KVS processes, cleaning up"
        pkill -f "kvsWebrtcClientMaster" 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "\n${GREEN}Stopped $stopped_count stream(s)${NC}"
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read
}

# ストリームステータス表示
show_stream_status() {
    show_logo
    echo -e "${CYAN}=== Stream Status ===${NC}"
    
    local running_count=0
    local stopped_count=0
    
    # PIDファイルから実行中のストリームを確認
    echo -e "\n${YELLOW}Configured Streams:${NC}"
    for config_file in "$LOG_DIR"/.stream_*_config; do
        if [ -f "$config_file" ]; then
            local channel=$(jq -r '.channel' "$config_file" 2>/dev/null || echo "unknown")
            local pid=$(jq -r '.pid' "$config_file" 2>/dev/null || echo "")
            local device=$(jq -r '.device' "$config_file" 2>/dev/null || echo "unknown")
            local type=$(jq -r '.type' "$config_file" 2>/dev/null || echo "unknown")
            local start_time=$(jq -r '.start_time' "$config_file" 2>/dev/null || echo "unknown")
            
            echo -e "\n${CYAN}Channel: $channel${NC}"
            echo "  Type: $type"
            echo "  Device/URI: $device"
            echo "  Started: $start_time"
            
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo -e "  Status: ${GREEN}RUNNING${NC} (PID: $pid)"
                
                # CPU/メモリ使用率
                local stats=$(ps -p "$pid" -o %cpu,%mem,etime --no-headers 2>/dev/null)
                if [ -n "$stats" ]; then
                    echo "  Resources: $stats (CPU%, MEM%, TIME)"
                fi
                
                running_count=$((running_count + 1))
            else
                echo -e "  Status: ${RED}STOPPED${NC}"
                rm -f "$config_file"
                stopped_count=$((stopped_count + 1))
            fi
        fi
    done
    
    # 実行中のKVSプロセス確認
    echo -e "\n${YELLOW}All KVS Processes:${NC}"
    if ps aux | grep -E "kvsWebrtcClientMaster" | grep -v grep > /dev/null; then
        ps aux | grep -E "kvsWebrtcClientMaster" | grep -v grep | awk '{printf "  PID: %s, CPU: %s%%, MEM: %s%%, CMD: %s\n", $2, $3, $4, $11}'
    else
        echo "  No KVS processes running"
    fi
    
    # ネットワーク接続確認
    echo -e "\n${YELLOW}Network Connections:${NC}"
    local connections=$(netstat -tn 2>/dev/null | grep -E ":443|:8554" | grep "ESTABLISHED" | wc -l)
    echo "  Active connections: $connections"
    
    echo -e "\n${GREEN}Summary: $running_count running, $stopped_count stopped${NC}"
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# チャンネル管理メニュー
channel_management_menu() {
    while true; do
        show_logo
        echo -e "${BLUE}=== Channel Management ===${NC}"
        echo "1) List Channels"
        echo "2) Create Channel"
        echo "3) Delete Channel"
        echo "4) Channel Details"
        echo "0) Back to Main Menu"
        echo -n "Select option: "
        
        read -r choice
        choice=${choice:-0}
        
        case $choice in
            1) list_channels ;;
            2) create_channel ;;
            3) delete_channel ;;
            4) channel_details ;;
            0) break ;;
            *) 
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# チャンネル一覧表示
list_channels() {
    show_logo
    echo -e "${YELLOW}=== Listing Channels ===${NC}"
    
    # jqがインストールされているか確認
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}jq not installed. Installing...${NC}"
        sudo apt-get update && sudo apt-get install -y jq
    fi
    
    # チャンネル一覧を取得
    echo "Fetching channel list..."
    local result=$(aws kinesisvideo list-signaling-channels --region "$DEFAULT_REGION" 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "$result" | jq -r '.ChannelInfoList[] | "\(.ChannelName) - \(.ChannelARN)"' 2>/dev/null || {
            # jqが失敗した場合の代替処理
            echo "$result" | grep -o '"ChannelName":"[^"]*"' | cut -d'"' -f4
        }
    else
        log_message "ERROR" "Failed to list channels: $result"
        echo -e "${RED}Failed to list channels${NC}"
        echo "$result"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# チャンネル作成
create_channel() {
    show_logo
    echo -e "${YELLOW}=== Create Channel ===${NC}"
    
    echo -n "Enter new channel name: "
    read channel_name
    
    if [ -z "$channel_name" ]; then
        echo -e "${RED}Channel name cannot be empty${NC}"
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read
        return
    fi
    
    echo -e "${YELLOW}Creating channel: $channel_name${NC}"
    local result=$(aws kinesisvideo create-signaling-channel \
        --channel-name "$channel_name" \
        --region "$DEFAULT_REGION" 2>&1)
    
    if [ $? -eq 0 ]; then
        log_message "INFO" "Created channel: $channel_name"
        echo -e "${GREEN}Channel created successfully!${NC}"
        if command -v jq &> /dev/null; then
            echo "$result" | jq '.'
        else
            echo "$result"
        fi
    else
        log_message "ERROR" "Failed to create channel: $result"
        echo -e "${RED}Failed to create channel${NC}"
        echo "$result"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# チャンネル削除
delete_channel() {
    show_logo
    echo -e "${YELLOW}=== Delete Channel ===${NC}"
    
    echo -n "Enter channel name to delete: "
    read channel_name
    
    if [ -z "$channel_name" ]; then
        echo -e "${RED}Channel name cannot be empty${NC}"
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read
        return
    fi
    
    echo -e "${RED}Warning: This will permanently delete the channel '$channel_name'${NC}"
    echo -n "Are you sure? (y/N): "
    read confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        echo -e "${YELLOW}Deleting channel: $channel_name${NC}"
        local result=$(aws kinesisvideo delete-signaling-channel \
            --channel-arn "arn:aws:kinesisvideo:$DEFAULT_REGION:$(aws sts get-caller-identity --query Account --output text):channel/$channel_name" \
            --region "$DEFAULT_REGION" 2>&1)
        
        if [ $? -eq 0 ]; then
            log_message "INFO" "Deleted channel: $channel_name"
            echo -e "${GREEN}Channel deleted successfully!${NC}"
        else
            log_message "ERROR" "Failed to delete channel: $result"
            echo -e "${RED}Failed to delete channel${NC}"
            echo "$result"
        fi
    else
        echo "Deletion cancelled"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# チャンネル詳細
channel_details() {
    show_logo
    echo -e "${YELLOW}=== Channel Details ===${NC}"
    
    echo -n "Enter channel name: "
    read channel_name
    
    if [ -z "$channel_name" ]; then
        echo -e "${RED}Channel name cannot be empty${NC}"
        echo -e "${CYAN}Press Enter to continue...${NC}"
        read
        return
    fi
    
    echo -e "${YELLOW}Fetching details for: $channel_name${NC}"
    local result=$(aws kinesisvideo describe-signaling-channel \
        --channel-name "$channel_name" \
        --region "$DEFAULT_REGION" 2>&1)
    
    if [ $? -eq 0 ]; then
        if command -v jq &> /dev/null; then
            echo "$result" | jq '.'
        else
            echo "$result"
        fi
    else
        echo -e "${RED}Failed to get channel details${NC}"
        echo "$result"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# デバッグ設定メニュー
debug_settings_menu() {
    while true; do
        show_logo
        echo -e "${BLUE}=== Debug Settings ===${NC}"
        echo "Current levels:"
        echo "  AWS_KVS_LOG_LEVEL: ${AWS_KVS_LOG_LEVEL:-2}"
        echo "  GST_DEBUG: ${GST_DEBUG:-2}"
        echo ""
        echo "1) Set KVS Log Level"
        echo "2) Set GStreamer Debug Level"
        echo "3) Enable/Disable Logging"
        echo "4) Configure Log Rotation"
        echo "5) Reset to Default"
        echo "0) Back to Main Menu"
        echo -n "Select option: "
        
        read -r choice
        choice=${choice:-0}
        
        case $choice in
            1) set_kvs_log_level ;;
            2) set_gst_debug_level ;;
            3) configure_logging ;;
            4) configure_log_rotation ;;
            5) reset_debug_levels ;;
            0) break ;;
            *) 
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# ロギング設定
configure_logging() {
    show_logo
    echo -e "${YELLOW}=== Logging Configuration ===${NC}"
    echo "Current setting: LOG_ENABLED=$LOG_ENABLED"
    echo ""
    echo "1) Enable logging"
    echo "2) Disable logging"
    echo "0) Cancel"
    echo -n "Select option: "
    
    read choice
    case $choice in
        1)
            LOG_ENABLED=true
            sed -i "s/^LOG_ENABLED=.*/LOG_ENABLED=true/" "$SETTINGS_FILE"
            echo -e "${GREEN}Logging enabled${NC}"
            log_message "INFO" "Logging enabled"
            ;;
        2)
            LOG_ENABLED=false
            sed -i "s/^LOG_ENABLED=.*/LOG_ENABLED=false/" "$SETTINGS_FILE"
            echo -e "${YELLOW}Logging disabled${NC}"
            ;;
        0)
            echo "Cancelled"
            ;;
        *)
            echo -e "${RED}Invalid option${NC}"
            ;;
    esac
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# ログローテーション設定
configure_log_rotation() {
    show_logo
    echo -e "${YELLOW}=== Log Rotation Configuration ===${NC}"
    echo "Current settings:"
    echo "  Max log size: $LOG_MAX_SIZE"
    echo "  Keep rotated logs: $LOG_ROTATE_COUNT"
    echo ""
    
    echo -n "Enter max log size (e.g., 100M, 1G) [current: $LOG_MAX_SIZE]: "
    read new_size
    if [ -n "$new_size" ]; then
        LOG_MAX_SIZE="$new_size"
        sed -i "s/^LOG_MAX_SIZE=.*/LOG_MAX_SIZE=$new_size/" "$SETTINGS_FILE"
    fi
    
    echo -n "Enter number of rotated logs to keep [current: $LOG_ROTATE_COUNT]: "
    read new_count
    if [ -n "$new_count" ] && [[ "$new_count" =~ ^[0-9]+$ ]]; then
        LOG_ROTATE_COUNT="$new_count"
        sed -i "s/^LOG_ROTATE_COUNT=.*/LOG_ROTATE_COUNT=$new_count/" "$SETTINGS_FILE"
    fi
    
    echo -e "\n${GREEN}Log rotation settings updated${NC}"
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read
}

# KVSログレベル設定
set_kvs_log_level() {
    show_logo
    echo -e "${YELLOW}=== KVS Log Level ===${NC}"
    echo "1 - VERBOSE"
    echo "2 - DEBUG (default)"
    echo "3 - INFO"
    echo "4 - WARN"
    echo "5 - ERROR"
    echo "6 - FATAL"
    echo "7 - SILENT"
    echo -n "Select level: "
    read level
    
    if [[ "$level" =~ ^[1-7]$ ]]; then
        export AWS_KVS_LOG_LEVEL="$level"
        echo "AWS_KVS_LOG_LEVEL=$level" >> "$CONFIG_DIR/debug_settings"
        echo -e "${GREEN}KVS log level set to: $level${NC}"
        log_message "INFO" "KVS log level set to $level"
    else
        echo -e "${RED}Invalid level${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# GStreamerデバッグレベル設定
set_gst_debug_level() {
    show_logo
    echo -e "${YELLOW}=== GStreamer Debug Level ===${NC}"
    echo "0 - None"
    echo "1 - ERROR"
    echo "2 - WARNING (default)"
    echo "3 - FIXME"
    echo "4 - INFO"
    echo "5 - DEBUG"
    echo "6 - LOG"
    echo "7 - TRACE"
    echo -n "Select level: "
    read level
    
    if [[ "$level" =~ ^[0-7]$ ]]; then
        export GST_DEBUG="$level"
        echo "GST_DEBUG=$level" >> "$CONFIG_DIR/debug_settings"
        echo -e "${GREEN}GStreamer debug level set to: $level${NC}"
        log_message "INFO" "GStreamer debug level set to $level"
    else
        echo -e "${RED}Invalid level${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# デバッグレベルリセット
reset_debug_levels() {
    export AWS_KVS_LOG_LEVEL=2
    export GST_DEBUG=2
    rm -f "$CONFIG_DIR/debug_settings"
    echo -e "${GREEN}Debug levels reset to default${NC}"
    log_message "INFO" "Debug levels reset to default"
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# システムステータス表示
show_system_status() {
    show_logo
    echo -e "${CYAN}=== System Status ===${NC}"
    
    # CPU使用率
    echo -e "\n${YELLOW}CPU Usage:${NC}"
    top -bn1 | head -5
    
    # メモリ使用率
    echo -e "\n${YELLOW}Memory Usage:${NC}"
    free -h
    
    # ディスク使用率
    echo -e "\n${YELLOW}Disk Usage:${NC}"
    df -h | grep -E "^/dev/"
    
    # ログディレクトリのサイズ
    echo -e "\n${YELLOW}Log Directory Size:${NC}"
    du -sh "$LOG_DIR" 2>/dev/null || echo "Log directory not found"
    
    # ネットワークインターフェース
    echo -e "\n${YELLOW}Network Interfaces:${NC}"
    ip -br addr show
    
    # カメラデバイス
    echo -e "\n${YELLOW}Video Devices:${NC}"
    v4l2-ctl --list-devices 2>/dev/null || echo "No video devices found"
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# 設定メニュー
configuration_menu() {
    while true; do
        show_logo
        echo -e "${BLUE}=== Configuration ===${NC}"
        echo "1) View Current Settings"
        echo "2) Edit Settings"
        echo "3) Export Configuration"
        echo "4) Import Configuration"
        echo "5) Reset to Defaults"
        echo "0) Back to Main Menu"
        echo -n "Select option: "
        
        read -r choice
        choice=${choice:-0}
        
        case $choice in
            1) view_settings ;;
            2) edit_settings ;;
            3) export_configuration ;;
            4) import_configuration ;;
            5) reset_configuration ;;
            0) break ;;
            *) 
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# 設定表示
view_settings() {
    show_logo
    echo -e "${CYAN}=== Current Settings ===${NC}"
    
    if [ -f "$SETTINGS_FILE" ]; then
        cat "$SETTINGS_FILE"
    else
        echo "No settings file found"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# 設定編集
edit_settings() {
    show_logo
    echo -e "${YELLOW}=== Edit Settings ===${NC}"
    
    if command -v nano &> /dev/null; then
        nano "$SETTINGS_FILE"
    elif command -v vi &> /dev/null; then
        vi "$SETTINGS_FILE"
    else
        echo -e "${RED}No text editor found${NC}"
    fi
    
    # 設定を再読み込み
    load_settings
    
    echo -e "${GREEN}Settings updated${NC}"
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read
}

# 設定エクスポート
export_configuration() {
    show_logo
    echo -e "${YELLOW}=== Export Configuration ===${NC}"
    
    local export_file="$HOME/kvs_config_export_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    echo "Exporting configuration..."
    tar -czf "$export_file" -C "$CONFIG_DIR" . 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Configuration exported to: $export_file${NC}"
        
        # MacBookへの転送オプション
        echo -n "Transfer to MacBook? (y/N): "
        read transfer
        if [ "$transfer" = "y" ] || [ "$transfer" = "Y" ]; then
            scp "$export_file" mbp:~/Developer/01_A1-Console/grok/ 2>/dev/null && \
                echo -e "${GREEN}Transferred successfully${NC}" || \
                echo -e "${RED}Transfer failed${NC}"
        fi
    else
        echo -e "${RED}Export failed${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# 設定リセット
reset_configuration() {
    show_logo
    echo -e "${YELLOW}=== Reset Configuration ===${NC}"
    
    echo -e "${RED}Warning: This will reset all settings to defaults${NC}"
    echo -n "Are you sure? (y/N): "
    read confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -f "$SETTINGS_FILE"
        rm -f "$CONFIG_DIR/debug_settings"
        load_settings  # デフォルト設定を再作成
        echo -e "${GREEN}Configuration reset to defaults${NC}"
        log_message "INFO" "Configuration reset to defaults"
    else
        echo "Reset cancelled"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# ログビューア
logs_viewer_menu() {
    while true; do
        show_logo
        echo -e "${BLUE}=== Logs Viewer ===${NC}"
        echo "1) View Latest KVS Log"
        echo "2) View All Recent Logs"
        echo "3) Search in Logs"
        echo "4) Export Logs to MacBook"
        echo "5) Clear Old Logs"
        echo "6) View Manager Log"
        echo "0) Back to Main Menu"
        echo -n "Select option: "
        
        read -r choice
        choice=${choice:-0}
        
        case $choice in
            1) view_latest_log ;;
            2) view_all_logs ;;
            3) search_logs ;;
            4) export_logs ;;
            5) clear_old_logs ;;
            6) view_manager_log ;;
            0) break ;;
            *) 
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# 最新ログ表示
view_latest_log() {
    show_logo
    echo -e "${CYAN}=== Latest KVS Log ===${NC}"
    
    local latest_log=$(ls -t "$LOG_DIR"/kvs_*.txt 2>/dev/null | head -1)
    if [ -f "$latest_log" ]; then
        echo "Viewing: $latest_log"
        echo "----------------------------------------"
        tail -50 "$latest_log"
    else
        echo -e "${RED}No logs found${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# 全ログ表示
view_all_logs() {
    show_logo
    echo -e "${CYAN}=== Recent Logs ===${NC}"
    
    echo "Recent log files:"
    ls -lht "$LOG_DIR"/*.txt 2>/dev/null | head -20 || echo "No logs found"
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# ログ検索
search_logs() {
    show_logo
    echo -e "${CYAN}=== Search Logs ===${NC}"
    
    echo -n "Enter search term: "
    read search_term
    
    if [ -z "$search_term" ]; then
        echo -e "${RED}Search term cannot be empty${NC}"
    else
        echo -e "\n${YELLOW}Searching for: $search_term${NC}"
        echo "----------------------------------------"
        grep -i "$search_term" "$LOG_DIR"/*.txt 2>/dev/null | head -50 || echo "No matches found"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# ログエクスポート
export_logs() {
    show_logo
    echo -e "${YELLOW}=== Export Logs ===${NC}"
    
    local export_count=0
    
    for log in "$LOG_DIR"/kvs_*.txt; do
        if [ -f "$log" ]; then
            echo -n "Exporting $(basename "$log")..."
            scp "$log" mbp:~/Developer/01_A1-Console/grok/ 2>/dev/null && {
                echo -e " ${GREEN}OK${NC}"
                export_count=$((export_count + 1))
            } || echo -e " ${RED}Failed${NC}"
        fi
    done
    
    echo -e "\n${GREEN}Exported $export_count log file(s)${NC}"
    echo -e "${CYAN}Press Enter to continue...${NC}"
    read
}

# 古いログ削除
clear_old_logs() {
    show_logo
    echo -e "${YELLOW}=== Clear Old Logs ===${NC}"
    
    echo -n "Delete logs older than how many days? (default: 7): "
    read days
    days=${days:-7}
    
    if [[ "$days" =~ ^[0-9]+$ ]]; then
        echo -e "${YELLOW}Deleting logs older than $days days...${NC}"
        find "$LOG_DIR" -name "*.txt" -type f -mtime +$days -delete
        find "$LOG_DIR" -name "*.txt.*" -type f -mtime +$days -delete
        echo -e "${GREEN}Old logs cleared${NC}"
        log_message "INFO" "Cleared logs older than $days days"
    else
        echo -e "${RED}Invalid number of days${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# マネージャーログ表示
view_manager_log() {
    show_logo
    echo -e "${CYAN}=== Manager Log ===${NC}"
    
    if [ -f "$LOG_DIR/kvs_manager.log" ]; then
        tail -50 "$LOG_DIR/kvs_manager.log"
    else
        echo -e "${RED}Manager log not found${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# ネットワーク診断
network_diagnostics() {
    show_logo
    echo -e "${CYAN}=== Network Diagnostics ===${NC}"
    
    # AWS接続確認
    echo -e "\n${YELLOW}AWS Connectivity:${NC}"
    
    if aws sts get-caller-identity --region "$DEFAULT_REGION" &> /dev/null; then
        echo -e "${GREEN}AWS connection successful${NC}"
        
        if command -v jq &> /dev/null; then
            aws sts get-caller-identity --region "$DEFAULT_REGION" 2>&1 | jq '.'
        else
            aws sts get-caller-identity --region "$DEFAULT_REGION" 2>&1 | grep -E "UserId|Account|Arn"
        fi
    else
        echo -e "${RED}AWS connection failed${NC}"
    fi
    
    # RTSP接続確認
    echo -e "\n${YELLOW}RTSP Connectivity Test:${NC}"
    echo -n "Enter RTSP URI to test (default: $DEFAULT_RTSP_URI): "
    read test_uri
    test_uri=${test_uri:-$DEFAULT_RTSP_URI}
    
    local host=$(echo "$test_uri" | sed -E 's|rtsp://([^:/]+).*|\1|')
    local port=$(echo "$test_uri" | sed -E 's|.*:([0-9]+)/.*|\1|')
    port=${port:-554}
    
    echo "Testing connection to $host:$port..."
    
    if ping -c 3 -W 2 "$host" &> /dev/null; then
        echo -e "${GREEN}Host $host is reachable${NC}"
        
        if command -v nc &> /dev/null; then
            timeout 3 nc -zv "$host" "$port" 2>&1 && \
                echo -e "${GREEN}Port $port is open${NC}" || \
                echo -e "${RED}Port $port is closed or filtered${NC}"
        fi
    else
        echo -e "${RED}Host $host is not reachable${NC}"
    fi
    
    # インターネット接続確認
    echo -e "\n${YELLOW}Internet Connectivity:${NC}"
    if ping -c 3 -W 2 8.8.8.8 &> /dev/null; then
        echo -e "${GREEN}Internet connection OK${NC}"
    else
        echo -e "${RED}No internet connection${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# パフォーマンスモニター
performance_monitor() {
    show_logo
    echo -e "${CYAN}=== Performance Monitor ===${NC}"
    echo "Monitoring for 10 seconds... Press Ctrl+C to stop"
    echo ""
    
    local count=0
    while [ $count -lt 10 ]; do
        echo -n "$(date +%H:%M:%S) - "
        
        # CPU使用率
        local cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
        echo -n "CPU: ${cpu}% | "
        
        # メモリ使用率
        local mem=$(free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}')
        echo -n "MEM: ${mem}% | "
        
        # KVSプロセスのCPU/メモリ
        local kvs_stats=$(ps aux | grep "kvsWebrtcClientMaster" | grep -v grep | awk '{cpu+=$3; mem+=$4} END {printf "KVS CPU: %.1f%%, MEM: %.1f%%", cpu, mem}')
        echo "$kvs_stats"
        
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# メイン処理
import_configuration() {
    show_logo
    echo -e "${YELLOW}=== Import Configuration ===${NC}"
    
    echo -n "Enter path to configuration file: "
    read import_file
    
    if [ -f "$import_file" ]; then
        echo "Importing configuration..."
        tar -xzf "$import_file" -C "$CONFIG_DIR" 2>/dev/null && {
            load_settings
            echo -e "${GREEN}Configuration imported successfully${NC}"
            log_message "INFO" "Configuration imported from $import_file"
        } || echo -e "${RED}Import failed${NC}"
    else
        echo -e "${RED}File not found: $import_file${NC}"
    fi
    
    echo -e "\n${CYAN}Press Enter to continue...${NC}"
    read
}

# メイン処理
main() {
    # 設定読み込み
    load_settings
    
    # ログローテーション実行
    rotate_logs "$LOG_DIR/kvs_manager.log"
    
    # AWS認証情報確認
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        echo -e "${RED}Error: AWS credentials not set!${NC}"
        echo "Please run:"
        echo "  export AWS_ACCESS_KEY_ID=your_key"
        echo "  export AWS_SECRET_ACCESS_KEY=your_secret"
        echo "  export AWS_DEFAULT_REGION=$DEFAULT_REGION"
        exit 1
    fi
    
    # 保存されたデバッグ設定を読み込み
    if [ -f "$CONFIG_DIR/debug_settings" ]; then
        source "$CONFIG_DIR/debug_settings"
    fi
    
    log_message "INFO" "KVS Manager started"
    
    # メインループ
    while true; do
        show_logo
        show_main_menu
        
        read -r choice
        
        # エンターのみの場合は何もしない（再表示）
        if [ -z "$choice" ]; then
            continue
        fi
        
        case $choice in
            1) stream_management_menu ;;
            2) channel_management_menu ;;
            3) debug_settings_menu ;;
            4) 
                show_system_status
                ;;
            5) configuration_menu ;;
            6) logs_viewer_menu ;;
            7) 
                network_diagnostics
                ;;
            0) 
                show_logo
                echo -e "${GREEN}Stopping all streams before exit...${NC}"
                stop_all_streams
                log_message "INFO" "KVS Manager stopped"
                echo -e "${GREEN}Goodbye!${NC}"
                exit 0 
                ;;
            *) 
                log_message "WARN" "Invalid option in main menu: $choice"
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# スクリプト実行
main "$@"