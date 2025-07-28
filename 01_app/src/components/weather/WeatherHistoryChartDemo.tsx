/**
 * WeatherHistoryChart デモコンポーネント
 * 開発・テスト用のデモ画面
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Divider,
  Alert
} from '@mui/material';
import { WeatherHistoryChart } from './WeatherHistoryChart';
import { WeatherDataType } from '../../types/weather';

/**
 * デモ設定の型定義
 */
interface DemoSettings {
  deviceId: string;
  initialTimeRange: number;
  initialDataType: WeatherDataType;
  height: number;
  autoRefreshInterval: number;
  enableAutoRefresh: boolean;
}

/**
 * WeatherHistoryChart デモコンポーネント
 */
export const WeatherHistoryChartDemo: React.FC = () => {
  const [settings, setSettings] = useState<DemoSettings>({
    deviceId: 'M-X-001',
    initialTimeRange: 60,
    initialDataType: WeatherDataType.TEMPERATURE,
    height: 400,
    autoRefreshInterval: 30000, // 30秒
    enableAutoRefresh: false
  });

  /**
   * 設定変更ハンドラー
   */
  const handleSettingChange = <K extends keyof DemoSettings>(
    key: K,
    value: DemoSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Typography variant="h4" component="h1" gutterBottom>
        WeatherHistoryChart デモ
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        気象データ履歴グラフコンポーネントのデモ画面です。
        各種設定を変更してコンポーネントの動作を確認できます。
      </Typography>

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={3}>
        {/* 設定パネル */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              設定
            </Typography>

            {/* デバイスID */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>デバイスID</InputLabel>
              <Select
                value={settings.deviceId}
                label="デバイスID"
                onChange={(e) => handleSettingChange('deviceId', e.target.value)}
              >
                <MenuItem value="M-X-001">M-X-001</MenuItem>
                <MenuItem value="M-X-002">M-X-002</MenuItem>
                <MenuItem value="M-X-003">M-X-003</MenuItem>
              </Select>
            </FormControl>

            {/* 初期時間範囲 */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>初期時間範囲</InputLabel>
              <Select
                value={settings.initialTimeRange}
                label="初期時間範囲"
                onChange={(e) => handleSettingChange('initialTimeRange', Number(e.target.value))}
              >
                <MenuItem value={15}>15分</MenuItem>
                <MenuItem value={30}>30分</MenuItem>
                <MenuItem value={60}>1時間</MenuItem>
                <MenuItem value={180}>3時間</MenuItem>
                <MenuItem value={360}>6時間</MenuItem>
                <MenuItem value={720}>12時間</MenuItem>
              </Select>
            </FormControl>

            {/* 初期データタイプ */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>初期データタイプ</InputLabel>
              <Select
                value={settings.initialDataType}
                label="初期データタイプ"
                onChange={(e) => handleSettingChange('initialDataType', e.target.value as WeatherDataType)}
              >
                <MenuItem value={WeatherDataType.TEMPERATURE}>気温</MenuItem>
                <MenuItem value={WeatherDataType.HUMIDITY}>湿度</MenuItem>
                <MenuItem value={WeatherDataType.PRESSURE}>気圧</MenuItem>
                <MenuItem value={WeatherDataType.WIND_SPEED}>風速</MenuItem>
                <MenuItem value={WeatherDataType.WIND_DIRECTION}>風向</MenuItem>
                <MenuItem value={WeatherDataType.RAINFALL}>降水量</MenuItem>
                <MenuItem value={WeatherDataType.ILLUMINANCE}>照度</MenuItem>
                <MenuItem value={WeatherDataType.VISIBILITY}>視程</MenuItem>
                <MenuItem value={WeatherDataType.FEELS_LIKE}>体感温度</MenuItem>
              </Select>
            </FormControl>

            {/* グラフ高さ */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>グラフ高さ</InputLabel>
              <Select
                value={settings.height}
                label="グラフ高さ"
                onChange={(e) => handleSettingChange('height', Number(e.target.value))}
              >
                <MenuItem value={300}>300px</MenuItem>
                <MenuItem value={400}>400px</MenuItem>
                <MenuItem value={500}>500px</MenuItem>
                <MenuItem value={600}>600px</MenuItem>
              </Select>
            </FormControl>

            {/* 自動更新設定 */}
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableAutoRefresh}
                  onChange={(e) => handleSettingChange('enableAutoRefresh', e.target.checked)}
                />
              }
              label="自動更新を有効にする"
              sx={{ mt: 2 }}
            />

            {settings.enableAutoRefresh && (
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>更新間隔</InputLabel>
                <Select
                  value={settings.autoRefreshInterval}
                  label="更新間隔"
                  onChange={(e) => handleSettingChange('autoRefreshInterval', Number(e.target.value))}
                >
                  <MenuItem value={10000}>10秒</MenuItem>
                  <MenuItem value={30000}>30秒</MenuItem>
                  <MenuItem value={60000}>1分</MenuItem>
                  <MenuItem value={300000}>5分</MenuItem>
                </Select>
              </FormControl>
            )}

            {/* 現在の設定表示 */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" display="block" gutterBottom>
                現在の設定:
              </Typography>
              <Typography variant="caption" display="block">
                デバイス: {settings.deviceId}
              </Typography>
              <Typography variant="caption" display="block">
                時間範囲: {settings.initialTimeRange}分
              </Typography>
              <Typography variant="caption" display="block">
                データタイプ: {settings.initialDataType}
              </Typography>
              <Typography variant="caption" display="block">
                高さ: {settings.height}px
              </Typography>
              <Typography variant="caption" display="block">
                自動更新: {settings.enableAutoRefresh ? `${settings.autoRefreshInterval/1000}秒間隔` : '無効'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* グラフ表示エリア */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 2 }}>
            {/* 注意事項 */}
            <Alert severity="info" sx={{ mb: 2 }}>
              このデモは実際のセンサーデータを使用します。
              データが存在しない場合は「データがありません」と表示されます。
              テスト環境では、モックデータを使用してください。
            </Alert>

            {/* WeatherHistoryChart コンポーネント */}
            <WeatherHistoryChart
              key={`${settings.deviceId}-${settings.initialTimeRange}-${settings.initialDataType}-${settings.height}`}
              deviceId={settings.deviceId}
              initialTimeRange={settings.initialTimeRange}
              initialDataType={settings.initialDataType}
              height={settings.height}
              autoRefreshInterval={settings.enableAutoRefresh ? settings.autoRefreshInterval : 0}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* 機能説明 */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          機能説明
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" gutterBottom>
              基本機能
            </Typography>
            <ul>
              <li>時系列グラフによる気象データ履歴表示</li>
              <li>9種類の気象要素の切り替え表示</li>
              <li>6段階の時間範囲選択（15分〜12時間）</li>
              <li>リアルタイムデータの統計情報表示</li>
            </ul>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" gutterBottom>
              操作機能
            </Typography>
            <ul>
              <li>マウスホイールによるズーム操作</li>
              <li>ドラッグによるパン操作</li>
              <li>ズームリセット機能</li>
              <li>手動データ更新機能</li>
              <li>自動更新機能（オプション）</li>
            </ul>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          対応要件
        </Typography>
        <ul>
          <li>要件2.1: 履歴データ表示と永続化</li>
          <li>要件2.4: グラフのズーム・パン操作</li>
          <li>要件4.4: レスポンシブUI設計</li>
        </ul>
      </Paper>
    </Container>
  );
};

export default WeatherHistoryChartDemo;