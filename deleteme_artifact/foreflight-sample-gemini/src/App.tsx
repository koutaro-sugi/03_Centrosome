import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Sidebar } from './components/Sidebar';
import { Flights } from './pages/Flights';
import { PreFlight } from './pages/PreFlight';
import { Aircrafts } from './pages/Aircrafts';
import { Logbook } from './pages/Logbook';
import { TrackLogs } from './pages/TrackLogs';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3498db', // アクセントカラー
      light: '#5dade2',
      dark: '#2874a6',
    },
    secondary: {
      main: '#617185', // その他のカラー
      light: '#7d8a9e',
      dark: '#4a5568',
    },
    background: {
      default: '#f4f5f7', // 背景色
      paper: '#ffffff',
    },
    error: {
      main: '#e74c3c',
      light: '#ec7063',
      dark: '#c0392b',
    },
    warning: {
      main: '#f39c12',
      light: '#f5b041',
      dark: '#d68910',
    },
    success: {
      main: '#27ae60',
      light: '#52be80',
      dark: '#1e8449',
    },
    info: {
      main: '#3498db',
      light: '#5dade2',
      dark: '#2874a6',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#617185',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f4f5f7',
        },
      },
    },
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
            <Route path="/pre-flight" element={<PreFlight />} />
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
