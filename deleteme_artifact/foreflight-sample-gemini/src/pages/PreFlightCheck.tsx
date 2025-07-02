import React from 'react';
import { Box, Typography, Container } from '@mui/material';

export const PreFlightCheck: React.FC = () => {
  return (
    <Box sx={{ flex: 1, backgroundColor: '#f5f5f5', p: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 3 }}>
          Pre-Flight Check
        </Typography>
        <Typography variant="body1" color="text.secondary">
          天候・機体状態・飛行許可などの事前チェック画面です。
        </Typography>
      </Container>
    </Box>
  );
};