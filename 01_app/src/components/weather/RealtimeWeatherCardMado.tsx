/**
 * RealtimeWeatherCardMado コンポーネント
 * Madoセンサーからのリアルタイム気象データを表示
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Fade,
  useTheme,
  alpha
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Refresh as RefreshIcon,
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Warning as WarningIcon,
  ThermostatAuto as TemperatureIcon,
  Water as HumidityIcon,
  Speed as PressureIcon,
  Air as WindIcon,
  WbSunny as IlluminanceIcon,
  CloudQueue as RainfallIcon,
  Thermostat as FeelsLikeIcon,
  Check as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useMadoSensorData } from '../../hooks/useMadoSensorData';
import { getWindDirectionLabel } from '../../utils/madoDataAdapter';
import { SensorData } from '../../types/weather';

/**
 * RealtimeWeatherCardMadoのプロパティ
 */
interface RealtimeWeatherCardMadoProps {
  /** デバイスID */
  deviceId: string;
  /** カードのタイトル */
  title?: string;
  /** 高さ（px） */
  height?: number;
  /** 更新アニメーションを有効にするか */
  enableAnimation?: boolean;
}

/**
 * 気象データ項目の表示設定
 */
interface WeatherDataItem {
  key: keyof SensorData;
  label: string;
  unit: string;
  icon: React.ReactElement;
  color: string;
  formatter?: (value: number) => string;
}

/**
 * RealtimeWeatherCardMado コンポーネント
 */
export const RealtimeWeatherCardMado: React.FC<RealtimeWeatherCardMadoProps> = ({
  deviceId,
  title = 'Madoリアルタイム気象データ',
  height = 400,
  enableAnimation = true
}) => {
  const theme = useTheme();
  
  // Madoセンサーデータフックを使用
  const {
    data,
    loading,
    error,
    connectionStatus,
    retry,
    dataQuality
  } = useMadoSensorData({
    deviceId,
    historyMinutes: 10
  });

  // アニメーション状態
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  /**
   * 気象データ項目の定義
   */
  const weatherItems: WeatherDataItem[] = [
    {
      key: 'temperature',
      label: '気温',
      unit: '℃',
      icon: <TemperatureIcon />,
      color: theme.palette.error.main,
      formatter: (value) => value.toFixed(1)
    },
    {
      key: 'humidity',
      label: '湿度',
      unit: '%',
      icon: <HumidityIcon />,
      color: theme.palette.info.main,
      formatter: (value) => value.toFixed(0)
    },
    {
      key: 'pressure',
      label: '気圧',
      unit: 'hPa',
      icon: <PressureIcon />,
      color: theme.palette.secondary.main,
      formatter: (value) => value.toFixed(1)
    },
    {
      key: 'windSpeed',
      label: '風速',
      unit: 'm/s',
      icon: <WindIcon />,
      color: theme.palette.success.main,
      formatter: (value) => value.toFixed(1)
    },
    {
      key: 'windDirection',
      label: '風向',
      unit: '',
      icon: <WindIcon />,
      color: theme.palette.success.main,
      formatter: (value) => `${value.toFixed(0)}° ${getWindDirectionLabel(value)}`
    },
    {
      key: 'rainfall',
      label: '降水量',
      unit: 'mm/h',
      icon: <RainfallIcon />,
      color: theme.palette.primary.main,
      formatter: (value) => value.toFixed(1)
    },
    {
      key: 'illuminance',
      label: '照度',
      unit: 'lux',
      icon: <IlluminanceIcon />,
      color: theme.palette.warning.main,
      formatter: (value) => value.toFixed(0)
    },
    {
      key: 'feelsLike',
      label: '体感温度',
      unit: '℃',
      icon: <FeelsLikeIcon />,
      color: theme.palette.error.light,
      formatter: (value) => value.toFixed(1)
    }
  ];

  /**
   * データ更新時のアニメーション
   */
  useEffect(() => {
    if (data && enableAnimation) {
      setIsUpdating(true);
      setLastUpdateTime(new Date());
      const timer = setTimeout(() => setIsUpdating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [data, enableAnimation]);

  /**
   * 接続状態の表示
   */
  const renderConnectionStatus = () => {
    const getStatusConfig = () => {
      switch (connectionStatus) {
        case 'connected':
          return {
            icon: <WifiIcon fontSize="small" />,
            label: '接続中',
            color: theme.palette.success.main,
            bgColor: alpha(theme.palette.success.main, 0.1)
          };
        case 'connecting':
          return {
            icon: <CircularProgress size={16} />,
            label: '接続中...',
            color: theme.palette.warning.main,
            bgColor: alpha(theme.palette.warning.main, 0.1)
          };
        default:
          return {
            icon: <WifiOffIcon fontSize="small" />,
            label: '切断',
            color: theme.palette.error.main,
            bgColor: alpha(theme.palette.error.main, 0.1)
          };
      }
    };

    const config = getStatusConfig();

    return (
      <Chip
        icon={config.icon}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bgColor,
          color: config.color,
          fontWeight: 'medium'
        }}
      />
    );
  };

  /**
   * データ品質の表示
   */
  const renderDataQuality = () => {
    if (!dataQuality || !data) return null;

    const getQualityConfig = () => {
      switch (dataQuality) {
        case 'good':
          return {
            icon: <CheckIcon fontSize="small" />,
            label: '正常',
            color: theme.palette.success.main
          };
        case 'warning':
          return {
            icon: <WarningIcon fontSize="small" />,
            label: '警告',
            color: theme.palette.warning.main
          };
        case 'error':
          return {
            icon: <ErrorIcon fontSize="small" />,
            label: 'エラー',
            color: theme.palette.error.main
          };
      }
    };

    const config = getQualityConfig();

    return (
      <Tooltip title="センサーデータ品質">
        <Chip
          icon={config.icon}
          label={config.label}
          size="small"
          sx={{
            backgroundColor: alpha(config.color, 0.1),
            color: config.color,
            fontWeight: 'medium',
            ml: 1
          }}
        />
      </Tooltip>
    );
  };

  /**
   * エラー表示
   */
  if (error && !data) {
    return (
      <Card sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={retry}
              >
                <RefreshIcon />
              </IconButton>
            }
          >
            センサーデータの取得に失敗しました
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {error.message}
          </Typography>
        </Box>
      </Card>
    );
  }

  /**
   * ローディング表示
   */
  if (loading && !data) {
    return (
      <Card sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  return (
    <Card sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, overflow: 'auto' }}>
        {/* ヘッダー */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {renderConnectionStatus()}
            {renderDataQuality()}
            <Tooltip title="更新">
              <IconButton 
                size="small" 
                onClick={retry}
                sx={{ ml: 1 }}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* デバイス情報 */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          デバイス: {deviceId}
          {lastUpdateTime && (
            <> • 最終更新: {lastUpdateTime.toLocaleTimeString()}</>
          )}
        </Typography>

        {/* データ表示 */}
        {data ? (
          <Grid container spacing={2}>
            {weatherItems.map((item) => {
              const value = data[item.key];
              if (value === undefined || value === null) return null;

              return (
                <Grid item xs={6} sm={4} md={3} key={item.key}>
                  <Fade in={!isUpdating} timeout={300}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(item.color, 0.05),
                        border: `1px solid ${alpha(item.color, 0.2)}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: alpha(item.color, 0.1),
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[2]
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ color: item.color, mr: 1 }}>
                          {item.icon}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {item.label}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          color: item.color,
                          fontWeight: 'bold'
                        }}
                      >
                        {item.formatter ? item.formatter(value as number) : value}
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ ml: 0.5 }}
                        >
                          {item.unit}
                        </Typography>
                      </Typography>
                    </Box>
                  </Fade>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            color: 'text.secondary'
          }}>
            <Typography>データを取得中...</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};