import React, {
  useEffect,
  useState,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  useMediaQuery,
  GlobalStyles,
  PaletteMode,
  useTheme,
  Typography,
  Button,
} from "@mui/material";
import { Amplify } from "aws-amplify";
import { AuthProvider } from "./contexts/AuthContextV2";
import { AuthWrapper } from "./components/AuthWrapperV2";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SecurityProvider } from "./contexts/SecurityContext";
import { Sidebar } from "./components/Sidebar";
import { Aircrafts } from "./pages/Aircrafts";
import { Logbook } from "./pages/Logbook";
// import { TestDataSetup } from './pages/TestDataSetup'; // コメントアウト：ファイルが存在しない
import { FlightPlanProvider } from "./contexts/FlightPlanContext";
import { initializeApp } from "./utils/initializeApp";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { logVersionInfo } from "./lib/version";

type AmplifyConfigState =
  | { status: "loading"; message?: undefined }
  | { status: "ready"; message?: undefined }
  | { status: "error"; message: string };

// Amplify設定はランタイムに /amplify_outputs.json から読み込む
// （src配下の古いファイルをバンドルしないため）
const useAmplifyConfiguration = (): AmplifyConfigState => {
  const [state, setState] = useState<AmplifyConfigState>({ status: "loading" });

  useEffect(() => {
    // Log version info on app start
    logVersionInfo();
    let cancelled = false;

    const loadOutputs = async (path: string) => {
      const res = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
      }

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid JSON returned from ${path}`);
      }
    };

    const configureAmplify = async () => {
      const candidates = ["/amplify_outputs.json", "/src/amplify_outputs.json"];
      let lastError: Error | null = null;

      for (const candidate of candidates) {
        try {
          console.info(`[Centra] Loading Amplify outputs from ${candidate}`);
          const outputs = await loadOutputs(candidate);

          if (!outputs?.auth?.user_pool_id || !outputs?.auth?.user_pool_client_id) {
            throw new Error("Missing Cognito configuration in amplify_outputs.json");
          }

          (window as any).__AMPLIFY_OUTPUTS__ = outputs;

          try {
            Amplify.configure(outputs);
          } catch (configError) {
            throw new Error(
              configError instanceof Error
                ? configError.message
                : String(configError)
            );
          }

          if (!cancelled) {
            setState({ status: "ready" });
          }
          return;
        } catch (error) {
          lastError =
            error instanceof Error ? error : new Error(String(error));
          console.error(
            `[Centra] Failed to initialize Amplify using ${candidate}:`,
            lastError
          );
        }
      }

      if (!cancelled) {
        setState({
          status: "error",
          message:
            lastError?.message || "Unknown error while loading amplify_outputs.json",
        });
      }
    };

    configureAmplify();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};

// テーマモード用のコンテキスト
interface ThemeModeContextType {
  toggleColorMode: () => void;
  mode: PaletteMode;
}

const ThemeModeContext = createContext<ThemeModeContextType>({
  toggleColorMode: () => {},
  mode: "light",
});

export const useThemeMode = () => useContext(ThemeModeContext);

// テーマ作成関数
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          // ライトモード
          primary: {
            main: "#3498db",
            light: "#5dade2",
            dark: "#2874a6",
          },
          secondary: {
            main: "#617185",
            light: "#7d8a9e",
            dark: "#4a5568",
          },
          background: {
            default: "#f4f5f7",
            paper: "#ffffff",
          },
          text: {
            primary: "#2c3e50",
            secondary: "#617185",
          },
        }
      : {
          // ダークモード
          primary: {
            main: "#5dade2",
            light: "#85c1e9",
            dark: "#3498db",
          },
          secondary: {
            main: "#7d8a9e",
            light: "#99a3b1",
            dark: "#617185",
          },
          background: {
            default: "#1a1a1a",
            paper: "#2d2d2d",
          },
          text: {
            primary: "#ffffff",
            secondary: "#b0b0b0",
          },
        }),
    error: {
      main: "#e74c3c",
      light: "#ec7063",
      dark: "#c0392b",
    },
    warning: {
      main: "#f39c12",
      light: "#f5b041",
      dark: "#d68910",
    },
    success: {
      main: "#27ae60",
      light: "#52be80",
      dark: "#1e8449",
    },
    info: {
      main: "#3498db",
      light: "#5dade2",
      dark: "#2874a6",
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mode === "light" ? "#f4f5f7" : "#1a1a1a",
        },
      },
    },
    // タッチターゲットサイズの最適化
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          "@media (hover: none)": {
            "&:hover": {
              backgroundColor: "transparent",
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 12,
          "@media (hover: none)": {
            "&:hover": {
              backgroundColor: "transparent",
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
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // 960px未満をモバイルとする
  const isLogbookPage = location.pathname === "/logbook";
  const shouldHideSidebar = isMobile && isLogbookPage;

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {!shouldHideSidebar && <Sidebar />}
      <Box sx={{ flex: 1, width: "100%", minHeight: 0, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/logbook" replace />} />
          <Route path="/logbook" element={<Logbook />} />
          <Route path="/aircrafts" element={<Aircrafts />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  const amplifyConfigState = useAmplifyConfiguration();
  // localStorageからテーマモードを取得
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem("themeMode");
    return (savedMode as PaletteMode) || "light";
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
          const newMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("themeMode", newMode);
          return newMode;
        });
      },
      mode,
    }),
    [mode]
  );

  // 動的にテーマを作成
  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  if (amplifyConfigState.status === "loading") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        初期化中...
      </Box>
    );
  }

  if (amplifyConfigState.status === "error") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 2,
          p: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Amplify の初期化に失敗しました
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {amplifyConfigState.message}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          リロードしても解決しない場合は、`/amplify_outputs.json` の配信設定を確認してください。
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles
            styles={{
              html: { height: "100%" },
              body: { height: "100%" },
              "#root": { height: "100%" },
            }}
          />
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
