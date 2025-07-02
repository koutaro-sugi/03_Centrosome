import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { ForeFlightSidebar, foreFlightTheme } from './components/ForeFlight';

function App() {
  const [activeItemId, setActiveItemId] = useState('flights');

  const handleItemClick = (itemId: string) => {
    setActiveItemId(itemId);
    console.log('Clicked item:', itemId);
  };

  return (
    <ThemeProvider theme={foreFlightTheme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <ForeFlightSidebar
          activeItemId={activeItemId}
          onItemClick={handleItemClick}
        />
        
        {/* Main content area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            padding: 3,
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box>
            <h1>ForeFlight Sample Claude</h1>
            <p>Active menu item: <strong>{activeItemId}</strong></p>
            <p>このサイドバーはFigmaデザインを基にMUIで完全再現したものです。</p>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;