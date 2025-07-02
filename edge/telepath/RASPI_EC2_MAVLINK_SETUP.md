# Raspberry Pi 5 - EC2 - MAVLink セットアップ手順書

## 概要
Raspberry Pi 5を使用して、フライトコントローラーからEC2経由でMAVLinkデータを転送し、EC2インスタンスを自動起動するシステムの完全セットアップガイドです。

## システム構成

```
┌─────────────┐    UDP:14555    ┌─────────────┐    UDP:14556    ┌─────────────┐
│ Raspberry Pi│ ──────────────→ │     EC2     │ ──────────────→ │ PC (QGC)    │
│    ├FC      │                 │   Router    │                 │             │
│    └USB     │                 │             │                 │             │
└─────────────┘                 └─────────────┘                 └─────────────┘
    /dev/ttyACM0                 52.194.5.104                    QGroundControl
    Baud: 57600                  i-05649608631f67afe
```

## セットアップ手順

### 1. Raspberry Pi初期設定

#### 1.1 SSHアクセス
```bash
ssh pi@100.94.179.107
```

#### 1.2 リポジトリのクローン
```bash
git clone https://github.com/koutaro-sugi/Raspi-Persona.git
cd Raspi-Persona
```

### 2. MAVProxyセットアップ

#### 2.1 必要なパッケージのインストール
```bash
# システムパッケージの更新
sudo apt update
sudo apt upgrade -y

# 依存関係のインストール
sudo apt install -y python3-pip python3-dev python3-opencv python3-wxgtk4.0 python3-matplotlib python3-lxml python3-pygame

# pipxのインストール（推奨）
sudo apt install -y pipx python3-pymavlink
pipx ensurepath
pipx install MAVProxy

# fishシェルの場合
set -U fish_user_paths /home/pi/.local/bin $fish_user_paths

# bashシェルの場合
echo 'export PATH=$PATH:/home/pi/.local/bin' >> ~/.bashrc
source ~/.bashrc
```

#### 2.2 MAVLinkサービスの作成

bashシェルで実行：
```bash
# bashに切り替え
bash

# サービスファイルの作成
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

#### 2.3 start_mavlink.shの修正

```bash
nano ~/Raspi-Persona/telepath/start_mavlink.sh
```

以下を追加（#!/bin/bashの次の行）：
```bash
export PATH=$PATH:/home/pi/.local/bin
```

#### 2.4 パーミッション設定とサービス有効化

```bash
# 実行権限を付与
chmod +x ~/Raspi-Persona/telepath/start_mavlink.sh
chmod +x ~/Raspi-Persona/telepath/manage_mavlink.sh

# サービスを有効化
sudo systemctl daemon-reload
sudo systemctl enable mavlink-raspi.service
sudo systemctl start mavlink-raspi.service
```

### 3. EC2自動起動サービスのセットアップ

#### 3.1 AWS CLIのインストール

```bash
# システムパッケージでインストール
sudo apt install -y awscli

# または pipxでインストール
pipx install awscli
```

#### 3.2 AWS認証情報の設定

```bash
aws configure
```

以下を入力：
- AWS Access Key ID: [YOUR_ACCESS_KEY]
- AWS Secret Access Key: [YOUR_SECRET_KEY]
- Default region name: ap-northeast-1
- Default output format: json

#### 3.3 EC2自動起動サービスのインストール

```bash
cd ~/Raspi-Persona/telepath
./install-ec2-autostart.sh
```

#### 3.4 サービスファイルの更新（必要な場合）

```bash
sudo nano /etc/systemd/system/ec2-auto-start.service
```

以下のようにPATH環境変数を追加：
```ini
[Service]
Environment="PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/pi/.local/bin"
```

#### 3.5 サービスの有効化と起動

```bash
sudo systemctl daemon-reload
sudo systemctl enable ec2-auto-start.service
sudo systemctl start ec2-auto-start.service
```

### 4. 動作確認

#### 4.1 MAVLinkサービスの状態確認

```bash
# サービス状態
bash ~/Raspi-Persona/telepath/manage_mavlink.sh status

# リアルタイムログ
bash ~/Raspi-Persona/telepath/manage_mavlink.sh logs

# 接続テスト
bash ~/Raspi-Persona/telepath/manage_mavlink.sh test
```

#### 4.2 EC2自動起動の確認

```bash
# サービス状態
sudo systemctl status ec2-auto-start.service

# ログ確認
tail -f ~/ec2-startup.log

# EC2インスタンス状態
aws ec2 describe-instances --instance-ids i-05649608631f67afe --region ap-northeast-1 --query 'Reservations[0].Instances[0].State.Name' --output text
```

### 5. QGroundControlでの接続

1. **Application Settings** → **Comm Links** → **Add**
2. **Type**: UDP
3. **Port**: 14556
4. **Target Host**: 52.194.5.104（EC2のパブリックIP）
5. **Connect**

## トラブルシューティング

### MAVProxyが見つからない場合

```bash
# MAVProxyの場所を確認
which mavproxy.py
pipx list

# PATHの確認
echo $PATH

# シンボリックリンクを作成
sudo ln -s /home/pi/.local/bin/mavproxy.py /usr/local/bin/mavproxy.py
```

### ロケールエラーの修正

```bash
sudo locale-gen en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
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

### EC2が起動しない場合

```bash
# 手動でスクリプトを実行してエラーを確認
bash ~/Raspi-Persona/telepath/ec2-auto-start.sh

# AWS CLIの動作確認
aws ec2 describe-instances --instance-ids i-05649608631f67afe
```

## システム再起動後の動作

1. **Raspberry Pi起動**
2. **ネットワーク接続確立**（自動）
3. **EC2インスタンス起動**（自動）
4. **MAVLinkサービス開始**（自動）
5. **FCからEC2へのデータ転送開始**（自動）

## 重要な設定値

| 項目 | 値 |
|------|-----|
| FC Device | /dev/ttyACM0 |
| Baud Rate | 57600 |
| EC2 IP | 52.194.5.104 |
| EC2 Instance ID | i-05649608631f67afe |
| UDP Port (to EC2) | 14555 |
| UDP Port (to QGC) | 14556 |
| Log Directory | /home/pi/mavlink_logs/ |

## メンテナンス

### ログのクリーンアップ

```bash
# 古いログを削除（30日以上）
find ~/mavlink_logs -name "*.log" -mtime +30 -delete
find ~/ -name "ec2-startup.log" -size +10M -delete
```

### サービスの再起動

```bash
# MAVLinkサービス
bash ~/Raspi-Persona/telepath/manage_mavlink.sh restart

# EC2自動起動サービス
sudo systemctl restart ec2-auto-start.service
```

### 設定の更新

```bash
# リポジトリの更新
cd ~/Raspi-Persona
git pull

# サービスファイルの更新
sudo cp telepath/ec2-auto-start.service /etc/systemd/system/
sudo systemctl daemon-reload
```

## セキュリティ考慮事項

1. **AWS認証情報**は`~/.aws/credentials`に安全に保管
2. **EC2のIAMロール**は必要最小限の権限のみ付与
3. **SSH鍵**は定期的に更新
4. **ファイアウォール**でUDPポートを適切に制限

## 関連ドキュメント

- [MAVProxyリカバリガイド](telepath/MAVPROXY_RECOVERY_GUIDE.md)
- [EC2自動起動README](telepath/README_EC2_AUTOSTART.md)
- [MAVLinkセットアップガイド](telepath/MAVLINK_SETUP_GUIDE.md)