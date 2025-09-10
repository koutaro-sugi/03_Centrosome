import React, { Profiler, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Cloud as CloudIcon } from '@mui/icons-material';
import { usePerformanceMonitor, ProfilerOnRenderCallback } from '../hooks/usePerformanceMonitor';
import { userTracker } from '../utils/monitoring/userTracking';
import { WeatherParamsTable } from '../components/weather/WeatherParamsTable';

export const Weather: React.FC = () => {
  const theme = useTheme();

  usePerformanceMonitor({ componentName: 'WeatherPage', trackRenderTime: true, trackMemory: true });

  useEffect(() => {
    userTracker.trackPageView({ path: '/weather', title: 'Weather Dashboard' });
  }, []);

  return (
    <Profiler id="WeatherPage" onRender={ProfilerOnRenderCallback}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f4f5f7',
          height: '100%',
          p: { xs: 2, sm: 3, md: 4 },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <CloudIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mr: 1 }} />
          <Typography variant="h4" component="h1">気象データダッシュボード</Typography>
        </Box>

        <Box sx={{ maxWidth: 720 }}>
          {/* 単純なパラメータテーブル（IoT Core直結） */}
          <WeatherParamsTable deviceId="M-X" />
        </Box>
      </Box>
    </Profiler>
  );
};
