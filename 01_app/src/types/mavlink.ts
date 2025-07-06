// MAVLink v1/v2 Protocol Types

// MAVLinkメッセージID
export enum MAVLinkMessageType {
  HEARTBEAT = 0,
  SYS_STATUS = 1,
  SYSTEM_TIME = 2,
  PING = 4,
  PARAM_REQUEST_READ = 20,
  PARAM_REQUEST_LIST = 21,
  PARAM_VALUE = 22,
  PARAM_SET = 23,
  GPS_RAW_INT = 24,
  GPS_STATUS = 25,
  SCALED_IMU = 26,
  RAW_IMU = 27,
  RAW_PRESSURE = 28,
  SCALED_PRESSURE = 29,
  ATTITUDE = 30,
  ATTITUDE_QUATERNION = 31,
  LOCAL_POSITION_NED = 32,
  GLOBAL_POSITION_INT = 33,
  RC_CHANNELS = 35,
  RC_CHANNELS_RAW = 35,
  SERVO_OUTPUT_RAW = 36,
  MISSION_CURRENT = 42,
  MISSION_COUNT = 44,
  MISSION_ITEM_REACHED = 46,
  MISSION_ACK = 47,
  MISSION_REQUEST_INT = 51,
  NAV_CONTROLLER_OUTPUT = 62,
  REQUEST_DATA_STREAM = 66,
  DATA_STREAM = 67,
  MISSION_ITEM_INT = 73,
  VFR_HUD = 74,
  COMMAND_ACK = 77,
  TIMESYNC = 111,
  SCALED_IMU2 = 116,
  POWER_STATUS = 125,
  GPS2_RAW = 124,
  SCALED_IMU3 = 129,
  TERRAIN_REPORT = 136,
  ALTITUDE = 141,
  AUTOPILOT_VERSION = 148,
  BATTERY_STATUS = 147,
  MEMINFO = 152,
  AHRS = 163,
  HWSTATUS = 165,
  WIND = 168,
  RANGEFINDER = 173,
  AHRS2 = 178,
  AHRS3 = 182,
  EKF_STATUS_REPORT = 193,
  VIBRATION = 241,
  HOME_POSITION = 242,
  STATUSTEXT = 253,
  
  // ArduPilot固有メッセージ
  SIMSTATE = 164,
  TERRAIN_DATA = 134,
  RC_CHANNELS_OVERRIDE = 65,
  
  // ArduPilot拡張メッセージ（10000番台）
  ARDUPILOT_AIRSPEED_AUTOCAL = 11020,
  ARDUPILOT_AOA_SSA = 11030,
  ARDUPILOT_PID_TUNING = 11031,
  
  // 追加のMAVLink v2メッセージ
  AIRSPEED = 295,
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
  systemLoad?: number;
  onboardControlSensorsPresent?: number;
  onboardControlSensorsEnabled?: number;
  onboardControlSensorsHealth?: number;
  
  // 時間
  timeUnixUsec?: number;
  timeBootMs?: number;
  
  // 位置情報
  lat?: number;          // 緯度 (度)
  lon?: number;          // 経度 (度)
  alt?: number;          // 高度 (m)
  relativeAlt?: number;  // 相対高度 (m)
  altitudeAmsl?: number; // 平均海面高度 (m)
  altitudeLocal?: number; // ローカル高度 (m)
  altitudeTerrain?: number; // 地形高度 (m)
  bottomClearance?: number; // 地表からの距離 (m)
  
  // ローカル位置
  localX?: number;       // ローカルX座標 (m)
  localY?: number;       // ローカルY座標 (m)  
  localZ?: number;       // ローカルZ座標 (m)
  localVx?: number;      // ローカルX速度 (m/s)
  localVy?: number;      // ローカルY速度 (m/s)
  localVz?: number;      // ローカルZ速度 (m/s)
  
  // 姿勢
  roll?: number;         // ロール (度)
  pitch?: number;        // ピッチ (度)
  yaw?: number;          // ヨー (度)
  rollSpeed?: number;    // ロール角速度 (rad/s)
  pitchSpeed?: number;   // ピッチ角速度 (rad/s)
  yawSpeed?: number;     // ヨー角速度 (rad/s)
  q1?: number;           // クォータニオン1
  q2?: number;           // クォータニオン2
  q3?: number;           // クォータニオン3
  q4?: number;           // クォータニオン4
  
  // 速度
  groundSpeed?: number;  // 対地速度 (m/s)
  airSpeed?: number;     // 対気速度 (m/s)
  verticalSpeed?: number; // 垂直速度 (m/s)
  heading?: number;      // 方位 (度)
  
  // エアスピード詳細
  diffPressure?: number; // 差圧 (Pa)
  EAS2TAS?: number;      // 等価対気速度から真対気速度への変換係数
  airspeedRatio?: number; // エアスピード比
  AOA?: number;          // 迎角 (度)
  SSA?: number;          // 横滑り角 (度)
  airspeedTemperature?: number; // エアスピード温度 (℃)
  airspeedRawPress?: number; // エアスピード生圧力
  airspeedFlags?: number; // エアスピードフラグ
  
  // バッテリー
  voltage?: number;      // 電圧 (V)
  current?: number;      // 電流 (A)
  batteryRemaining?: number; // 残量 (%)
  powerVcc?: number;     // Vcc (mV)
  powerVservo?: number;  // Vservo (mV)
  powerFlags?: number;   // 電源フラグ
  
  // GPS
  satellites?: number;   // 衛星数
  hdop?: number;        // 水平精度
  vdop?: number;        // 垂直精度
  fixType?: number;     // GPS Fix種別
  gps2Satellites?: number; // GPS2衛星数
  gps2FixType?: number;  // GPS2 Fix種別
  
  // ナビゲーション
  navRoll?: number;      // ナビロール (度)
  navPitch?: number;     // ナビピッチ (度)
  navBearing?: number;   // ナビ方位 (度)
  targetBearing?: number; // ターゲット方位 (度)
  wpDistance?: number;   // ウェイポイント距離 (m)
  altError?: number;     // 高度エラー (m)
  aspdError?: number;    // 対気速度エラー (m/s)
  xtrackError?: number;  // クロストラックエラー (m)
  
  // ミッション
  missionCurrent?: number; // 現在のミッション番号
  currentWaypoint?: number; // 現在のウェイポイント番号（missionCurrentのエイリアス）
  missionItemReached?: number; // 到達したミッション番号
  
  // サーボ/RC
  servo1?: number;
  servo2?: number;
  servo3?: number;
  servo4?: number;
  servo5?: number;
  servo6?: number;
  servo7?: number;
  servo8?: number;
  rcChan1?: number;
  rcChan2?: number;
  rcChan3?: number;
  rcChan4?: number;
  rcChan5?: number;
  rcChan6?: number;
  rcChan7?: number;
  rcChan8?: number;
  rcRssi?: number;
  
  // IMU
  xacc?: number;         // X加速度 (m/s^2)
  yacc?: number;         // Y加速度 (m/s^2)
  zacc?: number;         // Z加速度 (m/s^2)
  xgyro?: number;        // Xジャイロ (rad/s)
  ygyro?: number;        // Yジャイロ (rad/s)
  zgyro?: number;        // Zジャイロ (rad/s)
  xmag?: number;         // X磁気 (gauss)
  ymag?: number;         // Y磁気 (gauss)
  zmag?: number;         // Z磁気 (gauss)
  
  // 気圧
  pressAbs?: number;     // 絶対気圧 (hPa)
  pressDiff?: number;    // 差圧 (hPa)
  temperature?: number;  // 温度 (℃)
  
  // 風
  windDirection?: number; // 風向 (度)
  windSpeed?: number;    // 風速 (m/s)
  windSpeedZ?: number;   // 垂直風速 (m/s)
  
  // レンジファインダー
  rangefinderDistance?: number; // 距離 (m)
  rangefinderVoltage?: number; // 電圧 (V)
  
  // AHRS
  ahrsOmegaIx?: number;
  ahrsOmegaIy?: number;
  ahrsOmegaIz?: number;
  ahrsAccelWeight?: number;
  ahrsRenormVal?: number;
  ahrsErrorRp?: number;
  ahrsErrorYaw?: number;
  
  // 振動
  vibrationX?: number;
  vibrationY?: number;
  vibrationZ?: number;
  clipping0?: number;
  clipping1?: number;
  clipping2?: number;
  
  // ホーム位置
  homeLatitude?: number;
  homeLongitude?: number;
  homeAltitude?: number;
  
  // ハードウェア状態
  hwVcc?: number;
  hwI2cErr?: number;
  memFree?: number;
  
  // 地形
  terrainHeight?: number;
  terrainCurrentHeight?: number;
  
  // EKF
  ekfFlags?: number;
  ekfVelocityVariance?: number;
  ekfPosHorizVariance?: number;
  ekfPosVertVariance?: number;
  ekfCompassVariance?: number;
  ekfTerrainAltVariance?: number;
  
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
  customMode: number;
  type: number;
  autopilot: number;
  baseMode: number;
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

// 追加メッセージ型定義

export interface ParsedSysStatus {
  onboardControlSensorsPresent: number;
  onboardControlSensorsEnabled: number;
  onboardControlSensorsHealth: number;
  load: number;
  voltageBattery: number;
  currentBattery: number;
  batteryRemaining: number;
  dropRateComm: number;
  errorsComm: number;
  errorsCount1: number;
  errorsCount2: number;
  errorsCount3: number;
  errorsCount4: number;
}

export interface ParsedSystemTime {
  timeUnixUsec: number;
  timeBootMs: number;
}

export interface ParsedNavControllerOutput {
  navRoll: number;
  navPitch: number;
  navBearing: number;
  targetBearing: number;
  wpDist: number;
  altError: number;
  aspdError: number;
  xtrackError: number;
}

export interface ParsedMissionCurrent {
  seq: number;
}

export interface ParsedServoOutputRaw {
  timeUsec: number;
  port: number;
  servo1Raw: number;
  servo2Raw: number;
  servo3Raw: number;
  servo4Raw: number;
  servo5Raw: number;
  servo6Raw: number;
  servo7Raw: number;
  servo8Raw: number;
}

export interface ParsedRcChannels {
  timeBootMs: number;
  chancount: number;
  chan1Raw: number;
  chan2Raw: number;
  chan3Raw: number;
  chan4Raw: number;
  chan5Raw: number;
  chan6Raw: number;
  chan7Raw: number;
  chan8Raw: number;
  chan9Raw: number;
  chan10Raw: number;
  chan11Raw: number;
  chan12Raw: number;
  chan13Raw: number;
  chan14Raw: number;
  chan15Raw: number;
  chan16Raw: number;
  chan17Raw: number;
  chan18Raw: number;
  rssi: number;
}

export interface ParsedScaledImu {
  timeBootMs: number;
  xacc: number;  // mg
  yacc: number;  // mg
  zacc: number;  // mg
  xgyro: number; // mrad/s
  ygyro: number; // mrad/s
  zgyro: number; // mrad/s
  xmag: number;  // mgauss
  ymag: number;  // mgauss
  zmag: number;  // mgauss
}

export interface ParsedScaledPressure {
  timeBootMs: number;
  pressAbs: number;    // hPa
  pressDiff: number;   // hPa
  temperature: number; // 0.01 degC
}

export interface ParsedMissionItemReached {
  seq: number;
}

export interface ParsedWind {
  direction: number; // deg
  speed: number;     // m/s
  speedZ: number;    // m/s
}

export interface ParsedRangefinder {
  distance: number; // m
  voltage: number;  // V
}

export interface ParsedAhrs {
  omegaIx: number;
  omegaIy: number;
  omegaIz: number;
  accelWeight: number;
  renormVal: number;
  errorRp: number;
  errorYaw: number;
}

export interface ParsedAhrs2 {
  roll: number;
  pitch: number;
  yaw: number;
  altitude: number;
  lat: number;
  lng: number;
}

export interface ParsedAhrs3 {
  roll: number;
  pitch: number;
  yaw: number;
  altitude: number;
  lat: number;
  lng: number;
  v1: number;
  v2: number;
  v3: number;
  v4: number;
}

export interface ParsedVibration {
  timeUsec: number;
  vibrationX: number;
  vibrationY: number;
  vibrationZ: number;
  clipping0: number;
  clipping1: number;
  clipping2: number;
}

export interface ParsedHomePosition {
  latitude: number;  // 1E7
  longitude: number; // 1E7
  altitude: number;  // mm
  x: number;
  y: number;
  z: number;
  q: number[];      // quaternion [4]
  approachX: number;
  approachY: number;
  approachZ: number;
}

export interface ParsedPowerStatus {
  vcc: number;       // mV
  vservo: number;    // mV
  flags: number;
}

export interface ParsedMeminfo {
  brkval: number;
  freemem: number;
}

export interface ParsedHwStatus {
  vcc: number;
  i2cerr: number;
}

export interface ParsedTerrainReport {
  lat: number;         // 1E7
  lon: number;         // 1E7
  spacingLat: number;
  spacingLon: number;
  terrainHeight: number; // m
  currentHeight: number; // m
  pending: number;
  loaded: number;
}

export interface ParsedEkfStatusReport {
  flags: number;
  velocityVariance: number;
  posHorizVariance: number;
  posVertVariance: number;
  compassVariance: number;
  terrainAltVariance: number;
}

export interface ParsedLocalPositionNed {
  timeBootMs: number;
  x: number;  // m
  y: number;  // m
  z: number;  // m
  vx: number; // m/s
  vy: number; // m/s
  vz: number; // m/s
}

export interface ParsedGpsStatus {
  satellitesVisible: number;
  satellitePrn: number[];
  satelliteUsed: number[];
  satelliteElevation: number[];
  satelliteAzimuth: number[];
  satelliteSnr: number[];
}

export interface ParsedGps2Raw {
  timeUsec: number;
  fixType: number;
  lat: number;
  lon: number;
  alt: number;
  eph: number;
  epv: number;
  vel: number;
  cog: number;
  satellitesVisible: number;
  dgpsNumch: number;
  dgpsAge: number;
}

export interface ParsedScaledImu2 {
  timeBootMs: number;
  xacc: number;
  yacc: number;
  zacc: number;
  xgyro: number;
  ygyro: number;
  zgyro: number;
  xmag: number;
  ymag: number;
  zmag: number;
}

export interface ParsedScaledImu3 {
  timeBootMs: number;
  xacc: number;
  yacc: number;
  zacc: number;
  xgyro: number;
  ygyro: number;
  zgyro: number;
  xmag: number;
  ymag: number;
  zmag: number;
}

export interface ParsedRawImu {
  timeUsec: number;
  xacc: number;
  yacc: number;
  zacc: number;
  xgyro: number;
  ygyro: number;
  zgyro: number;
  xmag: number;
  ymag: number;
  zmag: number;
}

export interface ParsedRawPressure {
  timeUsec: number;
  pressAbs: number;
  pressDiff1: number;
  pressDiff2: number;
  temperature: number;
}

export interface ParsedAltitude {
  timeUsec: number;
  altitudeMonotonic: number;
  altitudeAmsl: number;
  altitudeLocal: number;
  altitudeRelative: number;
  altitudeTerrain: number;
  bottomClearance: number;
}

export interface ParsedAttitudeQuaternion {
  timeBootMs: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  rollspeed: number;
  pitchspeed: number;
  yawspeed: number;
}

export interface ParsedAirspeedAutocal {
  vx: number;
  vy: number;
  vz: number;
  diffPressure: number;
  EAS2TAS: number;
  ratio: number;
  stateX: number;
  stateY: number;
  stateZ: number;
  Pax: number;
  Pby: number;
  Pcz: number;
}

export interface ParsedAoaSsa {
  timeUsec: number;
  AOA: number;
  SSA: number;
}

export interface ParsedAirspeed {
  id: number;
  airspeed: number;
  temperature: number;
  rawPress: number;
  flags: number;
}

// STATUSTEXT メッセージ
export interface ParsedStatusText {
  severity: number;
  text: string;
  id?: number;       // MAVLink v2 only
  chunkSeq?: number; // MAVLink v2 only
}

// PARAM_VALUE メッセージ
export interface ParsedParamValue {
  paramValue: number;
  paramCount: number;
  paramIndex: number;
  paramId: string;
  paramType: number;
}

// COMMAND_ACK メッセージ
export interface ParsedCommandAck {
  command: number;
  result: number;
  progress?: number;      // MAVLink v2 only
  resultParam2?: number;  // MAVLink v2 only
  targetSystem?: number;  // MAVLink v2 only
  targetComponent?: number; // MAVLink v2 only
}

// AUTOPILOT_VERSION メッセージ
export interface ParsedAutopilotVersion {
  capabilities: number;
  flightSwVersion: number;
  middlewareSwVersion: number;
  osSwVersion: number;
  boardVersion: number;
  flightCustomVersion: number[];
  middlewareCustomVersion: number[];
  osCustomVersion: number[];
  vendorId: number;
  productId: number;
  uid: number;
}

// TIMESYNC メッセージ
export interface ParsedTimesync {
  tc1: number;
  ts1: number;
}