import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import { Upload, CheckCircle, Error } from '@mui/icons-material';
import { initializeUASPortsInDB } from '../scripts/initializeUASPortsDB';

export const AdminPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleInitializeUASPorts = async () => {
    setLoading(true);
    setResult(null);

    try {
      await initializeUASPortsInDB();
      setResult({
        success: true,
        message: 'UAS Ports initialized successfully!',
      });
    } catch (error) {
      console.error('Error initializing UAS ports:', error);
      setResult({
        success: false,
        message: 'Failed to initialize UAS ports. Check console for details.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Admin Panel
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            UAS Port Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Initialize UAS ports with polygon data in the database. This will create the following ports:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="ul" sx={{ mb: 2 }}>
            <li>UFKE - 五島（福江島）</li>
            <li>UNAG - 長崎市</li>
            <li>UWAK - 稚内市</li>
            <li>URSI - 利尻島</li>
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Upload />}
              onClick={handleInitializeUASPorts}
              disabled={loading}
            >
              {loading ? 'Initializing...' : 'Initialize UAS Ports'}
            </Button>
          </Stack>
          
          {result && (
            <Alert
              severity={result.success ? 'success' : 'error'}
              icon={result.success ? <CheckCircle /> : <Error />}
              sx={{ mt: 2 }}
            >
              {result.message}
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};