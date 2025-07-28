/**
 * Mado Sensor Service
 * WebSocket経由でAWS IoT CoreからMadoセンサーのリアルタイムデータを取得
 */

import { v4 as uuidv4 } from 'uuid';
import { fetchAuthSession } from 'aws-amplify/auth';
import mqtt from 'mqtt';

/**
 * Madoセンサーデータの型定義
 */
export interface MadoSensorData {
  device_id: string;
  timestamp: string;
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  data: {
    temperature: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_direction: number;
    rain_1h: number;
    illuminance: number;
    visibility: number;
    feels_like: number;
  };
  metadata: {
    sensor_model: string;
    firmware_version: string;
    conversion: string;
  };
}

/**
 * 接続設定
 */
interface MadoConnectionConfig {
  endpoint: string;
  region: string;
  clientId?: string;
  reconnectTimeoutMs?: number;
}

/**
 * コールバック型定義
 */
type DataCallback = (data: MadoSensorData) => void;
type StatusCallback = (status: 'connected' | 'disconnected' | 'error', error?: Error) => void;

/**
 * MadoSensorService クラス
 * AWS IoT Core経由でMadoセンサーデータを購読
 */
export class MadoSensorService {
  private client?: mqtt.MqttClient;
  private config: MadoConnectionConfig;
  private dataCallbacks: Map<string, DataCallback[]> = new Map();
  private statusCallbacks: StatusCallback[] = [];
  private isConnected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config: MadoConnectionConfig) {
    this.config = {
      ...config,
      clientId: config.clientId || `centra-web-${uuidv4()}`,
      reconnectTimeoutMs: config.reconnectTimeoutMs || 5000
    };
  }

  /**
   * AWS IoT Coreに接続
   */
  async connect(): Promise<void> {
    try {
      // Cognito認証情報を取得
      const session = await fetchAuthSession();
      if (!session.credentials) {
        throw new Error('Cognito認証情報が取得できません');
      }

      // SigV4署名付きWebSocket URLを生成
      const url = await this.createPresignedUrl(
        session.credentials.accessKeyId,
        session.credentials.secretAccessKey,
        session.credentials.sessionToken
      );

      // MQTT over WebSocketで接続
      this.client = mqtt.connect(url, {
        clientId: this.config.clientId,
        keepalive: 60,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        rejectUnauthorized: true
      });

      // 接続イベントハンドラ
      this.client.on('connect', () => {
        this.isConnected = true;
        this.notifyStatusChange('connected');
      });

      this.client.on('error', (error) => {
        this.notifyStatusChange('error', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.notifyStatusChange('disconnected');
      });

      // メッセージハンドラ
      this.client.on('message', (topic, payload) => {
        try {
          const message = JSON.parse(payload.toString());
          this.handleMessage(topic, message);
        } catch (error) {
          // メッセージパースエラー
        }
      });

      // 接続完了を待つ
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('接続タイムアウト'));
        }, 30000);

        this.client!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * デバイスのセンサーデータを購読
   */
  async subscribeToDevice(deviceId: string, callback: DataCallback): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('IoT Core未接続');
    }

    const topic = `mado/centra/${deviceId}/telemetry`;
    
    // コールバックを登録
    if (!this.dataCallbacks.has(topic)) {
      this.dataCallbacks.set(topic, []);
    }
    this.dataCallbacks.get(topic)!.push(callback);

    // トピックを購読
    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        throw error;
      }
    });
  }

  /**
   * デバイスの購読解除
   */
  async unsubscribeFromDevice(deviceId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      return;
    }

    const topic = `mado/centra/${deviceId}/telemetry`;
    this.dataCallbacks.delete(topic);
    
    this.client.unsubscribe(topic);
  }

  /**
   * 接続状態の変更を購読
   */
  onStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * 切断
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.client) {
      this.client.end();
      this.client = undefined;
    }

    this.dataCallbacks.clear();
    this.statusCallbacks = [];
    this.isConnected = false;
  }

  /**
   * メッセージハンドラ
   */
  private handleMessage(topic: string, message: any): void {
    const callbacks = this.dataCallbacks.get(topic) || [];
    
    // Madoセンサーデータの形式に変換
    const sensorData: MadoSensorData = message as MadoSensorData;
    
    callbacks.forEach(callback => {
      try {
        callback(sensorData);
      } catch (error) {
        // コールバックエラー: error
      }
    });
  }

  /**
   * 接続状態変更通知
   */
  private notifyStatusChange(status: 'connected' | 'disconnected' | 'error', error?: Error): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status, error);
      } catch (err) {
        // ステータスコールバックエラー: err
      }
    });
  }

  /**
   * SigV4署名付きWebSocket URLを生成
   */
  private async createPresignedUrl(
    accessKeyId: string,
    secretAccessKey: string,
    sessionToken?: string
  ): Promise<string> {
    const host = this.config.endpoint;
    const region = this.config.region;
    const service = 'iotdevicegateway';
    const algorithm = 'AWS4-HMAC-SHA256';
    
    // 現在時刻
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';
    
    // Canonical request
    const method = 'GET';
    const canonicalUri = '/mqtt';
    const canonicalQuerystring = 
      `X-Amz-Algorithm=${algorithm}&` +
      `X-Amz-Credential=${encodeURIComponent(accessKeyId + '/' + dateStamp + '/' + region + '/' + service + '/aws4_request')}&` +
      `X-Amz-Date=${amzDate}&` +
      `X-Amz-SignedHeaders=host`;
    
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = await this.sha256('');
    
    const canonicalRequest = 
      method + '\n' +
      canonicalUri + '\n' +
      canonicalQuerystring + '\n' +
      canonicalHeaders + '\n' +
      signedHeaders + '\n' +
      payloadHash;
    
    // String to sign
    const credentialScope = dateStamp + '/' + region + '/' + service + '/aws4_request';
    const stringToSign = 
      algorithm + '\n' +
      amzDate + '\n' +
      credentialScope + '\n' +
      await this.sha256(canonicalRequest);
    
    // Calculate signature
    const signingKey = await this.getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = await this.hmac(signingKey, stringToSign, 'hex');
    
    // Build URL
    let url = `wss://${host}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
    
    if (sessionToken) {
      url += `&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}`;
    }
    
    return url;
  }

  private async sha256(data: string): Promise<string> {
    const crypto = window.crypto || (window as any).msCrypto;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hash = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async hmac(key: ArrayBuffer | string, data: string, encoding?: 'hex'): Promise<string | ArrayBuffer> {
    const crypto = window.crypto || (window as any).msCrypto;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const keyBuffer = typeof key === 'string' ? encoder.encode(key) : key;
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    
    if (encoding === 'hex') {
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    return signature;
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const kDate = await this.hmac(encoder.encode('AWS4' + key), dateStamp);
    const kRegion = await this.hmac(kDate as ArrayBuffer, regionName);
    const kService = await this.hmac(kRegion as ArrayBuffer, serviceName);
    const kSigning = await this.hmac(kService as ArrayBuffer, 'aws4_request');
    return kSigning as ArrayBuffer;
  }

  /**
   * 接続状態を取得
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// シングルトンインスタンス
let instance: MadoSensorService | null = null;

/**
 * MadoSensorServiceのシングルトンインスタンスを取得
 */
export function getMadoSensorService(): MadoSensorService {
  if (!instance) {
    const endpoint = process.env.REACT_APP_IOT_ENDPOINT;
    const region = process.env.REACT_APP_AWS_REGION || 'ap-northeast-1';
    
    if (!endpoint) {
      throw new Error('REACT_APP_IOT_ENDPOINT環境変数が設定されていません');
    }

    instance = new MadoSensorService({
      endpoint,
      region
    });
  }
  
  return instance;
}