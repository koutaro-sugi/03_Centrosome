// MAVLink v1/v2 Protocol Types

// MAVLinkメッセージID
export enum MAVLinkMessageType {
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  SYSTEM_TIME = 2,
  GPS_RAW_INT = 24,
  ATTITUDE = 30,
  GLOBAL_POSITION_INT = 33,
  RC_CHANNELS = 35,
  VFR_HUD = 74,
  COMMAND_ACK = 77,
  BATTERY_STATUS = 147,
  STATUSTEXT = 253,
}

// MAVLinkフライトモード (ArduPilot Plane)
export enum MAVLinkFlightMode {
  MANUAL = 0,
  CIRCLE = 1,
  STABILIZE = 2,
  TRAINING = 3,
  ACRO = 4,
  FBWA = 5,
  FBWB = 6,
  CRUISE = 7,
  AUTOTUNE = 8,
  // 9は未使用
  AUTO = 10,
  RTL = 11,
  LOITER = 12,
  // 13は未使用  
  // 14は未使用
  GUIDED = 15,
  INITIALISING = 16,
  QSTABILIZE = 17,
  QHOVER = 18,
  QLOITER = 19,
  QLAND = 20,
  QRTL = 21,
  QAUTOTUNE = 22,
  QACRO = 23,
  THERMAL = 24,
  LOITER_ALT_QLAND = 25,
}

// MAVLink基本モードフラグ
export enum MAVLinkBaseMode {
  CUSTOM_MODE_ENABLED = 1,
  TEST_ENABLED = 2,
  AUTO_ENABLED = 4,
  GUIDED_ENABLED = 8,
  STABILIZE_ENABLED = 16,
  HIL_ENABLED = 32,
  MANUAL_INPUT_ENABLED = 64,
  SAFETY_ARMED = 128,
}

// MAVLinkメッセージヘッダー
export interface MAVLinkHeader {
  magic: number;      // 0xFE (v1) or 0xFD (v2)
  len: number;        // ペイロード長
  incompat_flags?: number; // v2のみ
  compat_flags?: number;   // v2のみ
  seq: number;        // シーケンス番号
  sysid: number;      // システムID
  compid: number;     // コンポーネントID
  msgid: number;      // メッセージID (v1は1バイト、v2は3バイト)
}

// MAVLinkメッセージ
export interface MAVLinkMessage {
  header: MAVLinkHeader;
  payload: Uint8Array;
  checksum: number;
  signature?: Uint8Array; // v2署名（オプション）
}

// テレメトリデータ型
export interface TelemetryData {
  // システム状態
  connected?: boolean;
  armed?: boolean;
  flightMode?: string;
  systemStatus?: number;
  
  // 位置情報
  lat?: number;          // 緯度 (度)
  lon?: number;          // 経度 (度)
  alt?: number;          // 高度 (m)
  relativeAlt?: number;  // 相対高度 (m)
  
  // 姿勢
  roll?: number;         // ロール (度)
  pitch?: number;        // ピッチ (度)
  yaw?: number;          // ヨー (度)
  rollSpeed?: number;    // ロール角速度 (rad/s)
  pitchSpeed?: number;   // ピッチ角速度 (rad/s)
  yawSpeed?: number;     // ヨー角速度 (rad/s)
  
  // 速度
  groundSpeed?: number;  // 対地速度 (m/s)
  airSpeed?: number;     // 対気速度 (m/s)
  verticalSpeed?: number; // 垂直速度 (m/s)
  heading?: number;      // 方位 (度)
  
  // バッテリー
  voltage?: number;      // 電圧 (V)
  current?: number;      // 電流 (A)
  batteryRemaining?: number; // 残量 (%)
  
  // GPS
  satellites?: number;   // 衛星数
  hdop?: number;        // 水平精度
  vdop?: number;        // 垂直精度
  fixType?: number;     // GPS Fix種別
  
  // その他
  throttle?: number;    // スロットル (%)
  distanceToHome?: number; // ホームまでの距離 (m)
  lastHeartbeat?: number;  // 最後のハートビート (timestamp)
  flightDistance?: number; // 飛行距離 (m)
  nextWpDistance?: number; // 次のウェイポイントまでの距離 (m)
  flightTime?: number;     // 飛行時間 (秒)
}

// パースされたメッセージ型
export interface ParsedHeartbeat {
  type: number;
  autopilot: number;
  baseMode: number;
  customMode: number;
  systemStatus: number;
  mavlinkVersion: number;
}

export interface ParsedAttitude {
  timeBootMs: number;
  roll: number;
  pitch: number;
  yaw: number;
  rollspeed: number;
  pitchspeed: number;
  yawspeed: number;
}

export interface ParsedGlobalPositionInt {
  timeBootMs: number;
  lat: number;          // 緯度 (1E7)
  lon: number;          // 経度 (1E7)
  alt: number;          // 高度 (mm)
  relativeAlt: number;  // 相対高度 (mm)
  vx: number;           // X速度 (cm/s)
  vy: number;           // Y速度 (cm/s)
  vz: number;           // Z速度 (cm/s)
  hdg: number;          // 方位 (cdeg)
}

export interface ParsedVfrHud {
  airspeed: number;
  groundspeed: number;
  heading: number;
  throttle: number;
  alt: number;
  climb: number;
}

export interface ParsedBatteryStatus {
  id: number;
  batteryFunction: number;
  type: number;
  temperature: number;
  voltages: number[];
  currentBattery: number;
  currentConsumed: number;
  energyConsumed: number;
  batteryRemaining: number;
}

export interface ParsedGpsRawInt {
  timeUsec: number;
  fixType: number;
  lat: number;          // 緯度 (1E7)
  lon: number;          // 経度 (1E7)
  alt: number;          // 高度 (mm)
  eph: number;          // HDOP (cm)
  epv: number;          // VDOP (cm)
  vel: number;          // 速度 (cm/s)
  cog: number;          // 進路 (cdeg)
  satellitesVisible: number;
}