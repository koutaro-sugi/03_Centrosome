import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { useUASPorts } from '../hooks/useUASPorts';
import { UASPort } from '../types/uasport';

interface UASPortSelectorProps {
  label: string;
  value?: string;
  onChange: (port: UASPort | null) => void;
  disabled?: boolean;
  excludePortCode?: string; // 除外するポートコード（出発地と目的地を同じにしないため）
}

export const UASPortSelector: React.FC<UASPortSelectorProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  excludePortCode,
}) => {
  const { ports, loading, error } = useUASPorts();
  const [selectedPort, setSelectedPort] = useState<UASPort | null>(null);

  // ポートコードが変更されたらポートオブジェクトを更新
  useEffect(() => {
    if (value && ports.length > 0) {
      const port = ports.find(p => p.uaport_code === value);
      setSelectedPort(port || null);
    } else {
      setSelectedPort(null);
    }
  }, [value, ports]);

  const handleChange = (event: SelectChangeEvent<string>) => {
    const portCode = event.target.value;
    if (portCode) {
      const port = ports.find(p => p.uaport_code === portCode);
      if (port) {
        setSelectedPort(port);
        onChange(port);
      }
    } else {
      setSelectedPort(null);
      onChange(null);
    }
  };

  // 除外ポートコードを考慮したポートリスト
  const availablePorts = excludePortCode 
    ? ports.filter(p => p.uaport_code !== excludePortCode && p.status === 'ACTIVE')
    : ports.filter(p => p.status === 'ACTIVE');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading ports...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ''}
        onChange={handleChange}
        label={label}
        startAdornment={
          selectedPort && (
            <Chip
              icon={<LocationOn />}
              label={`${selectedPort.uaport_code} - ${selectedPort.common_name}`}
              size="small"
              color="primary"
              sx={{ mr: 1 }}
            />
          )
        }
      >
        <MenuItem value="">
          <em>Select a port</em>
        </MenuItem>
        {availablePorts.map((port) => (
          <MenuItem 
            key={port.uaport_code} 
            value={port.uaport_code}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {port.uaport_code}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ({port.common_name})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                {port.full_address}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
      {selectedPort && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 0.5, ml: 1 }}
        >
          Coordinates: {selectedPort.location.lat.toFixed(6)}, {selectedPort.location.lon.toFixed(6)}
        </Typography>
      )}
    </FormControl>
  );
};