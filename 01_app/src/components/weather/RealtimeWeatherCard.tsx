/**
 * RealtimeWeatherCard コンポーネント
 * リアルタイム気象データの表示とWebSocket接続状態管理
 * 要件1.1, 1.3, 5.2に対応
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
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
import {
  Refresh as RefreshIcon,
  WifiOff as WifiOffIcon,
  Wifi as WifiIcon,
  Warning as WarningIcon,
  ThermostatAuto as TemperatureIcon,
  Water as HumidityIcon,
  Speed as PressureIcon,
  Air as WindIcon,
  Visibility as VisibilityIcon,
  WbSunny as IlluminanceIcon,
  CloudQueue as RainfallIcon,
  Thermostat as FeelsLikeIcon
} from '@mui/icons-material';
import { useWeatherData } from '../../hooks/useWeatherData';
import { SensorData, ConnectionStatus } from '../../types/weather';

/**
 * RealtimeWeatherCardのプロパティ
 */
interface RealtimeWeatherCardProps {
  /** デバイスID */
  deviceId: string;
  /** カードのタイトル */
  title?: string;
  /** 高さ（px） */
  height?: number;
  /** 更新アニメーションを有効にするか */
  enableAnimation?: boolean;
  /** エラー時の自動再接続を有効にするか */
  enableAutoReconnect?: boolean;
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
 * RealtimeWeatherCard コンポーネント
 * リアルタイム気象データを表示し、WebSocket接続状態を管理
 */
const RealtimeWeatherCardComponent: React.FC<RealtimeWeatherCardProps> = ({
  deviceId,
  title = 'リアルタイム気象データ',
  height = 400,
  enableAnimation = true,
  enableAutoReconnect = true
}) => {
  const theme = useTheme();
  
  // 気象データフックを使用
  const {
    data,
    loading,
    error,
    connectionStatus,
    retry
  } = useWeatherData({
    deviceId,
    enableRealtime: true,
    enableAutoRetry: enableAutoReconnect
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
      unit: '°',
      icon: <WindIcon />,
      color: theme.palette.success.main,
      formatter: (value) => value.toFixed(0)
    },
    {
      key: 'rainfall',
      label: '降水量',
      unit: 'mm',
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
      formatter: (value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0)
    },
    {
      key: 'visibility',
      label: '視程',
      unit: 'km',
      icon: <VisibilityIcon />,
      color: theme.palette.info.main,
      formatter: (value) => value.toFixed(1)
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
   * データ更新時のアニメーション効果
   */
  useEffect(() => {
    if (data && enableAnimation) {
      setIsUpdating(true);
      setLastUpdateTime(new Date());
      
      const timer = setTimeout(() => {
        setIsUpdating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [data, enableAnimation]);

  /**
   * 接続状態に応じたチップの色とアイコンを取得
   */
  const getConnectionStatusChip = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          color: 'success' as const,
          icon: <WifiIcon fontSize="small" />,
          label: '接続中'
        };
      case 'reconnecting':
        return {
          color: 'warning' as const,
          icon: <CircularProgress size={16} />,
          label: '再接続中'
        };
      case 'disconnected':
      default:
        return {
          color: 'error' as const,
          icon: <WifiOffIcon fontSize="small" />,
          label: '切断'
        };
    }
  };

  /**
   * 最終更新時刻のフォーマット
   */
  const formatLastUpdate = (date: Date | null): string => {
    if (!date) return '未更新';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds}秒前`;
    } else if (diffSeconds < 3600) {
      return `${Math.floor(diffSeconds / 60)}分前`;
    } else {
      return date.toLocaleTimeString('ja-JP');
    }
  };

  /**
   * 気象データ項目の表示コンポーネント
   */
  const WeatherDataDisplay: React.FC<{ item: WeatherDataItem; value?: number }> = ({ item, value }) => (
    <Fade in={true} timeout={enableAnimation ? 300 : 0}>
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: alpha(item.color, 0.1),
          border: `1px solid ${alpha(item.color, 0.2)}`,
          transition: theme.transitions.create(['transform', 'box-shadow'], {
            duration: theme.transitions.duration.short,
          }),
          transform: isUpdating ? 'scale(1.02)' : 'scale(1)',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: theme.shadows[4]
          }
        }}
      >
        <Box display="flex" alignItems="center" mb={1}>
          <Box sx={{ color: item.color, mr: 1 }}>
            {item.icon}
          </Box>
          <Typography variant="body2" color="textSecondary">
            {item.label}
          </Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            color: value !== undefined ? 'text.primary' : 'text.disabled'
          }}
        >
          {value !== undefined ? (
            <>
              {item.formatter ? item.formatter(value) : value.toFixed(1)}
              <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                {item.unit}
              </Typography>
            </>
          ) : (
            '---'
          )}
        </Typography>
      </Box>
    </Fade>
  );

  const statusChip = getConnectionStatusChip(connectionStatus);

  return (
    <Card
      sx={{
        height,
        display: 'flex',
        flexDirection: 'column',
        transition: theme.transitions.create(['box-shadow'], {
          duration: theme.transitions.duration.short,
        }),
        boxShadow: isUpdating ? theme.shadows[8] : theme.shadows[2]
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.05)
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={statusChip.icon}
              label={statusChip.label}
              color={statusChip.color}
              size="small"
              variant="outlined"
            />
            <Tooltip title="データを再取得">
              <span>
                <IconButton
                  onClick={retry}
                  disabled={loading}
                  size="small"
                  sx={{
                    animation: loading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
        
        {/* デバイス情報と最終更新時刻 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="body2" color="textSecondary">
            デバイス: {deviceId}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            最終更新: {formatLastUpdate(data ? new Date(data.timestamp) : lastUpdateTime)}
          </Typography>
        </Box>
      </Box>

      {/* コンテンツ */}
      <CardContent sx={{ flex: 1, overflow: 'auto' }}>
        {/* エラー表示 */}
        {error && (
          <Alert
            severity="error"
            icon={<WarningIcon />}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={retry}
              >
                <RefreshIcon />
              </IconButton>
            }
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              データ取得エラー: {error.message}
            </Typography>
          </Alert>
        )}

        {/* ローディング表示 */}
        {loading && !data && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%' }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body2" color="textSecondary">
              データを読み込み中...
            </Typography>
          </Box>
        )}

        {/* 気象データ表示 */}
        {!loading && (
          <Grid container spacing={2}>
            {weatherItems.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.key}>
                <WeatherDataDisplay
                  item={item}
                  value={data?.[item.key] as number | undefined}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {/* データなし表示 */}
        {!loading && !data && !error && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{ height: '100%' }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              データがありません
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              デバイス「{deviceId}」からのデータを待機中です
            </Typography>
            <IconButton onClick={retry} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// React.memoによる最適化
export const RealtimeWeatherCard = React.memo(RealtimeWeatherCardComponent);

export default RealtimeWeatherCard;