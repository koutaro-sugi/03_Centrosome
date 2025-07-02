import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  Chip,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import {
  CenterFocusWeak,
  RotateLeft,
  RotateRight,
  Home,
  RadioButtonChecked,
  ZoomIn,
  ZoomOut,
  FlightTakeoff,
  FlightLand,
  Add,
  Remove,
} from '@mui/icons-material';
import VirtualJoystick from './VirtualJoystick';
import './GimbalControlWidget.css';

interface GimbalControlWidgetProps {
  id: string;
  title: string;
  isEditMode: boolean;
}

// Gimbal state definition
interface GimbalState {
  yaw: number; // -120 to +120 degrees
  pitch: number; // -90 to +25 degrees
  zoom: number; // 1x to 30x
}

// Connection state definition
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastCommand: string | null;
  responseTime: number;
}

// Control input type
type ControlSource = 'slider' | 'joystick' | 'preset' | 'button';

// MAVLink command definition
interface GimbalCommand {
  yaw?: number;
  pitch?: number;
  zoom?: number;
  yawRate?: number;
  pitchRate?: number;
  controlMode?: 'absolute' | 'rate';
  source: ControlSource;
}

// MAVLink constants
const MAV_GIMBAL_MANAGER_FLAGS = {
  RETRACT: 1,
  NEUTRAL: 2,
  ROLL_LOCK: 4,
  PITCH_LOCK: 8,
  YAW_LOCK: 16,
  YAW_IN_VEHICLE_FRAME: 32,
  YAW_IN_EARTH_FRAME: 64,
  ACCEPTS_YAW_IN_EARTH_FRAME: 128,
  CAN_ACCEPT_YAW_IN_EARTH_FRAME: 256,
} as const;

const GimbalControlWidget: React.FC<GimbalControlWidgetProps> = ({
  id,
  title,
  isEditMode,
}) => {
  // === Basic state management ===
  const [gimbalState, setGimbalState] = useState<GimbalState>({
    yaw: 0,
    pitch: 0,
    zoom: 1,
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    lastCommand: null,
    responseTime: 0,
  });

  // === Control state management (MAVLink v2 unified) ===
  const [isSimulationMode, setIsSimulationMode] = useState(true);
  const [isControlling, setIsControlling] = useState(false);

  // Record the last manually operated axis (prevent telemetry conflicts)
  const lastManualControl = useRef<{
    yaw: number;
    pitch: number;
    zoom: number;
  }>({ yaw: 0, pitch: 0, zoom: 0 });

  // Timer references
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const commandThrottleRef = useRef<NodeJS.Timeout | null>(null);

  // MAVLink v2 sequence number management
  const mavlinkSequence = useRef<number>(0);

  // Anti-flicker: slider operation flag
  const isSliderActive = useRef<{
    yaw: boolean;
    pitch: boolean;
    zoom: boolean;
  }>({ yaw: false, pitch: false, zoom: false });

  // Rendering optimization: maintain previous values
  const prevGimbalState = useRef<GimbalState>(gimbalState);

  // === MAVLink v2 unified command transmission function ===
  const sendGimbalCommand = useCallback(
    async (command: GimbalCommand): Promise<void> => {
      if (connectionState.status !== 'connected') {
        console.warn(`[Gimbal] Skipping command due to disconnected state`);
        return;
      }

      // Don't set isControlling during slider operation (anti-flicker)
      if (command.source !== 'slider') {
        setIsControlling(true);
      }
      const startTime = Date.now();

      try {
        // Unified with MAVLink v2 protocol
        const mavlinkMessage = buildMAVLinkMessage(command);
        const commandText = formatCommandText(command);

        if (isSimulationMode) {
          // Simulation mode: Local processing in MAVLink v2 format
          await new Promise((resolve) =>
            setTimeout(resolve, 20 + Math.random() * 30)
          );

          const responseTime = Date.now() - startTime;

          setConnectionState((prev) => ({
            ...prev,
            lastCommand: `[MAVv2-SIM] ${commandText}`,
            responseTime,
          }));

          console.log(`[Gimbal] MAVLink v2 Simulation:`, mavlinkMessage);

          // Send custom event for animation widget
          const animationCommand = {
            ...command,
            timestamp: Date.now(),
          };
          window.dispatchEvent(
            new CustomEvent('mavlink-gimbal-command', {
              detail: animationCommand,
            })
          );
        } else {
          // 実際のMAVLink v2通信
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

          const response = await fetch(
            `${apiBaseUrl}/api/gimbal/manual-control`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-MAVLink-Version': '2.0',
              },
              body: JSON.stringify(mavlinkMessage),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          const responseTime = Date.now() - startTime;

          setConnectionState((prev) => ({
            ...prev,
            lastCommand: `[MAVv2] ${commandText}`,
            responseTime,
          }));

          console.log(`[Gimbal] MAVLink v2 Send Success:`, result);

          // Send custom event for animation widget
          const animationCommand = {
            ...command,
            timestamp: Date.now(),
          };
          window.dispatchEvent(
            new CustomEvent('mavlink-gimbal-command', {
              detail: animationCommand,
            })
          );
        }

        // Record last operation time for manual operations
        if (command.source !== 'joystick') {
          const now = Date.now();
          if (command.yaw !== undefined) lastManualControl.current.yaw = now;
          if (command.pitch !== undefined)
            lastManualControl.current.pitch = now;
          if (command.zoom !== undefined) lastManualControl.current.zoom = now;
        }
      } catch (error) {
        console.error('[Gimbal] MAVLink v2 Send Error:', error);
        setConnectionState((prev) => ({
          ...prev,
          status: 'error',
          lastCommand: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));
      } finally {
        // No need to clear control state for slider operations as it's not set (anti-flicker)
        if (command.source !== 'slider') {
          // Clear control state after short time for non-slider operations only
          setTimeout(() => setIsControlling(false), 50);
        }
        // Do nothing for sliders (as isControlling is not set)
      }
    },
    [connectionState.status, isSimulationMode]
  );

  // === ヘルパー関数 ===
  const formatCommandText = (command: GimbalCommand): string => {
    const parts = [];
    if (command.yaw !== undefined)
      parts.push(`YAW: ${command.yaw.toFixed(1)}°`);
    if (command.pitch !== undefined)
      parts.push(`PITCH: ${command.pitch.toFixed(1)}°`);
    if (command.zoom !== undefined)
      parts.push(`ZOOM: ${command.zoom.toFixed(1)}x`);
    if (command.yawRate !== undefined)
      parts.push(`YAW_RATE: ${(command.yawRate * 100).toFixed(1)}%`);
    if (command.pitchRate !== undefined)
      parts.push(`PITCH_RATE: ${(command.pitchRate * 100).toFixed(1)}%`);
    return parts.join(', ');
  };

  const buildMAVLinkMessage = (command: GimbalCommand) => {
    // MAVLink v2シーケンス番号をインクリメント
    mavlinkSequence.current = (mavlinkSequence.current + 1) % 256;

    const base = {
      // MAVLink v2ヘッダー情報
      protocol_version: 2,
      sequence: mavlinkSequence.current,
      system_id: 255, // GCS (Ground Control Station)
      component_id: 190, // MAV_COMP_ID_MISSIONPLANNER
      message_id: 288, // GIMBAL_MANAGER_SET_MANUAL_CONTROL

      // GIMBAL_MANAGER_SET_MANUAL_CONTROL ペイロード
      target_system: 1,
      target_component: 154, // SIYI ZR30 gimbal component
      flags:
        MAV_GIMBAL_MANAGER_FLAGS.YAW_LOCK | MAV_GIMBAL_MANAGER_FLAGS.PITCH_LOCK,

      // 制御ソース識別
      control_source: command.source,
      timestamp_us: Date.now() * 1000, // マイクロ秒
    };

    if (command.controlMode === 'rate') {
      // レート制御（ジョイスティック）
      return {
        ...base,
        pitch: NaN,
        yaw: NaN,
        pitch_rate: command.pitchRate || 0.0,
        yaw_rate: command.yawRate || 0.0,
        zoom_value: command.zoom || NaN,
        control_mode: 'RATE',
      };
    } else {
      // Absolute control (slider, preset, button)
      return {
        ...base,
        pitch:
          command.pitch !== undefined ? (command.pitch * Math.PI) / 180 : NaN, // ラジアン変換
        yaw: command.yaw !== undefined ? (command.yaw * Math.PI) / 180 : NaN, // ラジアン変換
        pitch_rate: NaN,
        yaw_rate: NaN,
        zoom_value: command.zoom || NaN,
        control_mode: 'ABSOLUTE',
      };
    }
  };

  // === Slider control (optimized to prevent flickering) ===
  const handleSliderChange = useCallback(
    (axis: 'yaw' | 'pitch' | 'zoom', value: number) => {
      // Skip update if value change is small (prevent flickering)
      const currentValue = gimbalState[axis];
      const threshold = axis === 'zoom' ? 0.05 : 0.5; // ズームは0.05、角度は0.5度の閾値

      if (Math.abs(value - currentValue) < threshold) {
        return;
      }

      // スライダー操作中フラグを設定
      isSliderActive.current[axis] = true;

      // 状態を即座に更新
      setGimbalState((prev) => ({ ...prev, [axis]: value }));

      // 手動操作時刻を記録（テレメトリ競合防止）
      lastManualControl.current[axis] = Date.now();

      // スロットル付きでコマンド送信
      if (commandThrottleRef.current) {
        clearTimeout(commandThrottleRef.current);
      }

      commandThrottleRef.current = setTimeout(() => {
        sendGimbalCommand({
          [axis]: value,
          controlMode: 'absolute',
          source: 'slider',
        });

        // コマンド送信後、少し遅延してスライダーフラグを解除
        setTimeout(() => {
          isSliderActive.current[axis] = false;
        }, 100);
      }, 30); // 30ms スロットル（応答性向上）

      console.log(`[Gimbal] Slider Control - ${axis}: ${value}`);
    },
    [gimbalState, sendGimbalCommand]
  );

  // === ジョイスティック制御 ===
  const handleJoystickMove = useCallback(
    (yawRate: number, pitchRate: number) => {
      // Send command only when value is non-zero
      if (yawRate !== 0 || pitchRate !== 0) {
        sendGimbalCommand({
          yawRate,
          pitchRate,
          controlMode: 'rate',
          source: 'joystick',
        });
      }
    },
    [sendGimbalCommand]
  );

  // === Button & Preset control ===
  const adjustValue = useCallback(
    (axis: 'yaw' | 'pitch' | 'zoom', increment: number) => {
      const ranges = {
        yaw: { min: -120, max: 120 },
        pitch: { min: -90, max: 25 },
        zoom: { min: 1, max: 30 },
      };

      const newValue = Math.max(
        ranges[axis].min,
        Math.min(ranges[axis].max, gimbalState[axis] + increment)
      );

      setGimbalState((prev) => ({ ...prev, [axis]: newValue }));
      sendGimbalCommand({
        [axis]: newValue,
        controlMode: 'absolute',
        source: 'button',
      });

      console.log(
        `[Gimbal] Button Control - ${axis}: ${newValue} (${increment > 0 ? '+' : ''}${increment})`
      );
    },
    [gimbalState, sendGimbalCommand]
  );

  const handlePresetPosition = useCallback(
    (preset: { yaw?: number; pitch?: number; zoom?: number }) => {
      const newState = { ...gimbalState, ...preset };
      setGimbalState(newState);
      sendGimbalCommand({
        ...preset,
        controlMode: 'absolute',
        source: 'preset',
      });

      console.log(`[Gimbal] Preset Control:`, preset);
    },
    [gimbalState, sendGimbalCommand]
  );

  // === MAVLink v2テレメトリ監視 ===
  const startStatusMonitoring = useCallback(() => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
    }

    statusIntervalRef.current = setInterval(async () => {
      if (connectionState.status !== 'connected') return;

      try {
        if (isSimulationMode) {
          // シミュレーションモード：MAVLink v2形式でランダム変化
          const now = Date.now();
          const shouldUpdate = {
            yaw:
              now - lastManualControl.current.yaw > 2000 &&
              !isSliderActive.current.yaw,
            pitch:
              now - lastManualControl.current.pitch > 2000 &&
              !isSliderActive.current.pitch,
            zoom:
              now - lastManualControl.current.zoom > 2000 &&
              !isSliderActive.current.zoom,
          };

          // Update only axes with significant changes (prevent flickering)
          if (shouldUpdate.yaw || shouldUpdate.pitch) {
            const updates: Partial<GimbalState> = {};

            if (shouldUpdate.yaw) {
              const newYaw = Math.max(
                -120,
                Math.min(120, gimbalState.yaw + (Math.random() - 0.5) * 1)
              );
              // Update only if there's significant change compared to previous value
              if (Math.abs(newYaw - prevGimbalState.current.yaw) > 0.5) {
                updates.yaw = newYaw;
              }
            }

            if (shouldUpdate.pitch) {
              const newPitch = Math.max(
                -90,
                Math.min(25, gimbalState.pitch + (Math.random() - 0.5) * 1)
              );
              if (Math.abs(newPitch - prevGimbalState.current.pitch) > 0.5) {
                updates.pitch = newPitch;
              }
            }

            // Call setGimbalState only when there are updates
            if (Object.keys(updates).length > 0) {
              setGimbalState((prev) => {
                const newState = { ...prev, ...updates };
                prevGimbalState.current = newState;
                return newState;
              });
            }
          }
        } else {
          // 実際のMAVLink v2テレメトリ取得
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
          const response = await fetch(`${apiBaseUrl}/api/gimbal/status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-MAVLink-Version': '2.0',
            },
          });

          if (response.ok) {
            const mavlinkTelemetry = await response.json();

            // MAVLink v2 GIMBAL_MANAGER_STATUS メッセージを期待
            if (
              mavlinkTelemetry.message_id === 281 &&
              mavlinkTelemetry.device_flags
            ) {
              // Convert quaternion to Euler angles
              const q = mavlinkTelemetry.q;
              if (q && q.length === 4) {
                const [w, x, y, z] = q;
                const yawRad = Math.atan2(
                  2 * (w * z + x * y),
                  1 - 2 * (y * y + z * z)
                );
                const pitchRad = Math.asin(
                  Math.max(-1, Math.min(1, 2 * (w * y - z * x)))
                );

                const yawDeg = (yawRad * 180) / Math.PI;
                const pitchDeg = (pitchRad * 180) / Math.PI;

                const now = Date.now();
                const shouldUpdate = {
                  yaw:
                    now - lastManualControl.current.yaw > 2000 &&
                    !isSliderActive.current.yaw,
                  pitch:
                    now - lastManualControl.current.pitch > 2000 &&
                    !isSliderActive.current.pitch,
                };

                // Update only axes with significant changes (prevent flickering)
                if (shouldUpdate.yaw || shouldUpdate.pitch) {
                  const updates: Partial<GimbalState> = {};

                  if (shouldUpdate.yaw) {
                    const newYaw = Math.max(-120, Math.min(120, yawDeg));
                    if (Math.abs(newYaw - prevGimbalState.current.yaw) > 0.5) {
                      updates.yaw = newYaw;
                    }
                  }

                  if (shouldUpdate.pitch) {
                    const newPitch = Math.max(-90, Math.min(25, pitchDeg));
                    if (
                      Math.abs(newPitch - prevGimbalState.current.pitch) > 0.5
                    ) {
                      updates.pitch = newPitch;
                    }
                  }

                  // Call setGimbalState only when there are updates
                  if (Object.keys(updates).length > 0) {
                    setGimbalState((prev) => {
                      const newState = { ...prev, ...updates };
                      prevGimbalState.current = newState;
                      return newState;
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.debug('[Gimbal] MAVLink v2 Telemetry Fetch Error:', error);
      }
    }, 200); // 5Hz (Increased frequency for smoother rendering to prevent flickering)

    console.log(
      '[Gimbal] MAVLink v2 Telemetry Monitoring Started (5Hz - Anti-flicker optimized)'
    );
  }, [connectionState.status, isSimulationMode]);

  // === MAVLink v2接続制御 ===
  const connect = useCallback(async () => {
    setConnectionState((prev) => ({ ...prev, status: 'connecting' }));

    try {
      if (isSimulationMode) {
        // シミュレーションモード：MAVLink v2接続手順をシミュレート
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setConnectionState((prev) => ({
          ...prev,
          status: 'connected',
          lastCommand: '[MAVv2-SIM] Connection Successful',
        }));
      } else {
        // 実際のMAVLink v2初期化シーケンス
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

        // MAVLink v2 GIMBAL_MANAGER_CONFIGURE コマンド
        const configMessage = {
          protocol_version: 2,
          sequence: mavlinkSequence.current++,
          system_id: 255,
          component_id: 190,
          message_id: 1001, // MAV_CMD_DO_GIMBAL_MANAGER_CONFIGURE
          target_system: 1,
          target_component: 154,
          param1: -1, // sysid (use current)
          param2: -1, // compid (use current)
          param3:
            MAV_GIMBAL_MANAGER_FLAGS.CAN_ACCEPT_YAW_IN_EARTH_FRAME |
            MAV_GIMBAL_MANAGER_FLAGS.YAW_LOCK |
            MAV_GIMBAL_MANAGER_FLAGS.PITCH_LOCK,
          param4: 0,
          param5: 0,
          param6: 0,
          param7: 0,
          timestamp_us: Date.now() * 1000,
        };

        const response = await fetch(`${apiBaseUrl}/api/gimbal/configure`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MAVLink-Version': '2.0',
          },
          body: JSON.stringify(configMessage),
        });

        if (!response.ok) {
          throw new Error('MAVLink v2 Gimbal Initialization Failed');
        }

        const result = await response.json();
        console.log('[Gimbal] MAVLink v2 Initialization Response:', result);

        setConnectionState((prev) => ({
          ...prev,
          status: 'connected',
          lastCommand: '[MAVv2] Connection & Initialization Complete',
        }));
      }

      // テレメトリ監視開始
      startStatusMonitoring();
    } catch (error) {
      setConnectionState((prev) => ({
        ...prev,
        status: 'error',
        lastCommand: `Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [isSimulationMode, startStatusMonitoring]);

  const disconnect = useCallback(() => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }
    if (commandThrottleRef.current) {
      clearTimeout(commandThrottleRef.current);
      commandThrottleRef.current = null;
    }

    setConnectionState({
      status: 'disconnected',
      lastCommand: null,
      responseTime: 0,
    });
    console.log('[Gimbal] Disconnected');
  }, []);

  // === 初期化・クリーンアップ ===
  useEffect(() => {
    // 前回状態の初期化
    prevGimbalState.current = gimbalState;

    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (commandThrottleRef.current) clearTimeout(commandThrottleRef.current);
    };
  }, []);

  // gimbalStateの変化を追跡
  useEffect(() => {
    prevGimbalState.current = gimbalState;
  }, [gimbalState]);

  // === プリセット定義 ===
  const presetPositions = useMemo(
    () => [
      { name: 'Home', yaw: 0, pitch: 0, zoom: 1, icon: <Home /> },
      { name: 'Left 90°', yaw: -90, pitch: 0, icon: <RotateLeft /> },
      { name: 'Right 90°', yaw: 90, pitch: 0, icon: <RotateRight /> },
      { name: 'Rear', yaw: 180, pitch: 0, icon: <RadioButtonChecked /> },
      {
        name: 'Top View',
        yaw: 0,
        pitch: -90,
        zoom: 1,
        icon: <FlightTakeoff />,
      },
      { name: 'Horizon', yaw: 0, pitch: 0, zoom: 1, icon: <FlightLand /> },
    ],
    []
  );

  const zoomPresets = useMemo(
    () => [
      { name: 'Wide', zoom: 1, icon: <ZoomOut /> },
      { name: '5x', zoom: 5, icon: <ZoomIn /> },
      { name: '10x', zoom: 10, icon: <ZoomIn /> },
      { name: 'Max', zoom: 30, icon: <ZoomIn /> },
    ],
    []
  );

  // === レンダリング ===
  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e7e7e6',
        borderRadius: 2,
        position: 'relative',
        height: '100%',
        width: '100%',
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #e7e7e6',
          backgroundColor: '#fafafa',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={
              connectionState.status === 'disconnected'
                ? 'Disconnected'
                : connectionState.status === 'connecting'
                  ? 'Connecting'
                  : connectionState.status === 'connected'
                    ? isSimulationMode
                      ? 'Connected (SIM)'
                      : 'Connected'
                    : 'Error'
            }
            size="small"
            color={
              connectionState.status === 'connected'
                ? 'success'
                : connectionState.status === 'connecting'
                  ? 'warning'
                  : connectionState.status === 'error'
                    ? 'error'
                    : 'default'
            }
          />

          {connectionState.status === 'disconnected' && (
            <Button
              size="small"
              variant="contained"
              onClick={connect}
              sx={{ textTransform: 'none' }}
            >
              {isSimulationMode ? 'SIM Connect' : 'MAVv2 Connect'}
            </Button>
          )}

          {connectionState.status === 'connected' && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={disconnect}
              sx={{ textTransform: 'none' }}
            >
              Disconnect
            </Button>
          )}

          <Button
            size="small"
            variant="text"
            onClick={() => setIsSimulationMode(!isSimulationMode)}
            sx={{
              textTransform: 'none',
              fontSize: '0.7rem',
              minWidth: 'auto',
              color: isSimulationMode ? 'warning.main' : 'success.main',
            }}
          >
            {isSimulationMode ? 'SIM' : 'REAL'}
          </Button>
        </Box>
      </Box>

      {/* コントロールエリア */}
      <Box
        sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {/* ジョイスティック + ズームコントロール */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {/* バーチャルジョイスティック */}
              <Box sx={{ flex: 1 }}>
                <VirtualJoystick
                  size={180}
                  maxDistance={70}
                  onMove={handleJoystickMove}
                  disabled={connectionState.status !== 'connected'}
                  showAxis={true}
                />
              </Box>

              {/* ズーム制御 */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  width: 80,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                >
                  Zoom
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => adjustValue('zoom', 5)}
                  disabled={connectionState.status !== 'connected'}
                  sx={{ minWidth: 50, fontSize: '0.7rem' }}
                >
                  +5x
                </Button>

                <IconButton
                  size="small"
                  onClick={() => adjustValue('zoom', 1)}
                  disabled={connectionState.status !== 'connected'}
                  sx={{
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    '&:hover': { backgroundColor: '#e0e0e0' },
                  }}
                >
                  <Add sx={{ fontSize: 16 }} />
                </IconButton>

                {/* 縦向きズームスライダー */}
                <Box
                  sx={{
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    mx: 1,
                  }}
                >
                  <Slider
                    orientation="vertical"
                    value={gimbalState.zoom}
                    onChange={(_event, newValue) => {
                      const value = Array.isArray(newValue)
                        ? newValue[0]
                        : newValue;
                      handleSliderChange('zoom', value);
                    }}
                    min={1}
                    max={30}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value.toFixed(1)}x`}
                    disabled={connectionState.status !== 'connected'}
                    sx={{
                      '& .MuiSlider-valueLabel': {
                        backgroundColor: '#ed6c02',
                      },
                      '& .MuiSlider-track': {
                        backgroundColor: '#ed6c02',
                      },
                      '& .MuiSlider-thumb': {
                        backgroundColor: '#ed6c02',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0 0 0 8px rgba(237, 108, 2, 0.16)',
                        },
                      },
                    }}
                  />
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: '#ed6c02',
                    fontSize: '1rem',
                    textAlign: 'center',
                    minWidth: 50,
                  }}
                >
                  {gimbalState.zoom.toFixed(1)}x
                </Typography>

                <IconButton
                  size="small"
                  onClick={() => adjustValue('zoom', -1)}
                  disabled={connectionState.status !== 'connected'}
                  sx={{
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    '&:hover': { backgroundColor: '#e0e0e0' },
                  }}
                >
                  <Remove sx={{ fontSize: 16 }} />
                </IconButton>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => adjustValue('zoom', -5)}
                  disabled={connectionState.status !== 'connected'}
                  sx={{ minWidth: 50, fontSize: '0.7rem' }}
                >
                  -5x
                </Button>

                {/* クイックズーム */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mt: 1,
                  }}
                >
                  {zoomPresets.map((preset, index) => (
                    <Button
                      key={index}
                      size="small"
                      variant={
                        gimbalState.zoom === preset.zoom
                          ? 'contained'
                          : 'outlined'
                      }
                      onClick={() => handleSliderChange('zoom', preset.zoom)}
                      disabled={connectionState.status !== 'connected'}
                      sx={{
                        minWidth: 45,
                        fontSize: '0.6rem',
                        py: 0.3,
                      }}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* プリセットポジション */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 2 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Preset Positions
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {presetPositions.map((preset, index) => (
                <Button
                  key={index}
                  size="small"
                  variant="outlined"
                  startIcon={preset.icon}
                  onClick={() => handlePresetPosition(preset)}
                  disabled={connectionState.status !== 'connected'}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    fontSize: '0.75rem',
                  }}
                >
                  {preset.name}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* ヨー制御 */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 2 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Yaw Control (Left/Right Rotation)
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => adjustValue('yaw', -45)}
                disabled={connectionState.status !== 'connected'}
                sx={{ minWidth: 40, fontSize: '0.7rem' }}
              >
                -45°
              </Button>

              <IconButton
                size="small"
                onClick={() => adjustValue('yaw', -10)}
                disabled={connectionState.status !== 'connected'}
                sx={{ border: '1px solid #ddd' }}
              >
                <Remove sx={{ fontSize: 16 }} />
              </IconButton>

              <Box sx={{ flex: 1, px: 1 }}>
                <Slider
                  value={gimbalState.yaw}
                  onChange={(_event, newValue) => {
                    const value = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue;
                    handleSliderChange('yaw', value);
                  }}
                  min={-120}
                  max={120}
                  step={1}
                  marks={[
                    { value: -120, label: '-120°' },
                    { value: -90, label: '-90°' },
                    { value: 0, label: '0°' },
                    { value: 90, label: '90°' },
                    { value: 120, label: '120°' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}°`}
                  disabled={connectionState.status !== 'connected'}
                  sx={{
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: '#1976d2',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#1976d2',
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#1976d2',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 8px rgba(25, 118, 210, 0.16)',
                      },
                    },
                    // マークラベルのクリックを無効化
                    '& .MuiSlider-markLabel': {
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                    // マーク自体のクリックも無効化
                    '& .MuiSlider-mark': {
                      pointerEvents: 'none',
                    },
                  }}
                />
              </Box>

              <IconButton
                size="small"
                onClick={() => adjustValue('yaw', 10)}
                disabled={connectionState.status !== 'connected'}
                sx={{ border: '1px solid #ddd' }}
              >
                <Add sx={{ fontSize: 16 }} />
              </IconButton>

              <Button
                variant="outlined"
                size="small"
                onClick={() => adjustValue('yaw', 45)}
                disabled={connectionState.status !== 'connected'}
                sx={{ minWidth: 40, fontSize: '0.7rem' }}
              >
                +45°
              </Button>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              Current Angle: {Math.round(gimbalState.yaw)}°
            </Typography>
          </CardContent>
        </Card>

        {/* ピッチ制御 */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 2 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Pitch Control (Up/Down Rotation)
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => adjustValue('pitch', -45)}
                disabled={connectionState.status !== 'connected'}
                sx={{ minWidth: 40, fontSize: '0.7rem' }}
              >
                -45°
              </Button>

              <IconButton
                size="small"
                onClick={() => adjustValue('pitch', -10)}
                disabled={connectionState.status !== 'connected'}
                sx={{ border: '1px solid #ddd' }}
              >
                <Remove sx={{ fontSize: 16 }} />
              </IconButton>

              <Box sx={{ flex: 1, px: 1 }}>
                <Slider
                  value={gimbalState.pitch}
                  onChange={(_event, newValue) => {
                    const value = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue;
                    handleSliderChange('pitch', value);
                  }}
                  min={-90}
                  max={25}
                  step={1}
                  marks={[
                    { value: -90, label: '-90°' },
                    { value: -45, label: '-45°' },
                    { value: 0, label: '0°' },
                    { value: 25, label: '25°' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}°`}
                  disabled={connectionState.status !== 'connected'}
                  sx={{
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: '#2e7d32',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#2e7d32',
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#2e7d32',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 8px rgba(46, 125, 50, 0.16)',
                      },
                    },
                    // マークラベルのクリックを無効化
                    '& .MuiSlider-markLabel': {
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                    // マーク自体のクリックも無効化
                    '& .MuiSlider-mark': {
                      pointerEvents: 'none',
                    },
                  }}
                />
              </Box>

              <IconButton
                size="small"
                onClick={() => adjustValue('pitch', 10)}
                disabled={connectionState.status !== 'connected'}
                sx={{ border: '1px solid #ddd' }}
              >
                <Add sx={{ fontSize: 16 }} />
              </IconButton>

              <Button
                variant="outlined"
                size="small"
                onClick={() => adjustValue('pitch', 45)}
                disabled={connectionState.status !== 'connected'}
                sx={{ minWidth: 40, fontSize: '0.7rem' }}
              >
                +45°
              </Button>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              Current Angle: {Math.round(gimbalState.pitch)}°
            </Typography>
          </CardContent>
        </Card>

        {/* ズーム制御 (詳細調整) */}
        <Card variant="outlined">
          <CardContent sx={{ pb: 2 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Zoom Control (Fine Adjustment)
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => adjustValue('zoom', -5)}
                disabled={connectionState.status !== 'connected'}
                sx={{ minWidth: 40, fontSize: '0.7rem' }}
              >
                -5x
              </Button>

              <IconButton
                size="small"
                onClick={() => adjustValue('zoom', -1)}
                disabled={connectionState.status !== 'connected'}
                sx={{ border: '1px solid #ddd' }}
              >
                <Remove sx={{ fontSize: 16 }} />
              </IconButton>

              <Box sx={{ flex: 1, px: 1 }}>
                <Slider
                  value={gimbalState.zoom}
                  onChange={(_event, newValue) => {
                    const value = Array.isArray(newValue)
                      ? newValue[0]
                      : newValue;
                    handleSliderChange('zoom', value);
                  }}
                  min={1}
                  max={30}
                  step={0.1}
                  marks={[
                    { value: 1, label: '1x' },
                    { value: 5, label: '5x' },
                    { value: 10, label: '10x' },
                    { value: 20, label: '20x' },
                    { value: 30, label: '30x' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value.toFixed(1)}x`}
                  disabled={connectionState.status !== 'connected'}
                  sx={{
                    '& .MuiSlider-valueLabel': {
                      backgroundColor: '#ed6c02',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#ed6c02',
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#ed6c02',
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 8px rgba(237, 108, 2, 0.16)',
                      },
                    },
                    // マークラベルのクリックを無効化
                    '& .MuiSlider-markLabel': {
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                    // マーク自体のクリックも無効化
                    '& .MuiSlider-mark': {
                      pointerEvents: 'none',
                    },
                  }}
                />
              </Box>

              <IconButton
                size="small"
                onClick={() => adjustValue('zoom', 1)}
                disabled={connectionState.status !== 'connected'}
                sx={{ border: '1px solid #ddd' }}
              >
                <Add sx={{ fontSize: 16 }} />
              </IconButton>

              <Button
                variant="outlined"
                size="small"
                onClick={() => adjustValue('zoom', 5)}
                disabled={connectionState.status !== 'connected'}
                sx={{ minWidth: 40, fontSize: '0.7rem' }}
              >
                +5x
              </Button>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              Current Zoom: {gimbalState.zoom.toFixed(1)}x
            </Typography>
          </CardContent>
        </Card>

        {/* Center/Reset buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<CenterFocusWeak />}
            onClick={() => handlePresetPosition({ yaw: 0, pitch: 0, zoom: 1 })}
            disabled={connectionState.status !== 'connected'}
            sx={{ textTransform: 'none', flex: 1 }}
          >
            Full Reset
          </Button>
        </Box>

        {/* 現在の状態表示 */}
        <Card variant="outlined" sx={{ mt: 1, bgcolor: 'rgba(0,0,0,0.02)' }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.5 }}
            >
              MAVLink v2 Unified Control | Joystick: Rate Control (Angular
              Velocity) | Slider: Absolute Control (Angle) | Telemetry: 5Hz
              Monitoring (Optimized)
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Yaw: {Math.round(gimbalState.yaw)}° | Pitch:{' '}
                {Math.round(gimbalState.pitch)}° | Zoom:{' '}
                {gimbalState.zoom.toFixed(1)}x
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Status footer */}
      <Box
        sx={{
          p: 1,
          borderTop: '1px solid #e7e7e6',
          backgroundColor: '#fafafa',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {connectionState.lastCommand
            ? `Last Command: ${connectionState.lastCommand} (${connectionState.responseTime}ms)`
            : 'SIYI ZR30 Gimbal Control (MAVLink v2 Unified)'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default GimbalControlWidget;
