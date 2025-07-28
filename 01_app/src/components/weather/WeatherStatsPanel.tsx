/**
 * WeatherStatsPanel コンポーネント
 * 気象データの統計情報を表示するパネル
 * 要件3.1, 3.2, 3.3に対応
 */

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ThermostatOutlined,
  OpacityOutlined,
  AirOutlined,
  CompressOutlined,
  ExploreOutlined,
  WbSunnyOutlined,
  VisibilityOutlined,
  AcUnitOutlined,
  SpeedOutlined
} from '@mui/icons-material';
import { useWeatherStatistics } from '../../hooks/useWeatherData';
import { StatsPeriod, StatsValues } from '../../types/weather';

/**
 * WeatherStatsPanelのプロパティ
 */
interface WeatherStatsPanelProps {
  /** デバイスID */
  deviceId: string;
  
  /** 統計期間（デフォルト: HOUR） */
  period?: StatsPeriod;
  
  /** カードの高さ（デフォルト: auto） */
  height?: number | string;
  
  /** 最大瞬間風速のハイライト閾値（m/s、デフォルト: 10） */
  windSpeedHighlightThreshold?: number;
}

/**
 * 統計値表示用のアイテムコンポーネント
 */
interface StatsItemProps {
  /** アイコン */
  icon: React.ReactNode;
  
  /** ラベル */
  label: string;
  
  /** 統計値 */
  stats?: StatsValues;
  
  /** 単位 */
  unit: string;
  
  /** ハイライト表示するか */
  highlight?: boolean;
  
  /** 小数点以下の桁数 */
  precision?: number;
}

/**
 * 統計値表示アイテム
 */
const StatsItemComponent: React.FC<StatsItemProps> = ({
  icon,
  label,
  stats,
  unit,
  highlight = false,
  precision = 1
}) => {
  if (!stats) {
    return (
      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {icon}
          <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          データなし
        </Typography>
      </Box>
    );
  }

  const formatValue = (value: number) => value.toFixed(precision);

  return (
    <Box 
      sx={{ 
        textAlign: 'center', 
        py: 1,
        ...(highlight && {
          backgroundColor: 'warning.light',
          borderRadius: 1,
          border: '2px solid',
          borderColor: 'warning.main'
        })
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        {icon}
        <Typography 
          variant="body2" 
          sx={{ 
            ml: 1, 
            fontWeight: highlight ? 'bold' : 'normal',
            color: highlight ? 'warning.dark' : 'text.secondary'
          }}
        >
          {label}
        </Typography>
        {highlight && (
          <Chip 
            label="注意" 
            size="small" 
            color="warning" 
            sx={{ ml: 1, fontSize: '0.7rem' }}
          />
        )}
      </Box>
      
      <Grid container spacing={1}>
        <Grid size={4}>
          <Tooltip title="最大値">
            <Box>
              <Typography 
                variant="caption" 
                color={highlight ? 'warning.dark' : 'text.secondary'}
              >
                最大
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight={highlight ? 'bold' : 'normal'}
                color={highlight ? 'warning.dark' : 'text.primary'}
              >
                {formatValue(stats.max)}{unit}
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
        
        <Grid size={4}>
          <Tooltip title="平均値">
            <Box>
              <Typography 
                variant="caption" 
                color={highlight ? 'warning.dark' : 'text.secondary'}
              >
                平均
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight={highlight ? 'bold' : 'normal'}
                color={highlight ? 'warning.dark' : 'text.primary'}
              >
                {formatValue(stats.avg)}{unit}
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
        
        <Grid size={4}>
          <Tooltip title="最小値">
            <Box>
              <Typography 
                variant="caption" 
                color={highlight ? 'warning.dark' : 'text.secondary'}
              >
                最小
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight={highlight ? 'bold' : 'normal'}
                color={highlight ? 'warning.dark' : 'text.primary'}
              >
                {formatValue(stats.min)}{unit}
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
    </Box>
  );
};

// StatsItemコンポーネントのメモ化
const StatsItem = React.memo(StatsItemComponent);

/**
 * WeatherStatsPanel メインコンポーネント
 */
const WeatherStatsPanelComponent: React.FC<WeatherStatsPanelProps> = ({
  deviceId,
  period = StatsPeriod.HOUR,
  height = 'auto',
  windSpeedHighlightThreshold = 10
}) => {
  // 統計データを取得（10分間隔で自動更新）
  const {
    statisticsData,
    statisticsLoading,
    statisticsError,
    refetchStatistics
  } = useWeatherStatistics(deviceId, period);

  // 最大瞬間風速のハイライト判定
  const shouldHighlightWindSpeed = useMemo(() => {
    return statisticsData?.windSpeed && 
           statisticsData.windSpeed.max >= windSpeedHighlightThreshold;
  }, [statisticsData?.windSpeed, windSpeedHighlightThreshold]);

  // 期間の表示名
  const periodLabel = period === StatsPeriod.HOUR ? '過去1時間' : '過去24時間';

  // ローディング状態
  if (statisticsLoading) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="body2" color="text.secondary">
              統計データを読み込み中...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // エラー状態
  if (statisticsError) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <Typography 
                variant="body2" 
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={refetchStatistics}
              >
                再試行
              </Typography>
            }
          >
            統計データの取得に失敗しました
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // データなし状態
  if (!statisticsData) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              {periodLabel}の統計データがありません
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ cursor: 'pointer', textDecoration: 'underline', mt: 1 }}
              onClick={refetchStatistics}
            >
              再読み込み
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height }}>
      <CardContent>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2">
            統計情報
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={periodLabel} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={`${statisticsData.samples}サンプル`} 
              size="small" 
              color="primary"
            />
          </Box>
        </Box>

        {/* 最大瞬間風速の警告表示 */}
        {shouldHighlightWindSpeed && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              最大瞬間風速が{windSpeedHighlightThreshold}m/sを超えています
              （{statisticsData.windSpeed?.max.toFixed(1)}m/s）
            </Typography>
          </Alert>
        )}

        {/* 統計データグリッド */}
        <Grid container spacing={2}>
          {/* 気温 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<ThermostatOutlined color="primary" />}
              label="気温"
              stats={statisticsData.temperature}
              unit="°C"
            />
          </Grid>

          {/* 湿度 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<OpacityOutlined color="info" />}
              label="湿度"
              stats={statisticsData.humidity}
              unit="%"
            />
          </Grid>

          {/* 風速（ハイライト対象） */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<AirOutlined color={shouldHighlightWindSpeed ? 'warning' : 'success'} />}
              label="風速"
              stats={statisticsData.windSpeed}
              unit="m/s"
              highlight={shouldHighlightWindSpeed}
            />
          </Grid>

          {/* 気圧 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<CompressOutlined color="secondary" />}
              label="気圧"
              stats={statisticsData.pressure}
              unit="hPa"
              precision={0}
            />
          </Grid>

          {/* 風向 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<ExploreOutlined color="primary" />}
              label="風向"
              stats={statisticsData.windDirection}
              unit="°"
              precision={0}
            />
          </Grid>

          {/* 照度 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<WbSunnyOutlined color="warning" />}
              label="照度"
              stats={statisticsData.illuminance}
              unit="lux"
              precision={0}
            />
          </Grid>

          {/* 視程 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<VisibilityOutlined color="info" />}
              label="視程"
              stats={statisticsData.visibility}
              unit="km"
            />
          </Grid>

          {/* 体感温度 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<AcUnitOutlined color="primary" />}
              label="体感温度"
              stats={statisticsData.feelsLike}
              unit="°C"
            />
          </Grid>

          {/* 降水量 */}
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsItem
              icon={<SpeedOutlined color="info" />}
              label="降水量"
              stats={statisticsData.rainfall}
              unit="mm"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* フッター情報 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            期間: {new Date(statisticsData.startTime).toLocaleString()} 〜 {new Date(statisticsData.endTime).toLocaleString()}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={refetchStatistics}
          >
            更新
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

// React.memoによる最適化
// propsが変更されない限り再レンダリングを防ぐ
export const WeatherStatsPanel = React.memo(WeatherStatsPanelComponent);

export default WeatherStatsPanel;