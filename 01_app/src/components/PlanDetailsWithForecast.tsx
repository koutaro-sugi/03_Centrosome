import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  styled,
  TextField,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  FlightTakeoff,
  FlightLand,
} from '@mui/icons-material';
import { MapCard } from './MapCard';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';
import { FlightPlan } from '../contexts/FlightPlanContext';
import { fetchFlightWeather, ProcessedWeatherData, getAvailableApis } from '../services/windyApi';
import { UASPortLookupService } from '../services/uasPortLookup';
import { uasPortAPI } from '../lib/uasPortApi';
import { extractCityAndBelow, formatCoordinates } from '../utils/addressUtils';

const MainContainer = styled(Box)({
  flex: 1,
  backgroundColor: '#f4f5f7',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  height: '100%',
});

const HeaderSection = styled(Box)({
  backgroundColor: '#32495f',
  color: 'white',
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
});

const ContentSection = styled(Box)({
  flex: 1,
  padding: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

const SectionCard = styled(Card)({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  '& .MuiCardContent-root': {
    padding: '16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
});

const SectionTitle = styled(Typography)({
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#333',
  marginBottom: '12px',
});

const InfoGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '20px',
  marginBottom: '20px',
});

const InfoItem = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

const InfoLabel = styled(Typography)({
  fontSize: '10px',
  color: '#666',
  textTransform: 'uppercase',
});

const InfoValue = styled(Typography)({
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#333',
});

const StyledTextField = styled(TextField)({
  '& .MuiInputBase-root': {
    fontSize: '12px',
    height: '28px',
  },
  '& .MuiInputBase-input': {
    padding: '4px 8px',
  },
});

const MapContainer = styled(Box)({
  flex: 1,
  position: 'relative',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  marginTop: '20px',
  minHeight: '400px',
});

const ForecastTable = styled(TableContainer)({
  marginTop: '20px',
  marginBottom: '20px',
  '& .MuiTableCell-root': {
    fontSize: '12px',
    padding: '8px 12px',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    fontWeight: 600,
    backgroundColor: '#f5f5f5',
  },
});

// 風向を八方位に変換する関数
const getWindDirectionText = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// 風速の四捨五入（既にm/s単位）
const formatWindSpeed = (ms: number): string => {
  return ms.toFixed(1);
};

interface PlanDetailsWithForecastProps {
  selectedPlanId?: string;
  flightPlan?: FlightPlan | null;
}

export const PlanDetailsWithForecast: React.FC<PlanDetailsWithForecastProps> = ({ 
  selectedPlanId,
  flightPlan: propFlightPlan 
}) => {
  const [planData, setPlanData] = useState<any>(propFlightPlan || null);
  const [planInfo, setPlanInfo] = useState({
    departure: 'N/A',
    destination: 'N/A',
    departureName: '',
    destinationName: '',
    departureAddress: '',
    destinationAddress: '',
    departurePort: null as string | null,
    destinationPort: null as string | null,
    distance: 'N/A',
    waypoints: 0,
    duration: '',
    aircraft: 'DrN-40 (VTOL)',
  });
  const [takeoffWeather, setTakeoffWeather] = useState<ProcessedWeatherData | null>(null);
  const [landingWeather, setLandingWeather] = useState<ProcessedWeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const { loadPlan } = useFlightPlanStorage();

  useEffect(() => {
    const loadPlanData = async () => {
      if (propFlightPlan) {
        setPlanData(propFlightPlan);
        const info = await analyzePlan(propFlightPlan);
        setPlanInfo(info);
      } else if (selectedPlanId) {
        const data = await loadPlan(selectedPlanId);
        if (data && data.planData) {
          setPlanData(data.planData);
          const info = await analyzePlan(data.planData);
          setPlanInfo(info);
        }
      }
    };
    
    loadPlanData();
  }, [selectedPlanId, propFlightPlan, loadPlan]);

  const analyzePlan = async (plan: any) => {
    const info = {
      departure: 'N/A',
      destination: 'N/A',
      departureName: '',
      destinationName: '',
      departureAddress: '',
      destinationAddress: '',
      departurePort: null as string | null,
      destinationPort: null as string | null,
      distance: 'N/A',
      waypoints: 0,
      duration: planInfo.duration || '',
      aircraft: planInfo.aircraft || 'DrN-40 (VTOL)',
    };

    if (plan?.mission?.items) {
      const items = plan.mission.items;
      info.waypoints = items.filter((item: any) => item.command === 16).length;

      let departureCoords = null;
      let destinationCoords = null;

      // Find takeoff location
      const takeoffItem = items.find((item: any) => item.command === 22);
      if (takeoffItem && plan.mission.plannedHomePosition) {
        departureCoords = {
          lat: plan.mission.plannedHomePosition[0],
          lon: plan.mission.plannedHomePosition[1]
        };
        info.departure = formatCoordinates(departureCoords.lat, departureCoords.lon);
      } else if (plan.mission.plannedHomePosition) {
        departureCoords = {
          lat: plan.mission.plannedHomePosition[0],
          lon: plan.mission.plannedHomePosition[1]
        };
        info.departure = formatCoordinates(departureCoords.lat, departureCoords.lon);
      }

      // Find landing location
      const landingItem = items.find((item: any) => item.command === 21);
      if (landingItem) {
        destinationCoords = {
          lat: landingItem.params[4],
          lon: landingItem.params[5]
        };
        info.destination = formatCoordinates(destinationCoords.lat, destinationCoords.lon);
      }

      // Detect UAS ports
      if (departureCoords && destinationCoords) {
        console.log('Checking coordinates:', { departureCoords, destinationCoords });
        const { departurePort, destinationPort } = await UASPortLookupService.identifyPortsForFlight(
          departureCoords,
          destinationCoords
        );
        
        console.log('Detected ports:', { departurePort, destinationPort });
        
        info.departurePort = departurePort;
        info.destinationPort = destinationPort;
        
        // Get port information
        if (departurePort) {
          try {
            const port = await uasPortAPI.get(departurePort);
            if (port) {
              info.departureName = port.common_name;
              info.departureAddress = extractCityAndBelow(port.full_address);
            }
          } catch (error) {
            // DBエラー時はUASPortLookupServiceから取得
            console.log('Using fallback for departure port:', departurePort);
            info.departureName = await UASPortLookupService.getPortName(departurePort);
            // ハードコードされたデータから住所を取得
            const { initialUASPorts } = require('../scripts/initializeUASPorts');
            const hardcodedPort = initialUASPorts.find((p: any) => p.uaport_code === departurePort);
            if (hardcodedPort) {
              info.departureAddress = extractCityAndBelow(hardcodedPort.full_address);
            }
          }
        } else {
          // Get place name if not in a port
          const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
          if (mapboxToken) {
            const placeName = await getPlaceName(departureCoords.lat, departureCoords.lon, mapboxToken);
            info.departureName = placeName || 'UNKNOWN';
          }
        }
        
        if (destinationPort) {
          try {
            const port = await uasPortAPI.get(destinationPort);
            if (port) {
              info.destinationName = port.common_name;
              info.destinationAddress = extractCityAndBelow(port.full_address);
            }
          } catch (error) {
            // DBエラー時はUASPortLookupServiceから取得
            console.log('Using fallback for destination port:', destinationPort);
            info.destinationName = await UASPortLookupService.getPortName(destinationPort);
            // ハードコードされたデータから住所を取得
            const { initialUASPorts } = require('../scripts/initializeUASPorts');
            const hardcodedPort = initialUASPorts.find((p: any) => p.uaport_code === destinationPort);
            if (hardcodedPort) {
              info.destinationAddress = extractCityAndBelow(hardcodedPort.full_address);
            }
          }
        } else {
          // Get place name if not in a port
          const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
          if (mapboxToken) {
            const placeName = await getPlaceName(destinationCoords.lat, destinationCoords.lon, mapboxToken);
            info.destinationName = placeName || 'UNKNOWN';
          }
        }
      }
    }

    return info;
  };

  // Helper function to get place name
  async function getPlaceName(lat: number, lon: number, mapboxToken: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const name = place.place_name?.split(',')[0] || place.text;
        return name?.toUpperCase() || null;
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // 天気データ取得関数
  const fetchWeatherData = async (plan: any) => {
    if (!plan?.mission?.items) return;

    setLoading(true);

    try {
      // 離着陸地点の座標を取得
      let takeoffCoords = null;
      let landingCoords = null;

      const items = plan.mission.items;
      
      // 離陸地点を探す
      const takeoffItem = items.find((item: any) => item.command === 22);
      if (takeoffItem && plan.mission.plannedHomePosition) {
        takeoffCoords = {
          lat: plan.mission.plannedHomePosition[0],
          lon: plan.mission.plannedHomePosition[1]
        };
      }
      
      // 着陸地点を探す
      const landingItem = items.find((item: any) => item.command === 21);
      if (landingItem) {
        landingCoords = {
          lat: landingItem.params[4],
          lon: landingItem.params[5]
        };
      }

      if (!takeoffCoords || !landingCoords) {
        console.warn('離着陸地点が見つかりません');
        return;
      }

      console.log('Weather fetch coords:', { takeoffCoords, landingCoords });

      // 利用可能なAPIを確認
      const availableApis = getAvailableApis();
      console.log('Available APIs:', availableApis);
      
      // 環境変数の直接確認（デバッグ用）
      console.log('Direct env check:', {
        WINDY_POINT_KEY: process.env.REACT_APP_WINDY_POINT_FORECAST_KEY ? 'Set' : 'Not set',
        WINDY_MAP_KEY: process.env.REACT_APP_WINDY_MAP_FORECAST_KEY ? 'Set' : 'Not set',
        MAPBOX_KEY: process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ? 'Set' : 'Not set'
      });
      
      if (availableApis.point) {
        // Point Forecast APIを使用
        console.log('Using Windy Point Forecast API');
        const weatherData = await fetchFlightWeather(
          takeoffCoords,
          landingCoords,
          undefined,
          'gfs'
        );
        
        console.log('Weather data received:', weatherData);
        
        setTakeoffWeather(weatherData.takeoff);
        setLandingWeather(weatherData.landing);
      } else {
        console.warn('Point Forecast API not available');
      }
    } catch (err) {
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // プランデータ変更時に天気データを取得
  useEffect(() => {
    console.log('PlanDetailsWithForecast: planData changed', planData);
    if (planData) {
      fetchWeatherData(planData);
    }
  }, [planData]);

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
            {selectedPlanId || propFlightPlan ? 'Plan Details' : 'No Plan Selected'}
          </Typography>
        </Box>
      </HeaderSection>

      <ContentSection>
        {/* Overview Section */}
        <SectionCard>
          <CardContent>
            <SectionTitle>OVERVIEW</SectionTitle>
            
            {/* Plan Information Grid */}
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Departure</InfoLabel>
                <InfoValue>
                  {planInfo.departurePort 
                    ? `${planInfo.departurePort} - ${planInfo.departureName}`
                    : planInfo.departureName || 'Loading...'}
                </InfoValue>
                {planInfo.departureAddress && (
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
                    {planInfo.departureAddress}
                  </Typography>
                )}
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
                  {planInfo.departure}
                </Typography>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Destination</InfoLabel>
                <InfoValue>
                  {planInfo.destinationPort 
                    ? `${planInfo.destinationPort} - ${planInfo.destinationName}`
                    : planInfo.destinationName || 'Loading...'}
                </InfoValue>
                {planInfo.destinationAddress && (
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
                    {planInfo.destinationAddress}
                  </Typography>
                )}
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
                  {planInfo.destination}
                </Typography>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Duration</InfoLabel>
                <StyledTextField 
                  value={planInfo.duration}
                  onChange={(e) => setPlanInfo({...planInfo, duration: e.target.value})}
                  size="small"
                  fullWidth
                  placeholder="00:00"
                />
              </InfoItem>
              <InfoItem>
                <InfoLabel>Aircraft</InfoLabel>
                <StyledTextField 
                  value={planInfo.aircraft}
                  onChange={(e) => setPlanInfo({...planInfo, aircraft: e.target.value})}
                  size="small"
                  fullWidth
                />
              </InfoItem>
            </InfoGrid>

            {/* Weather Forecast Table */}
            <SectionTitle sx={{ mt: 3 }}>WEATHER FORECAST</SectionTitle>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
                <Typography sx={{ ml: 2 }}>Loading weather data...</Typography>
              </Box>
            ) : !takeoffWeather && !landingWeather ? (
              <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                No weather data available
              </Typography>
            ) : (
              <ForecastTable>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Location</TableCell>
                      <TableCell align="center">Temperature</TableCell>
                      <TableCell align="center">Wind</TableCell>
                      <TableCell align="center">Humidity</TableCell>
                      <TableCell align="center">Visibility</TableCell>
                      <TableCell align="center">Pressure</TableCell>
                      <TableCell align="center">Cloud Cover</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {takeoffWeather && (
                        <TableRow>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FlightTakeoff sx={{ fontSize: 16 }} />
                              <Typography variant="body2">
                                {planInfo.departurePort 
                                  ? `${planInfo.departurePort} - ${planInfo.departureName}`
                                  : planInfo.departureName || takeoffWeather.location.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{takeoffWeather.current.temperature}°C</TableCell>
                          <TableCell align="center">
                            {formatWindSpeed(takeoffWeather.current.windSpeed)} m/s {getWindDirectionText(takeoffWeather.current.windDirection)}
                          </TableCell>
                          <TableCell align="center">{takeoffWeather.current.humidity}%</TableCell>
                          <TableCell align="center">{takeoffWeather.current.visibility} km</TableCell>
                          <TableCell align="center">{takeoffWeather.current.pressure} hPa</TableCell>
                          <TableCell align="center">{takeoffWeather.current.cloudCover}%</TableCell>
                        </TableRow>
                      )}
                      {landingWeather && (
                        <TableRow>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <FlightLand sx={{ fontSize: 16 }} />
                              <Typography variant="body2">
                                {planInfo.destinationPort 
                                  ? `${planInfo.destinationPort} - ${planInfo.destinationName}`
                                  : planInfo.destinationName || landingWeather.location.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">{landingWeather.current.temperature}°C</TableCell>
                          <TableCell align="center">
                            {formatWindSpeed(landingWeather.current.windSpeed)} m/s {getWindDirectionText(landingWeather.current.windDirection)}
                          </TableCell>
                          <TableCell align="center">{landingWeather.current.humidity}%</TableCell>
                          <TableCell align="center">{landingWeather.current.visibility} km</TableCell>
                          <TableCell align="center">{landingWeather.current.pressure} hPa</TableCell>
                          <TableCell align="center">{landingWeather.current.cloudCover}%</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ForecastTable>
            )}

            {/* Map Section */}
            {planData && (
              <MapContainer>
                <MapCard
                  initialPosition={{ x: 0, y: 0 }}
                  configMode={false}
                  mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
                  flightPlan={planData}
                  pageId="plan-details"
                />
              </MapContainer>
            )}
          </CardContent>
        </SectionCard>
      </ContentSection>
    </MainContainer>
  );
};