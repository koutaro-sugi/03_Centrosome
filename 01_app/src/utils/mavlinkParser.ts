// MAVLink v1/v2 Parser

import {
  MAVLinkMessage,
  MAVLinkHeader,
  MAVLinkMessageType,
  ParsedHeartbeat,
  ParsedAttitude,
  ParsedGlobalPositionInt,
  ParsedVfrHud,
  ParsedBatteryStatus,
  ParsedGpsRawInt,
  ParsedSysStatus,
  ParsedSystemTime,
  ParsedNavControllerOutput,
  ParsedMissionCurrent,
  ParsedServoOutputRaw,
  ParsedRcChannels,
  ParsedScaledImu,
  ParsedScaledPressure,
  ParsedMissionItemReached,
  ParsedWind,
  ParsedRangefinder,
  ParsedAhrs,
  ParsedAhrs2,
  ParsedAhrs3,
  ParsedVibration,
  ParsedHomePosition,
  ParsedPowerStatus,
  ParsedMeminfo,
  ParsedHwStatus,
  ParsedTerrainReport,
  ParsedEkfStatusReport,
  ParsedLocalPositionNed,
  ParsedGpsStatus,
  ParsedGps2Raw,
  ParsedScaledImu2,
  ParsedScaledImu3,
  ParsedRawImu,
  ParsedRawPressure,
  ParsedAltitude,
  ParsedAttitudeQuaternion,
  ParsedAirspeedAutocal,
  ParsedAoaSsa,
  ParsedAirspeed,
  ParsedStatusText,
  ParsedParamValue,
  ParsedCommandAck,
  ParsedAutopilotVersion,
  ParsedTimesync,
} from '../types/mavlink';

// MAVLinkマジックバイト
const MAVLINK_V1_MAGIC = 0xFE;
const MAVLINK_V2_MAGIC = 0xFD;

export class MAVLinkParser {
  private buffer: Uint8Array = new Uint8Array(0);
  private messages: MAVLinkMessage[] = [];
  private navDebugLogged: boolean = false;

  // バッファにデータを追加してメッセージをパース
  parseBuffer(data: ArrayBuffer): MAVLinkMessage[] {
    const newData = new Uint8Array(data);
    
    // 既存バッファと新しいデータを結合
    const combined = new Uint8Array(this.buffer.length + newData.length);
    combined.set(this.buffer);
    combined.set(newData, this.buffer.length);
    this.buffer = combined;

    this.messages = [];
    
    // バッファからメッセージを抽出
    while (this.buffer.length > 0) {
      const message = this.extractMessage();
      if (message) {
        this.messages.push(message);
      } else {
        break;
      }
    }

    return this.messages;
  }

  // バッファから1つのメッセージを抽出
  private extractMessage(): MAVLinkMessage | null {
    // マジックバイトを探す（v2を優先的に探す）
    let startIndex = -1;
    let isV2 = false;
    
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === MAVLINK_V2_MAGIC) {
        startIndex = i;
        isV2 = true;
        break;
      } else if (this.buffer[i] === MAVLINK_V1_MAGIC) {
        startIndex = i;
        isV2 = false;
        // v2が見つかる可能性があるので続ける
      }
    }

    if (startIndex === -1) {
      // マジックバイトが見つからない
      this.buffer = new Uint8Array(0);
      return null;
    }

    // 不要なデータを削除
    if (startIndex > 0) {
      this.buffer = this.buffer.slice(startIndex);
    }

    // ヘッダーサイズをチェック
    const headerSize = isV2 ? 10 : 6;
    if (this.buffer.length < headerSize) {
      return null;
    }

    // ヘッダーを読み込む
    const header = this.parseHeader(this.buffer, isV2);
    
    // 完全なメッセージがあるかチェック
    let messageSize = headerSize + header.len + 2; // +2 for checksum
    if (isV2 && (this.buffer[2] & 0x01)) {
      // 署名付きの場合
      messageSize += 13;
    }

    if (this.buffer.length < messageSize) {
      return null;
    }

    // ペイロードを抽出
    const payload = this.buffer.slice(headerSize, headerSize + header.len);
    
    // チェックサムを取得
    const checksumIndex = headerSize + header.len;
    const checksum = (this.buffer[checksumIndex + 1] << 8) | this.buffer[checksumIndex];

    // メッセージを作成
    const message: MAVLinkMessage = {
      header,
      payload,
      checksum,
    };

    // バッファからメッセージを削除
    this.buffer = this.buffer.slice(messageSize);

    return message;
  }

  // ヘッダーをパース
  private parseHeader(buffer: Uint8Array, isV2: boolean): MAVLinkHeader {
    if (isV2) {
      return {
        magic: buffer[0],
        len: buffer[1],
        incompat_flags: buffer[2],
        compat_flags: buffer[3],
        seq: buffer[4],
        sysid: buffer[5],
        compid: buffer[6],
        msgid: buffer[7] | (buffer[8] << 8) | (buffer[9] << 16),
      };
    } else {
      return {
        magic: buffer[0],
        len: buffer[1],
        seq: buffer[2],
        sysid: buffer[3],
        compid: buffer[4],
        msgid: buffer[5],
      };
    }
  }

  // HEARTBEAT メッセージをパース
  parseHeartbeat(payload: Uint8Array): ParsedHeartbeat {
    // MAVLink v2のHEARTBEATメッセージフィールド順序:
    // custom_mode (uint32) - オフセット 0
    // type (uint8) - オフセット 4
    // autopilot (uint8) - オフセット 5
    // base_mode (uint8) - オフセット 6
    // system_status (uint8) - オフセット 7
    // mavlink_version (uint8) - オフセット 8
    return {
      customMode: this.getUint32(payload, 0),
      type: payload[4],
      autopilot: payload[5],
      baseMode: payload[6],
      systemStatus: payload[7],
      mavlinkVersion: payload[8],
    };
  }

  // ATTITUDE メッセージをパース
  parseAttitude(payload: Uint8Array): ParsedAttitude {
    return {
      timeBootMs: this.getUint32(payload, 0),
      roll: this.getFloat32(payload, 4),
      pitch: this.getFloat32(payload, 8),
      yaw: this.getFloat32(payload, 12),
      rollspeed: this.getFloat32(payload, 16),
      pitchspeed: this.getFloat32(payload, 20),
      yawspeed: this.getFloat32(payload, 24),
    };
  }

  // GLOBAL_POSITION_INT メッセージをパース
  parseGlobalPositionInt(payload: Uint8Array): ParsedGlobalPositionInt | null {
    // GLOBAL_POSITION_INTメッセージは最低28バイト必要
    if (payload.length < 28) {
      return null;
    }
    return {
      timeBootMs: this.getUint32(payload, 0),
      lat: this.getInt32(payload, 4),
      lon: this.getInt32(payload, 8),
      alt: this.getInt32(payload, 12),
      relativeAlt: this.getInt32(payload, 16),
      vx: this.getInt16(payload, 20),
      vy: this.getInt16(payload, 22),
      vz: this.getInt16(payload, 24),
      hdg: this.getUint16(payload, 26),
    };
  }

  // VFR_HUD メッセージをパース
  parseVfrHud(payload: Uint8Array): ParsedVfrHud | null {
    // VFR_HUD (ID: 74)
    // MAVLink v1: 20バイト
    // フィールド:
    // - airspeed: float (4 bytes) @ 0
    // - groundspeed: float (4 bytes) @ 4
    // - heading: int16 (2 bytes) @ 8
    // - throttle: uint16 (2 bytes) @ 10
    // - alt: float (4 bytes) @ 12
    // - climb: float (4 bytes) @ 16
    
    if (payload.length < 20) {
      console.warn(`[VFR_HUD] ペイロードサイズが不正: ${payload.length}バイト (期待: 20バイト)`);
      return null;
    }
    
    return {
      airspeed: this.getFloat32(payload, 0),
      groundspeed: this.getFloat32(payload, 4),
      heading: this.getInt16(payload, 8),
      throttle: this.getUint16(payload, 10),
      alt: this.getFloat32(payload, 12),
      climb: this.getFloat32(payload, 16),
    };
  }

  // BATTERY_STATUS メッセージをパース
  parseBatteryStatus(payload: Uint8Array): ParsedBatteryStatus | null {
    // BATTERY_STATUSメッセージは最低36バイト必要
    if (payload.length < 36) {
      return null;
    }
    const voltages: number[] = [];
    for (let i = 0; i < 10; i++) {
      voltages.push(this.getUint16(payload, 2 + i * 2));
    }
    
    return {
      id: payload[0],
      batteryFunction: payload[1],
      type: payload[22],
      temperature: this.getInt16(payload, 23),
      voltages,
      currentBattery: this.getInt16(payload, 25),
      currentConsumed: this.getInt32(payload, 27),
      energyConsumed: this.getInt32(payload, 31),
      batteryRemaining: payload[35],
    };
  }

  // GPS_RAW_INT メッセージをパース
  parseGpsRawInt(payload: Uint8Array): ParsedGpsRawInt | null {
    // GPS_RAW_INTメッセージは最低30バイト必要
    if (payload.length < 30) {
      return null;
    }
    return {
      timeUsec: this.getUint64(payload, 0),
      fixType: payload[28],
      lat: this.getInt32(payload, 8),
      lon: this.getInt32(payload, 12),
      alt: this.getInt32(payload, 16),
      eph: this.getUint16(payload, 20),
      epv: this.getUint16(payload, 22),
      vel: this.getUint16(payload, 24),
      cog: this.getUint16(payload, 26),
      satellitesVisible: payload[29],
    };
  }

  // SYS_STATUS メッセージをパース
  parseSysStatus(payload: Uint8Array): ParsedSysStatus | null {
    if (payload.length < 31) return null;
    return {
      onboardControlSensorsPresent: this.getUint32(payload, 0),
      onboardControlSensorsEnabled: this.getUint32(payload, 4),
      onboardControlSensorsHealth: this.getUint32(payload, 8),
      load: this.getUint16(payload, 12),
      voltageBattery: this.getUint16(payload, 14),
      currentBattery: this.getInt16(payload, 16),
      batteryRemaining: payload[18],
      dropRateComm: this.getUint16(payload, 19),
      errorsComm: this.getUint16(payload, 21),
      errorsCount1: this.getUint16(payload, 23),
      errorsCount2: this.getUint16(payload, 25),
      errorsCount3: this.getUint16(payload, 27),
      errorsCount4: this.getUint16(payload, 29),
    };
  }

  // SYSTEM_TIME メッセージをパース
  parseSystemTime(payload: Uint8Array): ParsedSystemTime | null {
    if (payload.length < 12) return null;
    return {
      timeUnixUsec: this.getUint64(payload, 0),
      timeBootMs: this.getUint32(payload, 8),
    };
  }

  // NAV_CONTROLLER_OUTPUT メッセージをパース
  parseNavControllerOutput(payload: Uint8Array): ParsedNavControllerOutput | null {
    if (payload.length < 26) return null;
    
    
    // MAVLink標準仕様に基づくフィールド解析
    // 公式ドキュメントではnav_roll/nav_pitchは度単位だが、実際はラジアンで送信される場合が多い
    // bearingフィールドはセンチ度（1/100度）でエンコードされている
    const result = {
      navRoll: this.getFloat32(payload, 0),            // offset 0: float rad - ロール角（ラジアン）
      navPitch: this.getFloat32(payload, 4),           // offset 4: float rad - ピッチ角（ラジアン）
      navBearing: this.getInt16(payload, 8) / 100,     // offset 8: int16_t cdeg - 現在の目標方位（センチ度→度）
      targetBearing: this.getInt16(payload, 10) / 100, // offset 10: int16_t cdeg - ウェイポイントへの方位（センチ度→度）
      wpDist: this.getUint16(payload, 12),             // offset 12: uint16_t m - ウェイポイントまでの距離（メートル）
      altError: this.getFloat32(payload, 14),          // offset 14: float m - 高度誤差（メートル）
      aspdError: this.getFloat32(payload, 18),         // offset 18: float m/s - 対気速度誤差（m/s）
      xtrackError: this.getFloat32(payload, 22),       // offset 22: float m - クロストラック誤差（メートル）
    };
    
    // ラジアンを度に変換（roll/pitchフィールド）
    result.navRoll = result.navRoll * 180 / Math.PI;
    result.navPitch = result.navPitch * 180 / Math.PI;
    
    return result;
  }

  // MISSION_CURRENT メッセージをパース
  parseMissionCurrent(payload: Uint8Array): ParsedMissionCurrent | null {
    if (payload.length < 2) return null;
    return {
      seq: this.getUint16(payload, 0),
    };
  }

  // SERVO_OUTPUT_RAW メッセージをパース
  parseServoOutputRaw(payload: Uint8Array): ParsedServoOutputRaw | null {
    if (payload.length < 21) return null;
    return {
      timeUsec: this.getUint32(payload, 0),
      port: payload[4],
      servo1Raw: this.getUint16(payload, 5),
      servo2Raw: this.getUint16(payload, 7),
      servo3Raw: this.getUint16(payload, 9),
      servo4Raw: this.getUint16(payload, 11),
      servo5Raw: this.getUint16(payload, 13),
      servo6Raw: this.getUint16(payload, 15),
      servo7Raw: this.getUint16(payload, 17),
      servo8Raw: this.getUint16(payload, 19),
    };
  }

  // RC_CHANNELS メッセージをパース
  parseRcChannels(payload: Uint8Array): ParsedRcChannels | null {
    if (payload.length < 42) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      chancount: payload[4],
      chan1Raw: this.getUint16(payload, 5),
      chan2Raw: this.getUint16(payload, 7),
      chan3Raw: this.getUint16(payload, 9),
      chan4Raw: this.getUint16(payload, 11),
      chan5Raw: this.getUint16(payload, 13),
      chan6Raw: this.getUint16(payload, 15),
      chan7Raw: this.getUint16(payload, 17),
      chan8Raw: this.getUint16(payload, 19),
      chan9Raw: this.getUint16(payload, 21),
      chan10Raw: this.getUint16(payload, 23),
      chan11Raw: this.getUint16(payload, 25),
      chan12Raw: this.getUint16(payload, 27),
      chan13Raw: this.getUint16(payload, 29),
      chan14Raw: this.getUint16(payload, 31),
      chan15Raw: this.getUint16(payload, 33),
      chan16Raw: this.getUint16(payload, 35),
      chan17Raw: this.getUint16(payload, 37),
      chan18Raw: this.getUint16(payload, 39),
      rssi: payload[41],
    };
  }

  // SCALED_IMU メッセージをパース
  parseScaledImu(payload: Uint8Array): ParsedScaledImu | null {
    if (payload.length < 22) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      xacc: this.getInt16(payload, 4),
      yacc: this.getInt16(payload, 6),
      zacc: this.getInt16(payload, 8),
      xgyro: this.getInt16(payload, 10),
      ygyro: this.getInt16(payload, 12),
      zgyro: this.getInt16(payload, 14),
      xmag: this.getInt16(payload, 16),
      ymag: this.getInt16(payload, 18),
      zmag: this.getInt16(payload, 20),
    };
  }

  // SCALED_PRESSURE メッセージをパース
  parseScaledPressure(payload: Uint8Array): ParsedScaledPressure | null {
    if (payload.length < 14) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      pressAbs: this.getFloat32(payload, 4),
      pressDiff: this.getFloat32(payload, 8),
      temperature: this.getInt16(payload, 12),
    };
  }

  // MISSION_ITEM_REACHED メッセージをパース
  parseMissionItemReached(payload: Uint8Array): ParsedMissionItemReached | null {
    if (payload.length < 2) return null;
    return {
      seq: this.getUint16(payload, 0),
    };
  }

  // WIND メッセージをパース
  parseWind(payload: Uint8Array): ParsedWind | null {
    if (payload.length < 12) return null;
    return {
      direction: this.getFloat32(payload, 0),
      speed: this.getFloat32(payload, 4),
      speedZ: this.getFloat32(payload, 8),
    };
  }

  // RANGEFINDER メッセージをパース
  parseRangefinder(payload: Uint8Array): ParsedRangefinder | null {
    if (payload.length < 8) return null;
    return {
      distance: this.getFloat32(payload, 0),
      voltage: this.getFloat32(payload, 4),
    };
  }

  // AHRS メッセージをパース
  parseAhrs(payload: Uint8Array): ParsedAhrs | null {
    if (payload.length < 28) return null;
    return {
      omegaIx: this.getFloat32(payload, 0),
      omegaIy: this.getFloat32(payload, 4),
      omegaIz: this.getFloat32(payload, 8),
      accelWeight: this.getFloat32(payload, 12),
      renormVal: this.getFloat32(payload, 16),
      errorRp: this.getFloat32(payload, 20),
      errorYaw: this.getFloat32(payload, 24),
    };
  }

  // AHRS2 メッセージをパース
  parseAhrs2(payload: Uint8Array): ParsedAhrs2 | null {
    if (payload.length < 24) return null;
    return {
      roll: this.getFloat32(payload, 0),
      pitch: this.getFloat32(payload, 4),
      yaw: this.getFloat32(payload, 8),
      altitude: this.getFloat32(payload, 12),
      lat: this.getInt32(payload, 16),
      lng: this.getInt32(payload, 20),
    };
  }

  // AHRS3 メッセージをパース
  parseAhrs3(payload: Uint8Array): ParsedAhrs3 | null {
    if (payload.length < 40) return null;
    return {
      roll: this.getFloat32(payload, 0),
      pitch: this.getFloat32(payload, 4),
      yaw: this.getFloat32(payload, 8),
      altitude: this.getFloat32(payload, 12),
      lat: this.getInt32(payload, 16),
      lng: this.getInt32(payload, 20),
      v1: this.getFloat32(payload, 24),
      v2: this.getFloat32(payload, 28),
      v3: this.getFloat32(payload, 32),
      v4: this.getFloat32(payload, 36),
    };
  }

  // VIBRATION メッセージをパース
  parseVibration(payload: Uint8Array): ParsedVibration | null {
    if (payload.length < 32) return null;
    return {
      timeUsec: this.getUint64(payload, 0),
      vibrationX: this.getFloat32(payload, 8),
      vibrationY: this.getFloat32(payload, 12),
      vibrationZ: this.getFloat32(payload, 16),
      clipping0: this.getUint32(payload, 20),
      clipping1: this.getUint32(payload, 24),
      clipping2: this.getUint32(payload, 28),
    };
  }

  // HOME_POSITION メッセージをパース
  parseHomePosition(payload: Uint8Array): ParsedHomePosition | null {
    if (payload.length < 52) return null;
    const q: number[] = [];
    for (let i = 0; i < 4; i++) {
      q.push(this.getFloat32(payload, 24 + i * 4));
    }
    return {
      latitude: this.getInt32(payload, 0),
      longitude: this.getInt32(payload, 4),
      altitude: this.getInt32(payload, 8),
      x: this.getFloat32(payload, 12),
      y: this.getFloat32(payload, 16),
      z: this.getFloat32(payload, 20),
      q,
      approachX: this.getFloat32(payload, 40),
      approachY: this.getFloat32(payload, 44),
      approachZ: this.getFloat32(payload, 48),
    };
  }

  // POWER_STATUS メッセージをパース
  parsePowerStatus(payload: Uint8Array): ParsedPowerStatus | null {
    if (payload.length < 6) return null;
    return {
      vcc: this.getUint16(payload, 0),
      vservo: this.getUint16(payload, 2),
      flags: this.getUint16(payload, 4),
    };
  }

  // MEMINFO メッセージをパース
  parseMeminfo(payload: Uint8Array): ParsedMeminfo | null {
    if (payload.length < 4) return null;
    return {
      brkval: this.getUint16(payload, 0),
      freemem: this.getUint16(payload, 2),
    };
  }

  // HWSTATUS メッセージをパース
  parseHwStatus(payload: Uint8Array): ParsedHwStatus | null {
    if (payload.length < 3) return null;
    return {
      vcc: this.getUint16(payload, 0),
      i2cerr: payload[2],
    };
  }

  // TERRAIN_REPORT メッセージをパース
  parseTerrainReport(payload: Uint8Array): ParsedTerrainReport | null {
    if (payload.length < 22) return null;
    return {
      lat: this.getInt32(payload, 0),
      lon: this.getInt32(payload, 4),
      spacingLat: this.getUint16(payload, 8),
      spacingLon: this.getUint16(payload, 10),
      terrainHeight: this.getFloat32(payload, 12),
      currentHeight: this.getFloat32(payload, 16),
      pending: this.getUint16(payload, 20),
      loaded: this.getUint16(payload, 22),
    };
  }

  // EKF_STATUS_REPORT メッセージをパース
  parseEkfStatusReport(payload: Uint8Array): ParsedEkfStatusReport | null {
    if (payload.length < 22) return null;
    return {
      flags: this.getUint16(payload, 0),
      velocityVariance: this.getFloat32(payload, 2),
      posHorizVariance: this.getFloat32(payload, 6),
      posVertVariance: this.getFloat32(payload, 10),
      compassVariance: this.getFloat32(payload, 14),
      terrainAltVariance: this.getFloat32(payload, 18),
    };
  }

  // LOCAL_POSITION_NED メッセージをパース
  parseLocalPositionNed(payload: Uint8Array): ParsedLocalPositionNed | null {
    if (payload.length < 28) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      x: this.getFloat32(payload, 4),
      y: this.getFloat32(payload, 8),
      z: this.getFloat32(payload, 12),
      vx: this.getFloat32(payload, 16),
      vy: this.getFloat32(payload, 20),
      vz: this.getFloat32(payload, 24),
    };
  }

  // GPS_STATUS メッセージをパース
  parseGpsStatus(payload: Uint8Array): ParsedGpsStatus | null {
    if (payload.length < 101) return null;
    const satellitePrn: number[] = [];
    const satelliteUsed: number[] = [];
    const satelliteElevation: number[] = [];
    const satelliteAzimuth: number[] = [];
    const satelliteSnr: number[] = [];
    
    for (let i = 0; i < 20; i++) {
      satellitePrn.push(payload[1 + i]);
      satelliteUsed.push(payload[21 + i]);
      satelliteElevation.push(payload[41 + i]);
      satelliteAzimuth.push(payload[61 + i]);
      satelliteSnr.push(payload[81 + i]);
    }
    
    return {
      satellitesVisible: payload[0],
      satellitePrn,
      satelliteUsed,
      satelliteElevation,
      satelliteAzimuth,
      satelliteSnr,
    };
  }

  // GPS2_RAW メッセージをパース
  parseGps2Raw(payload: Uint8Array): ParsedGps2Raw | null {
    if (payload.length < 35) return null;
    return {
      timeUsec: this.getUint64(payload, 0),
      fixType: payload[28],
      lat: this.getInt32(payload, 8),
      lon: this.getInt32(payload, 12),
      alt: this.getInt32(payload, 16),
      eph: this.getUint16(payload, 20),
      epv: this.getUint16(payload, 22),
      vel: this.getUint16(payload, 24),
      cog: this.getUint16(payload, 26),
      satellitesVisible: payload[29],
      dgpsNumch: payload[30],
      dgpsAge: this.getUint32(payload, 31),
    };
  }

  // SCALED_IMU2 メッセージをパース
  parseScaledImu2(payload: Uint8Array): ParsedScaledImu2 | null {
    if (payload.length < 22) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      xacc: this.getInt16(payload, 4),
      yacc: this.getInt16(payload, 6),
      zacc: this.getInt16(payload, 8),
      xgyro: this.getInt16(payload, 10),
      ygyro: this.getInt16(payload, 12),
      zgyro: this.getInt16(payload, 14),
      xmag: this.getInt16(payload, 16),
      ymag: this.getInt16(payload, 18),
      zmag: this.getInt16(payload, 20),
    };
  }

  // SCALED_IMU3 メッセージをパース
  parseScaledImu3(payload: Uint8Array): ParsedScaledImu3 | null {
    if (payload.length < 22) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      xacc: this.getInt16(payload, 4),
      yacc: this.getInt16(payload, 6),
      zacc: this.getInt16(payload, 8),
      xgyro: this.getInt16(payload, 10),
      ygyro: this.getInt16(payload, 12),
      zgyro: this.getInt16(payload, 14),
      xmag: this.getInt16(payload, 16),
      ymag: this.getInt16(payload, 18),
      zmag: this.getInt16(payload, 20),
    };
  }

  // RAW_IMU メッセージをパース
  parseRawImu(payload: Uint8Array): ParsedRawImu | null {
    if (payload.length < 26) return null;
    return {
      timeUsec: this.getUint64(payload, 0),
      xacc: this.getInt16(payload, 8),
      yacc: this.getInt16(payload, 10),
      zacc: this.getInt16(payload, 12),
      xgyro: this.getInt16(payload, 14),
      ygyro: this.getInt16(payload, 16),
      zgyro: this.getInt16(payload, 18),
      xmag: this.getInt16(payload, 20),
      ymag: this.getInt16(payload, 22),
      zmag: this.getInt16(payload, 24),
    };
  }

  // RAW_PRESSURE メッセージをパース
  parseRawPressure(payload: Uint8Array): ParsedRawPressure | null {
    if (payload.length < 16) return null;
    return {
      timeUsec: this.getUint64(payload, 0),
      pressAbs: this.getInt16(payload, 8),
      pressDiff1: this.getInt16(payload, 10),
      pressDiff2: this.getInt16(payload, 12),
      temperature: this.getInt16(payload, 14),
    };
  }

  // ALTITUDE メッセージをパース
  parseAltitude(payload: Uint8Array): ParsedAltitude | null {
    if (payload.length < 32) return null;
    return {
      timeUsec: this.getUint64(payload, 0),
      altitudeMonotonic: this.getFloat32(payload, 8),
      altitudeAmsl: this.getFloat32(payload, 12),
      altitudeLocal: this.getFloat32(payload, 16),
      altitudeRelative: this.getFloat32(payload, 20),
      altitudeTerrain: this.getFloat32(payload, 24),
      bottomClearance: this.getFloat32(payload, 28),
    };
  }

  // ATTITUDE_QUATERNION メッセージをパース
  parseAttitudeQuaternion(payload: Uint8Array): ParsedAttitudeQuaternion | null {
    if (payload.length < 32) return null;
    return {
      timeBootMs: this.getUint32(payload, 0),
      q1: this.getFloat32(payload, 4),
      q2: this.getFloat32(payload, 8),
      q3: this.getFloat32(payload, 12),
      q4: this.getFloat32(payload, 16),
      rollspeed: this.getFloat32(payload, 20),
      pitchspeed: this.getFloat32(payload, 24),
      yawspeed: this.getFloat32(payload, 28),
    };
  }

  // AIRSPEED_AUTOCAL メッセージをパース (ArduPilot固有)
  parseAirspeedAutocal(payload: Uint8Array): ParsedAirspeedAutocal | null {
    if (payload.length < 48) return null;
    return {
      vx: this.getFloat32(payload, 0),
      vy: this.getFloat32(payload, 4),
      vz: this.getFloat32(payload, 8),
      diffPressure: this.getFloat32(payload, 12),
      EAS2TAS: this.getFloat32(payload, 16),
      ratio: this.getFloat32(payload, 20),
      stateX: this.getFloat32(payload, 24),
      stateY: this.getFloat32(payload, 28),
      stateZ: this.getFloat32(payload, 32),
      Pax: this.getFloat32(payload, 36),
      Pby: this.getFloat32(payload, 40),
      Pcz: this.getFloat32(payload, 44),
    };
  }

  // AOA_SSA メッセージをパース (ArduPilot固有)
  parseAoaSsa(payload: Uint8Array): ParsedAoaSsa | null {
    if (payload.length < 16) return null;
    return {
      timeUsec: this.getUint64(payload, 0),
      AOA: this.getFloat32(payload, 8),
      SSA: this.getFloat32(payload, 12),
    };
  }

  // AIRSPEED メッセージをパース (ID: 295)
  parseAirspeed(payload: Uint8Array): ParsedAirspeed | null {
    if (payload.length < 14) return null;
    return {
      id: payload[0],
      airspeed: this.getFloat32(payload, 1),
      temperature: this.getInt16(payload, 5) / 100.0, // centi-degrees to degrees
      rawPress: this.getFloat32(payload, 7),
      flags: payload[11],
    };
  }

  // STATUSTEXT メッセージをパース
  parseStatusText(payload: Uint8Array): ParsedStatusText | null {
    if (payload.length < 51) return null;
    
    // 文字列を抽出（null終端）
    let text = '';
    for (let i = 1; i < 51 && payload[i] !== 0; i++) {
      text += String.fromCharCode(payload[i]);
    }
    
    const result: ParsedStatusText = {
      severity: payload[0],
      text: text.trim(),
    };
    
    // MAVLink v2フィールド
    if (payload.length >= 54) {
      result.id = this.getUint16(payload, 51);
      result.chunkSeq = payload[53];
    }
    
    return result;
  }

  // PARAM_VALUE メッセージをパース
  parseParamValue(payload: Uint8Array): ParsedParamValue | null {
    if (payload.length < 25) return null;
    
    // パラメータIDを抽出（null終端）
    let paramId = '';
    for (let i = 8; i < 24 && payload[i] !== 0; i++) {
      paramId += String.fromCharCode(payload[i]);
    }
    
    return {
      paramValue: this.getFloat32(payload, 0),
      paramCount: this.getUint16(payload, 4),
      paramIndex: this.getUint16(payload, 6),
      paramId: paramId.trim(),
      paramType: payload[24],
    };
  }

  // COMMAND_ACK メッセージをパース
  parseCommandAck(payload: Uint8Array): ParsedCommandAck | null {
    if (payload.length < 3) return null;
    
    const result: ParsedCommandAck = {
      command: this.getUint16(payload, 0),
      result: payload[2],
    };
    
    // MAVLink v2フィールド
    if (payload.length >= 10) {
      result.progress = payload[3];
      result.resultParam2 = this.getInt32(payload, 4);
      result.targetSystem = payload[8];
      result.targetComponent = payload[9];
    }
    
    return result;
  }

  // AUTOPILOT_VERSION メッセージをパース
  parseAutopilotVersion(payload: Uint8Array): ParsedAutopilotVersion | null {
    if (payload.length < 60) return null;
    
    const flightCustomVersion: number[] = [];
    const middlewareCustomVersion: number[] = [];
    const osCustomVersion: number[] = [];
    
    // カスタムバージョン配列を読み取り
    for (let i = 0; i < 8; i++) {
      flightCustomVersion.push(payload[12 + i]);
      middlewareCustomVersion.push(payload[20 + i]);
      osCustomVersion.push(payload[28 + i]);
    }
    
    return {
      capabilities: this.getUint64(payload, 0),
      flightSwVersion: this.getUint32(payload, 8),
      middlewareSwVersion: this.getUint32(payload, 36),
      osSwVersion: this.getUint32(payload, 40),
      boardVersion: this.getUint32(payload, 44),
      flightCustomVersion,
      middlewareCustomVersion,
      osCustomVersion,
      vendorId: this.getUint16(payload, 48),
      productId: this.getUint16(payload, 50),
      uid: this.getUint64(payload, 52),
    };
  }

  // TIMESYNC メッセージをパース
  parseTimesync(payload: Uint8Array): ParsedTimesync | null {
    if (payload.length < 16) return null;
    return {
      tc1: this.getInt64(payload, 0),
      ts1: this.getInt64(payload, 8),
    };
  }

  // 汎用的なペイロードダンプ関数
  dumpPayload(msgId: number, payload: Uint8Array): { [key: string]: any } {
    const dump: { [key: string]: any } = {
      msgId: msgId,
      payloadLength: payload.length,
      hex: Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join(' '),
    };
    
    // バイト単位の値
    for (let i = 0; i < Math.min(payload.length, 64); i++) {
      dump[`byte_${i}`] = payload[i];
    }
    
    // 各種型での解釈を試みる（最初の数バイト）
    if (payload.length >= 4) {
      dump.uint32_0 = this.getUint32(payload, 0);
      dump.int32_0 = this.getInt32(payload, 0);
      dump.float32_0 = this.getFloat32(payload, 0);
    }
    if (payload.length >= 8) {
      dump.uint32_4 = this.getUint32(payload, 4);
      dump.int32_4 = this.getInt32(payload, 4);
      dump.float32_4 = this.getFloat32(payload, 4);
    }
    
    return dump;
  }

  // リトルエンディアンのヘルパー関数
  private getUint8(buffer: Uint8Array, offset: number): number {
    if (offset >= buffer.length) return 0;
    return buffer[offset];
  }

  private getInt8(buffer: Uint8Array, offset: number): number {
    const val = this.getUint8(buffer, offset);
    return val > 127 ? val - 256 : val;
  }

  private getUint16(buffer: Uint8Array, offset: number): number {
    if (offset + 2 > buffer.length) return 0;
    return buffer[offset] | (buffer[offset + 1] << 8);
  }

  private getInt16(buffer: Uint8Array, offset: number): number {
    const val = this.getUint16(buffer, offset);
    return val > 32767 ? val - 65536 : val;
  }

  private getUint32(buffer: Uint8Array, offset: number): number {
    if (offset + 4 > buffer.length) return 0;
    return (
      buffer[offset] |
      (buffer[offset + 1] << 8) |
      (buffer[offset + 2] << 16) |
      (buffer[offset + 3] << 24)
    ) >>> 0;
  }

  private getInt32(buffer: Uint8Array, offset: number): number {
    if (offset + 4 > buffer.length) return 0;
    const value = (
      buffer[offset] |
      (buffer[offset + 1] << 8) |
      (buffer[offset + 2] << 16) |
      (buffer[offset + 3] << 24)
    );
    // 符号付き32ビット整数として扱う
    return value | 0;
  }

  private getUint64(buffer: Uint8Array, offset: number): number {
    // JavaScriptの数値制限のため、下位32ビットのみ返す
    return this.getUint32(buffer, offset);
  }

  private getInt64(buffer: Uint8Array, offset: number): number {
    // JavaScriptの数値制限のため、下位32ビットのみ返す（符号付き）
    return this.getInt32(buffer, offset);
  }

  private getFloat32(buffer: Uint8Array, offset: number): number {
    if (offset + 4 > buffer.length) return 0;
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
    return view.getFloat32(0, true); // true = little endian
  }
}