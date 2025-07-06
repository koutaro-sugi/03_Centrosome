import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  styled,
} from '@mui/material';
import { Delete, ArrowForward } from '@mui/icons-material';

const SlideTrack = styled(Box)({
  position: 'relative',
  width: '100%',
  height: 50,
  backgroundColor: '#e0e0e0',
  borderRadius: 25,
  overflow: 'hidden',
  marginTop: 20,
  marginBottom: 10,
});

const SlideThumb = styled(Box)<{ progress: number }>(({ progress }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  height: '100%',
  width: 50,
  backgroundColor: '#e74c3c',
  borderRadius: 25,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
  transform: `translateX(${progress}px)`,
  transition: 'transform 0.1s ease-out',
  '&:active': {
    cursor: 'grabbing',
  },
}));

const SlideLabel = styled(Typography)({
  position: 'absolute',
  width: '100%',
  textAlign: 'center',
  top: '50%',
  transform: 'translateY(-50%)',
  userSelect: 'none',
  pointerEvents: 'none',
  color: '#666',
  fontSize: '14px',
  fontWeight: 500,
});

interface SlideToConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
}

export const SlideToConfirmDialog: React.FC<SlideToConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
}) => {
  const [slideProgress, setSlideProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const newProgress = Math.max(0, Math.min(e.clientX - trackRect.left - 25, trackRect.width - 50));
    setSlideProgress(newProgress);
  };

  const handleMouseUp = () => {
    if (!trackRef.current) return;
    
    const trackWidth = trackRef.current.getBoundingClientRect().width;
    // Check if slider is at the end position when mouse is released
    if (slideProgress >= trackWidth - 60) {
      // Confirm only if the slider is at the end
      handleConfirm();
    } else {
      // Snap back if not at the end
      setSlideProgress(0);
    }
    setIsDragging(false);
  };

  const handleConfirm = () => {
    onConfirm();
    handleClose();
  };

  const handleClose = () => {
    setSlideProgress(0);
    setIsDragging(false);
    onClose();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setSlideProgress(0);
      setIsDragging(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ color: '#e74c3c', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Delete />
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 1 }}>
          {message}
        </Typography>
        {itemName && (
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
            "{itemName}"
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This action cannot be undone.
        </Typography>

        <SlideTrack ref={trackRef}>
          <SlideThumb
            ref={thumbRef}
            progress={slideProgress}
            onMouseDown={handleMouseDown}
          >
            <ArrowForward sx={{ color: 'white' }} />
          </SlideThumb>
          <SlideLabel>
            Slide to confirm deletion
          </SlideLabel>
        </SlideTrack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};