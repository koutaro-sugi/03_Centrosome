import React, { useEffect, useState, useMemo, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, ThemeProvider, createTheme, CssBaseline, useMediaQuery, GlobalStyles, PaletteMode, useTheme } from '@mui/material';
import { Amplify } from 'aws-amplify';
import { AuthProvider } from './contexts/AuthContextV2';
import { AuthWrapper } from './components/AuthWrapperV2';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SecurityProvider } from './contexts/SecurityContext';
import { Sidebar } from './components/Sidebar';
import { Flights } from './pages/Flights';
import { Plan } from './pages/Plan';
import { PreFlight } from './pages/PreFlight';
import { InFlight } from './pages/InFlight';
import { Weather } from './pages/Weather';
import { Aircrafts } from './pages/Aircrafts';
import { Logbook } from './pages/Logbook';
import { TrackLogs } from './pages/TrackLogs';
import { Admin } from './pages/Admin';
// import { TestDataSetup } from './pages/TestDataSetup'; // コメントアウト：ファイルが存在しない
import { FlightPlanProvider } from './contexts/FlightPlanContext';
import { initializeApp } from './utils/initializeApp';
import { OfflineIndicator } from './components/OfflineIndicator';
import outputs from './amplify_outputs.json';

Amplify.configure(outputs);

// テーマモード用のコンテキスト
interface ThemeModeContextType {
  toggleColorMode: () => void;
  mode: PaletteMode;
}

const ThemeModeContext = createContext<ThemeModeContextType>({
  toggleColorMode: () => {},
  mode: 'light',
});

export const useThemeMode = () => useContext(ThemeModeContext);

// テーマ作成関数
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // ライトモード
          primary: {
            main: '#3498db',
            light: '#5dade2',
            dark: '#2874a6',
          },
          secondary: {
            main: '#617185',
            light: '#7d8a9e',
            dark: '#4a5568',
          },
          background: {
            default: '#f4f5f7',
            paper: '#ffffff',
          },
          text: {
            primary: '#2c3e50',
            secondary: '#617185',
          },
        }
      : {
          // ダークモード
          primary: {
            main: '#5dade2',
            light: '#85c1e9',
            dark: '#3498db',
          },
          secondary: {
            main: '#7d8a9e',
            light: '#99a3b1',
            dark: '#617185',
          },
          background: {
            default: '#1a1a1a',
            paper: '#2d2d2d',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
          },
        }),
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
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === 'light' ? '#f4f5f7' : '#1a1a1a',
        },
      },
    },
    // タッチターゲットサイズの最適化
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          '@media (hover: none)': {
            '&:hover': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 12,
          '@media (hover: none)': {
            '&:hover': {
              backgroundColor: 'transparent',
            },
          },
        },
      },
    },
  },
});

// レイアウトコンポーネント
function AppLayout() {
  const location = useLocation();
  const theme = useTheme();
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
        <Route path="/weather" element={<Weather />} />
        <Route path="/aircrafts" element={<Aircrafts />} />
        <Route path="/logbook" element={<Logbook />} />
        <Route path="/track-logs" element={<TrackLogs />} />
        <Route path="/admin" element={<Admin />} />
        {/* <Route path="/test-data" element={<TestDataSetup />} /> コメントアウト：コンポーネントが存在しない */}
      </Routes>
      </Box>
    </Box>
  );
}

function App() {
  // localStorageからテーマモードを取得
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as PaletteMode) || 'light';
  });

  // アプリ起動時に初期化処理を実行
  useEffect(() => {
    initializeApp();
  }, []);

  // テーマモード切り替え関数
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          localStorage.setItem('themeMode', newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode]
  );

  // 動的にテーマを作成
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <ErrorBoundary>
      <ThemeModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles styles={{
            html: { height: '100%' },
            body: { height: '100%' },
            '#root': { height: '100%' }
          }} />
          <AuthProvider>
            <SecurityProvider>
              <AuthWrapper>
                <FlightPlanProvider>
                  <Router>
                    <AppLayout />
                  </Router>
                  <OfflineIndicator />
                </FlightPlanProvider>
              </AuthWrapper>
            </SecurityProvider>
          </AuthProvider>
        </ThemeProvider>
      </ThemeModeContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
