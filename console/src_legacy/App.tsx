import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  CircularProgress,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
} from '@mui/material';
import { LogoutOutlined } from '@mui/icons-material';
import DraggableDashboard from './components/DraggableDashboard';
import AuthComponent from './components/AuthComponent';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import './App.css';

// Create MUI theme with Notion-like design
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#787774',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#37352f',
      secondary: '#787774',
    },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      color: '#37352f',
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
});

const App: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser();
      const attributes = user.signInDetails?.loginId;
      let displayName = null;

      if (user.username) {
        displayName = user.username;
      } else if (attributes) {
        displayName = attributes.split('@')[0];
      }

      setUserEmail(displayName);
      setIsAuthenticated(true);
      console.log('Amplify認証が成功しました:', displayName);
    } catch (error) {
      console.log('認証が必要です。ログイン画面に移動します。');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAuthSuccess = () => {
    checkAuthStatus();
  };

  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthComponent onAuthSuccess={handleAuthSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Simple header with user info and sign out */}
        <AppBar
          position="static"
          color="default"
          elevation={0}
          sx={{ borderBottom: '1px solid #e7e7e6' }}
        >
          <Toolbar sx={{ minHeight: '48px' }}>
            {userEmail && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mr: 'auto' }}
              >
                @{userEmail}
              </Typography>
            )}

            <IconButton color="inherit" onClick={handleSignOut} edge="end">
              <LogoutOutlined />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* DraggableDashboard handles everything else */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <DraggableDashboard
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
