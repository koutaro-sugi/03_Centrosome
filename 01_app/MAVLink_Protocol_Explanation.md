# MAVLinkプロトコル解説

## 概要
MAVLinkは**バイナリプロトコル**です。JSONのような人間が読めるテキスト形式ではなく、効率的なバイナリ形式でデータを送信します。

## パケット構造

### MAVLink v1パケット
```
+----------+------+------+--------+--------+--------+---------+
| STX(0xFE)| LEN  | SEQ  | SYS ID | COMP ID| MSG ID | PAYLOAD | CRC |
| 1 byte   |1 byte|1 byte| 1 byte | 1 byte |1 byte  | N bytes |2 bytes|
+----------+------+------+--------+--------+--------+---------+
```

### MAVLink v2パケット
```
+----------+------+-------+-------+--------+--------+--------+---------+
| STX(0xFD)| LEN  |INC FLG| CMP FLG| SEQ   | SYS ID | COMP ID| MSG ID  | PAYLOAD | CRC |
| 1 byte   |1 byte|1 byte | 1 byte |1 byte | 1 byte | 1 byte |3 bytes  | N bytes |2 bytes|
+----------+------+-------+-------+--------+--------+--------+---------+
```

## 実際のデータ例

### HEARTBEAT メッセージ (MSG ID: 0)
バイナリデータ（16進数表示）:
```
FE 09 00 01 01 00 00 00 00 00 02 03 51 01 03 8A 6C
```

解析すると:
- `FE`: スタートバイト (MAVLink v1)
- `09`: ペイロード長 (9バイト)
- `00`: シーケンス番号
- `01`: システムID
- `01`: コンポーネントID
- `00`: メッセージID (HEARTBEAT)
- `00 00 00 00 02 03 51 01 03`: ペイロード
- `8A 6C`: CRC

### VFR_HUD メッセージ (MSG ID: 74)
ペイロード構造（20バイト）:
```c
struct {
    float airspeed;     // 4バイト (m/s)
    float groundspeed;  // 4バイト (m/s)
    int16_t heading;    // 2バイト (度)
    uint16_t throttle;  // 2バイト (%)
    float alt;          // 4バイト (m)
    float climb;        // 4バイト (m/s)
}
```

実際のバイナリデータ例:
```
対気速度 15.5 m/s = 0x41 0x78 0x00 0x00 (float)
対地速度 14.2 m/s = 0x41 0x63 0x33 0x33 (float)
方位 270度 = 0x0E 0x01 (int16)
スロットル 75% = 0x4B 0x00 (uint16)
高度 120.5m = 0x42 0xF1 0x00 0x00 (float)
上昇率 2.1 m/s = 0x40 0x06 0x66 0x66 (float)
```

## WebSocketでの送信

EC2のWebSocket Bridgeは、UDP経由で受信したMAVLinkバイナリデータをそのままWebSocketで転送します：

```javascript
// WebSocketで受信するデータ
ws.onmessage = (event) => {
  // event.dataは ArrayBuffer (バイナリデータ)
  const buffer = new Uint8Array(event.data);
  // buffer[0] = 0xFE or 0xFD (スタートバイト)
  // buffer[1] = ペイロード長
  // ...
};
```

## よく使うメッセージタイプ

| MSG ID | 名前 | 頻度 | 内容 |
|--------|------|------|------|
| 0 | HEARTBEAT | 1Hz | 生存確認、モード情報 |
| 1 | SYS_STATUS | 2Hz | バッテリー、CPU負荷など |
| 24 | GPS_RAW_INT | 5Hz | GPS生データ |
| 30 | ATTITUDE | 10Hz | 姿勢（ロール、ピッチ、ヨー） |
| 33 | GLOBAL_POSITION_INT | 5Hz | 緯度経度、高度、速度 |
| 74 | VFR_HUD | 4Hz | 対気速度、高度、方位など |
| 147 | BATTERY_STATUS | 0.2Hz | 詳細なバッテリー情報 |

## なぜバイナリ？

1. **帯域幅効率**: JSONと比べて5-10倍コンパクト
2. **処理速度**: パース処理が高速
3. **信頼性**: CRCによるエラー検出
4. **リアルタイム性**: 低遅延通信に最適

## 実装での注意点

1. **エンディアン**: リトルエンディアン（Intel形式）
2. **浮動小数点**: IEEE 754形式
3. **座標**: 緯度経度は1e7倍の整数で送信
4. **単位**: メートル法が基本（m, m/s, 度など）

## デバッグ方法

```javascript
// バイナリデータを16進数で表示
const hexString = Array.from(new Uint8Array(buffer))
  .map(b => b.toString(16).padStart(2, '0'))
  .join(' ');
console.log('受信データ:', hexString);
```