#!/bin/bash

# =============================================================================
# GitHub Backup Script for Raspberry Pi MAVLink System
# ラズパイMAVLinkシステム用GitHubバックアップスクリプト
# =============================================================================

set -e

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
GITHUB_REPO="https://github.com/koutaro-sugi/Raspi-Persona.git"
BACKUP_DIR="/home/pi/raspi-persona-backup"
MAVLINK_CONFIG_DIR="/home/pi"

log_info "GitHubバックアップスクリプトを開始します..."

# 1. バックアップディレクトリの準備
prepare_backup_dir() {
    log_info "バックアップディレクトリを準備中..."
    
    if [ -d "$BACKUP_DIR" ]; then
        log_info "既存のバックアップディレクトリを更新中..."
        cd "$BACKUP_DIR"
        git pull origin main
    else
        log_info "新しいバックアップディレクトリを作成中..."
        git clone "$GITHUB_REPO" "$BACKUP_DIR"
        cd "$BACKUP_DIR"
    fi
}

# 2. MAVLinkシステムファイルのバックアップ
backup_mavlink_files() {
    log_info "MAVLinkシステムファイルをバックアップ中..."
    
    # MAVLinkディレクトリを作成
    mkdir -p "$BACKUP_DIR/mavlink_system"
    
    # 設定ファイルのコピー
    cp "$MAVLINK_CONFIG_DIR/start_mavlink.sh" "$BACKUP_DIR/mavlink_system/" 2>/dev/null || log_warn "start_mavlink.shが見つかりません"
    cp "$MAVLINK_CONFIG_DIR/manage_mavlink.sh" "$BACKUP_DIR/mavlink_system/" 2>/dev/null || log_warn "manage_mavlink.shが見つかりません"
    
    # systemdサービスファイルのコピー
    sudo cp /etc/systemd/system/mavlink-raspi.service "$BACKUP_DIR/mavlink_system/" 2>/dev/null || log_warn "systemdサービスファイルが見つかりません"
    
    # インストールスクリプトのコピー
    cp "$MAVLINK_CONFIG_DIR/install_mavlink_system.sh" "$BACKUP_DIR/mavlink_system/" 2>/dev/null || log_warn "インストールスクリプトが見つかりません"
    
    # 設定情報をテキストファイルに保存
    cat > "$BACKUP_DIR/mavlink_system/system_info.txt" << EOF
# ラズパイMAVLinkシステム情報
# 生成日時: $(date)

## ハードウェア情報
- Raspberry Pi Model: $(cat /proc/device-tree/model 2>/dev/null || echo "不明")
- OS Version: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)
- Kernel Version: $(uname -r)

## ネットワーク設定
- IPアドレス: $(hostname -I)
- ホスト名: $(hostname)

## デバイス情報
- フライトコントローラー: /dev/ttyACM0
- Baud Rate: 57600
- EC2転送先: 172.31.46.224:14555

## インストール済みパッケージ
$(pip3 list | grep -i mav || echo "MAVProxy関連パッケージなし")

## サービス状態
$(systemctl is-enabled mavlink-raspi.service 2>/dev/null || echo "サービス未登録")
$(systemctl is-active mavlink-raspi.service 2>/dev/null || echo "サービス停止中")
EOF
}

# 3. システム設定のバックアップ
backup_system_config() {
    log_info "システム設定をバックアップ中..."
    
    mkdir -p "$BACKUP_DIR/system_config"
    
    # ネットワーク設定
    sudo cp /etc/dhcpcd.conf "$BACKUP_DIR/system_config/" 2>/dev/null || log_warn "dhcpcd.confが見つかりません"
    
    # SSH設定
    sudo cp /etc/ssh/sshd_config "$BACKUP_DIR/system_config/" 2>/dev/null || log_warn "sshd_configが見つかりません"
    
    # crontab設定
    crontab -l > "$BACKUP_DIR/system_config/user_crontab.txt" 2>/dev/null || echo "# crontabなし" > "$BACKUP_DIR/system_config/user_crontab.txt"
    
    # インストール済みパッケージリスト
    dpkg --get-selections > "$BACKUP_DIR/system_config/installed_packages.txt"
    pip3 list > "$BACKUP_DIR/system_config/python_packages.txt"
}

# 4. 自動復元スクリプトの作成
create_restore_script() {
    log_info "自動復元スクリプトを作成中..."
    
    cat > "$BACKUP_DIR/restore_mavlink.sh" << 'EOF'
#!/bin/bash

# =============================================================================
# MAVLink System Restore Script
# MAVLinkシステム復元スクリプト
# =============================================================================

set -e

echo "MAVLinkシステムの復元を開始します..."

# 1. 必要なパッケージのインストール
echo "必要なパッケージをインストール中..."
sudo apt update
sudo apt install -y python3-pip git

# 2. MAVProxyのインストール
echo "MAVProxyをインストール中..."
sudo pip3 install mavproxy

# 3. 設定ファイルの復元
echo "設定ファイルを復元中..."
cp mavlink_system/start_mavlink.sh /home/pi/
cp mavlink_system/manage_mavlink.sh /home/pi/
chmod +x /home/pi/start_mavlink.sh
chmod +x /home/pi/manage_mavlink.sh

# 4. systemdサービスの復元
echo "systemdサービスを復元中..."
sudo cp mavlink_system/mavlink-raspi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mavlink-raspi.service

# 5. ユーザー権限設定
echo "ユーザー権限を設定中..."
sudo usermod -a -G dialout pi

# 6. ログディレクトリの作成
mkdir -p /home/pi/mavlink_logs

echo "復元が完了しました！"
echo "システムを再起動してから ./manage_mavlink.sh start を実行してください。"
EOF

    chmod +x "$BACKUP_DIR/restore_mavlink.sh"
}

# 5. READMEファイルの更新
update_readme() {
    log_info "READMEファイルを更新中..."
    
    cat > "$BACKUP_DIR/README_MAVLINK.md" << EOF
# Raspberry Pi MAVLink System

ラズパイ5用MAVLinkシステムのバックアップファイルです。

## システム構成

\`\`\`
ラズパイ5 → EC2 → PC (QGroundControl)
   ↓        ↓     ↓
/dev/ttyACM0  UDP:14555  UDP:14556
Baud:57600
\`\`\`

## 復元手順

1. 新しいラズパイでこのリポジトリをクローン：
   \`\`\`bash
   git clone https://github.com/koutaro-sugi/Raspi-Persona.git
   cd Raspi-Persona
   \`\`\`

2. 復元スクリプトを実行：
   \`\`\`bash
   chmod +x restore_mavlink.sh
   ./restore_mavlink.sh
   \`\`\`

3. システムを再起動：
   \`\`\`bash
   sudo reboot
   \`\`\`

4. MAVLinkサービスを開始：
   \`\`\`bash
   ./manage_mavlink.sh start
   \`\`\`

## 管理コマンド

- \`./manage_mavlink.sh start\` - サービス開始
- \`./manage_mavlink.sh stop\` - サービス停止
- \`./manage_mavlink.sh status\` - 状態確認
- \`./manage_mavlink.sh logs\` - ログ表示
- \`./manage_mavlink.sh test\` - 接続テスト

## 設定値

- フライトコントローラー: /dev/ttyACM0
- Baud Rate: 57600
- EC2転送先: 172.31.46.224:14555

## 最終更新

- 日時: $(date)
- バックアップ元: $(hostname) ($(hostname -I | awk '{print $1}'))
EOF
}

# 6. Gitコミット・プッシュ
commit_and_push() {
    log_info "変更をコミット・プッシュ中..."
    
    cd "$BACKUP_DIR"
    
    # Git設定（初回のみ）
    git config user.name "Raspberry Pi Auto Backup" 2>/dev/null || true
    git config user.email "raspi@backup.local" 2>/dev/null || true
    
    # 変更をステージング
    git add .
    
    # コミット（変更がある場合のみ）
    if git diff --staged --quiet; then
        log_info "変更がないため、コミットをスキップします"
    else
        git commit -m "MAVLink system backup from $(hostname) - $(date '+%Y-%m-%d %H:%M:%S')"
        
        # プッシュ（認証情報が設定されている場合）
        if git push origin main 2>/dev/null; then
            log_info "GitHubへのプッシュが完了しました"
        else
            log_warn "GitHubへのプッシュに失敗しました（認証設定を確認してください）"
            log_info "手動でプッシュするには: cd $BACKUP_DIR && git push origin main"
        fi
    fi
}

# メイン処理実行
main() {
    prepare_backup_dir
    backup_mavlink_files
    backup_system_config
    create_restore_script
    update_readme
    commit_and_push
    
    log_info "バックアップが完了しました！"
    echo ""
    echo "=== バックアップ先 ==="
    echo "• ローカル: $BACKUP_DIR"
    echo "• GitHub: $GITHUB_REPO"
    echo ""
    echo "=== 復元方法 ==="
    echo "新しいラズパイで以下を実行："
    echo "1. git clone $GITHUB_REPO"
    echo "2. cd raspi-persona-backup"
    echo "3. ./restore_mavlink.sh"
    echo "4. sudo reboot"
    echo "5. ./manage_mavlink.sh start"
}

# スクリプト実行
main "$@"