// MAVLink WebSocket Hook

import { useState, useEffect, useRef, useCallback } from 'react';
import { MAVLinkParser } from '../utils/mavlinkParser';
import { 
  TelemetryData, 
  MAVLinkMessageType,
  MAVLinkFlightMode,
  MAVLinkBaseMode,
} from '../types/mavlink';

// Window拡張の型定義
declare global {
  interface Window {
    mavlinkStats?: { [key: string]: number };
    mavlinkStatsTimer?: NodeJS.Timeout;
    heartbeatLogged?: { [key: number]: boolean };
    vfrHudLogged?: boolean;
    vfrHudDebug?: boolean;
    airspeedAutocalLogged?: boolean;
    airspeedLogged?: boolean;
    navControllerLogged?: boolean;
    dumpedMessages?: Set<number>;
    enableMavlinkStats?: boolean;
  }
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'weak' | 'error';

interface UseMAVLinkWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  heartbeatTimeout?: number;
}

export const useMAVLinkWebSocket = ({
  url,
  reconnectInterval = 5000,
  heartbeatTimeout = 3000,
}: UseMAVLinkWebSocketOptions) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData>({ connected: false });
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messageCount, setMessageCount] = useState(0);
  const [protocolVersion, setProtocolVersion] = useState<'v1' | 'v2' | null>(null);
  
  const parser = useRef(new MAVLinkParser());
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeat = useRef<number>(0);

  // フライトモードを文字列に変換
  const getFlightModeString = (customMode: number): string => {
    const modes: { [key: number]: string } = {
      [MAVLinkFlightMode.MANUAL]: 'MANUAL',
      [MAVLinkFlightMode.CIRCLE]: 'CIRCLE',
      [MAVLinkFlightMode.STABILIZE]: 'STABILIZE',
      [MAVLinkFlightMode.TRAINING]: 'TRAINING',
      [MAVLinkFlightMode.ACRO]: 'ACRO',
      [MAVLinkFlightMode.FBWA]: 'FBWA',
      [MAVLinkFlightMode.FBWB]: 'FBWB',
      [MAVLinkFlightMode.CRUISE]: 'CRUISE',
      [MAVLinkFlightMode.AUTOTUNE]: 'AUTOTUNE',
      [MAVLinkFlightMode.AUTO]: 'AUTO',
      [MAVLinkFlightMode.RTL]: 'RTL',
      [MAVLinkFlightMode.LOITER]: 'LOITER',
      [MAVLinkFlightMode.GUIDED]: 'GUIDED',
      [MAVLinkFlightMode.QSTABILIZE]: 'QSTABILIZE',
      [MAVLinkFlightMode.QHOVER]: 'QHOVER',
      [MAVLinkFlightMode.QLOITER]: 'QLOITER',
      [MAVLinkFlightMode.QLAND]: 'QLAND',
      [MAVLinkFlightMode.QRTL]: 'QRTL',
    };
    return modes[customMode] || `MODE_${customMode}`;
  };

  // ハートビートタイムアウトをチェック
  const checkHeartbeat = useCallback(() => {
    const now = Date.now();
    if (now - lastHeartbeat.current > heartbeatTimeout) {
      setStatus('weak');
      setTelemetry(prev => ({ ...prev, connected: false }));
    }
  }, [heartbeatTimeout]);

  // WebSocket接続
  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('MAVLink WebSocket接続開始:', url);
    setStatus('connecting');

    try {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('MAVLink WebSocket接続成功');
        setStatus('connected');
        setSocket(ws);
        
        // ハートビートチェックを開始
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
        }
        heartbeatTimer.current = setInterval(checkHeartbeat, 1000);
      };

      ws.onmessage = (event) => {
        try {
          const messages = parser.current.parseBuffer(event.data);
          setMessageCount(prev => prev + messages.length);
          
          
          messages.forEach(message => {
            try {
              // プロトコルバージョンを検出
              if (message.header.magic === 0xFD && protocolVersion !== 'v2') {
                setProtocolVersion('v2');
              } else if (message.header.magic === 0xFE && protocolVersion !== 'v1') {
                setProtocolVersion('v1');
              }
              
              // メッセージ統計を有効化（デバッグ用、必要時のみ）
              // window.enableMavlinkStats = true で有効化
              if (window.enableMavlinkStats) {
                if (!window.mavlinkStats) {
                  window.mavlinkStats = {};
                }
                const msgId = message.header.msgid;
                window.mavlinkStats[msgId] = (window.mavlinkStats[msgId] || 0) + 1;
              }
              
              switch (message.header.msgid) {
            case MAVLinkMessageType.HEARTBEAT: {
              // システムID 1（機体）からのHEARTBEATのみ処理
              if (message.header.sysid === 1) {
                const heartbeat = parser.current.parseHeartbeat(message.payload);
                
                // デバッグ用：HEARTBEATデータをログ出力
                if (!window.heartbeatLogged || !window.heartbeatLogged[message.header.sysid]) {
                  if (!window.heartbeatLogged) window.heartbeatLogged = {};
                  window.heartbeatLogged[message.header.sysid] = true;
                  console.log(`HEARTBEAT データ (sysid=${message.header.sysid}, compid=${message.header.compid}):`, heartbeat);
                  console.log('HEARTBEAT ペイロードダンプ:', parser.current.dumpPayload(0, message.payload));
                  console.log('Flight Mode 値:', heartbeat.customMode, '→', getFlightModeString(heartbeat.customMode));
                }
                
                lastHeartbeat.current = Date.now();
                setStatus('connected');
                setTelemetry(prev => ({
                  ...prev,
                  connected: true,
                  armed: (heartbeat.baseMode & MAVLinkBaseMode.SAFETY_ARMED) > 0,
                  flightMode: getFlightModeString(heartbeat.customMode),
                  systemStatus: heartbeat.systemStatus,
                  lastHeartbeat: lastHeartbeat.current,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.ATTITUDE: {
              const attitude = parser.current.parseAttitude(message.payload);
              setTelemetry(prev => ({
                ...prev,
                roll: attitude.roll * 180 / Math.PI,
                pitch: attitude.pitch * 180 / Math.PI,
                yaw: attitude.yaw * 180 / Math.PI,
                rollSpeed: attitude.rollspeed,
                pitchSpeed: attitude.pitchspeed,
                yawSpeed: attitude.yawspeed,
              }));
              break;
            }
            
            case MAVLinkMessageType.GLOBAL_POSITION_INT: {
              const pos = parser.current.parseGlobalPositionInt(message.payload);
              if (pos) {
                setTelemetry(prev => ({
                  ...prev,
                  lat: pos.lat / 1e7,
                  lon: pos.lon / 1e7,
                  alt: pos.alt / 1000,
                  relativeAlt: pos.relativeAlt / 1000,
                  groundSpeed: Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy) / 100,
                  verticalSpeed: -pos.vz / 100, // MAVLinkは下向きが正
                  heading: pos.hdg / 100,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.VFR_HUD: {
              // 初回のみペイロードをダンプ
              if (!window.vfrHudDebug) {
                window.vfrHudDebug = true;
                console.log('[VFR_HUD] ペイロードダンプ:', parser.current.dumpPayload(74, message.payload));
              }
              
              const hud = parser.current.parseVfrHud(message.payload);
              if (hud) {
                // パース後のデータを表示
                if (!window.vfrHudLogged) {
                  window.vfrHudLogged = true;
                  console.log('[VFR_HUD] Parsed data:', {
                    airspeed: hud.airspeed,
                    groundspeed: hud.groundspeed,
                    throttle: hud.throttle,
                    alt: hud.alt,
                    heading: hud.heading,
                    climb: hud.climb
                  });
                }
                setTelemetry(prev => ({
                  ...prev,
                  airSpeed: hud.airspeed,      // Vehicle speed (CAS/IAS) m/s
                  groundSpeed: hud.groundspeed, // Ground speed m/s
                  heading: hud.heading,         // Heading in degrees (0-360)
                  throttle: hud.throttle,       // Throttle percentage (0-100)
                  alt: hud.alt,                 // Altitude MSL in meters
                  verticalSpeed: hud.climb,     // Climb rate m/s
                }));
              } else {
                // console.error('[VFR_HUD] パース失敗！');
              }
              break;
            }
            
            case MAVLinkMessageType.BATTERY_STATUS: {
              const battery = parser.current.parseBatteryStatus(message.payload);
              if (battery) {
                setTelemetry(prev => ({
                  ...prev,
                  voltage: battery.voltages[0] / 1000,
                  current: battery.currentBattery / 100,
                  batteryRemaining: battery.batteryRemaining,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.GPS_RAW_INT: {
              const gps = parser.current.parseGpsRawInt(message.payload);
              if (gps) {
                setTelemetry(prev => ({
                  ...prev,
                  lat: gps.lat / 1e7,
                  lon: gps.lon / 1e7,
                  satellites: gps.satellitesVisible,
                  hdop: gps.eph / 100,
                  vdop: gps.epv / 100,
                  fixType: gps.fixType,
                }));
                
                // GPS品質に基づいて接続状態を更新
                if (gps.eph > 200) { // HDOP > 2.0
                  setStatus('weak');
                }
              }
              break;
            }
            
            case MAVLinkMessageType.SYS_STATUS: {
              const sys = parser.current.parseSysStatus(message.payload);
              if (sys) {
                setTelemetry(prev => ({
                  ...prev,
                  voltage: sys.voltageBattery / 1000,
                  current: sys.currentBattery / 100,
                  batteryRemaining: sys.batteryRemaining,
                  systemLoad: sys.load / 10,
                  onboardControlSensorsPresent: sys.onboardControlSensorsPresent,
                  onboardControlSensorsEnabled: sys.onboardControlSensorsEnabled,
                  onboardControlSensorsHealth: sys.onboardControlSensorsHealth,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.SYSTEM_TIME: {
              const time = parser.current.parseSystemTime(message.payload);
              if (time) {
                setTelemetry(prev => ({
                  ...prev,
                  timeUnixUsec: time.timeUnixUsec,
                  timeBootMs: time.timeBootMs,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.NAV_CONTROLLER_OUTPUT: {
              const nav = parser.current.parseNavControllerOutput(message.payload);
              if (nav) {
                // デバッグログを追加
                if (!window.navControllerLogged) {
                  window.navControllerLogged = true;
                  console.log('[NAV_CONTROLLER_OUTPUT] Received:', {
                    wpDist: nav.wpDist,
                    targetBearing: nav.targetBearing,
                    navBearing: nav.navBearing
                  });
                }
                setTelemetry(prev => ({
                  ...prev,
                  navRoll: nav.navRoll,
                  navPitch: nav.navPitch,
                  navBearing: nav.navBearing,
                  targetBearing: nav.targetBearing,
                  wpDistance: nav.wpDist,
                  nextWpDistance: nav.wpDist,
                  altError: nav.altError,
                  aspdError: nav.aspdError,
                  xtrackError: nav.xtrackError,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.MISSION_CURRENT: {
              const mission = parser.current.parseMissionCurrent(message.payload);
              if (mission) {
                setTelemetry(prev => ({
                  ...prev,
                  currentWaypoint: mission.seq,
                }));
              }
              break;
            }
            
            
            case MAVLinkMessageType.SERVO_OUTPUT_RAW: {
              const servo = parser.current.parseServoOutputRaw(message.payload);
              if (servo) {
                setTelemetry(prev => ({
                  ...prev,
                  servo1: servo.servo1Raw,
                  servo2: servo.servo2Raw,
                  servo3: servo.servo3Raw,
                  servo4: servo.servo4Raw,
                  servo5: servo.servo5Raw,
                  servo6: servo.servo6Raw,
                  servo7: servo.servo7Raw,
                  servo8: servo.servo8Raw,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.RC_CHANNELS: {
              const rc = parser.current.parseRcChannels(message.payload);
              if (rc) {
                setTelemetry(prev => ({
                  ...prev,
                  rcChan1: rc.chan1Raw,
                  rcChan2: rc.chan2Raw,
                  rcChan3: rc.chan3Raw,
                  rcChan4: rc.chan4Raw,
                  rcChan5: rc.chan5Raw,
                  rcChan6: rc.chan6Raw,
                  rcChan7: rc.chan7Raw,
                  rcChan8: rc.chan8Raw,
                  rcRssi: rc.rssi,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.SCALED_IMU: {
              const imu = parser.current.parseScaledImu(message.payload);
              if (imu) {
                setTelemetry(prev => ({
                  ...prev,
                  xacc: imu.xacc / 1000,
                  yacc: imu.yacc / 1000,
                  zacc: imu.zacc / 1000,
                  xgyro: imu.xgyro / 1000,
                  ygyro: imu.ygyro / 1000,
                  zgyro: imu.zgyro / 1000,
                  xmag: imu.xmag / 1000,
                  ymag: imu.ymag / 1000,
                  zmag: imu.zmag / 1000,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.SCALED_PRESSURE: {
              const pressure = parser.current.parseScaledPressure(message.payload);
              if (pressure) {
                setTelemetry(prev => ({
                  ...prev,
                  pressAbs: pressure.pressAbs,
                  pressDiff: pressure.pressDiff,
                  temperature: pressure.temperature / 100,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.MISSION_ITEM_REACHED: {
              const reached = parser.current.parseMissionItemReached(message.payload);
              if (reached) {
                setTelemetry(prev => ({
                  ...prev,
                  missionItemReached: reached.seq,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.WIND: {
              const wind = parser.current.parseWind(message.payload);
              if (wind) {
                setTelemetry(prev => ({
                  ...prev,
                  windDirection: wind.direction,
                  windSpeed: wind.speed,
                  windSpeedZ: wind.speedZ,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.RANGEFINDER: {
              const range = parser.current.parseRangefinder(message.payload);
              if (range) {
                setTelemetry(prev => ({
                  ...prev,
                  rangefinderDistance: range.distance,
                  rangefinderVoltage: range.voltage,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.AHRS: {
              const ahrs = parser.current.parseAhrs(message.payload);
              if (ahrs) {
                setTelemetry(prev => ({
                  ...prev,
                  ahrsOmegaIx: ahrs.omegaIx,
                  ahrsOmegaIy: ahrs.omegaIy,
                  ahrsOmegaIz: ahrs.omegaIz,
                  ahrsAccelWeight: ahrs.accelWeight,
                  ahrsRenormVal: ahrs.renormVal,
                  ahrsErrorRp: ahrs.errorRp,
                  ahrsErrorYaw: ahrs.errorYaw,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.VIBRATION: {
              const vib = parser.current.parseVibration(message.payload);
              if (vib) {
                setTelemetry(prev => ({
                  ...prev,
                  vibrationX: vib.vibrationX,
                  vibrationY: vib.vibrationY,
                  vibrationZ: vib.vibrationZ,
                  clipping0: vib.clipping0,
                  clipping1: vib.clipping1,
                  clipping2: vib.clipping2,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.HOME_POSITION: {
              const home = parser.current.parseHomePosition(message.payload);
              if (home) {
                setTelemetry(prev => ({
                  ...prev,
                  homeLatitude: home.latitude / 1e7,
                  homeLongitude: home.longitude / 1e7,
                  homeAltitude: home.altitude / 1000,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.POWER_STATUS: {
              const power = parser.current.parsePowerStatus(message.payload);
              if (power) {
                setTelemetry(prev => ({
                  ...prev,
                  powerVcc: power.vcc,
                  powerVservo: power.vservo,
                  powerFlags: power.flags,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.MEMINFO: {
              const mem = parser.current.parseMeminfo(message.payload);
              if (mem) {
                setTelemetry(prev => ({
                  ...prev,
                  memFree: mem.freemem,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.HWSTATUS: {
              const hw = parser.current.parseHwStatus(message.payload);
              if (hw) {
                setTelemetry(prev => ({
                  ...prev,
                  hwVcc: hw.vcc,
                  hwI2cErr: hw.i2cerr,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.TERRAIN_REPORT: {
              const terrain = parser.current.parseTerrainReport(message.payload);
              if (terrain) {
                setTelemetry(prev => ({
                  ...prev,
                  terrainHeight: terrain.terrainHeight,
                  terrainCurrentHeight: terrain.currentHeight,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.EKF_STATUS_REPORT: {
              const ekf = parser.current.parseEkfStatusReport(message.payload);
              if (ekf) {
                setTelemetry(prev => ({
                  ...prev,
                  ekfFlags: ekf.flags,
                  ekfVelocityVariance: ekf.velocityVariance,
                  ekfPosHorizVariance: ekf.posHorizVariance,
                  ekfPosVertVariance: ekf.posVertVariance,
                  ekfCompassVariance: ekf.compassVariance,
                  ekfTerrainAltVariance: ekf.terrainAltVariance,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.LOCAL_POSITION_NED: {
              const local = parser.current.parseLocalPositionNed(message.payload);
              if (local) {
                setTelemetry(prev => ({
                  ...prev,
                  localX: local.x,
                  localY: local.y,
                  localZ: local.z,
                  localVx: local.vx,
                  localVy: local.vy,
                  localVz: local.vz,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.GPS_STATUS: {
              const gpsStatus = parser.current.parseGpsStatus(message.payload);
              if (gpsStatus) {
                // GPS衛星情報を処理（必要に応じて）
              }
              break;
            }
            
            case MAVLinkMessageType.GPS2_RAW: {
              const gps2 = parser.current.parseGps2Raw(message.payload);
              if (gps2) {
                setTelemetry(prev => ({
                  ...prev,
                  gps2Satellites: gps2.satellitesVisible,
                  gps2FixType: gps2.fixType,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.SCALED_IMU2: {
              const imu2 = parser.current.parseScaledImu2(message.payload);
              // IMU2データを処理（必要に応じて）
              break;
            }
            
            case MAVLinkMessageType.SCALED_IMU3: {
              const imu3 = parser.current.parseScaledImu3(message.payload);
              // IMU3データを処理（必要に応じて）
              break;
            }
            
            case MAVLinkMessageType.RAW_IMU: {
              const rawImu = parser.current.parseRawImu(message.payload);
              // 生IMUデータを処理（必要に応じて）
              break;
            }
            
            case MAVLinkMessageType.RAW_PRESSURE: {
              const rawPressure = parser.current.parseRawPressure(message.payload);
              // 生圧力データを処理（必要に応じて）
              break;
            }
            
            case MAVLinkMessageType.ALTITUDE: {
              const altitude = parser.current.parseAltitude(message.payload);
              if (altitude) {
                setTelemetry(prev => ({
                  ...prev,
                  altitudeAmsl: altitude.altitudeAmsl,
                  altitudeLocal: altitude.altitudeLocal,
                  altitudeTerrain: altitude.altitudeTerrain,
                  bottomClearance: altitude.bottomClearance,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.ATTITUDE_QUATERNION: {
              const attQuat = parser.current.parseAttitudeQuaternion(message.payload);
              if (attQuat) {
                setTelemetry(prev => ({
                  ...prev,
                  q1: attQuat.q1,
                  q2: attQuat.q2,
                  q3: attQuat.q3,
                  q4: attQuat.q4,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.AHRS2: {
              const ahrs2 = parser.current.parseAhrs2(message.payload);
              // AHRS2データを処理（必要に応じて）
              break;
            }
            
            case MAVLinkMessageType.AHRS3: {
              const ahrs3 = parser.current.parseAhrs3(message.payload);
              // AHRS3データを処理（必要に応じて）
              break;
            }
            
            case MAVLinkMessageType.ARDUPILOT_AIRSPEED_AUTOCAL: {
              const airspeed = parser.current.parseAirspeedAutocal(message.payload);
              if (airspeed) {
                // デバッグ用：初回のAIRSPEED_AUTOCALデータをログ出力
                if (!window.airspeedAutocalLogged) {
                  window.airspeedAutocalLogged = true;
                  console.log('AIRSPEED_AUTOCAL データ:', airspeed);
                }
                setTelemetry(prev => ({
                  ...prev,
                  diffPressure: airspeed.diffPressure,
                  EAS2TAS: airspeed.EAS2TAS,
                  airspeedRatio: airspeed.ratio,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.ARDUPILOT_AOA_SSA: {
              const aoaSsa = parser.current.parseAoaSsa(message.payload);
              if (aoaSsa) {
                setTelemetry(prev => ({
                  ...prev,
                  AOA: aoaSsa.AOA,
                  SSA: aoaSsa.SSA,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.AIRSPEED: {
              const airspeed = parser.current.parseAirspeed(message.payload);
              if (airspeed) {
                // デバッグ用：AIRSPEEDデータをログ出力
                if (!window.airspeedLogged) {
                  window.airspeedLogged = true;
                  console.log('AIRSPEED (295) データ:', airspeed);
                  console.log('AIRSPEED ペイロードダンプ:', parser.current.dumpPayload(295, message.payload));
                }
                setTelemetry(prev => ({
                  ...prev,
                  airSpeed: airspeed.airspeed,
                  airspeedTemperature: airspeed.temperature,
                  airspeedRawPress: airspeed.rawPress,
                  airspeedFlags: airspeed.flags,
                }));
              }
              break;
            }
            
            case MAVLinkMessageType.STATUSTEXT: {
              const statusText = parser.current.parseStatusText(message.payload);
              if (statusText) {
                console.log(`[ARDUPILOT] ${statusText.text}`);
              }
              break;
            }
            
            default: {
              // 未処理のメッセージのペイロードをダンプ（初回のみ）
              if (!window.dumpedMessages) {
                window.dumpedMessages = new Set();
              }
              if (!window.dumpedMessages.has(message.header.msgid)) {
                window.dumpedMessages.add(message.header.msgid);
                const msgName = MAVLinkMessageType[message.header.msgid] || 'UNKNOWN';
                console.log(`=== 未処理メッセージのペイロードダンプ: ID ${message.header.msgid} (${msgName}) ===`);
                console.log(parser.current.dumpPayload(message.header.msgid, message.payload));
                
                // VFR_HUDメッセージを特別にチェック
                if (message.header.msgid === 74) {
                  console.log('!!! VFR_HUD (ID: 74) が未処理メッセージとして検出されました !!!');
                }
              }
              break;
            }
          }
            } catch (err) {
              console.error('メッセージパースエラー:', err, 'msgid:', message.header.msgid);
            }
          });
        } catch (err) {
          console.error('バッファパースエラー:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocketエラー:', error);
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('WebSocket切断');
        setStatus('disconnected');
        setSocket(null);
        setTelemetry(prev => ({ ...prev, connected: false }));
        
        // ハートビートチェックを停止
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
        }
        
        // 再接続をスケジュール
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
        }
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      };
    } catch (error) {
      console.error('WebSocket接続エラー:', error);
      setStatus('error');
    }
  }, [url, socket, checkHeartbeat, reconnectInterval]);

  // コンポーネントマウント時に接続
  useEffect(() => {
    connect();
    
    return () => {
      // クリーンアップ
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // 手動切断
  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (socket) {
      socket.close();
    }
  }, [socket]);

  return {
    telemetry,
    status,
    messageCount,
    protocolVersion,
    connect,
    disconnect,
  };
};