/**
 * WeatherHistoryChart コンポーネント
 * 気象データの履歴を時系列グラフで表示
 * Chart.jsを使用してズーム・パン機能、複数気象要素の切り替え機能を提供
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip as MuiTooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ZoomOut as ZoomOutIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { SensorData, WeatherDataType } from '../../types/weather';
import { weatherApiService } from '../../services/weatherApi';
import { useWeatherCache } from '../../hooks/useWeatherCache';

// Chart.jsプラグインの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

/**
 * 気象データタイプの表示設定
 */
interface WeatherDataConfig {
  label: string;
  unit: string;
  color: string;
  backgroundColor: string;
  yAxisMin?: number;
  yAxisMax?: number;
}

/**
 * 気象データタイプ設定マップ
 */
const WEATHER_DATA_CONFIGS: Record<WeatherDataType, WeatherDataConfig> = {
  [WeatherDataType.TEMPERATURE]: {
    label: '気温',
    unit: '℃',
    color: '#e74c3c',
    backgroundColor: 'rgba(231, 76, 60, 0.1)'
  },
  [WeatherDataType.HUMIDITY]: {
    label: '湿度',
    unit: '%',
    color: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    yAxisMin: 0,
    yAxisMax: 100
  },
  [WeatherDataType.PRESSURE]: {
    label: '気圧',
    unit: 'hPa',
    color: '#9b59b6',
    backgroundColor: 'rgba(155, 89, 182, 0.1)'
  },
  [WeatherDataType.WIND_SPEED]: {
    label: '風速',
    unit: 'm/s',
    color: '#27ae60',
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    yAxisMin: 0
  },
  [WeatherDataType.WIND_DIRECTION]: {
    label: '風向',
    unit: '度',
    color: '#f39c12',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    yAxisMin: 0,
    yAxisMax: 360
  },
  [WeatherDataType.RAINFALL]: {
    label: '降水量',
    unit: 'mm',
    color: '#2980b9',
    backgroundColor: 'rgba(41, 128, 185, 0.1)',
    yAxisMin: 0
  },
  [WeatherDataType.ILLUMINANCE]: {
    label: '照度',
    unit: 'lux',
    color: '#f1c40f',
    backgroundColor: 'rgba(241, 196, 15, 0.1)',
    yAxisMin: 0
  },
  [WeatherDataType.VISIBILITY]: {
    label: '視程',
    unit: 'km',
    color: '#95a5a6',
    backgroundColor: 'rgba(149, 165, 166, 0.1)',
    yAxisMin: 0
  },
  [WeatherDataType.FEELS_LIKE]: {
    label: '体感温度',
    unit: '℃',
    color: '#e67e22',
    backgroundColor: 'rgba(230, 126, 34, 0.1)'
  }
};

/**
 * 時間範囲オプション
 */
const TIME_RANGE_OPTIONS = [
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 60, label: '1時間' },
  { value: 180, label: '3時間' },
  { value: 360, label: '6時間' },
  { value: 720, label: '12時間' }
];

/**
 * WeatherHistoryChartコンポーネントのプロパティ
 */
interface WeatherHistoryChartProps {
  /** デバイスID */
  deviceId: string;
  /** 初期表示する時間範囲（分） */
  initialTimeRange?: number;
  /** 初期表示するデータタイプ */
  initialDataType?: WeatherDataType;
  /** グラフの高さ */
  height?: number;
  /** 自動更新間隔（ミリ秒、0で無効） */
  autoRefreshInterval?: number;
}

/**
 * WeatherHistoryChart コンポーネント
 * 要件2.1, 2.4, 4.4に対応した履歴データグラフ表示
 */
const WeatherHistoryChartComponent: React.FC<WeatherHistoryChartProps> = ({
  deviceId,
  initialTimeRange = 60,
  initialDataType = WeatherDataType.TEMPERATURE,
  height = 400,
  autoRefreshInterval = 0
}) => {
  // 状態管理
  const [selectedDataType, setSelectedDataType] = useState<WeatherDataType>(initialDataType);
  const [timeRange, setTimeRange] = useState<number>(initialTimeRange);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // キャッシュ管理
  const cacheKey = `${deviceId}_history_${timeRange}`;
  const { getCachedData, setCachedData } = useWeatherCache<SensorData[]>(cacheKey, {
    ttl: 60 * 60 * 1000, // 1時間
  });

  /**
   * 履歴データの取得
   */
  const fetchHistoricalData = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);
      
      // キャッシュからデータを取得
      if (useCache) {
        const cachedData = getCachedData();
        if (cachedData && cachedData.length > 0) {
          console.log(`キャッシュから履歴データを復元: ${cachedData.length}件`);
          setHistoricalData(cachedData);
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }
      }
      
      console.log(`履歴データ取得開始: ${deviceId}, 期間: ${timeRange}分`);
      const data = await weatherApiService.getHistoricalData(deviceId, timeRange);
      
      setHistoricalData(data);
      setLastUpdated(new Date());
      
      // キャッシュに保存
      if (data.length > 0) {
        setCachedData(data);
      }
      
      console.log(`履歴データ取得完了: ${data.length}件`);
    } catch (err: any) {
      console.error('履歴データ取得エラー:', err);
      setError(err.message || '履歴データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [deviceId, timeRange, getCachedData, setCachedData]);

  /**
   * 初期データ読み込みと自動更新設定
   */
  useEffect(() => {
    fetchHistoricalData();

    // 自動更新の設定
    if (autoRefreshInterval > 0) {
      const interval = setInterval(fetchHistoricalData, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHistoricalData, autoRefreshInterval]);

  /**
   * データタイプ変更ハンドラー
   */
  const handleDataTypeChange = useCallback((event: SelectChangeEvent<WeatherDataType>) => {
    const newDataType = event.target.value as WeatherDataType;
    setSelectedDataType(newDataType);
    console.log(`データタイプ変更: ${newDataType}`);
  }, []);

  /**
   * 時間範囲変更ハンドラー
   */
  const handleTimeRangeChange = useCallback((event: SelectChangeEvent<number>) => {
    const newTimeRange = event.target.value as number;
    setTimeRange(newTimeRange);
    console.log(`時間範囲変更: ${newTimeRange}分`);
  }, []);

  /**
   * Chart.jsデータの生成
   */
  const chartData: ChartData<'line'> = useMemo(() => {
    const config = WEATHER_DATA_CONFIGS[selectedDataType];
    
    // データが存在し、選択されたデータタイプの値を持つデータのみをフィルタリング
    const validData = historicalData.filter(item => {
      const value = item[selectedDataType as keyof SensorData];
      return value !== undefined && value !== null && typeof value === 'number';
    });

    return {
      labels: validData.map(item => new Date(item.timestamp)),
      datasets: [
        {
          label: `${config.label} (${config.unit})`,
          data: validData.map(item => ({
            x: new Date(item.timestamp).getTime(),
            y: item[selectedDataType as keyof SensorData] as number
          })),
          borderColor: config.color,
          backgroundColor: config.backgroundColor,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.1
        }
      ]
    };
  }, [historicalData, selectedDataType]);

  /**
   * Chart.jsオプションの生成
   */
  const chartOptions: ChartOptions<'line'> = useMemo(() => {
    const config = WEATHER_DATA_CONFIGS[selectedDataType];
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: `${config.label}の推移 (過去${timeRange}分間)`,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top' as const,
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x);
              return format(date, 'MM/dd HH:mm:ss', { locale: ja });
            },
            label: (context) => {
              return `${config.label}: ${context.parsed.y}${config.unit}`;
            }
          }
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'x' as const,
          },
          pan: {
            enabled: true,
            mode: 'x' as const,
          }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            displayFormats: {
              minute: 'HH:mm',
              hour: 'MM/dd HH:mm'
            }
          },
          title: {
            display: true,
            text: '時刻'
          }
        },
        y: {
          title: {
            display: true,
            text: `${config.label} (${config.unit})`
          },
          min: config.yAxisMin,
          max: config.yAxisMax
        }
      }
    };
  }, [selectedDataType, timeRange]);

  /**
   * ズームリセット
   */
  const handleZoomReset = useCallback(() => {
    // Chart.jsインスタンスにアクセスしてズームをリセット
    const chartInstance = ChartJS.getChart('weather-history-chart');
    if (chartInstance) {
      chartInstance.resetZoom();
    }
  }, []);

  /**
   * 手動更新
   */
  const handleRefresh = useCallback(() => {
    // 手動リフレッシュの場合はキャッシュを使わない
    fetchHistoricalData(false);
  }, [fetchHistoricalData]);

  /**
   * データ統計の計算
   */
  const dataStats = useMemo(() => {
    if (historicalData.length === 0) return null;

    const values = historicalData
      .map(item => item[selectedDataType as keyof SensorData] as number)
      .filter(value => value !== undefined && value !== null && !isNaN(value));

    if (values.length === 0) return null;

    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    return { max, min, avg, count: values.length };
  }, [historicalData, selectedDataType]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* ヘッダー部分 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <TimelineIcon color="primary" />
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
            気象データ履歴グラフ
          </Typography>
          
          {/* 最終更新時刻 */}
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              最終更新: {format(lastUpdated, 'HH:mm:ss', { locale: ja })}
            </Typography>
          )}
        </Box>

        {/* コントロール部分 */}
        <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          {/* データタイプ選択 */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>データタイプ</InputLabel>
            <Select
              value={selectedDataType}
              label="データタイプ"
              onChange={handleDataTypeChange}
            >
              {Object.entries(WEATHER_DATA_CONFIGS).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 時間範囲選択 */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>時間範囲</InputLabel>
            <Select
              value={timeRange}
              label="時間範囲"
              onChange={handleTimeRangeChange}
            >
              {TIME_RANGE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* アクションボタン */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <MuiTooltip title="データを更新">
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={loading}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </MuiTooltip>
            
            <MuiTooltip title="ズームをリセット">
              <IconButton
                size="small"
                onClick={handleZoomReset}
                color="secondary"
              >
                <ZoomOutIcon />
              </IconButton>
            </MuiTooltip>
          </Box>
        </Stack>

        {/* 統計情報 */}
        {dataStats && (
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`最大: ${dataStats.max.toFixed(1)}${WEATHER_DATA_CONFIGS[selectedDataType].unit}`}
              size="small"
              color="error"
              variant="outlined"
            />
            <Chip
              label={`最小: ${dataStats.min.toFixed(1)}${WEATHER_DATA_CONFIGS[selectedDataType].unit}`}
              size="small"
              color="info"
              variant="outlined"
            />
            <Chip
              label={`平均: ${dataStats.avg.toFixed(1)}${WEATHER_DATA_CONFIGS[selectedDataType].unit}`}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              label={`データ数: ${dataStats.count}件`}
              size="small"
              variant="outlined"
            />
          </Stack>
        )}

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* ローディング表示 */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: height }}>
            <CircularProgress />
          </Box>
        )}

        {/* グラフ表示 */}
        {!loading && !error && (
          <Box sx={{ height: height, position: 'relative' }}>
            {historicalData.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%',
                color: 'text.secondary'
              }}>
                <Typography>
                  データがありません
                </Typography>
              </Box>
            ) : (
              <Line
                id="weather-history-chart"
                data={chartData}
                options={chartOptions}
              />
            )}
          </Box>
        )}

        {/* 操作説明 */}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          マウスホイールでズーム、ドラッグでパン操作が可能です
        </Typography>
      </CardContent>
    </Card>
  );
};

// React.memoによる最適化
export const WeatherHistoryChart = React.memo(WeatherHistoryChartComponent);

export default WeatherHistoryChart;