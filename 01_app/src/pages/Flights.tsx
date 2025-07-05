import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { FlightDetails } from '../components/FlightDetails';
import { FlightsSidebar } from '../components/FlightsSidebar';

export const Flights: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <Box sx={{ flex: 1, display: 'flex', backgroundColor: '#32495f', position: 'relative' }}>
      <Box
        sx={{
          width: isSidebarOpen ? 280 : 0,
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <FlightsSidebar />
      </Box>
      
      {/* Toggle Button */}
      <IconButton
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        sx={{
          position: 'absolute',
          left: isSidebarOpen ? 280 : 0,
          top: '15%',
          transform: 'translateY(-50%)',
          backgroundColor: '#32495f',
          color: 'white',
          borderRadius: '0 4px 4px 0',
          width: '20px',
          height: '48px',
          padding: 0,
          zIndex: 1000,
          transition: 'left 0.3s ease',
          border: 'none',
          '&:hover': {
            backgroundColor: '#3d5673',
          },
        }}
      >
        {isSidebarOpen ? <ChevronLeft sx={{ fontSize: '20px' }} /> : <ChevronRight sx={{ fontSize: '20px' }} />}
      </IconButton>
      
      <FlightDetails />
    </Box>
  );
};