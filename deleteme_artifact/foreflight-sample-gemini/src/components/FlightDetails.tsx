import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  styled,
  TextField,
  Tabs,
  Tab,
} from '@mui/material';

const MainContainer = styled(Box)({
  flex: 1,
  backgroundColor: '#f5f5f5',
  display: 'flex',
  flexDirection: 'column',
});

const HeaderSection = styled(Box)({
  backgroundColor: '#4a90a4',
  color: 'white',
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ContentSection = styled(Box)({
  flex: 1,
  padding: '20px',
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

const DataTable = styled(Table)({
  '& .MuiTableCell-root': {
    fontSize: '12px',
    padding: '4px 8px',
    border: '1px solid #ddd',
  },
  '& .MuiTableCell-head': {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
});

const StyledTextField = styled(TextField)({
  '& .MuiInputBase-input': {
    fontSize: '12px',
    padding: '4px 8px',
  },
});

const StyledSelect = styled(Select)({
  fontSize: '12px',
  '& .MuiSelect-select': {
    padding: '4px 8px',
  },
});

export const FlightDetails: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ fontSize: '16px' }}>
            PUTT to NRT
          </Typography>
          <Typography sx={{ fontSize: '12px', opacity: 0.8 }}>
            Dec 01, 1:12:39 AM JST
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" sx={{ color: 'white', fontSize: '11px' }}>Send To Map</Button>
          <Button size="small" sx={{ color: 'white', fontSize: '11px' }}>Share</Button>
          <Button size="small" sx={{ color: 'white', fontSize: '11px' }}>Delete</Button>
          <Button size="small" sx={{ color: 'white', fontSize: '11px' }}>Show Map</Button>
        </Box>
      </HeaderSection>

      {/* Flight Info Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'white' }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ minHeight: '36px' }}>
          <Tab label="FLIGHTS" sx={{ fontSize: '11px', minHeight: '36px' }} />
          <Tab label="JULY 2025" sx={{ fontSize: '11px', minHeight: '36px' }} />
        </Tabs>
      </Box>

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
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label="Navlog" size="small" sx={{ fontSize: '10px', height: '18px' }} />
                  <Chip label="Briefing" size="small" sx={{ fontSize: '10px', height: '18px' }} />
                  <Chip label="Q Files" size="small" sx={{ fontSize: '10px', height: '18px' }} />
                  <Chip label="Q New Msg" size="small" sx={{ fontSize: '10px', height: '18px' }} />
                </Box>
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
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <StyledSelect value="AA (SF50)" displayEmpty>
                  <MenuItem value="AA (SF50)">AA (SF50)</MenuItem>
                </StyledSelect>
              </FormControl>
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
                <StyledSelect value="IFR" size="small">
                  <MenuItem value="IFR">IFR</MenuItem>
                  <MenuItem value="VFR">VFR</MenuItem>
                </StyledSelect>
              </Box>
            </Box>
          </CardContent>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Payload Section */}
          <Box sx={{ flex: '1 1 33%' }}>
            <SectionCard>
              <CardContent>
                <SectionTitle>PAYLOAD</SectionTitle>
                <TableContainer>
                  <DataTable size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>PAYLOAD (LBS)</TableCell>
                        <TableCell align="right">COUNT</TableCell>
                        <TableCell align="right">AVG. WT.</TableCell>
                        <TableCell align="right">TOTAL</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Persons</TableCell>
                        <TableCell align="right">1</TableCell>
                        <TableCell align="right">200</TableCell>
                        <TableCell align="right">200</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Cargo</TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right">0</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Payload</TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right">200</TableCell>
                      </TableRow>
                    </TableBody>
                  </DataTable>
                </TableContainer>
              </CardContent>
            </SectionCard>
          </Box>

          {/* Fuel Section */}
          <Box sx={{ flex: '1 1 33%' }}>
            <SectionCard>
              <CardContent>
                <SectionTitle>FUEL</SectionTitle>
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: '10px', color: '#666' }}>Fuel Policy</Typography>
                  <StyledSelect value="Minimum Fuel" size="small" fullWidth>
                    <MenuItem value="Minimum Fuel">Minimum Fuel</MenuItem>
                  </StyledSelect>
                </Box>
                
                <Typography sx={{ fontSize: '12px', fontWeight: 'bold', mt: 2, mb: 1 }}>FUEL ALLOCATION</Typography>
                <TableContainer>
                  <DataTable size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Start</TableCell>
                        <TableCell align="right">537</TableCell>
                        <TableCell align="right">80</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>▼ Flight Fuel</TableCell>
                        <TableCell align="right">157</TableCell>
                        <TableCell align="right">23</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Taxi Fuel</TableCell>
                        <TableCell align="right">40</TableCell>
                        <TableCell align="right">6</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Fuel to Destination</TableCell>
                        <TableCell align="right">117</TableCell>
                        <TableCell align="right">17</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>▼ Fuel at Landing</TableCell>
                        <TableCell align="right">380</TableCell>
                        <TableCell align="right">56</TableCell>
                      </TableRow>
                    </TableBody>
                  </DataTable>
                </TableContainer>
              </CardContent>
            </SectionCard>
          </Box>

          {/* Weights Section */}
          <Box sx={{ flex: '1 1 33%' }}>
            <SectionCard>
              <CardContent>
                <SectionTitle>WEIGHTS</SectionTitle>
                <TableContainer>
                  <DataTable size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>WEIGHTS</TableCell>
                        <TableCell align="right">LBS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>• Zero Fuel Weight</TableCell>
                        <TableCell align="right">3,772</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>1,128 lb available</TableCell>
                        <TableCell align="right">/ 4,900</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Total Fuel at Start</TableCell>
                        <TableCell align="right">537</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>• Ramp Weight</TableCell>
                        <TableCell align="right">4,309</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>1,731 lbs available</TableCell>
                        <TableCell align="right">/ 6,040</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Taxi/Takeoff Fuel</TableCell>
                        <TableCell align="right">40</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>• Takeoff Weight</TableCell>
                        <TableCell align="right">4,269</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>1,731 lbs available</TableCell>
                        <TableCell align="right">/ 6,000</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Fuel to Destination</TableCell>
                        <TableCell align="right">117</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Landing Weight</TableCell>
                        <TableCell align="right">4,152</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>1,998 lb available</TableCell>
                        <TableCell align="right">/ 6,150</TableCell>
                      </TableRow>
                    </TableBody>
                  </DataTable>
                </TableContainer>
              </CardContent>
            </SectionCard>
          </Box>
        </Box>

        {/* Bottom Sections */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: '1 1 50%' }}>
            <SectionCard>
              <CardContent>
                <SectionTitle>DESTINATION SERVICES</SectionTitle>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: '10px', color: '#666' }}>FBO</Typography>
                    <StyledSelect value="Optional" size="small">
                      <MenuItem value="Optional">Optional</MenuItem>
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

        {/* Bottom Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 2 }}>
          <Typography sx={{ fontSize: '12px', color: '#666' }}>
            Not Filed
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small">Add Next Flight</Button>
            <Button variant="outlined" size="small">Copy</Button>
            <Button variant="contained" size="small" sx={{ backgroundColor: '#4a90a4' }}>
              Proceed to File
            </Button>
          </Box>
        </Box>
      </ContentSection>
    </MainContainer>
  );
};