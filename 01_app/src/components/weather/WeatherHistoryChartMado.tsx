/**
 * WeatherHistoryChartMado コンポーネント
 * Madoセンサーの履歴データグラフ表示
 */

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useMadoSensorData } from '../../hooks/useMadoSensorData';
import { SensorData } from '../../types/weather';

/**
 * WeatherHistoryChartMadoのプロパティ
 */
interface WeatherHistoryChartMadoProps {
  /** デバイスID */
  deviceId: string;
  
  /** 初期の時間範囲（分） */
  initialTimeRange?: number;
  
  /** グラフの高さ */
  height?: number;
  
  /** カスタムタイトル */
  title?: string;
}

/**
 * データポイントの型
 */
interface ChartDataPoint {
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  rainfall: number;
}

/**
 * 表示する気象パラメータ
 */
type WeatherParameter = 'temperature' | 'humidity' | 'pressure' | 'windSpeed' | 'rainfall';

/**
 * WeatherHistoryChartMado コンポーネント
 */
export const WeatherHistoryChartMado: React.FC<WeatherHistoryChartMadoProps> = ({
  deviceId,
  initialTimeRange = 180,
  height = 400,
  title = '気象データ履歴'
}) => {
  const theme = useTheme();
  
  // 時間範囲と表示パラメータの状態
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [selectedParams, setSelectedParams] = useState<WeatherParameter[]>(['temperature', 'humidity']);
  
  // Madoセンサーデータを取得
  const { historicalData, loading, error } = useMadoSensorData({
    deviceId,
    historyMinutes: timeRange
  });

  /**
   * グラフ用データの変換
   */
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!historicalData || historicalData.length === 0) return [];

    return historicalData.map((data: SensorData) => ({
      time: new Date(data.timestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      temperature: data.temperature !== undefined ? Number(data.temperature.toFixed(1)) : 0,
      humidity: data.humidity !== undefined ? Number(data.humidity.toFixed(0)) : 0,
      pressure: data.pressure !== undefined ? Number(data.pressure.toFixed(1)) : 0,
      windSpeed: data.windSpeed !== undefined ? Number(data.windSpeed.toFixed(1)) : 0,
      rainfall: data.rainfall !== undefined ? Number(data.rainfall.toFixed(1)) : 0
    }));
  }, [historicalData]);

  /**
   * パラメータ設定
   */
  const parameterConfig = {
    temperature: {
      label: '気温',
      unit: '℃',
      color: theme.palette.error.main,
      yAxisId: 'left'
    },
    humidity: {
      label: '湿度',
      unit: '%',
      color: theme.palette.info.main,
      yAxisId: 'right'
    },
    pressure: {
      label: '気圧',
      unit: 'hPa',
      color: theme.palette.secondary.main,
      yAxisId: 'left'
    },
    windSpeed: {
      label: '風速',
      unit: 'm/s',
      color: theme.palette.success.main,
      yAxisId: 'right'
    },
    rainfall: {
      label: '降水量',
      unit: 'mm/h',
      color: theme.palette.primary.main,
      yAxisId: 'right'
    }
  };

  /**
   * 時間範囲の変更
   */
  const handleTimeRangeChange = (event: SelectChangeEvent<number>) => {
    setTimeRange(Number(event.target.value));
  };

  /**
   * 表示パラメータの変更
   */
  const handleParamChange = (_event: React.MouseEvent<HTMLElement>, newParams: WeatherParameter[]) => {
    if (newParams.length > 0) {
      setSelectedParams(newParams);
    }
  };

  /**
   * カスタムツールチップ
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            boxShadow: theme.shadows[3]
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          {payload.map((entry: any) => {
            const config = parameterConfig[entry.dataKey as WeatherParameter];
            return (
              <Box key={entry.dataKey} sx={{ mt: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: entry.color, fontWeight: 'medium' }}
                >
                  {config.label}: {entry.value} {config.unit}
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    }
    return null;
  };

  if (error) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Alert severity="error">
            履歴データの取得に失敗しました: {error.message}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          
          {/* 時間範囲選択 */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              displayEmpty
            >
              <MenuItem value={60}>1時間</MenuItem>
              <MenuItem value={180}>3時間</MenuItem>
              <MenuItem value={360}>6時間</MenuItem>
              <MenuItem value={720}>12時間</MenuItem>
              <MenuItem value={1440}>24時間</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* パラメータ選択 */}
        <ToggleButtonGroup
          value={selectedParams}
          onChange={handleParamChange}
          size="small"
          sx={{ mb: 2 }}
        >
          {Object.entries(parameterConfig).map(([key, config]) => (
            <ToggleButton
              key={key}
              value={key}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: alpha(config.color, 0.1),
                  color: config.color,
                  '&:hover': {
                    backgroundColor: alpha(config.color, 0.2)
                  }
                }
              }}
            >
              {config.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* グラフ */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          {loading ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%'
            }}>
              <CircularProgress />
            </Box>
          ) : chartData.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%'
            }}>
              <Typography color="text.secondary">
                データがありません
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis
                  dataKey="time"
                  stroke={theme.palette.text.secondary}
                  tick={{ fontSize: 12 }}
                />
                
                {/* 左側Y軸 */}
                <YAxis
                  yAxisId="left"
                  stroke={theme.palette.text.secondary}
                  tick={{ fontSize: 12 }}
                />
                
                {/* 右側Y軸 */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={theme.palette.text.secondary}
                  tick={{ fontSize: 12 }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="line"
                />
                
                {/* 各パラメータのライン */}
                {selectedParams.map(param => {
                  const config = parameterConfig[param];
                  return (
                    <Line
                      key={param}
                      yAxisId={config.yAxisId}
                      type="monotone"
                      dataKey={param}
                      stroke={config.color}
                      strokeWidth={2}
                      name={`${config.label} (${config.unit})`}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  );
                })}
                
                {/* 基準線（例：気温0度） */}
                {selectedParams.includes('temperature') && (
                  <ReferenceLine
                    yAxisId="left"
                    y={0}
                    stroke={theme.palette.divider}
                    strokeDasharray="5 5"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};