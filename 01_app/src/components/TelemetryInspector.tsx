import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Typography,
  Chip,
} from '@mui/material';
import {
  Sort as SortIcon,
  SortByAlpha as AlphaIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { TelemetryData } from '../types/mavlink';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface TelemetryInspectorProps {
  telemetry: TelemetryData;
  messageCount: number;
}

type SortMode = 'alpha' | 'recent' | 'none';

interface TelemetryItem {
  key: string;
  value: any;
  label: string;
  unit?: string;
  category: string;
  lastUpdate?: number;
}

// テレメトリ項目のメタデータ
const telemetryMetadata: Record<string, { label: string; unit?: string; category: string }> = {
  // System
  connected: { label: 'Connected', category: 'System' },
  armed: { label: 'Armed', category: 'System' },
  flightMode: { label: 'Flight Mode', category: 'System' },
  systemStatus: { label: 'System Status', category: 'System' },
  systemLoad: { label: 'CPU Load', unit: '%', category: 'System' },
  
  // Time
  timeUnixUsec: { label: 'Unix Time', unit: 'μs', category: 'Time' },
  timeBootMs: { label: 'Boot Time', unit: 'ms', category: 'Time' },
  
  // Position
  lat: { label: 'Latitude', unit: '°', category: 'Position' },
  lon: { label: 'Longitude', unit: '°', category: 'Position' },
  alt: { label: 'Altitude MSL', unit: 'm', category: 'Position' },
  relativeAlt: { label: 'Altitude Rel', unit: 'm', category: 'Position' },
  altitudeAmsl: { label: 'Altitude AMSL', unit: 'm', category: 'Position' },
  altitudeLocal: { label: 'Altitude Local', unit: 'm', category: 'Position' },
  altitudeTerrain: { label: 'Altitude Terrain', unit: 'm', category: 'Position' },
  bottomClearance: { label: 'Bottom Clearance', unit: 'm', category: 'Position' },
  
  // Local Position
  localX: { label: 'Local X', unit: 'm', category: 'Local Position' },
  localY: { label: 'Local Y', unit: 'm', category: 'Local Position' },
  localZ: { label: 'Local Z', unit: 'm', category: 'Local Position' },
  localVx: { label: 'Local Vx', unit: 'm/s', category: 'Local Position' },
  localVy: { label: 'Local Vy', unit: 'm/s', category: 'Local Position' },
  localVz: { label: 'Local Vz', unit: 'm/s', category: 'Local Position' },
  
  // Attitude
  roll: { label: 'Roll', unit: '°', category: 'Attitude' },
  pitch: { label: 'Pitch', unit: '°', category: 'Attitude' },
  yaw: { label: 'Yaw', unit: '°', category: 'Attitude' },
  rollSpeed: { label: 'Roll Rate', unit: 'rad/s', category: 'Attitude' },
  pitchSpeed: { label: 'Pitch Rate', unit: 'rad/s', category: 'Attitude' },
  yawSpeed: { label: 'Yaw Rate', unit: 'rad/s', category: 'Attitude' },
  q1: { label: 'Quaternion W', category: 'Attitude' },
  q2: { label: 'Quaternion X', category: 'Attitude' },
  q3: { label: 'Quaternion Y', category: 'Attitude' },
  q4: { label: 'Quaternion Z', category: 'Attitude' },
  
  // Velocity
  groundSpeed: { label: 'Ground Speed', unit: 'm/s', category: 'Velocity' },
  airSpeed: { label: 'Air Speed', unit: 'm/s', category: 'Velocity' },
  verticalSpeed: { label: 'Vertical Speed', unit: 'm/s', category: 'Velocity' },
  heading: { label: 'Heading', unit: '°', category: 'Velocity' },
  
  // Airspeed Details
  diffPressure: { label: 'Diff Pressure', unit: 'Pa', category: 'Airspeed' },
  EAS2TAS: { label: 'EAS to TAS', category: 'Airspeed' },
  airspeedRatio: { label: 'Airspeed Ratio', category: 'Airspeed' },
  AOA: { label: 'Angle of Attack', unit: '°', category: 'Airspeed' },
  SSA: { label: 'Sideslip Angle', unit: '°', category: 'Airspeed' },
  airspeedTemperature: { label: 'Airspeed Temp', unit: '°C', category: 'Airspeed' },
  airspeedRawPress: { label: 'Raw Pressure', unit: 'Pa', category: 'Airspeed' },
  airspeedFlags: { label: 'Airspeed Flags', category: 'Airspeed' },
  
  // Battery
  voltage: { label: 'Voltage', unit: 'V', category: 'Battery' },
  current: { label: 'Current', unit: 'A', category: 'Battery' },
  batteryRemaining: { label: 'Battery', unit: '%', category: 'Battery' },
  powerVcc: { label: 'Vcc', unit: 'mV', category: 'Battery' },
  powerVservo: { label: 'Vservo', unit: 'mV', category: 'Battery' },
  powerFlags: { label: 'Power Flags', category: 'Battery' },
  
  // GPS
  satellites: { label: 'Satellites', category: 'GPS' },
  hdop: { label: 'HDOP', category: 'GPS' },
  vdop: { label: 'VDOP', category: 'GPS' },
  fixType: { label: 'Fix Type', category: 'GPS' },
  gps2Satellites: { label: 'GPS2 Satellites', category: 'GPS' },
  gps2FixType: { label: 'GPS2 Fix Type', category: 'GPS' },
  
  // Navigation
  navRoll: { label: 'Nav Roll', unit: '°', category: 'Navigation' },
  navPitch: { label: 'Nav Pitch', unit: '°', category: 'Navigation' },
  navBearing: { label: 'Nav Bearing', unit: '°', category: 'Navigation' },
  targetBearing: { label: 'Target Bearing', unit: '°', category: 'Navigation' },
  wpDistance: { label: 'WP Distance', unit: 'm', category: 'Navigation' },
  altError: { label: 'Alt Error', unit: 'm', category: 'Navigation' },
  aspdError: { label: 'Airspeed Error', unit: 'm/s', category: 'Navigation' },
  xtrackError: { label: 'XTrack Error', unit: 'm', category: 'Navigation' },
  
  // Mission
  missionCurrent: { label: 'Current Mission', category: 'Mission' },
  missionItemReached: { label: 'Mission Reached', category: 'Mission' },
  
  // Servo/RC
  servo1: { label: 'Servo 1', category: 'Servo' },
  servo2: { label: 'Servo 2', category: 'Servo' },
  servo3: { label: 'Servo 3', category: 'Servo' },
  servo4: { label: 'Servo 4', category: 'Servo' },
  servo5: { label: 'Servo 5', category: 'Servo' },
  servo6: { label: 'Servo 6', category: 'Servo' },
  servo7: { label: 'Servo 7', category: 'Servo' },
  servo8: { label: 'Servo 8', category: 'Servo' },
  rcChan1: { label: 'RC Chan 1', category: 'RC' },
  rcChan2: { label: 'RC Chan 2', category: 'RC' },
  rcChan3: { label: 'RC Chan 3', category: 'RC' },
  rcChan4: { label: 'RC Chan 4', category: 'RC' },
  rcChan5: { label: 'RC Chan 5', category: 'RC' },
  rcChan6: { label: 'RC Chan 6', category: 'RC' },
  rcChan7: { label: 'RC Chan 7', category: 'RC' },
  rcChan8: { label: 'RC Chan 8', category: 'RC' },
  rcRssi: { label: 'RC RSSI', category: 'RC' },
  
  // IMU
  xacc: { label: 'X Accel', unit: 'm/s²', category: 'IMU' },
  yacc: { label: 'Y Accel', unit: 'm/s²', category: 'IMU' },
  zacc: { label: 'Z Accel', unit: 'm/s²', category: 'IMU' },
  xgyro: { label: 'X Gyro', unit: 'rad/s', category: 'IMU' },
  ygyro: { label: 'Y Gyro', unit: 'rad/s', category: 'IMU' },
  zgyro: { label: 'Z Gyro', unit: 'rad/s', category: 'IMU' },
  xmag: { label: 'X Mag', unit: 'gauss', category: 'IMU' },
  ymag: { label: 'Y Mag', unit: 'gauss', category: 'IMU' },
  zmag: { label: 'Z Mag', unit: 'gauss', category: 'IMU' },
  
  // Pressure
  pressAbs: { label: 'Pressure Abs', unit: 'hPa', category: 'Pressure' },
  pressDiff: { label: 'Pressure Diff', unit: 'hPa', category: 'Pressure' },
  temperature: { label: 'Temperature', unit: '°C', category: 'Pressure' },
  
  // Wind
  windDirection: { label: 'Wind Direction', unit: '°', category: 'Wind' },
  windSpeed: { label: 'Wind Speed', unit: 'm/s', category: 'Wind' },
  windSpeedZ: { label: 'Wind Speed Z', unit: 'm/s', category: 'Wind' },
  
  // Rangefinder
  rangefinderDistance: { label: 'Range Distance', unit: 'm', category: 'Rangefinder' },
  rangefinderVoltage: { label: 'Range Voltage', unit: 'V', category: 'Rangefinder' },
  
  // AHRS
  ahrsOmegaIx: { label: 'AHRS Omega Ix', category: 'AHRS' },
  ahrsOmegaIy: { label: 'AHRS Omega Iy', category: 'AHRS' },
  ahrsOmegaIz: { label: 'AHRS Omega Iz', category: 'AHRS' },
  ahrsAccelWeight: { label: 'AHRS Accel Weight', category: 'AHRS' },
  ahrsRenormVal: { label: 'AHRS Renorm Val', category: 'AHRS' },
  ahrsErrorRp: { label: 'AHRS Error RP', category: 'AHRS' },
  ahrsErrorYaw: { label: 'AHRS Error Yaw', category: 'AHRS' },
  
  // Vibration
  vibrationX: { label: 'Vibration X', category: 'Vibration' },
  vibrationY: { label: 'Vibration Y', category: 'Vibration' },
  vibrationZ: { label: 'Vibration Z', category: 'Vibration' },
  clipping0: { label: 'Clipping 0', category: 'Vibration' },
  clipping1: { label: 'Clipping 1', category: 'Vibration' },
  clipping2: { label: 'Clipping 2', category: 'Vibration' },
  
  // Home
  homeLatitude: { label: 'Home Latitude', unit: '°', category: 'Home' },
  homeLongitude: { label: 'Home Longitude', unit: '°', category: 'Home' },
  homeAltitude: { label: 'Home Altitude', unit: 'm', category: 'Home' },
  
  // Hardware
  hwVcc: { label: 'HW Vcc', unit: 'mV', category: 'Hardware' },
  hwI2cErr: { label: 'HW I2C Errors', category: 'Hardware' },
  memFree: { label: 'Free Memory', unit: 'bytes', category: 'Hardware' },
  
  // Terrain
  terrainHeight: { label: 'Terrain Height', unit: 'm', category: 'Terrain' },
  terrainCurrentHeight: { label: 'Current Height', unit: 'm', category: 'Terrain' },
  
  // EKF
  ekfFlags: { label: 'EKF Flags', category: 'EKF' },
  ekfVelocityVariance: { label: 'EKF Vel Variance', category: 'EKF' },
  ekfPosHorizVariance: { label: 'EKF Pos H Variance', category: 'EKF' },
  ekfPosVertVariance: { label: 'EKF Pos V Variance', category: 'EKF' },
  ekfCompassVariance: { label: 'EKF Compass Variance', category: 'EKF' },
  ekfTerrainAltVariance: { label: 'EKF Terrain Variance', category: 'EKF' },
  
  // Other
  throttle: { label: 'Throttle', unit: '%', category: 'Other' },
  distanceToHome: { label: 'Distance to Home', unit: 'm', category: 'Other' },
  flightDistance: { label: 'Flight Distance', unit: 'm', category: 'Other' },
  nextWpDistance: { label: 'Next WP Distance', unit: 'm', category: 'Other' },
  flightTime: { label: 'Flight Time', unit: 's', category: 'Other' },
};

const formatValue = (value: any, key: string): string => {
  if (value === undefined || value === null) return 'N/A';
  
  // Boolean values
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Special formatting for specific fields
  if (key === 'lat' || key === 'lon' || key === 'homeLatitude' || key === 'homeLongitude') {
    return value.toFixed(7);
  }
  
  if (key === 'fixType' || key === 'gps2FixType') {
    const fixTypes = ['No GPS', 'No Fix', '2D Fix', '3D Fix', 'DGPS', 'RTK Float', 'RTK Fixed'];
    return fixTypes[value] || `Unknown (${value})`;
  }
  
  if (key === 'systemStatus') {
    const statuses = ['Uninit', 'Boot', 'Calibrating', 'Standby', 'Active', 'Critical', 'Emergency', 'Poweroff'];
    return statuses[value] || `Unknown (${value})`;
  }
  
  // Numeric values
  if (typeof value === 'number') {
    // EKF系の大きな値は科学的記数法で表示
    if (key.toLowerCase().includes('ekf') || key.toLowerCase().includes('variance')) {
      if (Math.abs(value) >= 1e6) {
        return value.toExponential(2);
      } else if (Math.abs(value) >= 0.01) {
        return value.toFixed(4);
      } else {
        return value.toExponential(2);
      }
    }
    
    // その他の数値
    if (Number.isInteger(value)) {
      return value.toString();
    }
    
    // 通常の小数
    if (Math.abs(value) >= 1000000) {
      return value.toExponential(2);
    }
    return value.toFixed(2);
  }
  
  return String(value);
};

export const TelemetryInspector: React.FC<TelemetryInspectorProps> = ({ telemetry, messageCount }) => {
  const [sortMode, setSortMode] = useLocalStorage<SortMode>('telemetry_inspector_sort_mode', 'alpha');
  const [searchTerm, setSearchTerm] = useLocalStorage('telemetry_inspector_search_term', '');
  
  // テレメトリデータを表示用に変換
  const telemetryItems = useMemo(() => {
    const items: TelemetryItem[] = [];
    
    Object.entries(telemetry).forEach(([key, value]) => {
      if (value !== undefined && key !== 'lastHeartbeat') {
        const metadata = telemetryMetadata[key] || { 
          label: key, 
          category: 'Unknown' 
        };
        
        items.push({
          key,
          value,
          label: metadata.label,
          unit: metadata.unit,
          category: metadata.category,
        });
      }
    });
    
    // フィルタリング
    const filtered = items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // ソート
    if (sortMode === 'alpha') {
      filtered.sort((a, b) => {
        // カテゴリでソート、同じカテゴリ内ではラベルでソート
        const categoryCompare = a.category.localeCompare(b.category);
        if (categoryCompare !== 0) return categoryCompare;
        return a.label.localeCompare(b.label);
      });
    }
    
    return filtered;
  }, [telemetry, sortMode, searchTerm]);
  
  const handleSortToggle = () => {
    setSortMode(current => current === 'alpha' ? 'none' : 'alpha');
  };
  
  const getCategoryColor = (category: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    const colorMap: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
      'System': 'primary',
      'Position': 'success',
      'Attitude': 'info',
      'Battery': 'warning',
      'GPS': 'secondary',
      'Navigation': 'primary',
      'IMU': 'info',
      'EKF': 'error',
    };
    return colorMap[category] || 'default';
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Telemetry Inspector
          </Typography>
          <Chip
            icon={<TimerIcon />}
            label={`${messageCount} messages`}
            size="small"
            color="primary"
          />
          <Tooltip title={sortMode === 'alpha' ? 'Sorted alphabetically' : 'No sorting'}>
            <IconButton onClick={handleSortToggle} size="small">
              {sortMode === 'alpha' ? <AlphaIcon /> : <SortIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <TextField
          fullWidth
          size="small"
          placeholder="Search telemetry..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mt: 1 }}
        />
      </Box>
      
      <TableContainer component={Paper} sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '120px' }}>Category</TableCell>
              <TableCell sx={{ width: '200px' }}>Parameter</TableCell>
              <TableCell align="right" sx={{ width: '180px', minWidth: '180px' }}>Value</TableCell>
              <TableCell sx={{ width: '80px' }}>Unit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {telemetryItems.map((item) => (
              <TableRow key={item.key} hover>
                <TableCell sx={{ overflow: 'hidden' }}>
                  <Chip 
                    label={item.category} 
                    size="small" 
                    color={getCategoryColor(item.category)}
                    sx={{ fontSize: '0.75rem', maxWidth: '100%' }}
                  />
                </TableCell>
                <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: 2,
                    fontSize: '0.875rem'
                  }}
                >
                  {formatValue(item.value, item.key)}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {item.unit || ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};