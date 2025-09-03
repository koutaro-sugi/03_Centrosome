# 機体からミッションプランを取得する実装案

## 概要
機体（Autopilot）に保存されているミッションプランをWebアプリから取得する機能の実装案。

## 1. EC2 WebSocket Bridgeの拡張

### 現在の構成（読み取り専用）
```
機体 → MAVLink Router → WebSocket Bridge → Webapp
```

### 拡張後の構成（双方向）
```
機体 ← MAVLink Router ← WebSocket Bridge ← Webapp
    →                 →                   →
```

### WebSocket Bridge改修コード例

```javascript
// websocket-bridge-bidirectional.js
const WebSocket = require('ws');
const dgram = require('dgram');

// UDP送信用ソケット（MAVLink Routerへ）
const udpSend = dgram.createSocket('udp4');
const MAVLINK_ROUTER_IP = '127.0.0.1';
const MAVLINK_ROUTER_PORT = 14555; // RouterのInputポート

// UDP受信用ソケット（MAVLink Routerから）
const udpReceive = dgram.createSocket('udp4');
udpReceive.bind(14560);

// WebSocketサーバー
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // UDP → WebSocket（既存の機能）
  udpReceive.on('message', (msg) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg, { binary: true });
    }
  });
  
  // WebSocket → UDP（新機能）
  ws.on('message', (data) => {
    // Webappからのコマンドを機体に転送
    udpSend.send(data, MAVLINK_ROUTER_PORT, MAVLINK_ROUTER_IP, (err) => {
      if (err) console.error('UDP send error:', err);
    });
  });
});
```

## 2. Webアプリ側の実装

### MAVLinkミッション関連メッセージの追加

```typescript
// src/types/mavlink.ts に追加
export enum MAVLinkMessageType {
  // ... 既存のメッセージ
  MISSION_REQUEST_LIST = 43,
  MISSION_COUNT = 44,
  MISSION_REQUEST_INT = 51,
  MISSION_ITEM_INT = 73,
  MISSION_ACK = 47,
}

// ミッション要求タイプ
export enum MissionType {
  MISSION = 0,
  FENCE = 1,
  RALLY = 2,
}

// ミッションアイテム
export interface MissionItemInt {
  targetSystem: number;
  targetComponent: number;
  seq: number;
  frame: number;
  command: number;
  current: number;
  autocontinue: number;
  param1: number;
  param2: number;
  param3: number;
  param4: number;
  x: number; // 緯度 (degE7)
  y: number; // 経度 (degE7)
  z: number; // 高度
  missionType: number;
}
```

### ミッションダウンロード用Hook

```typescript
// src/hooks/useMissionDownload.ts
import { useState, useCallback } from 'react';
import { MAVLinkParser } from '../utils/mavlinkParser';

export const useMissionDownload = (socket: WebSocket | null) => {
  const [downloading, setDownloading] = useState(false);
  const [missionItems, setMissionItems] = useState<MissionItemInt[]>([]);
  const [progress, setProgress] = useState(0);
  
  const downloadMission = useCallback(async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    
    setDownloading(true);
    setMissionItems([]);
    setProgress(0);
    
    return new Promise((resolve, reject) => {
      let expectedCount = 0;
      let receivedItems: MissionItemInt[] = [];
      
      // メッセージハンドラー
      const handleMessage = (event: MessageEvent) => {
        const messages = parser.parseBuffer(event.data);
        
        messages.forEach(msg => {
          switch (msg.header.msgid) {
            case MAVLinkMessageType.MISSION_COUNT:
              expectedCount = parseMissionCount(msg.payload);
              console.log(`Expecting ${expectedCount} mission items`);
              // 最初のアイテムを要求
              if (expectedCount > 0) {
                requestMissionItem(0);
              }
              break;
              
            case MAVLinkMessageType.MISSION_ITEM_INT:
              const item = parseMissionItemInt(msg.payload);
              receivedItems[item.seq] = item;
              setProgress((item.seq + 1) / expectedCount * 100);
              
              // 次のアイテムを要求
              if (item.seq + 1 < expectedCount) {
                requestMissionItem(item.seq + 1);
              } else {
                // 全て受信完了
                sendMissionAck();
                setMissionItems(receivedItems);
                setDownloading(false);
                socket.removeEventListener('message', handleMessage);
                resolve(receivedItems);
              }
              break;
          }
        });
      };
      
      socket.addEventListener('message', handleMessage);
      
      // MISSION_REQUEST_LISTを送信
      const requestList = createMissionRequestList();
      socket.send(requestList);
      
      // タイムアウト設定
      setTimeout(() => {
        socket.removeEventListener('message', handleMessage);
        setDownloading(false);
        reject(new Error('Mission download timeout'));
      }, 30000);
    });
  }, [socket]);
  
  return {
    downloadMission,
    downloading,
    progress,
    missionItems,
  };
};
```

## 3. UI実装例

```typescript
// InFlightページに追加
const { downloadMission, downloading, progress } = useMissionDownload(socket);

<Button
  onClick={async () => {
    try {
      const items = await downloadMission();
      console.log('Downloaded mission:', items);
      // MissionPlannerフォーマットに変換して表示
      const plan = convertToMissionPlan(items);
      updateFlightPlan(plan);
    } catch (err) {
      console.error('Mission download failed:', err);
    }
  }}
  disabled={downloading || !telemetry.connected}
>
  {downloading ? (
    <CircularProgress variant="determinate" value={progress} size={20} />
  ) : (
    'Download Mission from Aircraft'
  )}
</Button>
```

## 4. セキュリティ考慮事項

1. **認証**: WebSocketに認証機能を追加
2. **レート制限**: 過度なリクエストを防ぐ
3. **検証**: 受信したミッションデータの妥当性チェック
4. **権限**: 読み取り専用モードのオプション

## 5. 代替案: MAVProxy経由

もしWebSocket Bridgeの改修が難しい場合、MAVProxyのREST APIを使う方法もある：

```bash
# EC2でMAVProxyを起動
mavproxy.py --master=udp:0.0.0.0:14555 --out=udp:127.0.0.1:14560 --rest-api=0.0.0.0:8081
```

そして、WebアプリからHTTP経由でミッション取得：

```typescript
const response = await fetch('http://ec2-ip:8081/api/mission');
const mission = await response.json();
```