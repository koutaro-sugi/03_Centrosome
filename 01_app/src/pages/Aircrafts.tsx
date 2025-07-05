import React from 'react';
import { Box, Typography, Container } from '@mui/material';

export const Aircrafts: React.FC = () => {
  return (
    <Box sx={{ flex: 1, backgroundColor: '#f5f5f5', p: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 3 }}>
          Aircrafts
        </Typography>
        <Typography variant="body1" color="text.secondary">
          システムに登録された機体の参照・編集画面です。
        </Typography>
      </Container>
    </Box>
  );
};