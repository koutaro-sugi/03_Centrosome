#!/bin/bash
# Raspberry Pi 5 自動セットアップスクリプト
# Mac側で実行: chmod +x setup_raspi.sh && ./setup_raspi.sh

RASPI_IP="${1:-raspberrypi.local}"
RASPI_USER="pi"
RASPI_PASS="123"

echo "🚀 Raspberry Pi クイックセットアップ開始"
echo "📍 接続先: ${RASPI_USER}@${RASPI_IP}"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# エラーチェック関数
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 失敗${NC}"
        exit 1
    fi
}

# 1. 既存のホストキーをクリア
echo -e "${YELLOW}🔐 既存のSSHホストキーをクリア中...${NC}"
ssh-keygen -R ${RASPI_IP} 2>/dev/null
ssh-keygen -R raspberrypi.local 2>/dev/null
ssh-keygen -R 100.94.179.107 2>/dev/null

# 2. SSHキー設定
echo -e "${YELLOW}📝 SSHキー設定中...${NC}"
sshpass -p "${RASPI_PASS}" ssh-copy-id -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519.pub ${RASPI_USER}@${RASPI_IP}
check_status "SSHキー設定"

# 3. 初期設定スクリプト実行
echo -e "${YELLOW}⚙️  初期設定実行中（約3分）...${NC}"
ssh ${RASPI_USER}@${RASPI_IP} 'bash -s' << 'EOF'
set -e

# パッケージ更新
echo "📦 パッケージ更新中..."
sudo apt update -qq && sudo apt upgrade -y -qq
sudo apt install -y -qq git wget curl unzip build-essential cmake pkg-config python3-pip python3-dev fish fonts-powerline fontconfig sshpass

# Fish設定（後でchshする）
echo "🐟 Fish準備中..."

# Nerd Font
echo "🖋️ Nerd Fontインストール中..."
cd /tmp
wget -q https://github.com/ryanoasis/nerd-fonts/releases/download/v3.4.0/Meslo.zip
unzip -q Meslo.zip
sudo mkdir -p /usr/share/fonts/truetype/meslo-nerd-font
sudo cp *.ttf /usr/share/fonts/truetype/meslo-nerd-font/
sudo fc-cache -fv >/dev/null 2>&1

# Tailscale
echo "🔐 Tailscaleインストール中..."
curl -fsSL https://tailscale.com/install.sh | sudo sh >/dev/null 2>&1

# 権限設定
sudo usermod -a -G dialout pi
sudo usermod -a -G tty pi

echo "✅ ラズパイ側初期設定完了！"
EOF
check_status "初期設定"

# 4. Fish設定コピー
echo -e "${YELLOW}🐟 Fish設定コピー中...${NC}"
scp -r ~/.config/fish ${RASPI_USER}@${RASPI_IP}:~/.config/ >/dev/null 2>&1
check_status "Fish設定コピー"

# 5. GitHub SSH鍵設定とRaspi-Personaクローン
echo -e "${YELLOW}🔐 GitHub SSH鍵設定中...${NC}"
ssh ${RASPI_USER}@${RASPI_IP} << 'EOF'
# SSH鍵が既に存在するかチェック
if [ ! -f ~/.ssh/id_ed25519_github ]; then
    ssh-keygen -t ed25519 -C "pi@raspberrypi" -f ~/.ssh/id_ed25519_github -N ""
    
    # SSH設定
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
fi
EOF

echo -e "${YELLOW}📁 Raspi-Personaクローン中...${NC}"
read -p "GitHubにSSH鍵を登録しましたか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh ${RASPI_USER}@${RASPI_IP} "cd ~ && rm -rf Raspi-Persona && git clone git@github.com:koutaro-sugi/Raspi-Persona.git"
    check_status "Raspi-Personaクローン"
else
    echo -e "${YELLOW}📦 ローカルからコピーします...${NC}"
    if [ -d ~/Developer/01_A1-Console/Raspi-Persona ]; then
        scp -r ~/Developer/01_A1-Console/Raspi-Persona ${RASPI_USER}@${RASPI_IP}:~/ >/dev/null 2>&1
        check_status "プロジェクトファイルコピー"
    else
        echo -e "${RED}⚠️  Raspi-Personaディレクトリが見つかりません${NC}"
    fi
fi

# 6. Fishシェル設定スクリプト作成
echo -e "${YELLOW}🐠 Fishセットアップスクリプト作成中...${NC}"
ssh ${RASPI_USER}@${RASPI_IP} << 'EOF'
cat > ~/setup_fish.sh << 'FISHSCRIPT'
#!/bin/bash
# デフォルトシェルをfishに変更
chsh -s /usr/bin/fish pi

# oh-my-fishインストール用スクリプト
cat > ~/install_omf.fish << 'OMF'
#!/usr/bin/fish
curl https://raw.githubusercontent.com/oh-my-fish/oh-my-fish/master/bin/install | fish
omf install bobthefish
set -U theme_powerline_fonts yes
set -U theme_nerd_fonts yes
echo "✅ Fish設定完了！"
OMF
chmod +x ~/install_omf.fish
FISHSCRIPT
chmod +x ~/setup_fish.sh
EOF

# 7. 完了メッセージ
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════╗"
echo "║       ✅ セットアップ完了！                    ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "📌 次の手順（ラズパイ側で実行）:"
echo ""
echo "1. Fishシェルに切り替え:"
echo "   ${YELLOW}./setup_fish.sh${NC}"
echo ""
echo "2. Fishシェルで実行:"
echo "   ${YELLOW}fish${NC}"
echo "   ${YELLOW}./install_omf.fish${NC}"
echo ""
echo "3. Tailscale VPN認証:"
echo "   ${YELLOW}sudo tailscale up${NC}"
echo ""
echo "4. MAVLinkシステムセットアップ:"
echo "   ${YELLOW}cd ~/Raspi-Persona/telepath${NC}"
echo "   ${YELLOW}./install_mavlink_system.sh${NC}"
echo "   ${YELLOW}sudo ./manage_mavlink.sh install${NC}"
echo ""
echo "🔨 次の手順（手動実行が必要）:"
echo ""
echo "5. SDKビルド（初回のみ、約15分）:"
echo "   ${YELLOW}cd ~/Raspi-Persona/amazon-kinesis-video-streams-webrtc-sdk-c${NC}"
echo "   ${YELLOW}mkdir -p build && cd build${NC}"
echo "   ${YELLOW}cmake .. && make -j4${NC}"
echo ""
echo "⏱️  自動化部分の所要時間: 約5分"
echo "⏱️  手動部分の所要時間: 約20分"
echo "📝 詳細は RASPBERRY_PI_QUICK_RECOVERY_GUIDE.md を参照"