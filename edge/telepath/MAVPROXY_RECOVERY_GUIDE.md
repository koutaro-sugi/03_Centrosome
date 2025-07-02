# MAVProxy セットアップ・リカバリガイド

## 概要

このガイドは、Raspberry Pi 5でMAVProxyを使用してフライトコントローラーからEC2へMAVLinkデータを転送するシステムのセットアップとリカバリ手順を説明します。

## システム構成

```
Raspberry Pi 5 → EC2 → QGroundControl
  MAVProxy       Router    UDP:14556
  /dev/ttyACM0   UDP:14555
```

## 初期セットアップ

### 1. 必要なパッケージのインストール

```bash
# システムパッケージの更新
sudo apt update
sudo apt upgrade -y

# 必要な依存関係のインストール
sudo apt install -y python3-pip python3-dev python3-opencv python3-wxgtk4.0 python3-matplotlib python3-lxml python3-pygame

# MAVProxyのインストール（pipxを使用）
sudo apt install -y pipx python3-pymavlink
pipx ensurepath
pipx install MAVProxy

# fishシェルの場合はパスを設定
set -U fish_user_paths /home/pi/.local/bin $fish_user_paths

# bashシェルの場合
echo 'export PATH=$PATH:/home/pi/.local/bin' >> ~/.bashrc
source ~/.bashrc
```

### 2. MAVLinkサービスの作成

```bash
# サービスファイルの作成（bashで実行）
sudo tee /etc/systemd/system/mavlink-raspi.service << 'EOF'
[Unit]
Description=MAVLink Raspi to EC2 Transfer Service
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/home/pi/Raspi-Persona/telepath/start_mavlink.sh
Restart=always
RestartSec=10
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/pi/.local/bin"

[Install]
WantedBy=multi-user.target
EOF
```

### 3. start_mavlink.shの修正

```bash
nano ~/Raspi-Persona/telepath/start_mavlink.sh
```

以下の行を追加（#!/bin/bashの次）：
```bash
export PATH=$PATH:/home/pi/.local/bin
```

または、mavproxy.pyをフルパスに変更：
```bash
    /home/pi/.local/bin/mavproxy.py \
        --master=$FC_DEVICE \
        --baudrate=$FC_BAUD_RATE \
        --out=udp:$EC2_IP:$EC2_PORT \
        --state-basedir=$LOG_DIR \
        --logfile=$LOG_DIR/mavlink_$(date +%Y%m%d_%H%M%S).log \
        --daemon \
        --streamrate=10
```

### 4. パーミッション設定とサービス有効化

```bash
# スクリプトに実行権限を付与
chmod +x ~/Raspi-Persona/telepath/start_mavlink.sh
chmod +x ~/Raspi-Persona/telepath/manage_mavlink.sh

# サービスを有効化
sudo systemctl daemon-reload
sudo systemctl enable mavlink-raspi.service
sudo systemctl start mavlink-raspi.service
```

## トラブルシューティング

### MAVProxyが見つからない場合

```bash
# MAVProxyの場所を確認
which mavproxy.py
pipx list

# シンボリックリンクを作成
sudo ln -s /home/pi/.local/bin/mavproxy.py /usr/local/bin/mavproxy.py
```

### ロケールエラーの修正

```bash
sudo locale-gen en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

### サービスの管理

```bash
# サービス状態確認
bash ~/Raspi-Persona/telepath/manage_mavlink.sh status

# ログ確認
bash ~/Raspi-Persona/telepath/manage_mavlink.sh logs

# サービス再起動
bash ~/Raspi-Persona/telepath/manage_mavlink.sh restart

# 接続テスト
bash ~/Raspi-Persona/telepath/manage_mavlink.sh test
```

### フライトコントローラーが認識されない場合

```bash
# デバイスの確認
ls -la /dev/ttyACM*
lsusb

# udevルールの作成（Cube Orange Plus用）
sudo tee /etc/udev/rules.d/99-cube-orange.rules << 'EOF'
SUBSYSTEM=="tty", ATTRS{idVendor}=="2dae", ATTRS{idProduct}=="1016", SYMLINK+="ttyFC", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

## リカバリ手順

### 完全なリセットとセットアップ

```bash
# 1. 既存サービスの停止と削除
sudo systemctl stop mavlink-raspi.service
sudo systemctl disable mavlink-raspi.service
sudo rm /etc/systemd/system/mavlink-raspi.service

# 2. MAVProxyの再インストール
pipx uninstall MAVProxy
pipx install MAVProxy

# 3. 最新のスクリプトを取得
cd ~/Raspi-Persona
git pull

# 4. 再セットアップ
cd telepath
chmod +x *.sh
sudo cp mavlink-raspi.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mavlink-raspi.service
sudo systemctl start mavlink-raspi.service
```

## 動作確認

### 1. ローカルでの確認

```bash
# MAVProxyが正しく起動しているか
ps aux | grep mavproxy

# ログファイルの確認
ls -la ~/mavlink_logs/
tail -f ~/mavlink_logs/mavlink_*.log
```

### 2. EC2での確認

EC2にSSHして以下を実行：
```bash
# ポート14555でデータを受信しているか確認
sudo tcpdump -i any -n port 14555

# MAVLink Routerの状態確認
sudo systemctl status mavlink-router-ec2.service
```

### 3. QGroundControlでの確認

1. Application Settings → Comm Links → Add
2. Type: UDP, Port: 14556
3. Target Host: EC2のパブリックIP
4. Connect

## 設定値一覧

| 項目 | 値 |
|------|-----|
| FC Device | /dev/ttyACM0 |
| Baud Rate | 57600 |
| EC2 IP | 52.194.5.104 |
| UDP Port (to EC2) | 14555 |
| UDP Port (to QGC) | 14556 |
| Log Directory | /home/pi/mavlink_logs/ |

## よくある問題と解決策

### Q: MAVProxyが起動しない
A: PATHが正しく設定されているか確認。`export PATH=$PATH:/home/pi/.local/bin`を追加。

### Q: "externally-managed-environment"エラー
A: pipxを使用するか、`sudo apt install mavproxy`でシステムパッケージを使用。

### Q: フライトコントローラーが接続されない
A: USB接続を確認し、`dmesg | tail`でデバイス認識を確認。

### Q: EC2にデータが届かない
A: ファイアウォール設定とセキュリティグループでUDP:14555が開いているか確認。