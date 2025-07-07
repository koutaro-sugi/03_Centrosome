import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { AdminPanel } from '../components/AdminPanel';

export const Admin: React.FC = () => {
  return (
    <Box sx={{ backgroundColor: '#f4f5f7', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          System Administration
        </Typography>
        <AdminPanel />
      </Container>
    </Box>
  );
};