# EC2 WebSocket MAVLink実装計画

## 現在のEC2構成
- **WebSocketエンドポイント**: `ws://52.194.5.104:8080`
- **UDP受信ポート**: 14555 (SITLから)
- **実行中のサービス**: mavlink-ws-bridge (PM2で管理)
- **データフロー**: SITL → UDP 14555 → WebSocket 8080 → ブラウザ

## 実装ステップ

### 1. MAVLinkプロトコル定義
```typescript
// src/types/mavlink.ts
export enum MAVLinkMessageType {
  HEARTBEAT = 0,
  ATTITUDE = 30,
  GLOBAL_POSITION_INT = 33,
  VFR_HUD = 74,
  BATTERY_STATUS = 147,
  GPS_RAW_INT = 24,
  // その他必要なメッセージタイプ
}

export interface MAVLinkMessage {
  magic: number;
  len: number;
  seq: number;
  sysid: number;
  compid: number;
  msgid: number;
  payload: Uint8Array;
  checksum: number;
}
```

### 2. MAVLinkパーサー実装
```typescript
// src/utils/mavlinkParser.ts
export class MAVLinkParser {
  private buffer: Uint8Array = new Uint8Array(0);
  
  parseBuffer(data: ArrayBuffer): MAVLinkMessage[] {
    // MAVLink v1/v2プロトコルのパース処理
    // 1. Magic byte検出 (0xFE for v1, 0xFD for v2)
    // 2. ヘッダー解析
    // 3. ペイロード抽出
    // 4. チェックサム検証
  }
  
  parseHeartbeat(payload: Uint8Array) {
    // HEARTBEAT メッセージのパース
  }
  
  parseAttitude(payload: Uint8Array) {
    // ATTITUDE メッセージのパース
  }
  
  // 他のメッセージタイプのパーサー
}
```

### 3. WebSocket接続Hook
```typescript
// src/hooks/useMAVLinkWebSocket.ts
export const useMAVLinkWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData>({});
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const parser = useRef(new MAVLinkParser());
  
  useEffect(() => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    
    ws.onopen = () => {
      setStatus('connected');
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      const messages = parser.current.parseBuffer(event.data);
      messages.forEach(msg => {
        updateTelemetryFromMessage(msg);
      });
    };
    
    ws.onerror = () => setStatus('disconnected');
    ws.onclose = () => setStatus('disconnected');
    
    return () => ws.close();
  }, [url]);
  
  return { telemetry, status, socket };
};
```

### 4. InFlightページでの使用
```typescript
// src/pages/InFlight.tsx
const { telemetry, status } = useMAVLinkWebSocket('ws://52.194.5.104:8080');

// telemetryデータを使ってUIを更新
useEffect(() => {
  setTelemetryData(telemetry);
  setConnectionStatus(status);
}, [telemetry, status]);
```

## 技術的考慮事項

### 1. バイナリデータの扱い
- WebSocketの`binaryType`を`arraybuffer`に設定
- Uint8Arrayでバイト単位の処理
- ビットシフトとマスク演算で値を抽出

### 2. エンディアン対応
- MAVLinkはリトルエンディアン
- DataViewを使用して適切に読み込み

### 3. メッセージバッファリング
- 不完全なメッセージの保持
- 複数メッセージの連続処理

### 4. エラーハンドリング
- チェックサム不一致
- 不正なメッセージ長
- 接続断の自動再接続

### 5. パフォーマンス最適化
- メッセージタイプによるフィルタリング
- 更新頻度の制限（スロットリング）
- 不要なレンダリングの回避

## テスト方法

1. **EC2接続確認**
   ```bash
   # EC2側でWebSocketが動作確認
   ssh -i cred/rpi1.pem ubuntu@ec2-52-194-5-104.ap-northeast-1.compute.amazonaws.com
   pm2 logs mavlink-ws-bridge
   ```

2. **SITL起動**
   ```bash
   # WSL側でSITL起動
   sim_vehicle.py -v ArduPlane -f quadplane --out=udp:52.194.5.104:14555
   ```

3. **ブラウザコンソール確認**
   - WebSocket接続状態
   - 受信メッセージ数
   - パースエラー

## 実装優先順位

1. **Phase 1**: 基本接続
   - WebSocket接続確立
   - バイナリデータ受信確認
   - 接続状態表示

2. **Phase 2**: メッセージパース
   - HEARTBEAT解析（フライトモード、アーム状態）
   - ATTITUDE解析（姿勢情報）
   - VFR_HUD解析（速度、高度）

3. **Phase 3**: 完全実装
   - 全メッセージタイプ対応
   - エラーハンドリング
   - 自動再接続
   - データ検証

## 参考資料
- [MAVLink Protocol](https://mavlink.io/en/messages/common.html)
- [MAVLink Packet Format](https://mavlink.io/en/guide/serialization.html)
- EC2 mavlink-ws-bridge: `/home/ubuntu/mavlink-ws-bridge/`