import React from 'react';
import { Box, Typography, Container } from '@mui/material';

export const TrackLogs: React.FC = () => {
  return (
    <Box sx={{ flex: 1, backgroundColor: '#f5f5f5', p: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 3 }}>
          Track Logs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          飛行記録をMapに表示する画面です。
        </Typography>
      </Container>
    </Box>
  );
};