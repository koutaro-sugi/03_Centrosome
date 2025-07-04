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
} from '../types/mavlink';

// MAVLinkマジックバイト
const MAVLINK_V1_MAGIC = 0xFE;
const MAVLINK_V2_MAGIC = 0xFD;

export class MAVLinkParser {
  private buffer: Uint8Array = new Uint8Array(0);
  private messages: MAVLinkMessage[] = [];

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
    // マジックバイトを探す
    let startIndex = -1;
    let isV2 = false;
    
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === MAVLINK_V1_MAGIC || this.buffer[i] === MAVLINK_V2_MAGIC) {
        startIndex = i;
        isV2 = this.buffer[i] === MAVLINK_V2_MAGIC;
        break;
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
    return {
      type: payload[0],
      autopilot: payload[1],
      baseMode: payload[2],
      customMode: this.getUint32(payload, 3),
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
    // VFR_HUDメッセージは最低20バイト必要
    if (payload.length < 20) {
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

  // リトルエンディアンのヘルパー関数
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

  private getFloat32(buffer: Uint8Array, offset: number): number {
    if (offset + 4 > buffer.length) return 0;
    const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 4);
    return view.getFloat32(0, true); // true = little endian
  }
}