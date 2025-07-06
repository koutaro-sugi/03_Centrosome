import React, { useState, useRef } from 'react';
import { Box, Typography, styled } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';

const SliderContainer = styled(Box)({
  position: 'relative',
  width: '100%',
  height: 48,
  backgroundColor: '#f5f5f5',
  borderRadius: 24,
  overflow: 'hidden',
  cursor: 'pointer',
  userSelect: 'none',
});

const SliderTrack = styled(Box)<{ progress: number }>(({ progress }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  width: `${progress}%`,
  backgroundColor: '#dc3545',
  transition: 'none',
}));

const SliderThumb = styled(Box)<{ thumbPosition: number }>(({ thumbPosition }) => ({
  position: 'absolute',
  left: `${thumbPosition}px`,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 40,
  height: 40,
  backgroundColor: 'white',
  borderRadius: '50%',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'none',
  zIndex: 2,
}));

const SliderText = styled(Typography)({
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#666',
  fontSize: '14px',
  fontWeight: 500,
  pointerEvents: 'none',
  zIndex: 1,
});

interface SlideToConfirmProps {
  onConfirm: () => void;
  text?: string;
  disabled?: boolean;
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  text = 'Slide to confirm',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startPos = useRef(0);

  const handleStart = (clientX: number) => {
    if (disabled) return;
    setIsDragging(true);
    startX.current = clientX;
    startPos.current = position;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const deltaX = clientX - startX.current;
    const newPosition = Math.max(4, Math.min(startPos.current + deltaX, containerRect.width - 44));
    setPosition(newPosition);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Check if slider is at the end position when released
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const isAtEnd = position >= containerRect.width - 44;
      
      if (isAtEnd && !disabled) {
        // Confirm action
        onConfirm();
        // Reset position after confirmation
        setTimeout(() => {
          setPosition(4);
        }, 200);
      } else {
        // Reset position if not at the end
        setPosition(4);
      }
    }
  };

  const progress = containerRef.current 
    ? ((position - 4) / (containerRef.current.getBoundingClientRect().width - 48)) * 100
    : 0;

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleMouseUp = () => handleEnd();
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const handleTouchEnd = () => handleEnd();

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, position]);

  return (
    <SliderContainer
      ref={containerRef}
      onMouseDown={(e) => handleStart(e.clientX)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <SliderTrack progress={progress} />
      <SliderText>{text}</SliderText>
      <SliderThumb thumbPosition={position}>
        <ChevronRight sx={{ color: '#dc3545' }} />
      </SliderThumb>
    </SliderContainer>
  );
};