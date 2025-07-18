import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, ThemeProvider, createTheme, CssBaseline, useMediaQuery } from '@mui/material';
// import { Amplify } from 'aws-amplify';
// import { AuthWrapper } from './components/AuthWrapper';
import { Sidebar } from './components/Sidebar';
import { Flights } from './pages/Flights';
import { Plan } from './pages/Plan';
import { PreFlight } from './pages/PreFlight';
import { InFlight } from './pages/InFlight';
import { Aircrafts } from './pages/Aircrafts';
import { Logbook } from './pages/Logbook';
import { TrackLogs } from './pages/TrackLogs';
import { Admin } from './pages/Admin';
import { TestDataSetup } from './pages/TestDataSetup';
import { FlightPlanProvider } from './contexts/FlightPlanContext';
import { initializeApp } from './utils/initializeApp';
// import amplifyconfig from './amplifyconfiguration';

// Amplify.configure(amplifyconfig);

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

// レイアウトコンポーネント
function AppLayout() {
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 960px未満をモバイルとする
  const isLogbookPage = location.pathname === '/logbook';
  const shouldHideSidebar = isMobile && isLogbookPage;

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      width: '100%',
      overflow: 'hidden'
    }}>
      {!shouldHideSidebar && <Sidebar />}
      <Box sx={{ flex: 1, width: '100%' }}>
        <Routes>
        <Route path="/" element={<Navigate to="/flights" replace />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/pre-flight" element={<PreFlight />} />
        <Route path="/in-flight" element={<InFlight />} />
        <Route path="/aircrafts" element={<Aircrafts />} />
        <Route path="/logbook" element={<Logbook />} />
        <Route path="/track-logs" element={<TrackLogs />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/test-data" element={<TestDataSetup />} />
      </Routes>
      </Box>
    </Box>
  );
}

function App() {
  // アプリ起動時に初期化処理を実行
  useEffect(() => {
    initializeApp();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Amplify Authを有効にする場合は下記のコメントを解除 */}
      {/* <AuthWrapper> */}
        <FlightPlanProvider>
          <Router>
            <AppLayout />
          </Router>
        </FlightPlanProvider>
      {/* </AuthWrapper> */}
    </ThemeProvider>
  );
}

export default App;
