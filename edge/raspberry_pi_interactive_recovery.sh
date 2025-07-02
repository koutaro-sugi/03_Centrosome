#!/bin/bash
# Raspberry Pi 5 インタラクティブリカバリーツール
# 全ての復旧手順をガイド付きで実行

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 設定
RASPI_IP="${1:-raspberrypi.local}"
RASPI_USER="pi"
RASPI_PASS="123"

# ステップ管理
CURRENT_STEP=1
TOTAL_STEPS=10

# ヘルプ表示
show_header() {
    clear
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║            🍓 Raspberry Pi 5 Interactive Recovery Tool          ║${NC}"
    echo -e "${BLUE}║                      10分で完全復旧！                            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}現在のステップ: ${YELLOW}$CURRENT_STEP/$TOTAL_STEPS${NC}"
    echo ""
}

# エラーチェック関数
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 完了${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 失敗${NC}"
        echo -e "${YELLOW}続行しますか？ (y/n):${NC}"
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}復旧を中断しました${NC}"
            exit 1
        fi
        return 1
    fi
}

# ユーザー確認
confirm_step() {
    echo -e "${YELLOW}$1${NC}"
    echo -e "${CYAN}実行しますか？ (y/n/s=skip): ${NC}"
    read -n 1 -r
    echo
    case $REPLY in
        [Yy]* ) return 0;;
        [Ss]* ) echo -e "${YELLOW}⏭️  スキップしました${NC}"; return 1;;
        * ) echo -e "${RED}キャンセルしました${NC}"; exit 1;;
    esac
}

# 進行状況表示
next_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    sleep 1
}

# メイン関数
main() {
    show_header
    echo -e "${PURPLE}🎯 このツールは以下の手順を実行します：${NC}"
    echo -e "   1. SSH接続テスト"
    echo -e "   2. ホストキークリア"
    echo -e "   3. SSH鍵設定"
    echo -e "   4. 基本パッケージ更新"
    echo -e "   5. Fish Shell設定"
    echo -e "   6. Nerd Font設定"
    echo -e "   7. GitHub SSH鍵設定"
    echo -e "   8. Raspi-Personaクローン"
    echo -e "   9. AWS認証情報設定"
    echo -e "   10. 完了確認"
    echo ""
    
    if ! confirm_step "復旧を開始しますか？"; then
        exit 0
    fi

    # ステップ1: SSH接続テスト
    show_header
    echo -e "${PURPLE}📡 ステップ1: SSH接続テスト${NC}"
    echo -e "ラズパイ ${YELLOW}${RASPI_IP}${NC} への接続をテストします"
    
    if confirm_step "SSH接続をテストしますか？"; then
        ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${RASPI_USER}@${RASPI_IP} "echo 'SSH接続成功'" 2>/dev/null
        check_status "SSH接続テスト"
    fi
    next_step

    # ステップ2: ホストキークリア
    show_header
    echo -e "${PURPLE}🔑 ステップ2: ホストキークリア${NC}"
    echo -e "古いSSHホストキーをクリアします"
    
    if confirm_step "ホストキーをクリアしますか？"; then
        ssh-keygen -R ${RASPI_IP} 2>/dev/null || true
        ssh-keygen -R raspberrypi.local 2>/dev/null || true
        ssh-keygen -R 100.94.179.107 2>/dev/null || true
        check_status "ホストキークリア"
    fi
    next_step

    # ステップ3: SSH鍵設定
    show_header
    echo -e "${PURPLE}🔐 ステップ3: SSH鍵設定${NC}"
    echo -e "パスワードレスSSH接続を設定します"
    
    if confirm_step "SSH鍵を設定しますか？"; then
        if command -v sshpass >/dev/null 2>&1; then
            sshpass -p "${RASPI_PASS}" ssh-copy-id -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519.pub ${RASPI_USER}@${RASPI_IP}
            check_status "SSH鍵設定"
        else
            echo -e "${YELLOW}⚠️  sshpassが見つかりません。手動で設定してください：${NC}"
            echo -e "   ${CYAN}ssh-copy-id -i ~/.ssh/id_ed25519.pub ${RASPI_USER}@${RASPI_IP}${NC}"
            echo -e "${YELLOW}パスワード: ${RASPI_PASS}${NC}"
            echo -e "${CYAN}実行後、Enterを押してください${NC}"
            read
        fi
    fi
    next_step

    # ステップ4: 基本パッケージ更新
    show_header
    echo -e "${PURPLE}📦 ステップ4: 基本パッケージ更新${NC}"
    echo -e "必要なパッケージをインストールします"
    
    if confirm_step "パッケージを更新しますか？"; then
        ssh ${RASPI_USER}@${RASPI_IP} "sudo apt update -qq && sudo apt install -y -qq git wget curl unzip build-essential cmake pkg-config python3-pip python3-dev fish fonts-powerline fontconfig sshpass" >/dev/null 2>&1
        check_status "パッケージ更新"
    fi
    next_step

    # ステップ5: Fish Shell設定
    show_header
    echo -e "${PURPLE}🐟 ステップ5: Fish Shell設定${NC}"
    echo -e "Fish ShellとOMFをセットアップします"
    
    if confirm_step "Fish Shellを設定しますか？"; then
        # デフォルトシェル変更は時間がかかるのでユーザーに委ねる
        echo -e "${YELLOW}⚠️  以下のコマンドをラズパイで手動実行してください：${NC}"
        echo -e "   ${CYAN}chsh -s /usr/bin/fish${NC}"
        echo -e "   ${CYAN}curl https://raw.githubusercontent.com/oh-my-fish/oh-my-fish/master/bin/install | fish${NC}"
        echo -e "   ${CYAN}omf install bobthefish${NC}"
        echo -e "${YELLOW}実行後、Enterを押してください${NC}"
        read
        check_status "Fish Shell設定（手動）"
    fi
    next_step

    # ステップ6: Nerd Font設定
    show_header
    echo -e "${PURPLE}🖋️  ステップ6: Nerd Font設定${NC}"
    echo -e "Nerd Fontをインストールします"
    
    if confirm_step "Nerd Fontを設定しますか？"; then
        ssh ${RASPI_USER}@${RASPI_IP} << 'EOF'
cd /tmp
wget -q https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/Meslo.zip 2>/dev/null || curl -sL https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/Meslo.zip -o Meslo.zip
unzip -q Meslo.zip 2>/dev/null
sudo mkdir -p /usr/share/fonts/truetype/meslo-nerd-font
sudo cp *.ttf /usr/share/fonts/truetype/meslo-nerd-font/ 2>/dev/null
sudo fc-cache -fv >/dev/null 2>&1
EOF
        check_status "Nerd Font設定"
    fi
    next_step

    # ステップ7: Fish設定コピー
    show_header
    echo -e "${PURPLE}🐠 ステップ7: Fish設定コピー${NC}"
    echo -e "MacのFish設定をコピーします"
    
    if confirm_step "Fish設定をコピーしますか？"; then
        if [ -d ~/.config/fish ]; then
            scp -r ~/.config/fish ${RASPI_USER}@${RASPI_IP}:~/.config/ >/dev/null 2>&1
            check_status "Fish設定コピー"
        else
            echo -e "${YELLOW}⚠️  ~/.config/fishが見つかりません${NC}"
        fi
    fi
    next_step

    # ステップ8: GitHub SSH鍵設定
    show_header
    echo -e "${PURPLE}🔐 ステップ8: GitHub SSH鍵設定${NC}"
    echo -e "GitHubアクセス用のSSH鍵を設定します"
    
    if confirm_step "GitHub SSH鍵を設定しますか？"; then
        ssh ${RASPI_USER}@${RASPI_IP} << 'EOF'
if [ ! -f ~/.ssh/id_ed25519_github ]; then
    ssh-keygen -t ed25519 -C "pi@raspberrypi" -f ~/.ssh/id_ed25519_github -N ""
    
    cat > ~/.ssh/config << 'CONFIG'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  StrictHostKeyChecking no
CONFIG
    chmod 600 ~/.ssh/config
    
    echo ""
    echo "⚠️  GitHubに以下の公開鍵を登録してください："
    echo "================================================"
    cat ~/.ssh/id_ed25519_github.pub
    echo "================================================"
    echo "GitHub → Settings → SSH and GPG keys → New SSH key"
    echo "Title: RaspberryPi5-Recovery"
    echo ""
else
    echo "✅ SSH鍵は既に存在します"
    cat ~/.ssh/id_ed25519_github.pub
fi
EOF
        echo -e "${YELLOW}GitHubに公開鍵を登録してください。完了したらEnterを押してください${NC}"
        read
        check_status "GitHub SSH鍵設定"
    fi
    next_step

    # ステップ9: Raspi-Personaクローン
    show_header
    echo -e "${PURPLE}📁 ステップ9: Raspi-Personaクローン${NC}"
    echo -e "GitHubからプロジェクトをクローンします"
    
    if confirm_step "Raspi-Personaをクローンしますか？"; then
        # まず接続テスト
        ssh ${RASPI_USER}@${RASPI_IP} "ssh -T git@github.com" 2>/dev/null || true
        
        # クローン実行
        ssh ${RASPI_USER}@${RASPI_IP} "cd ~ && rm -rf Raspi-Persona && git clone git@github.com:koutaro-sugi/Raspi-Persona.git && cd Raspi-Persona && git submodule update --init --recursive" 2>/dev/null
        check_status "Raspi-Personaクローン"
        
        # ディレクトリ作成
        ssh ${RASPI_USER}@${RASPI_IP} "mkdir -p ~/Raspi-Persona/51_robot/debug/logs ~/Raspi-Persona/51_robot/config"
        check_status "ディレクトリ作成"
    fi
    next_step

    # ステップ10: AWS認証情報設定
    show_header
    echo -e "${PURPLE}🔐 ステップ10: AWS認証情報設定${NC}"
    echo -e "KVS用のAWS認証情報を設定します"
    
    if confirm_step "AWS認証情報を設定しますか？"; then
        ssh ${RASPI_USER}@${RASPI_IP} "fish -c \"
        echo '# AWS KVS設定' >> ~/.config/fish/config.fish
        echo 'set -gx AWS_ACCESS_KEY_ID YOUR_AWS_ACCESS_KEY_ID' >> ~/.config/fish/config.fish
        echo 'set -gx AWS_SECRET_ACCESS_KEY YOUR_AWS_SECRET_ACCESS_KEY' >> ~/.config/fish/config.fish
        echo 'set -gx AWS_DEFAULT_REGION ap-northeast-1' >> ~/.config/fish/config.fish
        \""
        check_status "AWS認証情報設定"
    fi
    next_step

    # 完了画面
    show_header
    echo -e "${GREEN}🎉 復旧完了！${NC}"
    echo ""
    echo -e "${PURPLE}📋 次に手動で実行してください：${NC}"
    echo ""
    echo -e "${YELLOW}1. SDKビルド（初回のみ、15-20分）：${NC}"
    echo -e "   ${CYAN}ssh pi@raspberrypi.local${NC}"
    echo -e "   ${CYAN}cd ~/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c${NC}"
    echo -e "   ${CYAN}mkdir -p build && cd build${NC}"
    echo -e "   ${CYAN}cmake .. && make -j4${NC}"
    echo ""
    echo -e "${YELLOW}2. Tailscale設定：${NC}"
    echo -e "   ${CYAN}curl -fsSL https://tailscale.com/install.sh | sh${NC}"
    echo -e "   ${CYAN}sudo tailscale up${NC}"
    echo ""
    echo -e "${YELLOW}3. KVS Manager起動テスト：${NC}"
    echo -e "   ${CYAN}cd ~/Raspi-Persona/robot/fpv-streaming${NC}"
    echo -e "   ${CYAN}./kvs_manager.sh${NC}"
    echo ""
    echo -e "${GREEN}⏱️  自動化部分の所要時間: 約$(( ($(date +%s) - START_TIME) / 60 ))分${NC}"
    echo -e "${PURPLE}📖 詳細は RASPBERRY_PI_QUICK_RECOVERY_GUIDE.md を参照${NC}"
}

# 開始時刻記録
START_TIME=$(date +%s)

# メイン実行
main "$@"