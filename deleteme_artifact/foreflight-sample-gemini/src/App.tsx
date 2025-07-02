import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Sidebar } from './components/Sidebar';
import { Flights } from './pages/Flights';
import { PreFlightCheck } from './pages/PreFlightCheck';
import { Aircrafts } from './pages/Aircrafts';
import { Logbook } from './pages/Logbook';
import { TrackLogs } from './pages/TrackLogs';

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
      <Router>
        <Box sx={{ 
          display: 'flex', 
          height: '100vh',
          width: '100%',
          overflow: 'hidden'
        }}>
          <Sidebar />
          <Routes>
            <Route path="/" element={<Navigate to="/flights" replace />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/pre-flight" element={<PreFlightCheck />} />
            <Route path="/aircrafts" element={<Aircrafts />} />
            <Route path="/logbook" element={<Logbook />} />
            <Route path="/track-logs" element={<TrackLogs />} />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
