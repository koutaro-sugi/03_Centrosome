import React from 'react';
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
  const [expandedSections, setExpandedSections] = React.useState({
    flightFuel: true,
    fuelAtLanding: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
            FUJ to NGS
          </Typography>
          <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Dec 01, 1:12:39 AM JST
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>Send To Map</Button>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>Show Map</Button>
        </Box>
      </HeaderSection>

      <ContentSection>
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
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>PUTT</Typography>
              </Box>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>Destination</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>NRT</Typography>
              </Box>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>FLIGHT FUEL</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>59 g</Typography>
              </Box>
              <Box sx={{ flex: '1 1 16%' }}>
                <Typography sx={{ fontSize: '10px', color: '#666' }}>WHO</Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold' }}>3 hrs tail</Typography>
              </Box>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: '10px', color: '#666' }}>Aircraft</Typography>
              <StyledSelect value="AA (SF50)">
                <option value="AA (SF50)">AA (SF50)</option>
                <option value="BB (SF60)">BB (SF60)</option>
                <option value="CC (SF70)">CC (SF70)</option>
              </StyledSelect>
            </Box>
          </CardContent>
        </SectionCard>

        {/* Route Section */}
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

        {/* Payload, Fuel, Weights Combined Section */}
        <SectionCard>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 4 }}>
              {/* Payload Section */}
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

        {/* Bottom Sections */}
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