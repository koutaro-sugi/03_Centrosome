import React from 'react';
import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Sidebar } from './components/Sidebar';
import { FlightDetails } from './components/FlightDetails';

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        height: '100vh',
        width: '1920px',
        overflow: 'hidden'
      }}>
        <Sidebar />
        <FlightDetails />
      </Box>
    </ThemeProvider>
  );
}

export default App;
