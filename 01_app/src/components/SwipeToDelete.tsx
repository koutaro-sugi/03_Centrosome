import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  Slider,
  Stack,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

interface SwipeToDeleteProps {
  onDelete: () => void;
  itemName: string;
  variant?: 'icon' | 'text';
}

export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({ onDelete, itemName, variant = 'icon' }) => {
  const [open, setOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setSliderValue(newValue as number);
  };

  const handleSliderChangeCommitted = () => {
    if (sliderValue >= 100) {
      onDelete();
      setOpen(false);
      setSliderValue(0);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSliderValue(0);
  };

  return (
    <>
      {variant === 'icon' ? (
        <IconButton
          size="small"
          onClick={() => setOpen(true)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ) : (
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            width: '100%',
            cursor: 'pointer',
            color: 'error.main',
          }}
        >
          <DeleteIcon fontSize="small" />
          <Typography>削除</Typography>
        </Box>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogContent>
          <Stack spacing={3}>
            <Typography variant="h6" align="center">
              削除確認
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary">
              「{itemName}」を削除しますか？
            </Typography>
            <Box sx={{ px: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                右にスライドして削除
              </Typography>
              <Slider
                value={sliderValue}
                onChange={handleSliderChange}
                onChangeCommitted={handleSliderChangeCommitted}
                sx={{
                  '& .MuiSlider-thumb': {
                    width: 32,
                    height: 32,
                    backgroundColor: 'error.main',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: 'error.main',
                  },
                }}
              />
            </Box>
            <Typography
              variant="button"
              onClick={handleClose}
              sx={{
                textAlign: 'center',
                color: 'primary.main',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};