# Centrosome テレメトリ通信ベストプラクティス

## アーキテクチャ概要

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ SITL (WSL)  │     │ EC2 Router   │     │ Centrosome   │
│             │ UDP │              │ WS  │   Browser    │
│ Port 14550  ├────►│ Port 14555   ├────►│              │
└─────────────┘     │              │     └──────────────┘
                    │ Port 14560   │     
                    └──────────────┘     
```

## 推奨実装方法

### 1. EC2 MAVLink Router設定
```bash
# mavlink-routerd.conf
[General]
TcpServerPort=5760
ReportStats=false
MavlinkDialect=ardupilotmega

[UdpEndpoint alpha]
Mode=Normal
Address=0.0.0.0
Port=14555

[UdpEndpoint beta]
Mode=Normal
Address=0.0.0.0
Port=14556

# WebSocket endpoint for browsers
[WebSocketEndpoint websocket]
Port=14560
```

### 2. Centrosome WebSocket Client実装

```typescript
// src/services/MavlinkService.ts
import { MAVLink20Processor } from '@ifrunistuttgart/node-mavlink';

export class MavlinkService {
  private ws: WebSocket | null = null;
  private mavlink: MAVLink20Processor;
  private reconnectInterval: number = 5000;
  private telemetryCallbacks: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.mavlink = new MAVLink20Processor();
  }

  connect(url: string = 'wss://52.194.5.104:14560') {
    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('MAVLink WebSocket connected');
        this.requestDataStreams();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(() => this.connect(url), this.reconnectInterval);
      };
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }

  private handleMessage(data: ArrayBuffer) {
    const messages = this.mavlink.parseBuffer(Buffer.from(data));
    
    messages.forEach(message => {
      switch (message.name) {
        case 'HEARTBEAT':
          this.notifyCallbacks('heartbeat', {
            flightMode: this.getFlightMode(message.custom_mode),
            armed: (message.base_mode & 128) > 0
          });
          break;
          
        case 'ATTITUDE':
          this.notifyCallbacks('attitude', {
            roll: message.roll * 180 / Math.PI,
            pitch: message.pitch * 180 / Math.PI,
            yaw: message.yaw * 180 / Math.PI,
            rollSpeed: message.rollspeed,
            pitchSpeed: message.pitchspeed,
            yawSpeed: message.yawspeed
          });
          break;
          
        case 'GLOBAL_POSITION_INT':
          this.notifyCallbacks('position', {
            lat: message.lat / 1e7,
            lon: message.lon / 1e7,
            alt: message.alt / 1000,
            relativeAlt: message.relative_alt / 1000,
            vx: message.vx / 100,
            vy: message.vy / 100,
            vz: message.vz / 100,
            heading: message.hdg / 100
          });
          break;
          
        case 'VFR_HUD':
          this.notifyCallbacks('hud', {
            airspeed: message.airspeed,
            groundspeed: message.groundspeed,
            altitude: message.alt,
            climb: message.climb,
            heading: message.heading,
            throttle: message.throttle
          });
          break;
          
        case 'BATTERY_STATUS':
          this.notifyCallbacks('battery', {
            voltage: message.voltages[0] / 1000,
            current: message.current_battery / 100,
            remaining: message.battery_remaining
          });
          break;
          
        case 'GPS_RAW_INT':
          this.notifyCallbacks('gps', {
            fix: message.fix_type,
            satellites: message.satellites_visible,
            hdop: message.eph / 100,
            vdop: message.epv / 100,
            lat: message.lat / 1e7,
            lon: message.lon / 1e7,
            alt: message.alt / 1000
          });
          break;
      }
    });
  }

  private requestDataStreams() {
    // Request telemetry at 4Hz
    const streamRequest = {
      target_system: 1,
      target_component: 1,
      req_stream_id: 0, // MAV_DATA_STREAM_ALL
      req_message_rate: 4,
      start_stop: 1
    };
    
    this.sendMessage('REQUEST_DATA_STREAM', streamRequest);
  }

  subscribe(event: string, callback: (data: any) => void) {
    this.telemetryCallbacks.set(event, callback);
  }

  unsubscribe(event: string) {
    this.telemetryCallbacks.delete(event);
  }

  private notifyCallbacks(event: string, data: any) {
    const callback = this.telemetryCallbacks.get(event);
    if (callback) callback(data);
  }

  private getFlightMode(customMode: number): string {
    // ArduPlane flight modes
    const modes: { [key: number]: string } = {
      0: 'MANUAL',
      1: 'CIRCLE',
      2: 'STABILIZE',
      3: 'TRAINING',
      4: 'ACRO',
      5: 'FBWA',
      6: 'FBWB',
      7: 'CRUISE',
      8: 'AUTOTUNE',
      10: 'AUTO',
      11: 'RTL',
      12: 'LOITER',
      15: 'GUIDED',
      17: 'QSTABILIZE',
      18: 'QHOVER',
      19: 'QLOITER',
      20: 'QLAND',
      21: 'QRTL'
    };
    
    return modes[customMode] || 'UNKNOWN';
  }

  sendCommand(command: string, params: any) {
    // MAVLinkコマンド送信実装
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### 3. React Hook実装

```typescript
// src/hooks/useMavlinkTelemetry.ts
import { useEffect, useState } from 'react';
import { MavlinkService } from '../services/MavlinkService';

const mavlinkService = new MavlinkService();

export interface TelemetryData {
  heartbeat?: {
    flightMode: string;
    armed: boolean;
  };
  attitude?: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  position?: {
    lat: number;
    lon: number;
    alt: number;
    heading: number;
  };
  battery?: {
    voltage: number;
    current: number;
    remaining: number;
  };
  gps?: {
    satellites: number;
    hdop: number;
  };
}

export const useMavlinkTelemetry = () => {
  const [telemetry, setTelemetry] = useState<TelemetryData>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // EC2のWebSocketエンドポイントに接続
    mavlinkService.connect('wss://52.194.5.104:14560');

    // テレメトリイベントをサブスクライブ
    mavlinkService.subscribe('heartbeat', (data) => {
      setTelemetry(prev => ({ ...prev, heartbeat: data }));
      setConnected(true);
    });

    mavlinkService.subscribe('attitude', (data) => {
      setTelemetry(prev => ({ ...prev, attitude: data }));
    });

    mavlinkService.subscribe('position', (data) => {
      setTelemetry(prev => ({ ...prev, position: data }));
    });

    mavlinkService.subscribe('battery', (data) => {
      setTelemetry(prev => ({ ...prev, battery: data }));
    });

    mavlinkService.subscribe('gps', (data) => {
      setTelemetry(prev => ({ ...prev, gps: data }));
    });

    return () => {
      mavlinkService.disconnect();
    };
  }, []);

  return { telemetry, connected };
};
```

### 4. In-Flightページでの使用

```typescript
// In-Flightページで実際のテレメトリを使用
import { useMavlinkTelemetry } from '../hooks/useMavlinkTelemetry';

export const InFlight: React.FC = () => {
  const { telemetry, connected } = useMavlinkTelemetry();
  
  // テレメトリデータで状態を更新
  useEffect(() => {
    if (telemetry.position) {
      updateTelemetryValue('altitude', telemetry.position.alt);
      updateTelemetryValue('heading', telemetry.position.heading);
    }
    if (telemetry.battery) {
      updateTelemetryValue('voltage', telemetry.battery.voltage);
      updateTelemetryValue('remaining', telemetry.battery.remaining);
    }
    // ... 他のテレメトリデータも同様に更新
  }, [telemetry]);
};
```

## セキュリティ考慮事項

1. **SSL/TLS証明書**
   - EC2でLet's Encryptを使用してWSS対応
   - 自己署名証明書の場合は開発環境のみ

2. **認証**
   - WebSocketハンドシェイク時にトークン認証
   - API Gateway経由でのアクセス制御

3. **レート制限**
   - テレメトリ更新頻度の制限（最大10Hz）
   - クライアント側でのデバウンス処理

## パフォーマンス最適化

1. **バイナリプロトコル**
   - MAVLinkのバイナリフォーマットをそのまま使用
   - JSON変換は最小限に

2. **選択的サブスクリプション**
   - 必要なメッセージタイプのみリクエスト
   - 画面に表示されているデータのみ更新

3. **バッファリング**
   - 複数のメッセージをバッチ処理
   - React状態更新の最適化

## 代替案

### Option 1: REST API polling
- シンプルだが遅延が大きい
- リアルタイム性に欠ける

### Option 2: Server-Sent Events (SSE)
- 単方向通信のみ
- コマンド送信には別途APIが必要

### Option 3: gRPC-Web
- 高性能だが実装が複雑
- プロトコル定義の管理が必要

## 推奨構成

**WebSocket + MAVLink** が最適：
- リアルタイム双方向通信
- 既存のMAVLinkエコシステムと互換
- ブラウザネイティブサポート
- EC2 MAVLink Routerの既存機能を活用