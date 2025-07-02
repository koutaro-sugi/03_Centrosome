import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import './GimbalAnimationWidget.css';

interface GimbalAnimationWidgetProps {
  id: string;
  title: string;
  isEditMode: boolean;
}

interface GimbalState {
  yaw: number; // -120 to +120 degrees
  pitch: number; // -90 to +25 degrees
  zoom: number; // 1x to 30x
}

interface MAVLinkCommand {
  yaw?: number;
  pitch?: number;
  zoom?: number;
  yawRate?: number;
  pitchRate?: number;
  controlMode?: 'absolute' | 'rate';
  source: 'slider' | 'joystick' | 'preset' | 'button';
  timestamp?: number;
}

const GimbalAnimationWidget: React.FC<GimbalAnimationWidgetProps> = ({
  id,
  title,
  isEditMode,
}) => {
  // ジンバル状態管理
  const [gimbalState, setGimbalState] = useState<GimbalState>({
    yaw: 0,
    pitch: 0,
    zoom: 1,
  });

  // アニメーション設定
  const [isAnimationEnabled, setIsAnimationEnabled] = useState(true);
  const [lastCommand, setLastCommand] = useState<MAVLinkCommand | null>(null);
  const [commandHistory, setCommandHistory] = useState<MAVLinkCommand[]>([]);

  // レート制御用の状態
  const [isRateControlActive, setIsRateControlActive] = useState(false);
  const rateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // MAVLinkコマンド受信のシミュレーション（実際にはイベントリスナーで受信）
  useEffect(() => {
    const handleMAVLinkCommand = (event: CustomEvent<MAVLinkCommand>) => {
      const command = event.detail;
      setLastCommand(command);

      // コマンド履歴に追加（最新10件まで）
      setCommandHistory((prev) => [command, ...prev.slice(0, 9)]);

      if (command.controlMode === 'rate') {
        // レート制御：継続的に位置を更新
        handleRateControl(command);
      } else {
        // 絶対値制御：直接位置を設定
        handleAbsoluteControl(command);
      }
    };

    // カスタムイベントリスナー登録
    window.addEventListener(
      'mavlink-gimbal-command',
      handleMAVLinkCommand as EventListener
    );

    return () => {
      window.removeEventListener(
        'mavlink-gimbal-command',
        handleMAVLinkCommand as EventListener
      );
      if (rateIntervalRef.current) {
        clearInterval(rateIntervalRef.current);
      }
    };
  }, []);

  // 絶対値制御処理
  const handleAbsoluteControl = (command: MAVLinkCommand) => {
    setGimbalState((prev) => ({
      yaw: command.yaw !== undefined ? command.yaw : prev.yaw,
      pitch: command.pitch !== undefined ? command.pitch : prev.pitch,
      zoom: command.zoom !== undefined ? command.zoom : prev.zoom,
    }));

    // レート制御を停止
    if (rateIntervalRef.current) {
      clearInterval(rateIntervalRef.current);
      rateIntervalRef.current = null;
      setIsRateControlActive(false);
    }
  };

  // レート制御処理
  const handleRateControl = (command: MAVLinkCommand) => {
    // 既存のレート制御をクリア
    if (rateIntervalRef.current) {
      clearInterval(rateIntervalRef.current);
    }

    const yawRate = command.yawRate || 0;
    const pitchRate = command.pitchRate || 0;

    if (yawRate === 0 && pitchRate === 0) {
      // レート0の場合は停止
      setIsRateControlActive(false);
      return;
    }

    setIsRateControlActive(true);

    // 20Hzでレート制御を適用
    rateIntervalRef.current = setInterval(() => {
      setGimbalState((prev) => {
        const deltaTime = 0.05; // 50ms = 0.05s

        // レートを角度変化に変換（最大角速度を想定）
        const maxYawRate = 90; // deg/s
        const maxPitchRate = 90; // deg/s

        const yawDelta = yawRate * maxYawRate * deltaTime;
        const pitchDelta = pitchRate * maxPitchRate * deltaTime;

        const newYaw = Math.max(-120, Math.min(120, prev.yaw + yawDelta));
        const newPitch = Math.max(-90, Math.min(25, prev.pitch + pitchDelta));

        return {
          ...prev,
          yaw: newYaw,
          pitch: newPitch,
        };
      });
    }, 50); // 20Hz
  };

  // デモ用の自動アニメーション
  useEffect(() => {
    if (!isAnimationEnabled || lastCommand) return;

    const demoInterval = setInterval(() => {
      const time = Date.now() / 1000;
      setGimbalState({
        yaw: Math.sin(time * 0.3) * 45,
        pitch: Math.cos(time * 0.2) * 15,
        zoom: 1 + Math.abs(Math.sin(time * 0.1)) * 10,
      });
    }, 50);

    return () => clearInterval(demoInterval);
  }, [isAnimationEnabled, lastCommand]);

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
        backgroundColor: '#fafafa',
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
            label={isRateControlActive ? 'Rate Control' : 'Absolute Control'}
            size="small"
            color={isRateControlActive ? 'warning' : 'primary'}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isAnimationEnabled}
                onChange={(e) => setIsAnimationEnabled(e.target.checked)}
                size="small"
              />
            }
            label="Demo"
            sx={{ fontSize: '0.8rem', margin: 0 }}
          />
        </Box>
      </Box>

      {/* 3Dジンバルアニメーション */}
      <Box
        sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {/* メイン3Dビュー */}
        <Card variant="outlined" sx={{ flex: 1, minHeight: 300 }}>
          <CardContent
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              3D Gimbal Visualization
            </Typography>

            <Box
              className="gimbal-3d-container"
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                perspective: '1000px',
                backgroundColor: '#f8f9fa',
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* ベースプラットフォーム */}
              <Box
                className="gimbal-base"
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  width: 120,
                  height: 20,
                  backgroundColor: '#666',
                  borderRadius: 2,
                  transform: 'rotateX(60deg)',
                  opacity: 0.7,
                }}
              />

              {/* ジンバル本体 */}
              <Box
                className="gimbal-body"
                sx={{
                  transformStyle: 'preserve-3d',
                  transform: `
                                        rotateY(${gimbalState.yaw}deg) 
                                        rotateX(${-gimbalState.pitch}deg)
                                        translateZ(0)
                                    `,
                  transition: isRateControlActive
                    ? 'none'
                    : 'transform 0.3s ease-out',
                }}
              >
                {/* ヨー軸（縦軸） */}
                <Box
                  sx={{
                    width: 8,
                    height: 80,
                    backgroundColor: '#1976d2',
                    borderRadius: 1,
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) translateZ(0)',
                    boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                  }}
                />

                {/* ピッチ軸（横軸） */}
                <Box
                  sx={{
                    width: 60,
                    height: 8,
                    backgroundColor: '#2e7d32',
                    borderRadius: 1,
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) translateZ(30px)',
                    boxShadow: '0 2px 8px rgba(46, 125, 50, 0.3)',
                  }}
                />

                {/* カメラボディ */}
                <Box
                  sx={{
                    width: 40,
                    height: 30,
                    backgroundColor: '#37474f',
                    borderRadius: 2,
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) translateZ(40px)',
                    boxShadow: '0 4px 12px rgba(55, 71, 79, 0.4)',
                    border: '2px solid #546e7a',
                  }}
                />

                {/* レンズ */}
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    backgroundColor: '#263238',
                    borderRadius: '50%',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) translateZ(55px)',
                    border: '3px solid #37474f',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: 8,
                      height: 8,
                      backgroundColor: '#1a237e',
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                    },
                  }}
                />

                {/* ズーム表示リング */}
                <Box
                  sx={{
                    width: 30 + gimbalState.zoom * 2,
                    height: 30 + gimbalState.zoom * 2,
                    border: '2px solid #ed6c02',
                    borderRadius: '50%',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) translateZ(45px)',
                    opacity: 0.6,
                    transition: 'width 0.2s ease, height 0.2s ease',
                  }}
                />
              </Box>

              {/* 座標軸表示 */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  right: 10,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* X軸（赤） */}
                <Box
                  sx={{
                    width: 30,
                    height: 2,
                    backgroundColor: '#f44336',
                    position: 'absolute',
                    transform: 'rotateY(90deg) translateZ(15px)',
                  }}
                />
                {/* Y軸（緑） */}
                <Box
                  sx={{
                    width: 2,
                    height: 30,
                    backgroundColor: '#4caf50',
                    position: 'absolute',
                    transform: 'translateZ(0)',
                  }}
                />
                {/* Z軸（青） */}
                <Box
                  sx={{
                    width: 30,
                    height: 2,
                    backgroundColor: '#2196f3',
                    position: 'absolute',
                    transform: 'rotateX(90deg) translateZ(15px)',
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* 状態表示 */}
        <Card variant="outlined">
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Current State
              </Typography>
              {lastCommand && (
                <Chip
                  label={lastCommand.source}
                  size="small"
                  color="secondary"
                />
              )}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 1,
                textAlign: 'center',
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Yaw
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: '#1976d2', fontWeight: 600 }}
                >
                  {gimbalState.yaw.toFixed(1)}°
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pitch
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: '#2e7d32', fontWeight: 600 }}
                >
                  {gimbalState.pitch.toFixed(1)}°
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Zoom
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: '#ed6c02', fontWeight: 600 }}
                >
                  {gimbalState.zoom.toFixed(1)}x
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* コマンド履歴 */}
        {commandHistory.length > 0 && (
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{ fontWeight: 600 }}
              >
                Recent Commands
              </Typography>
              <Box sx={{ maxHeight: 120, overflowY: 'auto' }}>
                {commandHistory.slice(0, 5).map((cmd, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {cmd.source} ({cmd.controlMode})
                    </Typography>
                    <Typography variant="caption">
                      {cmd.yaw !== undefined && `Y:${cmd.yaw.toFixed(1)}°`}
                      {cmd.pitch !== undefined && ` P:${cmd.pitch.toFixed(1)}°`}
                      {cmd.zoom !== undefined && ` Z:${cmd.zoom.toFixed(1)}x`}
                      {cmd.yawRate !== undefined &&
                        ` YR:${(cmd.yawRate * 100).toFixed(0)}%`}
                      {cmd.pitchRate !== undefined &&
                        ` PR:${(cmd.pitchRate * 100).toFixed(0)}%`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>
    </Paper>
  );
};

export default GimbalAnimationWidget;
