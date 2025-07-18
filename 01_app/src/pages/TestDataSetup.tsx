import React, { useState } from 'react';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import { seedTestData } from '../scripts/seedTestData';

export const TestDataSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSeedData = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      await seedTestData();
      setMessage({ type: 'success', text: 'テストデータの作成に成功しました！' });
    } catch (err) {
      console.error('Failed to seed test data:', err);
      setMessage({ type: 'error', text: 'テストデータの作成に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        テストデータセットアップ
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 3 }}>
        パイロットと機体のテストデータを作成します。
      </Typography>
      
      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}
      
      <Button
        variant="contained"
        onClick={handleSeedData}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : null}
      >
        {loading ? 'データ作成中...' : 'テストデータを作成'}
      </Button>
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          作成されるデータ：
        </Typography>
        <Typography variant="body2" component="div">
          <strong>パイロット：</strong>
          <ul>
            <li>杉晃太朗</li>
            <li>林賢太</li>
          </ul>
          <strong>機体：</strong>
          <ul>
            <li>DrN-40</li>
            <li>Wingcopter198 (SN56, SN57, SN61, SN62)</li>
            <li>ACSL SOTEN (CHIE, RINO)</li>
          </ul>
        </Typography>
      </Box>
    </Box>
  );
};