import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Collapse,
  Divider,
  Button,
  styled,
  Grid
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  FlightTakeoff,
  FlightLand,
  Air,
  Thermostat,
  WaterDrop,
  Visibility,
  Speed,
  Cloud,
  Refresh
} from '@mui/icons-material';
import { FlightPlan } from '../contexts/FlightPlanContext';
import { fetchFlightWeather, ProcessedWeatherData, getAvailableApis } from '../services/windyApi';

interface ForecastPanelProps {
  flightPlan: FlightPlan | null;
  initialPosition?: { x: number; y: number };
  configMode?: boolean;
  onPositionChange?: (position: { x: number; y: number }) => void;
  size?: { width: number; height: number };
  onSizeChange?: (size: { width: number; height: number }) => void;
}


const StyledCard = styled(Card)<{ configMode?: boolean; isDragging?: boolean }>(({ configMode, isDragging }) => ({
  backgroundColor: 'white',
  borderRadius: 8,
  boxShadow: configMode ? '0 0 0 2px #3498db' : '0 2px 8px rgba(0, 0, 0, 0.1)',
  position: configMode ? 'absolute' : 'relative',
  cursor: configMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
  userSelect: configMode ? 'none' : 'auto',
}));

const LocationHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
});

const WeatherIcon = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#617185',
});

const MetricCard = styled(Box)({
  backgroundColor: '#f4f5f7',
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

// 風向を八方位に変換する関数
const getWindDirectionText = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// 風速をknotsからm/sに変換
const knotsToMs = (knots: number): number => {
  return Math.round(knots * 0.514444 * 10) / 10;
};

export const ForecastPanel: React.FC<ForecastPanelProps> = ({
  flightPlan,
  initialPosition = { x: 600, y: 40 },
  configMode = false,
  onPositionChange,
  size = { width: 400, height: 600 },
  onSizeChange
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [takeoffWeather, setTakeoffWeather] = useState<ProcessedWeatherData | null>(null);
  const [landingWeather, setLandingWeather] = useState<ProcessedWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    takeoff: true,
    landing: true
  });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // ドラッグハンドラー
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!configMode) return;
    
    // リサイズハンドルをクリックした場合はドラッグしない
    const target = e.target as HTMLElement;
    if (target.style.cursor === 'nwse-resize') return;
    
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) {
      const newX = Math.round((e.clientX - dragStart.x) / 20) * 20;
      const newY = Math.round((e.clientY - dragStart.y) / 20) * 20;
      setPosition({ x: newX, y: newY });
      onPositionChange?.({ x: newX, y: newY });
    }
    if (resizing) {
      const newWidth = Math.round((resizeStart.width + e.clientX - resizeStart.x) / 20) * 20;
      const newHeight = Math.round((resizeStart.height + e.clientY - resizeStart.y) / 20) * 20;
      onSizeChange?.({ 
        width: Math.max(300, newWidth), 
        height: Math.max(400, newHeight) 
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  // リサイズハンドラー
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    setResizeStart({ 
      x: e.clientX, 
      y: e.clientY, 
      width: size.width, 
      height: size.height 
    });
  };

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, dragStart, resizeStart]);

  // 離着陸地点の座標を取得
  const getTakeoffAndLandingCoords = () => {
    if (!flightPlan?.mission?.items) return null;
    
    const missionItems = flightPlan.mission.items;
    if (missionItems.length === 0) return null;
    
    // 離陸地点を探す
    let takeoffCoords = null;
    let landingCoords = null;
    
    for (let i = 0; i < missionItems.length; i++) {
      const item = missionItems[i];
      
      // TAKEOFF (command 22)
      if (item.command === 22 && !takeoffCoords) {
        if (flightPlan.mission.plannedHomePosition) {
          takeoffCoords = {
            lat: flightPlan.mission.plannedHomePosition[0],
            lon: flightPlan.mission.plannedHomePosition[1]
          };
        }
      }
      
      // LANDING (command 21)
      if (item.command === 21) {
        const lat = item.params[4];
        const lon = item.params[5];
        if (lat !== undefined && lon !== undefined) {
          landingCoords = {
            lat: lat,
            lon: lon
          };
        }
      }
      
      // 通常のウェイポイント (command 16)
      if (item.command === 16) {
        const lat = item.params[4];
        const lon = item.params[5];
        if (lat !== undefined && lon !== undefined) {
          // 離陸地点が見つからない場合は最初のウェイポイントを使用
          if (!takeoffCoords && i === 0) {
            takeoffCoords = { lat, lon };
          }
          // 着陸地点が見つからない場合は最後のウェイポイントを使用
          if (i === missionItems.length - 1 && !landingCoords) {
            landingCoords = { lat, lon };
          }
        }
      }
    }
    
    // どちらかが見つからない場合はnullを返す
    if (!takeoffCoords || !landingCoords) {
      return null;
    }
    
    return {
      takeoff: takeoffCoords,
      landing: landingCoords
    };
  };

  // 気象データ取得
  const fetchWeatherData = async () => {
    const coords = getTakeoffAndLandingCoords();
    if (!coords) return;

    setLoading(true);
    setError(null);

    try {
      // 利用可能なAPIを確認
      const availableApis = getAvailableApis();
      
      if (!availableApis.point && !availableApis.map) {
        // どちらのAPIキーもない場合はモックデータを使用
        console.warn('No Windy API keys found, using mock data');
        
        const mockTakeoffWeather: ProcessedWeatherData = {
          location: {
            name: 'Departure',
            lat: coords.takeoff.lat,
            lon: coords.takeoff.lon
          },
          current: {
            temperature: 23.5,
            windSpeed: 12.3,
            windDirection: 270,
            humidity: 65,
            pressure: 1013.2,
            visibility: 10,
            cloudCover: 25,
            precipitation: 0
          },
          forecast: [],
          timestamp: new Date().toISOString(),
          model: 'GFS'
        };

        const mockLandingWeather: ProcessedWeatherData = {
          location: {
            name: 'Destination',
            lat: coords.landing.lat,
            lon: coords.landing.lon
          },
          current: {
            temperature: 21.8,
            windSpeed: 8.5,
            windDirection: 290,
            humidity: 70,
            pressure: 1014.5,
            visibility: 15,
            cloudCover: 15,
            precipitation: 0
          },
          forecast: [],
          timestamp: new Date().toISOString(),
          model: 'GFS'
        };

        setTakeoffWeather(mockTakeoffWeather);
        setLandingWeather(mockLandingWeather);
      } else if (availableApis.point) {
        // Point Forecast APIを使用
        console.log('Using Windy Point Forecast API');
        const weatherData = await fetchFlightWeather(
          coords.takeoff,
          coords.landing,
          undefined, // API keyは環境変数から自動取得
          'gfs'
        );
        
        setTakeoffWeather(weatherData.takeoff);
        setLandingWeather(weatherData.landing);
      } else {
        // Map Forecast APIのみ利用可能な場合
        console.warn('Only Map Forecast API available, showing limited data');
        setError('Point Forecast API not available. Please configure REACT_APP_WINDY_POINT_FORECAST_KEY for detailed weather data.');
      }
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // フライトプラン変更時に気象データを取得
  useEffect(() => {
    if (flightPlan) {
      fetchWeatherData();
    }
  }, [flightPlan]);

  const toggleSection = (section: 'takeoff' | 'landing') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderWeatherData = (weather: ProcessedWeatherData | null, type: 'takeoff' | 'landing') => {
    if (!weather) return null;

    const icon = type === 'takeoff' ? <FlightTakeoff /> : <FlightLand />;
    const expanded = expandedSections[type];

    return (
      <Box>
        <LocationHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {weather.location.name}
            </Typography>
          </Box>
          <IconButton onClick={() => toggleSection(type)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </LocationHeader>

        <Collapse in={expanded}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <MetricCard>
                <WeatherIcon>
                  <Thermostat fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Temperature
                  </Typography>
                </WeatherIcon>
                <Typography variant="h5">
                  {weather.current.temperature}°C
                </Typography>
              </MetricCard>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <MetricCard>
                <WeatherIcon>
                  <Air fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Wind
                  </Typography>
                </WeatherIcon>
                <Typography variant="h5">
                  {knotsToMs(weather.current.windSpeed)} m/s
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {getWindDirectionText(weather.current.windDirection)} ({weather.current.windDirection}°)
                </Typography>
              </MetricCard>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <MetricCard>
                <WeatherIcon>
                  <WaterDrop fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Humidity
                  </Typography>
                </WeatherIcon>
                <Typography variant="h5">
                  {weather.current.humidity}%
                </Typography>
              </MetricCard>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <MetricCard>
                <WeatherIcon>
                  <Visibility fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Visibility
                  </Typography>
                </WeatherIcon>
                <Typography variant="h5">
                  {weather.current.visibility} km
                </Typography>
              </MetricCard>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <MetricCard>
                <WeatherIcon>
                  <Speed fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Pressure
                  </Typography>
                </WeatherIcon>
                <Typography variant="h5">
                  {weather.current.pressure} hPa
                </Typography>
              </MetricCard>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <MetricCard>
                <WeatherIcon>
                  <Cloud fontSize="small" />
                  <Typography variant="body2" color="textSecondary">
                    Cloud Cover
                  </Typography>
                </WeatherIcon>
                <Typography variant="h5">
                  {weather.current.cloudCover}%
                </Typography>
              </MetricCard>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="textSecondary">
              Model: {weather.model}
            </Typography>
            <Chip 
              label={`Updated: ${new Date(weather.timestamp).toLocaleTimeString()}`}
              size="small"
              variant="outlined"
            />
          </Box>
        </Collapse>
      </Box>
    );
  };

  if (!flightPlan) {
    return null;
  }

  return (
    <StyledCard
      configMode={configMode}
      isDragging={dragging}
      onMouseDown={handleMouseDown}
      sx={{
        position: configMode ? 'absolute' : 'relative',
        left: configMode ? position.x : 0,
        top: configMode ? position.y : 0,
        width: size.width,
        height: size.height,
        overflow: 'auto'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Weather Forecast
          </Typography>
          <Button
            size="small"
            startIcon={<Refresh />}
            onClick={fetchWeatherData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {renderWeatherData(takeoffWeather, 'takeoff')}
            <Divider />
            {renderWeatherData(landingWeather, 'landing')}
          </Box>
        )}
      </CardContent>

      {/* リサイズハンドル */}
      {configMode && (
        <Box
          onMouseDown={handleResizeStart}
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 20,
            height: 20,
            cursor: 'nwse-resize',
            backgroundColor: '#3498db',
            borderBottomRightRadius: 8,
            '&:hover': {
              backgroundColor: '#2980b9'
            }
          }}
        />
      )}
    </StyledCard>
  );
};