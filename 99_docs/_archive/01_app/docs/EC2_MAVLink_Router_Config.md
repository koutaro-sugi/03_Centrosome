# EC2 MAVLink Router 設定ガイド

## 現在の問題点
- MAVLink Routerが起動できていない（ポート競合）
- WebSocket Bridgeが独立して動作中

## 推奨構成

```
           ┌─────────────────┐
           │      SITL       │
           │  (Raspberry Pi)  │
           └────────┬────────┘
                    │ UDP:14555
                    ↓
           ┌─────────────────┐
           │   EC2 Instance  │
           │                 │
           │ MAVLink Router  │
           │   Port: 14555   │──────┬─────→ UDP:14556 → QGC
           │                 │      │
           └─────────────────┘      └─────→ UDP:14560 → WebSocket Bridge
                                                   ↓
                                            WebSocket:8080 → Webapp
```

## 設定手順

### 1. MAVLink Router設定ファイル修正

```bash
# EC2にSSH接続
ssh -i cred/rpi1.pem ubuntu@ec2-52-194-5-104.ap-northeast-1.compute.amazonaws.com

# 設定ファイルを編集
sudo nano /etc/mavlink-router/main.conf
```

以下の内容に更新：

```ini
[General]
ReportStats=false
MavlinkDialect=ardupilotmega

# RPi/SITLから受信（UDP 14555）
[UdpEndpoint rpi-input]
Mode = Server
Address = 0.0.0.0
Port = 14555

# QGCへ送信（UDP 14556）
[UdpEndpoint qgc-output]
Mode = Normal
Address = 0.0.0.0
Port = 14556

# WebSocket Bridge用（UDP 14560）
[UdpEndpoint websocket-output]
Mode = Normal
Address = 127.0.0.1
Port = 14560
```

### 2. サービス再起動

```bash
# MAVLink Routerサービスファイルを修正
sudo nano /etc/systemd/system/mavlink-router.service
```

```ini
[Unit]
Description=MAVLink Router
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/mavlink-routerd
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

```bash
# サービス再起動
sudo systemctl daemon-reload
sudo systemctl restart mavlink-router
sudo systemctl status mavlink-router
```

### 3. WebSocket Bridgeはそのまま維持

現在の設定（UDP:14560 → WebSocket:8080）で問題ありません。

## 動作確認

1. **SITL起動**
   ```bash
   sim_vehicle.py -v ArduPlane -f quadplane --out=udp:52.194.5.104:14555
   ```

2. **QGC接続確認**
   - 既存の設定（52.194.5.104:14556）で接続

3. **Webapp接続確認**
   - ws://52.194.5.104:8080 で接続

## メリット

1. **同時接続**: QGCとWebappが同時にテレメトリを受信
2. **独立性**: どちらか一方が切断されても他方に影響なし
3. **低遅延**: MAVLink Routerによる効率的な配信
4. **拡張性**: 更に別のGCSも追加可能

## トラブルシューティング

### ポート競合エラーの場合
```bash
# 使用中のポートを確認
sudo ss -tlnp | grep 14555

# プロセスを停止
sudo kill -9 <PID>
```

### AWS セキュリティグループ設定
以下のインバウンドルールが必要：
- UDP 14555 (SITL入力)
- UDP 14556 (QGC接続)
- TCP 8080 (WebSocket)

## 代替案: 単一ポートからの分岐

もしMAVLink Routerが使えない場合、WebSocket Bridgeを改修して14556からも読み取る：

```javascript
// 複数UDPポートから受信
const udp14556 = dgram.createSocket('udp4');
const udp14560 = dgram.createSocket('udp4');

udp14556.on('message', (msg) => {
  // WebSocketクライアントに転送
  broadcastToWebSocket(msg);
});

udp14560.on('message', (msg) => {
  // WebSocketクライアントに転送
  broadcastToWebSocket(msg);
});
```