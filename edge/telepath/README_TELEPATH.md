# Telepath - MAVLink テレメトリシステム

Raspberry Pi 5用のMAVLinkテレメトリシステムです。ドローンのフライトコントローラーからテレメトリデータを受信し、EC2サーバー経由でQGroundControlに転送します。

## システム構成

```
ラズパイ5 (Telepath) → EC2 (Relay) → PC (QGroundControl)
       ↓                 ↓              ↓
   /dev/ttyACM0     UDP:14555      UDP:14556
   Baud:57600       Router         Mission Control
```

## クイックスタート

### 1. 初回セットアップ

```bash
cd ~/Persona/telepath
chmod +x install_mavlink_system.sh
./install_mavlink_system.sh
sudo reboot
```

### 2. サービス管理

```bash
cd ~/Persona/telepath

# サービス開始
./manage_mavlink.sh start

# 状態確認
./manage_mavlink.sh status

# リアルタイムログ
./manage_mavlink.sh logs

# 接続テスト
./manage_mavlink.sh test
```

## ファイル構成

```
telepath/
├── README_TELEPATH.md          # このファイル
├── install_mavlink_system.sh   # システムセットアップスクリプト
├── start_mavlink.sh           # MAVLink転送スクリプト
├── manage_mavlink.sh          # サービス管理スクリプト
├── backup_to_github.sh        # バックアップスクリプト
├── MAVLINK_SETUP_GUIDE.md     # 詳細セットアップガイド
└── logs/                      # ログディレクトリ
    └── mavlink_YYYYMMDD_HHMMSS.log
```

## 設定情報

### ハードウェア設定
- **フライトコントローラー**: /dev/ttyACM0
- **Baud Rate**: 57600
- **対応FC**: ArduPlane, ArduCopter (Pixhawk系)

### ネットワーク設定
- **EC2サーバー**: 52.194.5.104:14555
- **QGC接続**: EC2:14556
- **WebSocket**: EC2:14560 (Web用)

### ディレクトリ構成
- **ログ**: `/home/pi/Persona/telepath/logs/`
- **設定**: `/etc/systemd/system/mavlink-raspi.service`
- **ローテーション**: `/etc/logrotate.d/mavlink`

## コマンドリファレンス

### 管理コマンド
```bash
./manage_mavlink.sh start      # サービス開始
./manage_mavlink.sh stop       # サービス停止
./manage_mavlink.sh restart    # サービス再起動
./manage_mavlink.sh status     # 状態確認
./manage_mavlink.sh logs       # ログ表示
./manage_mavlink.sh test       # 接続テスト
```

### 手動実行
```bash
# フォアグラウンドで実行（デバッグ用）
./start_mavlink.sh

# MAVProxyを直接起動
mavproxy.py --master=/dev/ttyACM0 --baudrate=57600 --out=udp:52.194.5.104:14555
```

### systemd操作
```bash
sudo systemctl start mavlink-raspi.service    # 開始
sudo systemctl stop mavlink-raspi.service     # 停止
sudo systemctl status mavlink-raspi.service   # 状態確認
sudo journalctl -u mavlink-raspi.service -f   # ログ確認
```

## トラブルシューティング

### 1. フライトコントローラーが認識されない
```bash
# デバイス確認
ls /dev/tty*
lsusb

# 権限確認
groups $USER | grep dialout
sudo usermod -a -G dialout $USER  # 必要に応じて
```

### 2. ネットワーク接続エラー
```bash
# EC2接続確認
ping 52.194.5.104
telnet 52.194.5.104 14555

# ファイアウォール確認
sudo ufw status
```

### 3. サービス起動エラー
```bash
# 詳細ログ確認
sudo journalctl -u mavlink-raspi.service --no-pager

# 設定ファイル確認
cat /etc/systemd/system/mavlink-raspi.service

# 手動実行テスト
./start_mavlink.sh
```

### 4. QGroundControl接続できない
1. EC2のセキュリティグループでポート14556が開放されているか確認
2. QGCの接続設定でEC2のパブリックIPとポート14556を指定
3. EC2のmavlink-router-ec2.serviceが正常動作しているか確認

## 設定変更

### Baud Rate変更
```bash
nano start_mavlink.sh
# FC_BAUD_RATE="115200" に変更
sudo systemctl restart mavlink-raspi.service
```

### EC2サーバー変更
```bash
nano start_mavlink.sh
# EC2_IP="新しいIP" に変更
sudo systemctl restart mavlink-raspi.service
```

## バックアップ・復元

### バックアップ作成
```bash
./backup_to_github.sh
```

### 新しいラズパイでの復元
```bash
git clone https://github.com/koutaro-sugi/Raspi-Persona.git
cd Raspi-Persona/telepath
./install_mavlink_system.sh
sudo reboot
cd ~/Persona/telepath
./manage_mavlink.sh start
```

## ログ確認

### リアルタイムログ
```bash
./manage_mavlink.sh logs
# または
sudo journalctl -u mavlink-raspi.service -f
```

### MAVLinkログファイル
```bash
ls logs/
tail -f logs/mavlink_*.log
```

### パラメータファイル
```bash
# FCパラメータ確認
cat logs/mav.parm
cat logs/defaults.parm
```

## よくある質問

**Q: サービスの自動起動を無効にしたい**
A: `sudo systemctl disable mavlink-raspi.service`

**Q: 複数のFCを接続したい**
A: 各FCに対してデバイスパスとポートを変更して複数インスタンスを起動

**Q: ログの保存期間を変更したい**
A: `/etc/logrotate.d/mavlink`を編集して保存期間を調整

**Q: WebSocket経由でブラウザからテレメトリを見たい**
A: EC2の14560ポートにWebSocketクライアントで接続

## 技術仕様

- **対応OS**: Raspberry Pi OS (Debian 12 Bookworm)
- **Python**: 3.11+
- **MAVProxy**: 1.8.71+
- **MAVLink**: Protocol v2.0
- **通信方式**: UDP (非暗号化)
- **リトライ機能**: 接続失敗時10秒間隔でリトライ
- **ログローテーション**: 日次、7日間保存

## 開発・メンテナンス

このシステムは`~/Persona/telepath/`ディレクトリで管理されています。
設定変更やアップデートはGitHub経由で行い、バックアップスクリプトで自動同期されます。

詳細な技術情報は`MAVLINK_SETUP_GUIDE.md`を参照してください。