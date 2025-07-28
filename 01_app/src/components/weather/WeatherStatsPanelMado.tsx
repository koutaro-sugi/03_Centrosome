/**
 * WeatherStatsPanelMado コンポーネント
 * Madoセンサーデータの統計情報を表示するパネル
 */

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  ThermostatOutlined,
  OpacityOutlined,
  AirOutlined,
  CompressOutlined,
  AcUnitOutlined,
  SpeedOutlined,
  TrendingUp,
  TrendingDown
} from '@mui/icons-material';
import { useMadoSensorData } from '../../hooks/useMadoSensorData';
import { SensorData } from '../../types/weather';

/**
 * WeatherStatsPanelMadoのプロパティ
 */
interface WeatherStatsPanelMadoProps {
  /** デバイスID */
  deviceId: string;
  
  /** カードの高さ（デフォルト: auto） */
  height?: number | string;
  
  /** 最大瞬間風速のハイライト閾値（m/s、デフォルト: 10） */
  windSpeedHighlightThreshold?: number;
}

/**
 * 統計値の計算
 */
const calculateStats = (data: SensorData[]): {
  temperature: { min: number; max: number; avg: number };
  humidity: { min: number; max: number; avg: number };
  pressure: { min: number; max: number; avg: number };
  windSpeed: { min: number; max: number; avg: number; maxGust: number };
} | null => {
  if (!data || data.length === 0) return null;

  const stats = {
    temperature: { min: Infinity, max: -Infinity, sum: 0 },
    humidity: { min: Infinity, max: -Infinity, sum: 0 },
    pressure: { min: Infinity, max: -Infinity, sum: 0 },
    windSpeed: { min: Infinity, max: -Infinity, sum: 0, maxGust: 0 }
  };

  data.forEach(item => {
    // 温度
    if (item.temperature !== undefined) {
      stats.temperature.min = Math.min(stats.temperature.min, item.temperature);
      stats.temperature.max = Math.max(stats.temperature.max, item.temperature);
      stats.temperature.sum += item.temperature;
    }

    // 湿度
    if (item.humidity !== undefined) {
      stats.humidity.min = Math.min(stats.humidity.min, item.humidity);
      stats.humidity.max = Math.max(stats.humidity.max, item.humidity);
      stats.humidity.sum += item.humidity;
    }

    // 気圧
    if (item.pressure !== undefined) {
      stats.pressure.min = Math.min(stats.pressure.min, item.pressure);
      stats.pressure.max = Math.max(stats.pressure.max, item.pressure);
      stats.pressure.sum += item.pressure;
    }

    // 風速
    if (item.windSpeed !== undefined) {
      stats.windSpeed.min = Math.min(stats.windSpeed.min, item.windSpeed);
      stats.windSpeed.max = Math.max(stats.windSpeed.max, item.windSpeed);
      stats.windSpeed.sum += item.windSpeed;
      stats.windSpeed.maxGust = Math.max(stats.windSpeed.maxGust, item.windSpeed);
    }
  });

  return {
    temperature: {
      min: stats.temperature.min,
      max: stats.temperature.max,
      avg: stats.temperature.sum / data.length
    },
    humidity: {
      min: stats.humidity.min,
      max: stats.humidity.max,
      avg: stats.humidity.sum / data.length
    },
    pressure: {
      min: stats.pressure.min,
      max: stats.pressure.max,
      avg: stats.pressure.sum / data.length
    },
    windSpeed: {
      min: stats.windSpeed.min,
      max: stats.windSpeed.max,
      avg: stats.windSpeed.sum / data.length,
      maxGust: stats.windSpeed.maxGust
    }
  };
};

/**
 * WeatherStatsPanelMado コンポーネント
 */
export const WeatherStatsPanelMado: React.FC<WeatherStatsPanelMadoProps> = ({
  deviceId,
  height = 'auto',
  windSpeedHighlightThreshold = 10
}) => {
  const theme = useTheme();
  
  // Madoセンサーデータを取得（履歴1時間）
  const { historicalData, loading, error } = useMadoSensorData({
    deviceId,
    historyMinutes: 60
  });

  // 統計値を計算
  const stats = useMemo(() => {
    return calculateStats(historicalData);
  }, [historicalData]);

  /**
   * 統計項目の表示
   */
  const StatItem: React.FC<{
    icon: React.ReactElement;
    label: string;
    value: string;
    unit: string;
    color: string;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ icon, label, value, unit, color, trend }) => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{ color, mr: 1 }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        {trend && (
          <Box sx={{ ml: 'auto' }}>
            {trend === 'up' && <TrendingUp fontSize="small" color="error" />}
            {trend === 'down' && <TrendingDown fontSize="small" color="info" />}
          </Box>
        )}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
        {value}
        <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
          {unit}
        </Typography>
      </Typography>
    </Box>
  );

  if (error) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Alert severity="error">
            統計データの取得に失敗しました: {error.message}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography color="text.secondary">
            統計データがありません
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            過去1時間の統計
          </Typography>
          <Chip
            label={`${historicalData.length}件のデータ`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        <Grid container spacing={2}>
          {/* 気温統計 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.error.main, 0.05) }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                気温
              </Typography>
              <StatItem
                icon={<ThermostatOutlined />}
                label="最高"
                value={stats.temperature.max.toFixed(1)}
                unit="℃"
                color={theme.palette.error.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<AcUnitOutlined />}
                label="最低"
                value={stats.temperature.min.toFixed(1)}
                unit="℃"
                color={theme.palette.info.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<ThermostatOutlined />}
                label="平均"
                value={stats.temperature.avg.toFixed(1)}
                unit="℃"
                color={theme.palette.text.primary}
              />
            </Box>
          </Grid>

          {/* 湿度統計 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                湿度
              </Typography>
              <StatItem
                icon={<OpacityOutlined />}
                label="最高"
                value={stats.humidity.max.toFixed(0)}
                unit="%"
                color={theme.palette.info.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<OpacityOutlined />}
                label="最低"
                value={stats.humidity.min.toFixed(0)}
                unit="%"
                color={theme.palette.info.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<OpacityOutlined />}
                label="平均"
                value={stats.humidity.avg.toFixed(0)}
                unit="%"
                color={theme.palette.text.primary}
              />
            </Box>
          </Grid>

          {/* 気圧統計 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.secondary.main, 0.05) }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                気圧
              </Typography>
              <StatItem
                icon={<CompressOutlined />}
                label="最高"
                value={stats.pressure.max.toFixed(1)}
                unit="hPa"
                color={theme.palette.secondary.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<CompressOutlined />}
                label="最低"
                value={stats.pressure.min.toFixed(1)}
                unit="hPa"
                color={theme.palette.secondary.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<CompressOutlined />}
                label="平均"
                value={stats.pressure.avg.toFixed(1)}
                unit="hPa"
                color={theme.palette.text.primary}
              />
            </Box>
          </Grid>

          {/* 風速統計 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: alpha(theme.palette.success.main, 0.05) }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                風速
              </Typography>
              <StatItem
                icon={<AirOutlined />}
                label="最大瞬間"
                value={stats.windSpeed.maxGust.toFixed(1)}
                unit="m/s"
                color={
                  stats.windSpeed.maxGust >= windSpeedHighlightThreshold
                    ? theme.palette.warning.main
                    : theme.palette.success.main
                }
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<AirOutlined />}
                label="最小"
                value={stats.windSpeed.min.toFixed(1)}
                unit="m/s"
                color={theme.palette.success.main}
              />
              <Divider sx={{ my: 1 }} />
              <StatItem
                icon={<SpeedOutlined />}
                label="平均"
                value={stats.windSpeed.avg.toFixed(1)}
                unit="m/s"
                color={theme.palette.text.primary}
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};