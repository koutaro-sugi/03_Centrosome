/**
 * WeatherStatsPanel デモコンポーネント
 * 統計情報パネルの動作確認とテスト用
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  Divider
} from '@mui/material';
import { WeatherStatsPanel } from './WeatherStatsPanel';
import { StatsPeriod } from '../../types/weather';

/**
 * WeatherStatsPanelDemo メインコンポーネント
 */
export const WeatherStatsPanelDemo: React.FC = () => {
  // デモ用の状態
  const [deviceId, setDeviceId] = useState<string>('M-X-001');
  const [period, setPeriod] = useState<StatsPeriod>(StatsPeriod.HOUR);
  const [windSpeedThreshold, setWindSpeedThreshold] = useState<number>(10);
  const [customHeight, setCustomHeight] = useState<number>(600);
  const [useCustomHeight, setUseCustomHeight] = useState<boolean>(false);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        WeatherStatsPanel デモ
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        統計情報パネルコンポーネントの動作確認用デモページです。
        各種設定を変更して表示を確認できます。
      </Typography>

      <Grid container spacing={3}>
        {/* 設定パネル */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              設定
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* デバイスID */}
              <TextField
                label="デバイスID"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                fullWidth
                size="small"
              />

              {/* 統計期間 */}
              <FormControl fullWidth size="small">
                <InputLabel>統計期間</InputLabel>
                <Select
                  value={period}
                  label="統計期間"
                  onChange={(e) => setPeriod(e.target.value as StatsPeriod)}
                >
                  <MenuItem value={StatsPeriod.HOUR}>過去1時間</MenuItem>
                  <MenuItem value={StatsPeriod.DAY}>過去24時間</MenuItem>
                </Select>
              </FormControl>

              {/* 風速ハイライト閾値 */}
              <TextField
                label="風速ハイライト閾値 (m/s)"
                type="number"
                value={windSpeedThreshold}
                onChange={(e) => setWindSpeedThreshold(Number(e.target.value))}
                fullWidth
                size="small"
                inputProps={{ min: 0, max: 50, step: 0.1 }}
              />

              <Divider />

              {/* カスタム高さ設定 */}
              <FormControlLabel
                control={
                  <Switch
                    checked={useCustomHeight}
                    onChange={(e) => setUseCustomHeight(e.target.checked)}
                  />
                }
                label="カスタム高さを使用"
              />

              {useCustomHeight && (
                <TextField
                  label="高さ (px)"
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  fullWidth
                  size="small"
                  inputProps={{ min: 200, max: 1000, step: 50 }}
                />
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* 現在の設定表示 */}
            <Typography variant="subtitle2" gutterBottom>
              現在の設定:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              デバイス: {deviceId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              期間: {period === StatsPeriod.HOUR ? '過去1時間' : '過去24時間'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              風速閾値: {windSpeedThreshold}m/s
            </Typography>
            {useCustomHeight && (
              <Typography variant="body2" color="text.secondary">
                高さ: {customHeight}px
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* WeatherStatsPanel表示エリア */}
        <Grid size={{ xs: 12, md: 8 }}>
          <WeatherStatsPanel
            deviceId={deviceId}
            period={period}
            windSpeedHighlightThreshold={windSpeedThreshold}
            height={useCustomHeight ? customHeight : 'auto'}
          />
        </Grid>
      </Grid>

      {/* 使用例 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          使用例
        </Typography>
        
        <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
{`// 基本的な使用方法
<WeatherStatsPanel deviceId="M-X-001" />

// 期間とハイライト閾値を指定
<WeatherStatsPanel 
  deviceId="M-X-001" 
  period={StatsPeriod.DAY}
  windSpeedHighlightThreshold={15}
/>

// カスタム高さを指定
<WeatherStatsPanel 
  deviceId="M-X-001" 
  height={500}
/>`}
          </Typography>
        </Paper>
      </Box>

      {/* 機能説明 */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          主な機能
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                統計データ表示
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 最大・最小・平均値の表示<br/>
                • 9つの気象要素に対応<br/>
                • サンプル数の表示<br/>
                • 期間情報の表示
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                ハイライト機能
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 最大瞬間風速の警告表示<br/>
                • カスタム閾値設定<br/>
                • 視覚的なハイライト<br/>
                • 注意チップの表示
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                自動更新機能
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • 10分間隔での自動更新<br/>
                • 手動更新ボタン<br/>
                • エラー時の再試行<br/>
                • ローディング状態表示
              </Typography>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                レスポンシブ対応
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • モバイル対応レイアウト<br/>
                • カスタム高さ設定<br/>
                • グリッドレイアウト<br/>
                • ツールチップ表示
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default WeatherStatsPanelDemo;