import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { useMadoSensorData } from '../../hooks/useMadoSensorData';
import { getWindDirectionLabel } from '../../utils/madoDataAdapter';

type WeatherParamsTableProps = {
  deviceId?: string;
};

const formatNumber = (val: number | undefined, digits: number = 1) =>
  typeof val === 'number' && !Number.isNaN(val) ? val.toFixed(digits) : '-';

export const WeatherParamsTable: React.FC<WeatherParamsTableProps> = ({ deviceId = 'M-X' }) => {
  const { data, loading, error, connectionStatus } = useMadoSensorData({ deviceId, historyMinutes: 0 });

  const rows = useMemo(
    () => [
      { label: '気温', value: formatNumber(data?.temperature, 1), unit: '℃' },
      { label: '体感温度', value: formatNumber(data?.feelsLike, 1), unit: '℃' },
      { label: '湿度', value: formatNumber(data?.humidity, 0), unit: '%' },
      { label: '気圧', value: formatNumber(data?.pressure, 1), unit: 'hPa' },
      { label: '風速', value: formatNumber(data?.windSpeed, 1), unit: 'm/s' },
      {
        label: '風向',
        value:
          typeof data?.windDirection === 'number'
            ? `${data!.windDirection.toFixed(0)}° ${getWindDirectionLabel(data!.windDirection)}`
            : '-',
        unit: '',
      },
      { label: '降水量(1h)', value: formatNumber(data?.rainfall, 1), unit: 'mm' },
      { label: '照度', value: formatNumber(data?.illuminance, 0), unit: 'lux' },
      { label: '視程', value: formatNumber(data?.visibility, 1), unit: 'km' },
    ],
    [data]
  );

  const connectionChip = (
    <Chip
      size="small"
      label={connectionStatus === 'connected' ? '接続中' : '切断'}
      color={connectionStatus === 'connected' ? 'success' : 'default'}
      variant={connectionStatus === 'connected' ? 'filled' : 'outlined'}
      sx={{ ml: 1 }}
    />
  );

  return (
    <Paper elevation={0} variant="outlined">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">リアルタイム気象パラメータ</Typography>
          <Typography variant="body2" color="text.secondary">
            デバイス: {deviceId}
            {data?.timestamp ? ` • 更新: ${new Date(data.timestamp).toLocaleTimeString()}` : ''}
          </Typography>
        </Box>
        {connectionChip}
      </Box>
      <Divider />

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">データ取得中...</Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" variant="outlined">
            {error.message || 'データの取得に失敗しました'}
          </Alert>
        </Box>
      )}

      <TableContainer>
        <Table size="small" aria-label="weather-params-table">
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} hover>
                <TableCell sx={{ width: 180 }}>{row.label}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{row.value}</TableCell>
                <TableCell sx={{ width: 80, color: 'text.secondary' }}>{row.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default WeatherParamsTable;

