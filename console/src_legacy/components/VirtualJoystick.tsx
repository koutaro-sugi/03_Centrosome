import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import './VirtualJoystick.css';

interface VirtualJoystickProps {
  size?: number;
  maxDistance?: number;
  onMove: (x: number, y: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
  disabled?: boolean;
  showAxis?: boolean;
}

interface Position {
  x: number;
  y: number;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  size = 200,
  maxDistance = 80,
  onMove,
  onStart,
  onEnd,
  disabled = false,
  showAxis = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [knobPosition, setKnobPosition] = useState<Position>({ x: 0, y: 0 });
  const [lastCommandValues, setLastCommandValues] = useState<{
    yaw: number;
    pitch: number;
  }>({ yaw: 0, pitch: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const knobSize = size * 0.3;
  const centerX = size / 2;
  const centerY = size / 2;

  // ノブの位置を制限内に収める
  const constrainPosition = useCallback(
    (x: number, y: number): Position => {
      const distance = Math.sqrt(x * x + y * y);
      if (distance <= maxDistance) {
        return { x, y };
      }

      const angle = Math.atan2(y, x);
      return {
        x: Math.cos(angle) * maxDistance,
        y: Math.sin(angle) * maxDistance,
      };
    },
    [maxDistance]
  );

  // 座標をレート値に変換（-1.0 to +1.0の正規化値）
  const positionToRates = useCallback(
    (x: number, y: number) => {
      // デッドゾーン処理
      const deadZone = maxDistance * 0.05; // 5%のデッドゾーン

      const distance = Math.sqrt(x * x + y * y);
      if (distance < deadZone) {
        return { yaw: 0, pitch: 0 };
      }

      // 正規化されたレート値 (-1.0 to +1.0)
      const yawRate = Math.max(-1.0, Math.min(1.0, x / maxDistance));
      const pitchRate = Math.max(-1.0, Math.min(1.0, -y / maxDistance)); // Y軸反転

      return { yaw: yawRate, pitch: pitchRate };
    },
    [maxDistance]
  );

  // マウス/タッチイベントの処理
  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - centerX;
      const y = clientY - rect.top - centerY;

      const constrainedPos = constrainPosition(x, y);
      setKnobPosition(constrainedPos);
      setIsDragging(true);

      const { yaw, pitch } = positionToRates(
        constrainedPos.x,
        constrainedPos.y
      );
      console.log('[Joystick] Start Rate:', {
        yaw: (yaw * 100).toFixed(0) + '%',
        pitch: (pitch * 100).toFixed(0) + '%',
      });
      setLastCommandValues({ yaw, pitch });
      onMove(yaw, pitch);
      onStart?.();
    },
    [
      disabled,
      centerX,
      centerY,
      constrainPosition,
      positionToRates,
      onMove,
      onStart,
    ]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || disabled || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - centerX;
      const y = clientY - rect.top - centerY;

      const constrainedPos = constrainPosition(x, y);
      setKnobPosition(constrainedPos);

      const { yaw, pitch } = positionToRates(
        constrainedPos.x,
        constrainedPos.y
      );
      console.log('[Joystick] Move Rate:', {
        yaw: (yaw * 100).toFixed(0) + '%',
        pitch: (pitch * 100).toFixed(0) + '%',
      });
      setLastCommandValues({ yaw, pitch });
      onMove(yaw, pitch);
    },
    [
      isDragging,
      disabled,
      centerX,
      centerY,
      constrainPosition,
      positionToRates,
      onMove,
    ]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // 描画上のノブは中央に戻す
    setKnobPosition({ x: 0, y: 0 });

    // レート制御用：停止時はレート0を送信
    const zeroRate = { yaw: 0, pitch: 0 };
    console.log('[Joystick] Stop - Send Zero Rate:', zeroRate);
    setLastCommandValues(zeroRate);
    onMove(0, 0);

    onEnd?.();
  }, [isDragging, onEnd, onMove]);

  // マウスイベント
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // タッチイベント
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    },
    [handleEnd]
  );

  // グローバルイベントリスナー
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, {
        passive: false,
      });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // 表示用の値：ドラッグ中は現在位置、ドラッグ終了後は最後のコマンド値
  const displayValues = isDragging
    ? positionToRates(knobPosition.x, knobPosition.y)
    : lastCommandValues;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, color: 'text.secondary' }}
      >
        Virtual Joystick
      </Typography>

      <Box
        ref={containerRef}
        className={`joystick-container ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        sx={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #f0f0f0, #e6e6e6)',
          border: '2px solid #ddd',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          boxShadow: isDragging
            ? 'inset 0 4px 8px rgba(0,0,0,0.2)'
            : 'inset 0 2px 4px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.2s ease',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* 軸線表示 */}
        {showAxis && (
          <>
            {/* 水平線 (ヨー軸) */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '10%',
                right: '10%',
                height: '1px',
                backgroundColor: '#1976d2',
                opacity: 0.3,
                transform: 'translateY(-50%)',
              }}
            />
            {/* 垂直線 (ピッチ軸) */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '10%',
                bottom: '10%',
                width: '1px',
                backgroundColor: '#2e7d32',
                opacity: 0.3,
                transform: 'translateX(-50%)',
              }}
            />
          </>
        )}

        {/* センターマーク */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: '#666',
            transform: 'translate(-50%, -50%)',
            opacity: 0.6,
          }}
        />

        {/* ジョイスティックノブ */}
        <Box
          className="joystick-knob"
          sx={{
            position: 'absolute',
            width: knobSize,
            height: knobSize,
            borderRadius: '50%',
            background: isDragging
              ? 'linear-gradient(145deg, #4fc3f7, #29b6f6)'
              : 'linear-gradient(145deg, #ffffff, #f5f5f5)',
            border: '2px solid #ccc',
            cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
            transform: `translate(${centerX + knobPosition.x - knobSize / 2}px, ${centerY + knobPosition.y - knobSize / 2}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            boxShadow: isDragging
              ? '0 4px 12px rgba(0,0,0,0.3)'
              : '0 2px 6px rgba(0,0,0,0.2)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '20%',
              left: '20%',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.8), rgba(255,255,255,0.3))',
            },
          }}
        />
      </Box>

      {/* 現在の値表示（固定高さでレイアウトシフト防止） */}
      <Box
        sx={{
          textAlign: 'center',
          height: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Yaw Rate:{' '}
          <strong
            style={{ color: displayValues.yaw === 0 ? '#666' : '#1976d2' }}
          >
            {(displayValues.yaw * 100).toFixed(0)}%
          </strong>{' '}
          | Pitch Rate:{' '}
          <strong
            style={{ color: displayValues.pitch === 0 ? '#666' : '#2e7d32' }}
          >
            {(displayValues.pitch * 100).toFixed(0)}%
          </strong>
        </Typography>
        <Box
          sx={{
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isDragging && (
            <Typography variant="caption" color="primary">
              Controlling...
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default VirtualJoystick;
