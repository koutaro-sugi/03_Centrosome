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
    duration: '---',
    aircraft: 'DrN-40 (VTOL)',
    pilotInCommand: '---',
    omcLocation: '---',
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
          const info = extractPlanInfo(plan.planData);
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

  // プランデータから情報を抽出
  const extractPlanInfo = (plan: any) => {
    const info: any = {};
    
    if (plan.mission && plan.mission.items) {
      const items = plan.mission.items;
      
      // 離陸地点を探す
      const takeoffItem = items.find((item: any) => item.command === 22);
      if (takeoffItem && plan.mission.plannedHomePosition) {
        const lat = plan.mission.plannedHomePosition[0];
        const lng = plan.mission.plannedHomePosition[1];
        info.departure = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
      
      // 着陸地点を探す
      const landingItem = items.find((item: any) => item.command === 21);
      if (landingItem && landingItem.params) {
        const lat = landingItem.params[4];
        const lng = landingItem.params[5];
        info.destination = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      } else {
        // 着陸コマンドがない場合は最後のウェイポイント
        const waypointItems = items.filter((item: any) => item.command === 16);
        if (waypointItems.length > 0) {
          const lastWaypoint = waypointItems[waypointItems.length - 1];
          if (lastWaypoint.params) {
            const lat = lastWaypoint.params[4];
            const lng = lastWaypoint.params[5];
            info.destination = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
                <InfoValue>{planInfo.departure}</InfoValue>
              </InfoItem>
              <InfoItem>
                <InfoLabel>Destination</InfoLabel>
                <InfoValue>{planInfo.destination}</InfoValue>
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
              <InfoItem>
                <InfoLabel>Pilot In Command</InfoLabel>
                <StyledTextField 
                  value={planInfo.pilotInCommand}
                  onChange={(e) => setPlanInfo({...planInfo, pilotInCommand: e.target.value})}
                  size="small"
                  fullWidth
                />
              </InfoItem>
              <InfoItem>
                <InfoLabel>OMC Location</InfoLabel>
                <StyledTextField 
                  value={planInfo.omcLocation}
                  onChange={(e) => setPlanInfo({...planInfo, omcLocation: e.target.value})}
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