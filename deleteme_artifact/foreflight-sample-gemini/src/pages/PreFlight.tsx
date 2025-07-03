import React, { useState } from 'react';
import { Box, Typography, Button, IconButton, styled } from '@mui/material';
import { Settings } from '@mui/icons-material';
import { MapCard } from '../components/MapCard';

const MainContainer = styled(Box)({
  flex: 1,
  backgroundColor: '#f4f5f7',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
});

const HeaderSection = styled(Box)({
  backgroundColor: '#32495f',
  color: 'white',
  padding: '12px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ContentSection = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'configMode',
})<{ configMode: boolean }>(({ configMode }) => ({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  backgroundImage: configMode ? `
    linear-gradient(rgba(200, 200, 200, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200, 200, 200, 0.3) 1px, transparent 1px)
  ` : 'none',
  backgroundSize: '20px 20px',
}));

export const PreFlight: React.FC = () => {
  const [configMode, setConfigMode] = useState(false);

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
            Pre-Flight Planning
          </Typography>
          <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Weather & Route Analysis
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>
            Load Plan
          </Button>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>
            Save Plan
          </Button>
          <IconButton 
            size="small" 
            onClick={() => setConfigMode(!configMode)}
            sx={{ 
              color: configMode ? '#61dafb' : 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <Settings fontSize="small" />
          </IconButton>
        </Box>
      </HeaderSection>

      {/* Content with Grid Background */}
      <ContentSection configMode={configMode}>
        <MapCard 
          initialPosition={{ x: 40, y: 40 }} 
          configMode={configMode} 
          mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        />
      </ContentSection>
    </MainContainer>
  );
};