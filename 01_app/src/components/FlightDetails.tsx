import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  styled,
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import { UploadFile, Map as MapIcon } from '@mui/icons-material';
import { useFlightPlan } from '../contexts/FlightPlanContext';

const MainContainer = styled(Box)({
  flex: 1,
  backgroundColor: '#f4f5f7',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
});

const HeaderSection = styled(Box)({
  backgroundColor: '#32495f',
  color: 'white',
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ContentSection = styled(Box)({
  flex: 1,
  padding: '20px',
  paddingBottom: '68px',
  overflowY: 'auto',
});

const SectionCard = styled(Card)({
  marginBottom: '16px',
  '& .MuiCardContent-root': {
    padding: '16px',
  },
});

const SectionTitle = styled(Typography)({
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#333',
  marginBottom: '12px',
});


const StyledTextField = styled(TextField)({
  '& .MuiInputBase-root': {
    fontSize: '12px',
    padding: 0,
    '&:before': {
      display: 'none',
    },
    '&:after': {
      display: 'none',
    },
  },
  '& .MuiInputBase-input': {
    fontSize: '12px',
    padding: '2px 4px',
    color: '#3498db',
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: 'none',
    '&:hover': {
      backgroundColor: 'rgba(52, 152, 219, 0.05)',
    },
  },
});

const StyledSelect = styled('select')({
  fontSize: '12px',
  padding: '2px 4px',
  border: '1px solid #ccc',
  borderRadius: '2px',
  backgroundColor: 'white',
  minWidth: '120px',
  '&:focus': {
    outline: 'none',
    borderColor: '#3498db',
  },
});

export const FlightDetails: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState({
    flightFuel: true,
    fuelAtLanding: true,
  });
  const [departure, setDeparture] = useState('---');
  const [destination, setDestination] = useState('---');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPlan, setSelectedPlan, uploadedPlans, selectedPlan } = useFlightPlan();

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.endsWith('.plan')) {
      alert('.planファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const planData = JSON.parse(e.target?.result as string);
        
        // .planファイルの検証
        if (planData.fileType !== 'Plan' || !planData.mission) {
          alert('無効なプランファイル形式です');
          return;
        }

        addPlan(file.name, planData);
        alert(`プランファイル "${file.name}" をアップロードしました`);
      } catch (error) {
        alert('プランファイルの読み込みに失敗しました');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const handleSendToMap = () => {
    if (!uploadedPlans || uploadedPlans.length === 0) {
      alert('プランファイルをアップロードしてください');
      return;
    }
    
    // 最後にアップロードされたプランを選択
    const latestPlan = uploadedPlans[uploadedPlans.length - 1];
    setSelectedPlan(latestPlan.plan);
    alert(`"${latestPlan.name}" をマップに送信しました`);
  };

  // 座標から地名を推定（簡易版）
  const getLocationName = (lat: number, lng: number): string => {
    // 日本の主要地点の座標と地名のマッピング
    const locations = [
      { name: '福江', lat: 32.6958, lng: 128.8415, radius: 0.1 },
      { name: '長崎', lat: 32.7503, lng: 129.8779, radius: 0.1 },
      { name: '東京', lat: 35.6762, lng: 139.6503, radius: 0.1 },
      { name: '羽田', lat: 35.5494, lng: 139.7798, radius: 0.1 },
      { name: '成田', lat: 35.7720, lng: 140.3929, radius: 0.1 },
    ];

    for (const loc of locations) {
      const distance = Math.sqrt(
        Math.pow(lat - loc.lat, 2) + Math.pow(lng - loc.lng, 2)
      );
      if (distance < loc.radius) {
        return loc.name;
      }
    }
    
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  };

  // selectedPlanが変わったら地名を更新
  useEffect(() => {
    if (selectedPlan && selectedPlan.mission && selectedPlan.mission.items) {
      const items = selectedPlan.mission.items;
      
      // 離陸地点を探す
      const takeoffItem = items.find((item: any) => item.command === 22);
      if (takeoffItem && selectedPlan.mission.plannedHomePosition) {
        const lat = selectedPlan.mission.plannedHomePosition[0];
        const lng = selectedPlan.mission.plannedHomePosition[1];
        setDeparture(getLocationName(lat, lng));
      }
      
      // 着陸地点を探す（最後のウェイポイント）
      const waypointItems = items.filter((item: any) => item.command === 16);
      if (waypointItems.length > 0) {
        const lastWaypoint = waypointItems[waypointItems.length - 1];
        if (lastWaypoint.params && lastWaypoint.params[4] && lastWaypoint.params[5]) {
          const lat = lastWaypoint.params[4];
          const lng = lastWaypoint.params[5];
          setDestination(getLocationName(lat, lng));
        }
      }
    }
  }, [selectedPlan]);

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
            {departure && destination ? `${departure} to ${destination}` : 'No Plan Selected'}
          </Typography>
          <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Dec 01, 1:12:39 AM JST
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".plan"
            style={{ display: 'none' }}
          />
          <Button 
            size="small" 
            sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}
            startIcon={<UploadFile sx={{ fontSize: '14px' }} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Plan
          </Button>
          <Button 
            size="small" 
            sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}
            onClick={handleSendToMap}
          >
            Send To Map
          </Button>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>Show Map</Button>
        </Box>
      </HeaderSection>

      <ContentSection>
        {/* Uploaded Plans Section */}
        <SectionCard>
          <CardContent>
            <SectionTitle>アップロード済みプラン</SectionTitle>
            {uploadedPlans.length === 0 ? (
              <Typography sx={{ fontSize: '12px', color: '#999' }}>
                プランファイルがアップロードされていません
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {uploadedPlans.map((plan, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                    }}
                  >
                    <Typography sx={{ fontSize: '12px' }}>{plan.name}</Typography>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ fontSize: '10px', minHeight: '24px' }}
                      onClick={() => {
                        setSelectedPlan(plan.plan);
                        alert(`"${plan.name}" をマップに送信しました`);
                      }}
                    >
                      マップに送信
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </SectionCard>
        
        {/* Overview Section */}
        <SectionCard>
          <CardContent>
            <SectionTitle>OVERVIEW</SectionTitle>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>ETA STA</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>07/01/2025</Typography>
              </Box>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Time (JST)</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>12:15 AM</Typography>
              </Box>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Departure</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>{departure}</Typography>
              </Box>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Destination</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>{destination}</Typography>
              </Box>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: '10px', color: '#666' }}>Aircraft</Typography>
              <StyledSelect defaultValue="DrN-40 (VTOL)">
                <option value="DrN-40 (VTOL)">DrN-40 (VTOL)</option>
                <option value="AA (SF50)">AA (SF50)</option>
                <option value="BB (SF60)">BB (SF60)</option>
                <option value="CC (SF70)">CC (SF70)</option>
              </StyledSelect>
            </Box>
          </CardContent>
        </SectionCard>

        {false && (
        <SectionCard>
          <CardContent>
            <SectionTitle>ROUTE</SectionTitle>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ flex: '1 1 50%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Route</Typography>
                <StyledTextField fullWidth value="Direct" size="small" />
              </Box>
              <Box sx={{ flex: '1 1 25%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Altitude</Typography>
                <StyledTextField value="7,000" size="small" />
              </Box>
              <Box sx={{ flex: '1 1 25%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Flight Rules</Typography>
                <StyledSelect value="IFR">
                  <option value="IFR">IFR</option>
                  <option value="VFR">VFR</option>
                </StyledSelect>
              </Box>
            </Box>
          </CardContent>
        </SectionCard>
        )}

        {false && (
        <SectionCard>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Box sx={{ flex: '1 1 33%' }}>
                <SectionTitle>PAYLOAD</SectionTitle>
                <Typography sx={{ fontSize: '11px', color: '#666', mb: 1, fontWeight: 'bold' }}>
                  PAYLOAD (LBS) &nbsp;&nbsp;&nbsp;&nbsp; COUNT &nbsp;&nbsp; AVG. WT. &nbsp;&nbsp; TOTAL
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '12px' }}>Persons</Typography>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>1</Typography>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>200</Typography>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right' }}>200</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: '12px' }}>Cargo</Typography>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right' }}></Typography>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right' }}></Typography>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right' }}>0</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', pt: 0.5 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>Total Payload</Typography>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right' }}></Typography>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right' }}></Typography>
                    <Typography sx={{ fontSize: '12px', minWidth: '40px', textAlign: 'right', fontWeight: 'bold' }}>200</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Fuel Section */}
              <Box sx={{ flex: '1 1 33%' }}>
                <SectionTitle>FUEL</SectionTitle>
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: '10px', color: '#666' }}>Fuel Policy</Typography>
                  <StyledSelect value="Minimum Fuel" style={{ width: '100%' }}>
                    <option value="Minimum Fuel">Minimum Fuel</option>
                    <option value="Standard Fuel">Standard Fuel</option>
                    <option value="Maximum Fuel">Maximum Fuel</option>
                  </StyledSelect>
                </Box>
                
                <Typography sx={{ fontSize: '11px', fontWeight: 'bold', mt: 2, mb: 1 }}>FUEL ALLOCATION</Typography>
                <Box sx={{ '& > div': { mb: 0.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '12px' }}>Start</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>537</Typography>
                      <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>80</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 1 }}>
                    <Typography 
                      sx={{ fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSection('flightFuel')}
                    >
                      {expandedSections.flightFuel ? '▼' : '►'} Flight Fuel
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>157</Typography>
                      <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>23</Typography>
                    </Box>
                  </Box>
                  
                  {expandedSections.flightFuel && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                        <Typography sx={{ fontSize: '12px' }}>Taxi Fuel</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>40</Typography>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>6</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                        <Typography sx={{ fontSize: '12px' }}>Fuel to Destination</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>117</Typography>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>17</Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 1 }}>
                    <Typography 
                      sx={{ fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSection('fuelAtLanding')}
                    >
                      {expandedSections.fuelAtLanding ? '▼' : '►'} Fuel at Landing
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>380</Typography>
                      <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>56</Typography>
                    </Box>
                  </Box>
                  
                  {expandedSections.fuelAtLanding && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                        <Typography sx={{ fontSize: '12px' }}>Alternate Fuel</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>0</Typography>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>0</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                        <Typography sx={{ fontSize: '12px' }}>Reserve Fuel</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>380</Typography>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right' }}>56</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                        <Typography sx={{ fontSize: '12px' }}>Extra Fuel</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>0</Typography>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>0</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                        <Typography sx={{ fontSize: '12px' }}>Discretionary Fuel</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>0</Typography>
                          <Typography sx={{ fontSize: '12px', minWidth: '35px', textAlign: 'right', color: '#3498db', fontWeight: 500 }}>0</Typography>
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>

              {/* Weights Section */}
              <Box sx={{ flex: '1 1 33%' }}>
                <SectionTitle>WEIGHTS</SectionTitle>
                <Typography sx={{ fontSize: '11px', color: '#666', mb: 1, textAlign: 'right', fontWeight: 'bold' }}>
                  LBS
                </Typography>
                <Box sx={{ '& > div': { mb: 0.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: '12px' }}>• Zero Fuel Weight</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>3,772</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>1,128 lb available</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>/ 4,900</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: '12px' }}>Total Fuel at Start</Typography>
                    <Typography sx={{ fontSize: '12px', color: '#3498db', fontWeight: 500 }}>537</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: '12px' }}>• Ramp Weight</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>4,309</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>1,731 lbs available</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>/ 6,040</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: '12px' }}>Taxi/Takeoff Fuel</Typography>
                    <Typography sx={{ fontSize: '12px', color: '#3498db', fontWeight: 500 }}>40</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: '12px' }}>• Takeoff Weight</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>4,269</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>1,731 lbs available</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>/ 6,000</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: '12px' }}>Fuel to Destination</Typography>
                    <Typography sx={{ fontSize: '12px', color: '#3498db', fontWeight: 500 }}>117</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography sx={{ fontSize: '12px' }}>Landing Weight</Typography>
                    <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>4,152</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>1,998 lb available</Typography>
                    <Typography sx={{ fontSize: '11px', color: '#666' }}>/ 5,950</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </SectionCard>
        )}

        {false && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: '1 1 50%' }}>
            <SectionCard>
              <CardContent>
                <SectionTitle>DESTINATION SERVICES</SectionTitle>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: '10px', color: '#666' }}>FBO</Typography>
                    <StyledSelect value="Optional">
                      <option value="Optional">Optional</option>
                      <option value="Required">Required</option>
                    </StyledSelect>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '10px', color: '#666' }}>Select FBO</Typography>
                    <Button variant="outlined" size="small" sx={{ fontSize: '10px' }}>Select FBO &gt;</Button>
                  </Box>
                </Box>
              </CardContent>
            </SectionCard>
          </Box>
          
          <Box sx={{ flex: '1 1 50%' }}>
            <SectionCard>
              <CardContent>
                <SectionTitle>FLIGHT LOG</SectionTitle>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: '10px', color: '#666' }}>Fuel at Shutdown (g)</Typography>
                    <StyledTextField size="small" />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '10px', color: '#666' }}>Times</Typography>
                    <StyledTextField value="Optional" size="small" />
                  </Box>
                </Box>
              </CardContent>
            </SectionCard>
          </Box>
        </Box>
        )}

      </ContentSection>
      
      {/* Bottom Bar */}
      <Box 
        sx={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '48px',
          backgroundColor: '#f8f8f8',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
        }}
      >
        <Typography sx={{ fontSize: '11px', color: '#666' }}>
          Not Filed
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ 
              fontSize: '11px',
              height: '28px',
              textTransform: 'none',
              borderColor: '#ddd',
              color: '#666',
            }}
          >
            Add Next Flight
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ 
              fontSize: '11px',
              height: '28px',
              textTransform: 'none',
              borderColor: '#ddd',
              color: '#666',
            }}
          >
            Copy
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ 
              fontSize: '11px',
              height: '28px',
              textTransform: 'none',
              borderColor: '#ddd',
              color: '#d32f2f',
            }}
          >
            Delete
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            sx={{ 
              fontSize: '11px',
              height: '28px',
              textTransform: 'none',
              backgroundColor: '#3498db',
              '&:hover': {
                backgroundColor: '#2980b9',
              }
            }}
          >
            Proceed to File
          </Button>
        </Box>
      </Box>
    </MainContainer>
  );
};