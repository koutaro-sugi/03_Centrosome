# MAVLink System Setup Guide
# MAVLinkシステムセットアップガイド

## システム概要

```
┌─────────────┐    UDP:14555    ┌─────────────┐    UDP:14556    ┌─────────────┐
│ Raspberry Pi│ ──────────────→ │     EC2     │ ──────────────→ │ PC (QGC)    │
│    ├FC      │                 │   Router    │                 │             │
│    └USB     │                 │             │                 │             │
└─────────────┘                 └─────────────┘                 └─────────────┘
    /dev/ttyACM0                    mavlink-router               QGroundControl
    Baud: 57600                     Port relay                   Mission planning
```

## セットアップ手順

### 1. ラズパイ5でのMAVLinkシステム構築

```bash
# 1. スクリプトをダウンロード
wget https://raw.githubusercontent.com/koutaro-sugi/Raspi-Persona/main/install_mavlink_system.sh
chmod +x install_mavlink_system.sh

# 2. インストール実行
./install_mavlink_system.sh

# 3. 再起動
sudo reboot

# 4. サービス開始
./manage_mavlink.sh start

# 5. 状態確認
./manage_mavlink.sh status
```

### 2. EC2での設定確認

EC2側は既に設定済みです：

```bash
# サービス状態確認
sudo systemctl status mavlink-router-ec2.service

# ポート使用状況確認
sudo ss -tulpn | grep :145
```

### 3. QGroundControlでの接続

QGCで以下の設定を行ってください：

1. **Application Settings** → **Comm Links** → **Add**
2. **Type**: UDP
3. **Port**: 14556
4. **Target Hosts**: EC2のパブリックIP
5. **High Latency**: チェック

## 管理コマンド

### ラズパイでの操作

```bash
# サービス管理
./manage_mavlink.sh start     # 開始
./manage_mavlink.sh stop      # 停止
./manage_mavlink.sh restart   # 再起動
./manage_mavlink.sh status    # 状態確認
./manage_mavlink.sh logs      # ログ表示
./manage_mavlink.sh test      # 接続テスト
```

### EC2での操作

```bash
# サービス管理
sudo systemctl start mavlink-router-ec2.service
sudo systemctl stop mavlink-router-ec2.service
sudo systemctl status mavlink-router-ec2.service

# ログ確認
sudo journalctl -u mavlink-router-ec2.service -f
```

## 設定値

### ラズパイ設定
- **デバイス**: /dev/ttyACM0
- **Baud Rate**: 57600
- **転送先**: EC2プライベートIP:14555
- **ログ**: /home/pi/mavlink_logs/

### EC2設定
- **受信ポート**: 14555 (ラズパイから)
- **送信ポート**: 14556 (QGCへ)
- **WebSocket**: 14560 (Webアプリ用)
- **設定ファイル**: /etc/mavlink-router/main.conf

## トラブルシューティング

### 1. フライトコントローラーが認識されない

```bash
# デバイス確認
ls /dev/tty*

# USBデバイス確認
lsusb

# 権限確認
groups $USER | grep dialout
```

### 2. EC2への接続ができない

```bash
# ネットワーク接続確認
ping 172.31.46.224

# ポート確認
telnet 172.31.46.224 14555

# ファイアウォール確認（EC2側）
sudo ufw status
```

### 3. QGCで接続できない

1. EC2のセキュリティグループで14556ポートが開放されているか確認
2. QGCの接続設定を再確認
3. EC2の mavlink-router-ec2.service が正常動作しているか確認

### 4. ログ確認方法

```bash
# ラズパイ側
sudo journalctl -u mavlink-raspi.service -f
tail -f /home/pi/mavlink_logs/mavlink_*.log

# EC2側
sudo journalctl -u mavlink-router-ec2.service -f
```

## バックアップ・復元

### バックアップ作成

```bash
# バックアップスクリプトのダウンロード
wget https://raw.githubusercontent.com/koutaro-sugi/Raspi-Persona/main/backup_to_github.sh
chmod +x backup_to_github.sh

# バックアップ実行
./backup_to_github.sh
```

### 新しいラズパイでの復元

```bash
# 1. リポジトリクローン
git clone https://github.com/koutaro-sugi/Raspi-Persona.git
cd Raspi-Persona

# 2. 復元実行
chmod +x restore_mavlink.sh
./restore_mavlink.sh

# 3. 再起動
sudo reboot

# 4. サービス開始
./manage_mavlink.sh start
```

## ファイル構成

### ラズパイ側
```
/home/pi/
├── start_mavlink.sh           # MAVProxy起動スクリプト
├── manage_mavlink.sh          # 管理スクリプト
├── install_mavlink_system.sh  # インストールスクリプト
├── backup_to_github.sh        # バックアップスクリプト
└── mavlink_logs/              # ログディレクトリ
    ├── mavlink_*.log          # MAVLinkログ
    └── mav.parm               # パラメータファイル

/etc/systemd/system/
└── mavlink-raspi.service      # systemdサービス
```

### EC2側
```
/etc/mavlink-router/
└── main.conf                  # mavlink-router設定

/etc/systemd/system/
├── mavlink-router.service     # 標準サービス
└── mavlink-router-ec2.service # EC2用サービス

/home/ubuntu/
└── mavlink-ws-bridge/         # WebSocket ブリッジ
```

## よくある質問

### Q: Baud Rateを変更したい
A: `/home/pi/start_mavlink.sh`の`FC_BAUD_RATE`を編集してサービスを再起動

### Q: EC2のIPアドレスが変わった
A: `start_mavlink.sh`の`EC2_IP`を編集してサービスを再起動

### Q: 自動起動を無効にしたい
A: `sudo systemctl disable mavlink-raspi.service`

### Q: 複数のFCを接続したい
A: デバイスパスを追加して複数のMAVProxyインスタンスを起動

## 注意事項

1. **セキュリティ**: EC2のセキュリティグループでポート制限を適切に設定
2. **ネットワーク**: VPN環境での動作は要検証
3. **電源**: ラズパイの電源が不安定だとMAVLinkが切断される可能性
4. **ログ**: 長時間運用時はログローテーションを確認

## サポート

問題が発生した場合は、以下の情報と共にお問い合わせください：

1. エラーメッセージ
2. `./manage_mavlink.sh test`の結果
3. `sudo journalctl -u mavlink-raspi.service --no-pager`の出力
4. ネットワーク環境の詳細