#!/bin/bash

# =============================================================================
# MAVLink System Setup Script for Raspberry Pi 5
# ラズパイ5用MAVLinkシステムセットアップスクリプト
# =============================================================================

set -e  # エラー時に即座に終了

# 色付きログ出力関数
log_info() {
    echo -e "\e[32m[INFO]\e[0m $1"
}

log_warn() {
    echo -e "\e[33m[WARN]\e[0m $1"
}

log_error() {
    echo -e "\e[31m[ERROR]\e[0m $1"
}

# 設定値
FC_DEVICE="/dev/ttyACM0"
FC_BAUD_RATE="57600"  # 一般的なbaud rate（後で調整可能）
EC2_IP="52.194.5.104"  # EC2のパブリックIP
EC2_PORT="14555"
SYSTEM_ID="1"
COMPONENT_ID="1"

log_info "MAVLinkシステムセットアップを開始します..."

# 1. システム更新
log_info "システムパッケージを更新中..."
sudo apt update
sudo apt upgrade -y

# 2. 必要なパッケージのインストール
log_info "必要なパッケージをインストール中..."
sudo apt install -y \
    python3-pip \
    python3-dev \
    python3-setuptools \
    python3-wheel \
    screen \
    git \
    build-essential \
    cmake \
    pkg-config \
    libxml2-dev \
    libxslt-dev \
    python3-lxml \
    python3-future

# 3. MAVProxyのインストール
log_info "MAVProxyをインストール中..."
sudo pip3 install --upgrade pip
sudo pip3 install mavproxy

# 4. シリアルデバイスの権限設定
log_info "シリアルデバイスの権限を設定中..."
sudo usermod -a -G dialout $USER

# 5. MAVProxy設定ディレクトリの作成
log_info "MAVProxy設定ディレクトリを作成中..."
mkdir -p /home/$USER/.mavproxy

# 6. MAVProxy起動スクリプトの作成
log_info "MAVProxy起動スクリプトを作成中..."
cat > /home/$USER/Persona/telepath/start_mavlink.sh << 'EOF'
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
EOF

chmod +x /home/$USER/Persona/telepath/start_mavlink.sh

# 7. systemdサービスファイルの作成
log_info "systemdサービスを作成中..."
sudo tee /etc/systemd/system/mavlink-raspi.service > /dev/null << EOF
[Unit]
Description=MAVLink Forwarder for Raspberry Pi
After=network.target
Wants=network.target

[Service]
Type=simple
User=pi
Group=pi
ExecStart=/home/pi/Persona/telepath/start_mavlink.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# 環境変数
Environment=HOME=/home/pi
Environment=USER=pi

[Install]
WantedBy=multi-user.target
EOF

# 8. サービスの有効化
log_info "MAVLinkサービスを有効化中..."
sudo systemctl daemon-reload
sudo systemctl enable mavlink-raspi.service

# 9. ログローテーション設定
log_info "ログローテーション設定を作成中..."
sudo tee /etc/logrotate.d/mavlink > /dev/null << 'EOF'
/home/pi/mavlink_logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 pi pi
}
EOF

# 10. 管理スクリプトの作成
log_info "管理スクリプトを作成中..."
cat > /home/$USER/Persona/telepath/manage_mavlink.sh << 'EOF'
#!/bin/bash

# MAVLinkサービス管理スクリプト

case "$1" in
    start)
        echo "MAVLinkサービスを開始します..."
        sudo systemctl start mavlink-raspi.service
        sudo systemctl status mavlink-raspi.service
        ;;
    stop)
        echo "MAVLinkサービスを停止します..."
        sudo systemctl stop mavlink-raspi.service
        ;;
    restart)
        echo "MAVLinkサービスを再起動します..."
        sudo systemctl restart mavlink-raspi.service
        sudo systemctl status mavlink-raspi.service
        ;;
    status)
        sudo systemctl status mavlink-raspi.service
        ;;
    logs)
        sudo journalctl -u mavlink-raspi.service -f
        ;;
    test)
        echo "フライトコントローラー接続テスト..."
        if [ -e "/dev/ttyACM0" ]; then
            echo "✓ /dev/ttyACM0 が検出されました"
            ls -la /dev/ttyACM0
        else
            echo "✗ /dev/ttyACM0 が見つかりません"
            echo "利用可能なttyデバイス:"
            ls /dev/tty*
        fi
        
        echo "ネットワーク接続テスト..."
        ping -c 3 52.194.5.104
        ;;
    *)
        echo "使用方法: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "コマンド説明:"
        echo "  start   - MAVLinkサービスを開始"
        echo "  stop    - MAVLinkサービスを停止"
        echo "  restart - MAVLinkサービスを再起動"
        echo "  status  - サービス状態を確認"
        echo "  logs    - リアルタイムログを表示"
        echo "  test    - 接続テストを実行"
        exit 1
        ;;
esac
EOF

chmod +x /home/$USER/Persona/telepath/manage_mavlink.sh

# 11. インストール完了メッセージ
log_info "MAVLinkシステムのセットアップが完了しました！"
echo ""
echo "=== 次の手順 ==="
echo "1. システムを再起動してください："
echo "   sudo reboot"
echo ""
echo "2. 再起動後、以下のコマンドでサービスを開始："
echo "   cd ~/Persona/telepath && ./manage_mavlink.sh start"
echo ""
echo "3. サービス状態の確認："
echo "   cd ~/Persona/telepath && ./manage_mavlink.sh status"
echo ""
echo "4. リアルタイムログの確認："
echo "   cd ~/Persona/telepath && ./manage_mavlink.sh logs"
echo ""
echo "5. 接続テストの実行："
echo "   cd ~/Persona/telepath && ./manage_mavlink.sh test"
echo ""
echo "=== 重要な設定値 ==="
echo "• フライトコントローラー: $FC_DEVICE"
echo "• Baud Rate: $FC_BAUD_RATE"
echo "• EC2転送先: $EC2_IP:$EC2_PORT"
echo "• ログディレクトリ: /home/$USER/mavlink_logs"
echo ""
echo "Baud rateの調整が必要な場合は start_mavlink.sh を編集してください。"