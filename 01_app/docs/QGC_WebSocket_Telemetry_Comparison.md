# QGCとWebSocketのテレメトリ受信差分調査レポート

## Table of Contents
1. [調査概要](#調査概要)
2. [MAVLink Stream Rate (SR) パラメータ](#mavlink-stream-rate-sr-パラメータ)
3. [QGCのMAVLinkメッセージ要求方法](#qgcのmavlinkメッセージ要求方法)
4. [WebSocketで受信できていない可能性のあるメッセージ](#websocketで受信できていない可能性のあるメッセージ)
5. [推奨される対策](#推奨される対策)

## 調査概要

QGroundControl (QGC) とWebSocket接続でのMAVLinkテレメトリ受信に差分がある可能性について調査しました。

### 現在の構成
- **WebSocket URL**: ws://52.194.5.104:8080
- **データフロー**: SITL → UDP 14555 → EC2 mavlink-ws-bridge → WebSocket → ブラウザ
- **プロトコル**: MAVLink v1/v2 バイナリプロトコル

## MAVLink Stream Rate (SR) パラメータ

SRパラメータは、MAVLinkメッセージグループの送信レート（Hz）を設定するために使用されます。

### 主なストリームグループ

1. **STREAM_EXTRA1** (SRx_EXTRA1)
   - ATTITUDE
   - SIMSTATE
   - AHRS2
   - AHRS3
   - PID_TUNING

2. **STREAM_EXTRA2** (SRx_EXTRA2)
   - VFR_HUD

3. **STREAM_EXTRA3** (SRx_EXTRA3)
   - AHRS
   - HWSTATUS
   - SYSTEM_TIME
   - RANGEFINDER
   - DISTANCE_SENSOR
   - TERRAIN_REQUEST
   - BATTERY_STATUS
   - MOUNT_STATUS
   - OPTICAL_FLOW
   - GIMBAL_REPORT

4. **STREAM_POSITION** (SRx_POSITION)
   - POSITION_TARGET_GLOBAL_INT
   - GPS_RAW_INT
   - GPS_RTK
   - GPS2_RAW
   - GPS2_RTK
   - NAV_CONTROLLER_OUTPUT
   - FENCE_STATUS

5. **STREAM_RAW_SENSORS** (SRx_RAW_SENS)
   - 生センサーデータ（IMU、気圧計など）

## QGCのMAVLinkメッセージ要求方法

QGCは以下の方法でMAVLinkメッセージを要求します：

### 1. REQUEST_DATA_STREAM (従来の方法)
```
- target_system: 通常は "1"（機体のMAVLink ID）
- req_stream_id: 0〜12（MAV_DATA_STREAMグループに対応）
- req_message_rate: メッセージレート（Hz）
- start_stop: 1で開始、0で停止
```

### 2. SET_MESSAGE_INTERVAL (新しい方法)
ArduPilot 4.0以降でサポートされる、より精密な制御方法：
```
MAV_CMD_SET_MESSAGE_INTERVAL コマンドを使用
- 個別のメッセージIDを指定可能
- マイクロ秒単位でインターバルを設定
```

### 3. 自動ストリーム設定
QGCは接続時に自動的に必要なストリームを要求します。これにより、WebSocket経由の接続では一部のメッセージが欠落する可能性があります。

## WebSocketで受信できていない可能性のあるメッセージ

現在のWebSocket実装で処理されているメッセージと、QGCが通常受信するメッセージを比較した結果：

### 現在受信・処理されているメッセージ
✅ HEARTBEAT (0)
✅ SYS_STATUS (1)
✅ SYSTEM_TIME (2)
✅ GPS_RAW_INT (24)
✅ ATTITUDE (30)
✅ GLOBAL_POSITION_INT (33)
✅ MISSION_CURRENT (42)
✅ SERVO_OUTPUT_RAW (36)
✅ RC_CHANNELS (65)
✅ VFR_HUD (74)
✅ NAV_CONTROLLER_OUTPUT (62)
✅ BATTERY_STATUS (147)
✅ その他多数

### QGCでは受信できるが、WebSocketで欠落している可能性があるメッセージ

1. **ストリーム要求関連**
   - REQUEST_DATA_STREAM応答メッセージ
   - SET_MESSAGE_INTERVAL応答メッセージ

2. **ミッション関連**
   - MISSION_COUNT
   - MISSION_ITEM_INT
   - MISSION_REQUEST
   - MISSION_ACK
   - MISSION_REQUEST_LIST

3. **パラメータ関連**
   - PARAM_REQUEST_LIST
   - PARAM_REQUEST_READ
   - PARAM_SET

4. **その他の重要なメッセージ**
   - POSITION_TARGET_GLOBAL_INT (SRx_POSITION)
   - GPS_RTK / GPS2_RTK (高精度GPS情報)
   - FENCE_STATUS (ジオフェンス状態)
   - PID_TUNING (PIDチューニング情報)
   - SIMSTATE (シミュレーション状態)

## 推奨される対策

### 1. WebSocket接続でのストリーム要求実装

```javascript
// REQUEST_DATA_STREAMメッセージを送信する関数の追加
function requestDataStream(streamId, messageRate) {
  const msg = {
    msgid: 66, // REQUEST_DATA_STREAM
    target_system: 1,
    target_component: 1,
    req_stream_id: streamId,
    req_message_rate: messageRate,
    start_stop: 1
  };
  // WebSocketで送信
}

// 接続時に必要なストリームを要求
function onWebSocketConnect() {
  requestDataStream(0, 4); // STREAM_ALL
  requestDataStream(1, 4); // STREAM_RAW_SENSORS
  requestDataStream(2, 4); // STREAM_EXTENDED_STATUS
  requestDataStream(3, 4); // STREAM_RC_CHANNELS
  requestDataStream(6, 4); // STREAM_POSITION
  requestDataStream(10, 4); // STREAM_EXTRA1
  requestDataStream(11, 4); // STREAM_EXTRA2
  requestDataStream(12, 4); // STREAM_EXTRA3
}
```

### 2. EC2側のmavlink-ws-bridgeの改善

現在のブリッジが単純にUDPパケットを転送しているだけの場合、以下の改善が必要：

1. **双方向通信のサポート**: WebSocketからのMAVLinkメッセージをUDPで機体に送信
2. **自動ストリーム要求**: 接続時に必要なストリームを自動的に要求
3. **メッセージフィルタリング**: 不要なメッセージの除外オプション

### 3. デバッグとモニタリング

```javascript
// メッセージ統計の拡張
window.mavlinkStats = {};
setInterval(() => {
  console.log('=== MAVLink メッセージ統計 ===');
  // 期待されるメッセージのリスト
  const expectedMessages = [
    'MISSION_COUNT', 'MISSION_ITEM_INT', 
    'POSITION_TARGET_GLOBAL_INT', 'FENCE_STATUS'
  ];
  
  expectedMessages.forEach(msgName => {
    const msgId = MAVLinkMessageType[msgName];
    if (!window.mavlinkStats[msgId]) {
      console.warn(`⚠️ ${msgName} (ID: ${msgId}) が受信されていません`);
    }
  });
}, 10000);
```

### 4. SITLパラメータの調整

SITL起動時にストリームレートを明示的に設定：

```bash
# SITL起動コマンドの例
sim_vehicle.py -v ArduPlane -f quadplane \
  --out=udp:52.194.5.104:14555 \
  --mavproxy-args="--cmd='set streamrate 10'"
```

## まとめ

QGCとWebSocketのテレメトリ受信差分は、主に以下の要因によるものと考えられます：

1. **ストリーム要求の欠如**: WebSocket接続では自動的にストリームが要求されていない
2. **双方向通信の制限**: 現在のWebSocket実装が受信専用の可能性
3. **デフォルトストリームレートの違い**: QGCは接続時に最適なレートを設定

これらの問題を解決することで、QGCと同等のテレメトリデータをWebSocket経由でも受信できるようになります。