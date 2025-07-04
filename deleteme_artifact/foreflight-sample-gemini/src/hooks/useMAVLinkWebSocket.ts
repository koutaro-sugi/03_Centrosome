// MAVLink WebSocket Hook

import { useState, useEffect, useRef, useCallback } from 'react';
import { MAVLinkParser } from '../utils/mavlinkParser';
import { 
  TelemetryData, 
  MAVLinkMessageType,
  MAVLinkFlightMode,
  MAVLinkBaseMode,
} from '../types/mavlink';

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
              
              switch (message.header.msgid) {
            case MAVLinkMessageType.HEARTBEAT: {
              const heartbeat = parser.current.parseHeartbeat(message.payload);
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
              const hud = parser.current.parseVfrHud(message.payload);
              if (hud) {
                setTelemetry(prev => ({
                  ...prev,
                  airSpeed: hud.airspeed,
                  groundSpeed: hud.groundspeed,
                  heading: hud.heading,
                  throttle: hud.throttle,
                  alt: hud.alt,
                  verticalSpeed: hud.climb,
                }));
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
    connect,
    disconnect,
  };
};