import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  styled,
  TextField,
} from '@mui/material';
import { MapCard } from './MapCard';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';
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

interface PlanDetailsProps {
  selectedPlanId?: string;
}

export const PlanDetails: React.FC<PlanDetailsProps> = ({ selectedPlanId }) => {
  const [planData, setPlanData] = useState<any>(null);
  const [planInfo, setPlanInfo] = useState({
    departure: '---',
    destination: '---',
    departureName: '',
    destinationName: '',
    departureAddress: '',
    destinationAddress: '',
    departurePort: null as string | null,
    destinationPort: null as string | null,
    duration: '---',
    aircraft: 'DrN-40 (VTOL)',
  });
  const { loadPlan } = useFlightPlanStorage();

  // プランデータを読み込む
  useEffect(() => {
    const fetchPlanData = async () => {
      if (!selectedPlanId) {
        setPlanData(null);
        return;
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Loading plan data for:', selectedPlanId);
        }
        const plan = await loadPlan(selectedPlanId);
        if (plan && plan.planData) {
          setPlanData(plan.planData);
          
          // プラン情報を解析
          const info = await extractPlanInfo(plan.planData);
          setPlanInfo(prev => ({
            ...prev,
            ...info,
          }));
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Plan data loaded:', plan.planData);
          }
        }
      } catch (error) {
        console.error('Failed to load plan:', error);
      }
    };

    fetchPlanData();
  }, [selectedPlanId, loadPlan]);

  // 地名を取得する関数
  async function getPlaceName(lat: number, lon: number): Promise<string | null> {
    const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) return null;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const name = place.place_name?.split(',')[0] || place.text;
        return name || null;
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // プランデータから情報を抽出
  const extractPlanInfo = async (plan: any) => {
    const info: any = {
      departurePort: null,
      destinationPort: null,
      departureAddress: '',
      destinationAddress: '',
    };
    
    if (plan.mission && plan.mission.items) {
      const items = plan.mission.items;
      let departureCoords = null;
      let destinationCoords = null;
      
      // 離陸地点を探す
      const takeoffItem = items.find((item: any) => item.command === 22);
      if (takeoffItem && plan.mission.plannedHomePosition) {
        const lat = plan.mission.plannedHomePosition[0];
        const lng = plan.mission.plannedHomePosition[1];
        departureCoords = { lat, lon: lng };
        info.departure = formatCoordinates(lat, lng);
      }
      
      // 着陸地点を探す
      const landingItem = items.find((item: any) => item.command === 21);
      if (landingItem && landingItem.params) {
        const lat = landingItem.params[4];
        const lng = landingItem.params[5];
        destinationCoords = { lat, lon: lng };
        info.destination = formatCoordinates(lat, lng);
      } else {
        // 着陸コマンドがない場合は最後のウェイポイント
        const waypointItems = items.filter((item: any) => item.command === 16);
        if (waypointItems.length > 0) {
          const lastWaypoint = waypointItems[waypointItems.length - 1];
          if (lastWaypoint.params) {
            const lat = lastWaypoint.params[4];
            const lng = lastWaypoint.params[5];
            destinationCoords = { lat, lon: lng };
            info.destination = formatCoordinates(lat, lng);
          }
        }
      }
      
      // UASポートを検出
      if (departureCoords && destinationCoords) {
        console.log('Checking coordinates:', { departureCoords, destinationCoords });
        const { departurePort, destinationPort } = await UASPortLookupService.identifyPortsForFlight(
          departureCoords,
          destinationCoords
        );
        
        console.log('Detected ports:', { departurePort, destinationPort });
        
        info.departurePort = departurePort;
        info.destinationPort = destinationPort;
        
        // ポート情報を取得
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
          // ポート外の場合は地名を取得
          const placeName = await getPlaceName(departureCoords.lat, departureCoords.lon);
          if (placeName) {
            info.departureName = placeName;
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
          // ポート外の場合は地名を取得
          const placeName = await getPlaceName(destinationCoords.lat, destinationCoords.lon);
          if (placeName) {
            info.destinationName = placeName;
          }
        }
      }
    }
    
    return info;
  };

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
            {selectedPlanId ? 'Plan Details' : 'No Plan Selected'}
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

            {/* Map Section - Flexibly sized */}
            {planData && (
              <Box sx={{ 
                flex: 1,
                minHeight: '300px',
                position: 'relative',
                mt: 2
              }}>
                <MapCard
                  initialPosition={{ x: 0, y: 0 }}
                  configMode={false}
                  mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
                  flightPlan={planData}
                  pageId="plan"
                />
              </Box>
            )}
          </CardContent>
        </SectionCard>
      </ContentSection>
    </MainContainer>
  );
};