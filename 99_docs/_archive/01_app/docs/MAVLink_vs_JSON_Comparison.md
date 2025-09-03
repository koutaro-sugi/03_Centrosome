# MAVLink vs JSON データ形式の比較

## JSON形式（名前と値のペア）
```json
{
  "messageType": "VFR_HUD",
  "airspeed": 15.5,
  "groundspeed": 14.2,
  "heading": 270,
  "throttle": 75,
  "altitude": 120.5,
  "climbRate": 2.1
}
```
- サイズ: 約150バイト
- 人間が読める
- キー名でアクセス: `data.airspeed`

## MAVLinkバイナリ形式（位置ベース）
```
[ヘッダー 6バイト][ペイロード 20バイト][CRC 2バイト]

ペイロード内部:
+--------+--------+--------+--------+--------+--------+
| 0-3    | 4-7    | 8-9    | 10-11  | 12-15  | 16-19  |
| 対気速度| 対地速度| 方位    | スロットル| 高度    | 上昇率  |
| float  | float  | int16  | uint16 | float  | float  |
+--------+--------+--------+--------+--------+--------+
```
- サイズ: 28バイト（ヘッダー込み）
- バイナリデータ
- 位置でアクセス: `getFloat32(payload, 0)` // 0バイト目から4バイト読む

## 実際のコードでの違い

### JSON版
```javascript
// 受信
const data = JSON.parse(message);
const airspeed = data.airspeed;
const altitude = data.altitude;
```

### MAVLink版
```javascript
// 受信（現在の実装）
const airspeed = this.getFloat32(payload, 0);    // 0バイト目から
const groundspeed = this.getFloat32(payload, 4); // 4バイト目から
const heading = this.getInt16(payload, 8);       // 8バイト目から
const throttle = this.getUint16(payload, 10);    // 10バイト目から
const altitude = this.getFloat32(payload, 12);   // 12バイト目から
const climbRate = this.getFloat32(payload, 16);  // 16バイト目から
```

## メリット・デメリット

### MAVLink（位置ベース）
**メリット:**
- 超コンパクト（5-10倍小さい）
- パース処理が高速
- 帯域幅を節約
- リアルタイム通信に最適

**デメリット:**
- 仕様書がないと解読不可能
- フィールドの順序が固定
- デバッグが難しい
- バージョン間の互換性に注意必要

### JSON（名前ベース）
**メリット:**
- 自己記述的（読めばわかる）
- フィールドの順序自由
- デバッグ簡単
- 拡張性高い

**デメリット:**
- データサイズ大きい
- パース処理遅い
- 帯域幅を消費

## なぜMAVLinkは位置ベース？

1. **ドローンの通信は帯域幅が限られる**
   - 無線通信（433MHz、915MHz等）
   - 長距離通信で信号が弱い
   - 複数の機体と同時通信

2. **リアルタイム性が重要**
   - 10Hz〜50Hzでデータ更新
   - 遅延は墜落につながる
   - CPUリソースも限られる

3. **仕様が安定している**
   - メッセージ形式は標準化済み
   - 全世界で同じ仕様を使用
   - XMLで定義されている

## 実際のバイナリデータ例
```
// VFR_HUDメッセージのペイロード（16進数表示）
41 78 00 00  // 0-3:   対気速度 15.5 (float)
41 63 33 33  // 4-7:   対地速度 14.2 (float)
0E 01        // 8-9:   方位 270 (int16)
4B 00        // 10-11: スロットル 75 (uint16)
42 F1 00 00  // 12-15: 高度 120.5 (float)
40 06 66 66  // 16-19: 上昇率 2.1 (float)
```

各バイトの位置が完全に固定されていて、名前の情報は一切含まれていません！