#!/bin/bash

# Mobile Network Diagnostics for KVS WebRTC
# モバイルネットワーク環境でのKVSストリーミング問題診断スクリプト

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  KVS WebRTC モバイルネットワーク診断  ${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# 基本情報収集
echo -e "${YELLOW}=== 基本ネットワーク情報 ===${NC}"
echo "現在時刻: $(date)"
echo "ホスト名: $(hostname)"
echo "ユーザー: $(whoami)"

# ネットワークインターフェース確認
echo -e "\n${YELLOW}=== ネットワークインターフェース ===${NC}"
ip -br addr show

# デフォルトゲートウェイ確認
echo -e "\n${YELLOW}=== デフォルトゲートウェイ ===${NC}"
ip route | grep default

# DNS設定確認
echo -e "\n${YELLOW}=== DNS設定 ===${NC}"
cat /etc/resolv.conf | grep nameserver

# 基本接続テスト
echo -e "\n${YELLOW}=== 基本接続テスト ===${NC}"
echo -n "インターネット接続: "
if ping -c 3 -W 2 8.8.8.8 >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
fi

echo -n "DNS解決: "
if dig +short google.com >/dev/null 2>&1 || nslookup google.com >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "  DNS設定を確認してください"
fi

# AWS接続テスト
echo -e "\n${YELLOW}=== AWS接続テスト ===${NC}"
echo -n "AWS KVS API接続: "
if curl -s --max-time 5 https://kinesisvideo.ap-northeast-1.amazonaws.com >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
elif ping -c 2 -W 3 kinesisvideo.ap-northeast-1.amazonaws.com >/dev/null 2>&1; then
    echo -e "${YELLOW}PING OK (HTTPS不明)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "  ネットワーク接続またはDNS解決に問題があります"
fi

# AWS認証確認
echo -n "AWS認証: "
if aws sts get-caller-identity --region ap-northeast-1 >/dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    aws sts get-caller-identity --region ap-northeast-1 | jq -r '.Account' 2>/dev/null | xargs -I {} echo "アカウントID: {}"
else
    echo -e "${RED}FAILED${NC}"
fi

# MTU検出
echo -e "\n${YELLOW}=== MTU検出 ===${NC}"
echo "パケットサイズテスト実行中..."

max_mtu=1500
working_mtu=0

for size in 1472 1400 1300 1200 1100 1000; do
    echo -n "サイズ ${size}バイト: "
    if ping -c 1 -W 2 -M do -s $size 8.8.8.8 >/dev/null 2>&1; then
        echo -e "${GREEN}OK${NC}"
        if [ $working_mtu -eq 0 ]; then
            working_mtu=$((size + 28))
        fi
    else
        echo -e "${RED}FAILED${NC}"
    fi
done

if [ $working_mtu -gt 0 ]; then
    echo -e "検出MTU: ${GREEN}${working_mtu}バイト${NC}"
    if [ $working_mtu -lt 1500 ]; then
        echo -e "${YELLOW}警告: 標準MTU(1500)より小さいです${NC}"
    fi
else
    echo -e "${RED}MTU検出失敗${NC}"
fi

# ネットワークタイプ検出
echo -e "\n${YELLOW}=== ネットワークタイプ検出 ===${NC}"

# パブリックIP取得
echo -n "パブリックIP取得中..."
public_ip=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || echo "取得失敗")
echo " $public_ip"

# ローカルIP取得
local_ip=$(ip route get 8.8.8.8 | awk '{print $7; exit}')
echo "ローカルIP: $local_ip"

# NAT検出
if [ "$public_ip" != "$local_ip" ] && [ "$public_ip" != "取得失敗" ]; then
    echo -e "NAT環境: ${YELLOW}検出${NC}"
    
    # キャリアグレードNAT (CG-NAT) の可能性チェック
    if [[ $local_ip =~ ^10\. ]] || [[ $local_ip =~ ^100\.6[4-9]\. ]] || [[ $local_ip =~ ^100\.[7-9][0-9]\. ]] || [[ $local_ip =~ ^100\.1[0-1][0-9]\. ]] || [[ $local_ip =~ ^100\.12[0-7]\. ]]; then
        echo -e "CG-NAT可能性: ${RED}高（RFC6598アドレス検出）${NC}"
    else
        echo -e "CG-NAT可能性: ${YELLOW}中程度${NC}"
    fi
else
    echo -e "NAT環境: ${GREEN}なし${NC}"
fi

# STUN/TURNテスト
echo -e "\n${YELLOW}=== STUN/TURNテスト ===${NC}"

# パブリックSTUNサーバーでのテスト
stun_servers=(
    "stun.l.google.com:19302"
    "stun1.l.google.com:19302"
    "stun.stunprotocol.org:3478"
)

for stun in "${stun_servers[@]}"; do
    echo -n "STUN ${stun}: "
    host=$(echo $stun | cut -d: -f1)
    port=$(echo $stun | cut -d: -f2)
    
    # まずホスト名解決を確認
    if ! nslookup "$host" >/dev/null 2>&1; then
        echo -e "${RED}DNS解決失敗${NC}"
        continue
    fi
    
    # UDPポート接続テスト（簡易版）
    if timeout 3 bash -c "echo test | nc -u -w 1 $host $port" >/dev/null 2>&1; then
        echo -e "${GREEN}接続可能${NC}"
    elif ping -c 1 -W 2 "$host" >/dev/null 2>&1; then
        echo -e "${YELLOW}ホスト到達可能（UDPブロック）${NC}"
    else
        echo -e "${RED}接続失敗${NC}"
    fi
done

# UDPポート範囲テスト
echo -e "\n${YELLOW}=== UDPポート範囲テスト ===${NC}"
echo "WebRTC一般的ポート範囲でのテスト..."

udp_ports=(16384 32768 49152 60000)
for port in "${udp_ports[@]}"; do
    echo -n "UDP ポート $port: "
    # ncでUDPポートをテスト（簡易版）
    if timeout 2 nc -u -w 1 8.8.8.8 $port </dev/null >/dev/null 2>&1; then
        echo -e "${GREEN}送信可能${NC}"
    else
        echo -e "${YELLOW}制限あり${NC}"
    fi
done

# KVSチャンネル確認
echo -e "\n${YELLOW}=== KVSチャンネル確認 ===${NC}"

channels=("usb-camera-channel" "siyi-zr30-channel")
for channel in "${channels[@]}"; do
    echo -n "チャンネル ${channel}: "
    if aws kinesisvideo describe-signaling-channel --channel-name "$channel" --region ap-northeast-1 >/dev/null 2>&1; then
        echo -e "${GREEN}存在${NC}"
        
        # TURN設定確認
        echo -n "  エンドポイント確認中..."
        turn_config=$(aws kinesisvideo get-signaling-channel-endpoint \
            --channel-name "$channel" \
            --single-master-channel-endpoint-configuration Protocols=WSS,Role=VIEWER \
            --region ap-northeast-1 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$turn_config" ]; then
            endpoint=$(echo "$turn_config" | jq -r '.ResourceEndpointList[0].ResourceEndpoint' 2>/dev/null || echo "JSON解析失敗")
            echo -e " ${GREEN}OK${NC}"
            echo "    エンドポイント: $endpoint"
            
            # ICE設定確認
            ice_config=$(aws kinesisvideo get-ice-server-config \
                --channel-arn "arn:aws:kinesisvideo:ap-northeast-1:$(aws sts get-caller-identity --query Account --output text):channel/$channel" \
                --region ap-northeast-1 2>/dev/null)
            
            if [ $? -eq 0 ]; then
                echo -e "    TURN設定: ${GREEN}利用可能${NC}"
                stun_count=$(echo "$ice_config" | jq -r '.IceServerList[] | select(.Uris[] | contains("stun:")) | .Uris[]' 2>/dev/null | wc -l)
                turn_count=$(echo "$ice_config" | jq -r '.IceServerList[] | select(.Uris[] | contains("turn:")) | .Uris[]' 2>/dev/null | wc -l)
                echo "    STUNサーバー: $stun_count個"
                echo "    TURNサーバー: $turn_count個"
            else
                echo -e "    TURN設定: ${RED}取得失敗${NC}"
            fi
        else
            echo -e " ${RED}失敗${NC}"
        fi
    else
        echo -e "${RED}存在しない${NC}"
    fi
done

# TailScale接続確認
echo -e "\n${YELLOW}=== Tailscale確認 ===${NC}"
if command -v tailscale >/dev/null 2>&1; then
    echo -n "Tailscaleステータス: "
    tailscale_status=$(tailscale status --json 2>/dev/null | jq -r '.BackendState' 2>/dev/null || echo "取得失敗")
    if [ "$tailscale_status" = "Running" ]; then
        echo -e "${GREEN}動作中${NC}"
        tailscale ip --4 2>/dev/null | head -1 | xargs -I {} echo "TailscaleIP: {}"
    else
        echo -e "${YELLOW}${tailscale_status}${NC}"
    fi
else
    echo -e "${YELLOW}Tailscaleコマンドなし${NC}"
fi

# 診断結果サマリー
echo -e "\n${CYAN}=== 診断結果サマリー ===${NC}"

issues_found=0

echo "検出された問題:"

if [ $working_mtu -lt 1500 ] && [ $working_mtu -gt 0 ]; then
    echo -e "  ${YELLOW}⚠️  小さなMTU検出 (${working_mtu}バイト)${NC}"
    issues_found=$((issues_found + 1))
fi

if [[ $local_ip =~ ^10\. ]] || [[ $local_ip =~ ^100\.6[4-9]\. ]] || [[ $local_ip =~ ^100\.[7-9][0-9]\. ]]; then
    echo -e "  ${RED}🚨 CG-NAT環境検出 - TURNサーバー必須${NC}"
    issues_found=$((issues_found + 1))
fi

if [ "$public_ip" != "$local_ip" ] && [ "$public_ip" != "取得失敗" ]; then
    echo -e "  ${YELLOW}⚠️  NAT環境 - STUN/TURN推奨${NC}"
    issues_found=$((issues_found + 1))
fi

# DNS問題チェック
if ! dig +short google.com >/dev/null 2>&1 && ! nslookup google.com >/dev/null 2>&1; then
    echo -e "  ${RED}🚨 DNS解決失敗 - ネットワーク設定確認必要${NC}"
    issues_found=$((issues_found + 1))
fi

# STUN接続失敗チェック（全て失敗している場合）
stun_failed=0
for stun in "${stun_servers[@]}"; do
    host=$(echo $stun | cut -d: -f1)
    if ! ping -c 1 -W 2 "$host" >/dev/null 2>&1; then
        stun_failed=$((stun_failed + 1))
    fi
done

if [ $stun_failed -eq 3 ]; then
    echo -e "  ${RED}🚨 全STUNサーバーアクセス失敗 - ファイアウォール確認必要${NC}"
    issues_found=$((issues_found + 1))
fi

if [ $issues_found -eq 0 ]; then
    echo -e "  ${GREEN}✅ 明らかな問題は検出されませんでした${NC}"
fi

# 推奨事項
echo -e "\n${CYAN}=== 推奨事項 ===${NC}"

step_num=1

if [[ $local_ip =~ ^10\. ]] || [[ $local_ip =~ ^100\.6[4-9]\. ]]; then
    echo -e "${YELLOW}${step_num}. KVSでTURNサーバー設定を有効化${NC}"
    echo "   - AWSコンソール → KVS → シグナリングチャンネル → 設定"
    echo "   - 'STUN/TURNサーバー設定を取得' をON"
    step_num=$((step_num + 1))
fi

if ! dig +short google.com >/dev/null 2>&1 && ! nslookup google.com >/dev/null 2>&1; then
    echo -e "${YELLOW}${step_num}. DNS設定確認${NC}"
    echo "   sudo systemctl restart systemd-resolved"
    echo "   または /etc/resolv.conf の設定を確認"
    step_num=$((step_num + 1))
fi

if [ $working_mtu -lt 1400 ] && [ $working_mtu -gt 0 ]; then
    echo -e "${YELLOW}${step_num}. MTU調整${NC}"
    echo "   sudo ip link set dev \$(ip route | grep default | awk '{print \$5}') mtu $working_mtu"
    step_num=$((step_num + 1))
fi

echo -e "${YELLOW}${step_num}. 詳細ログ有効化${NC}"
echo "   export AWS_KVS_LOG_LEVEL=1"
echo "   export GST_DEBUG=5"
step_num=$((step_num + 1))

echo -e "${YELLOW}${step_num}. WebRTC内部状態確認${NC}"
echo "   ブラウザで chrome://webrtc-internals/ を開いて接続状態を確認"
step_num=$((step_num + 1))

echo -e "${YELLOW}${step_num}. モバイルネットワーク特有の問題対策${NC}"
echo "   - TURNサーバーを必ず使用するよう設定"
echo "   - UDP以外のプロトコル（TURN-over-TCP）の利用を検討"

# ログファイル保存
log_file="/home/pi/mobile_network_diagnostics_$(date +%Y%m%d_%H%M%S).log"
echo -e "\n${CYAN}診断結果を保存中: $log_file${NC}"

# この実行結果をログファイルに保存
{
    echo "=== Mobile Network Diagnostics Report ==="
    echo "実行日時: $(date)"
    echo "ホスト: $(hostname)"
    echo ""
    echo "検出MTU: ${working_mtu}バイト"
    echo "パブリックIP: $public_ip"
    echo "ローカルIP: $local_ip"
    echo "Tailscaleステータス: $tailscale_status"
    echo ""
    echo "問題数: $issues_found"
} > "$log_file"

echo -e "${GREEN}診断完了！${NC}"
echo ""
echo -e "${CYAN}次のステップ:${NC}"
echo -e "1. ${YELLOW}TURNサーバー設定確認${NC}: AWS KVSコンソールで設定を確認"
echo -e "2. ${YELLOW}詳細ログ確認${NC}: KVSマネージャーで詳細ログを有効化"
echo -e "3. ${YELLOW}ネットワーク最適化${NC}: 必要に応じてMTU調整"