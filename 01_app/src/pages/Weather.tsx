import React, { useState, useMemo, useEffect, Profiler } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { 
  Cloud as CloudIcon
} from '@mui/icons-material';
import { RealtimeWeatherCardReal } from '../components/weather/RealtimeWeatherCardReal';
import { WeatherStatsPanelMado } from '../components/weather/WeatherStatsPanelMado';
import { WeatherHistoryChartMado } from '../components/weather/WeatherHistoryChartMado';
import { usePerformanceMonitor, ProfilerOnRenderCallback } from '../hooks/usePerformanceMonitor';
import { userTracker } from '../utils/monitoring/userTracking';

// 利用可能なデバイスリスト（Madoセンサー）
const AVAILABLE_DEVICES = [
  { id: 'M-X', name: '試作機 (M-X)' },
  { id: 'M-01', name: 'メイン気象ステーション (M-01)' },
  { id: 'M-02', name: 'サブ気象ステーション (M-02)' }
];

// 時間範囲の定義
const TIME_RANGES = [
  { value: 1, label: '1時間' },
  { value: 3, label: '3時間' },
  { value: 6, label: '6時間' },
  { value: 12, label: '12時間' },
  { value: 24, label: '24時間' }
];

export const Weather: React.FC = () => {
  console.log('Weather page rendering'); // デバッグログ
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // パフォーマンス監視
  usePerformanceMonitor({
    componentName: 'WeatherPage',
    trackRenderTime: true,
    trackMemory: true
  });
  
  // ページビュートラッキング
  useEffect(() => {
    userTracker.trackPageView({
      path: '/weather',
      title: 'Weather Dashboard'
    });
  }, []);
  
  // ページレベルの状態管理
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(AVAILABLE_DEVICES[0].id);
  const [timeRange, setTimeRange] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  
  // デバイス選択ハンドラー
  const handleDeviceChange = (event: SelectChangeEvent) => {
    const newDeviceId = event.target.value;
    setSelectedDeviceId(newDeviceId);
    
    // ユーザーアクションのトラッキング
    userTracker.track({
      category: 'Weather',
      action: 'device_change',
      label: newDeviceId
    });
  };
  
  // 時間範囲選択ハンドラー
  const handleTimeRangeChange = (event: SelectChangeEvent<number>) => {
    const newTimeRange = Number(event.target.value);
    setTimeRange(newTimeRange);
    
    // ユーザーアクションのトラッキング
    userTracker.track({
      category: 'Weather',
      action: 'time_range_change',
      label: `${newTimeRange}_hours`,
      value: newTimeRange
    });
  };
  
  
  // エラーメッセージを閉じる
  const handleCloseError = () => {
    setError(null);
  };
  
  // レスポンシブなグリッドサイズの計算
  const gridSizes = useMemo(() => {
    if (isMobile) {
      return {
        deviceSelector: 12,
        realtimeCard: 12,
        historyChart: 12,
        statsPanel: 12
      };
    } else if (isTablet) {
      return {
        deviceSelector: 12,
        realtimeCard: 12,
        historyChart: 12,
        statsPanel: 12
      };
    } else {
      return {
        deviceSelector: 12,
        realtimeCard: 4,
        historyChart: 8,
        statsPanel: 12
      };
    }
  }, [isMobile, isTablet]);

  return (
    <Profiler id="WeatherPage" onRender={ProfilerOnRenderCallback}>
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#f4f5f7', 
        height: '100%',
        p: { xs: 2, sm: 3, md: 4 }
      }}>
      {/* ヘッダー部分 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CloudIcon sx={{ fontSize: 32, color: theme.palette.primary.main, mr: 1 }} />
          <Typography variant="h4" component="h1">
            気象データダッシュボード
          </Typography>
        </Box>
        
        {/* デバイス選択 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="device-select-label">
                  観測デバイス
                </InputLabel>
                <Select
                  labelId="device-select-label"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  label="観測デバイス"
                  MenuProps={{
                    PaperProps: {
                      style: {
                        maxHeight: 300,
                      },
                    },
                  }}
                >
                  {AVAILABLE_DEVICES.map((device) => (
                    <MenuItem key={device.id} value={device.id}>
                      {device.name} ({device.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="time-range-select-label">
                  履歴データの時間範囲
                </InputLabel>
                <Select
                  labelId="time-range-select-label"
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  label="履歴データの時間範囲"
                >
                  {TIME_RANGES.map((range) => (
                    <MenuItem key={range.value} value={range.value}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* メインコンテンツ */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Grid container spacing={3}>
          {/* リアルタイムデータカード（実センサー対応版） */}
          <Grid item xs={12} md={gridSizes.realtimeCard}>
            <RealtimeWeatherCardReal 
              deviceId={selectedDeviceId}
            />
          </Grid>
          
          {/* 履歴データグラフ */}
          <Grid item xs={12} md={gridSizes.historyChart}>
            <WeatherHistoryChartMado 
              deviceId={selectedDeviceId}
              initialTimeRange={timeRange * 60}
              height={isMobile ? 300 : 400}
            />
          </Grid>
          
          {/* 統計情報パネル */}
          <Grid item xs={12}>
            <WeatherStatsPanelMado 
              deviceId={selectedDeviceId}
              height={isMobile ? 'auto' : 200}
            />
          </Grid>
        </Grid>
      </Box>
      
      {/* エラー通知 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      </Box>
    </Profiler>
  );
};