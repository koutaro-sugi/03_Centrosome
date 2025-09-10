/**
 * Mado Sensor Service (AWS IoT Device SDK v2 / CRT)
 * Browser向けにWebSocket + SigV4で接続
 */

import { v4 as uuidv4 } from 'uuid';
import { fetchAuthSession } from 'aws-amplify/auth';
import { mqtt, iot, auth, io } from 'aws-iot-device-sdk-v2';

export interface MadoSensorData {
  device_id: string;
  timestamp: string;
  location?: { name?: string; lat?: number; lon?: number };
  data: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    wind_speed?: number;
    wind_direction?: number;
    rain_1h?: number;
    illuminance?: number;
    visibility?: number;
    feels_like?: number;
  };
  metadata?: Record<string, any>;
}

interface MadoConnectionConfig {
  endpoint: string; // host only
  region: string;
  clientId?: string;
}

type DataCallback = (data: MadoSensorData) => void;
type StatusCallback = (status: 'connected' | 'disconnected' | 'error' | 'reconnecting', error?: Error) => void;

export class MadoSensorServiceCrt {
  private connection?: mqtt.MqttClientConnection;
  private config: MadoConnectionConfig;
  private dataCallbacks: Map<string, DataCallback[]> = new Map();
  private statusCallbacks: StatusCallback[] = [];
  private connected = false;

  constructor(config: MadoConnectionConfig) {
    // host正規化
    const host = (config.endpoint || '')
      .replace(/^\s*/, '')
      .replace(/^https?:\/\//i, '')
      .replace(/^wss?:\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();
    this.config = {
      ...config,
      endpoint: host,
      clientId: config.clientId || `centra-web-${uuidv4()}`,
    };
  }

  onStatusChange(cb: StatusCallback) {
    this.statusCallbacks.push(cb);
  }

  private notify(status: 'connected' | 'disconnected' | 'error' | 'reconnecting', err?: Error) {
    this.statusCallbacks.forEach((cb) => {
      try { cb(status, err); } catch {}
    });
  }

  async connect(): Promise<void> {
    const debug = process.env.REACT_APP_DEBUG_MQTT === 'true';
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      if (!session.credentials) throw new Error('Cognito一時クレデンシャルなし');

      const creds = auth.AwsCredentials.new(session.credentials.accessKeyId, session.credentials.secretAccessKey, session.credentials.sessionToken);
      const provider = auth.AwsCredentialsProvider.newStatic(creds);

      const builder = iot.AwsIotMqttConnectionConfigBuilder.new_with_websockets({
        region: this.config.region,
        credentials_provider: provider,
      });
      builder.with_client_id(this.config.clientId!);
      builder.with_clean_session(true);
      builder.with_keep_alive_seconds(60);
      builder.with_endpoint(this.config.endpoint);

      const config = builder.build();
      const client = new mqtt.MqttClient(new io.ClientBootstrap());
      this.connection = client.new_connection(config);

      this.connection.on('connect', () => {
        this.connected = true;
        if (debug) console.log('[CRT] connected');
        this.notify('connected');
      });
      this.connection.on('disconnect', () => {
        this.connected = false;
        if (debug) console.warn('[CRT] disconnected');
        this.notify('disconnected');
      });
      this.connection.on('error', (e) => {
        if (debug) console.error('[CRT] error', e);
        this.notify('error', e as any);
      });

      await this.connection.connect();
    } catch (e) {
      this.notify('error', e as Error);
      throw e;
    }
  }

  async subscribeToDevice(deviceId: string, cb: DataCallback): Promise<void> {
    if (!this.connection || !this.connected) throw new Error('IoT Core未接続');
    const topic = `mado/centra/${deviceId}/telemetry`;
    if (!this.dataCallbacks.has(topic)) this.dataCallbacks.set(topic, []);
    this.dataCallbacks.get(topic)!.push(cb);

    await this.connection.subscribe(topic, mqtt.QoS.AtLeastOnce, (t, payload) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload)) as MadoSensorData;
        this.dataCallbacks.get(topic)?.forEach((fn) => fn(data));
      } catch {}
    });
  }

  async unsubscribeFromDevice(deviceId: string): Promise<void> {
    if (!this.connection) return;
    const topic = `mado/centra/${deviceId}/telemetry`;
    try { await this.connection.unsubscribe(topic); } catch {}
    this.dataCallbacks.delete(topic);
  }

  async disconnect(): Promise<void> {
    try { await this.connection?.disconnect(); } catch {}
    this.connection = undefined;
    this.dataCallbacks.clear();
    this.connected = false;
    this.statusCallbacks = [];
  }

  getConnectionStatus(): boolean { return this.connected; }
}

