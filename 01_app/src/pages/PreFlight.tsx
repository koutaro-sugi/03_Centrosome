import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  styled,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { Settings, CloudUpload, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { MapCard } from '../components/MapCard';
import { PreFlightSidebar } from '../components/PreFlightSidebar';
import { ForecastPanel } from '../components/ForecastPanel';
import { PlanDetailsWithForecast } from '../components/PlanDetailsWithForecast';
import { useFlightPlan } from '../contexts/FlightPlanContext';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const { selectedPlan, updateFlightPlan } = useFlightPlan();
  const { loading, savePlan, loadPlan } = useFlightPlanStorage();
  
  // 画面サイズに基づいてMapCardの初期サイズを計算
  const calculateInitialMapSize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 画面サイズに応じて適切なサイズを計算
    let widthRatio = 0.5;
    let heightRatio = 0.6;
    
    if (screenWidth <= 768) { // モバイル
      widthRatio = 0.85;
      heightRatio = 0.7;
    } else if (screenWidth <= 1024) { // タブレット
      widthRatio = 0.65;
      heightRatio = 0.65;
    } else if (screenWidth <= 1440) { // 小さめのデスクトップ
      widthRatio = 0.55;
      heightRatio = 0.6;
    }
    
    // グリッドにスナップして返す
    const snapToGrid = (value: number, gridSize: number = 20) => {
      return Math.round(value / gridSize) * gridSize;
    };
    
    return {
      width: snapToGrid(Math.min(screenWidth * widthRatio, 1200)), // 最大幅1200px
      height: snapToGrid(Math.min(screenHeight * heightRatio, 800)) // 最大高さ800px
    };
  };
  
  // MapCardの位置とサイズをLocalStorageに保持
  const [mapPosition, setMapPosition] = useLocalStorage('preflight_map_position', { x: 40, y: 40 });
  const [mapSize, setMapSize] = useLocalStorage('preflight_map_size', calculateInitialMapSize());
  
  // ForecastPanelの位置とサイズをLocalStorageに保持
  const [forecastPosition, setForecastPosition] = useLocalStorage('preflight_forecast_position', { x: 600, y: 40 });
  const [forecastSize, setForecastSize] = useLocalStorage('preflight_forecast_size', { width: 400, height: 600 });
  
  // PlanDetailsコンポーネントの表示状態をLocalStorageに保持 (デフォルトをtrueに変更)
  const [showPlanDetails] = useLocalStorage('preflight_show_plan_details', true);
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // プラン選択ハンドラー
  const handlePlanSelect = async (planId: string) => {
    setSelectedPlanId(planId);
    try {
      const planData = await loadPlan(planId);
      if (planData && planData.planData) {
        updateFlightPlan(planData.planData);
        setSnackbar({
          open: true,
          message: 'Plan loaded successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load plan',
        severity: 'error'
      });
    }
  };



  // ウィンドウリサイズ時のMapCardサイズ調整
  useEffect(() => {
    const handleWindowResize = () => {
      // MapCardのサイズを画面サイズに応じて自動調整
      if (!configMode) { // 設定モードでない場合のみ
        const newMapSize = calculateInitialMapSize();
        setMapSize(prev => {
          // アスペクト比を維持しつつサイズを調整
          const aspectRatio = prev.width / prev.height;
          const newWidth = newMapSize.width;
          const newHeight = Math.round(newWidth / aspectRatio);
          
          // グリッドにスナップ
          const snapToGrid = (value: number, gridSize: number = 20) => {
            return Math.round(value / gridSize) * gridSize;
          };
          
          return {
            width: snapToGrid(newWidth),
            height: snapToGrid(Math.min(newHeight, window.innerHeight * 0.8))
          };
        });
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [configMode]);

  return (
    <Box sx={{ flex: 1, display: 'flex', backgroundColor: '#32495f', position: 'relative' }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: isSidebarOpen ? 280 : 0,
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <PreFlightSidebar 
          selectedPlanId={selectedPlanId}
          onPlanSelect={handlePlanSelect}
        />
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
      
      {/* Main Content */}
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
            <Button 
              size="small" 
              sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}
              startIcon={<CloudUpload sx={{ fontSize: 14 }} />}
              onClick={() => setSaveDialogOpen(true)}
              disabled={!selectedPlan}
            >
              Save Plan
            </Button>
            <IconButton 
              size="small" 
              onClick={() => setConfigMode(!configMode)}
              sx={{ 
                color: configMode ? '#61dafb' : 'white',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
              disabled={showPlanDetails}
            >
              <Settings fontSize="small" />
            </IconButton>
          </Box>
        </HeaderSection>

        {/* Content with Grid Background */}
        <ContentSection configMode={configMode}>
          {showPlanDetails ? (
            // PlanDetailsレイアウト（拡張版） - デフォルト表示
            <PlanDetailsWithForecast selectedPlanId={selectedPlanId} flightPlan={selectedPlan} />
          ) : (
            // 通常のPre-Flightレイアウト（現在は使用されない）
            configMode ? (
              <>
                <MapCard 
                  initialPosition={mapPosition} 
                  configMode={configMode} 
                  mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
                  flightPlan={selectedPlan}
                  size={mapSize}
                  onPositionChange={setMapPosition}
                  onSizeChange={setMapSize}
                  pageId="preflight"
                />
                <ForecastPanel
                  flightPlan={selectedPlan}
                  initialPosition={forecastPosition}
                  configMode={configMode}
                  onPositionChange={setForecastPosition}
                  size={forecastSize}
                  onSizeChange={setForecastSize}
                />
              </>
            ) : (
              <>
                <Box sx={{
                  position: 'absolute',
                  left: mapPosition.x,
                  top: mapPosition.y,
                  width: mapSize.width,
                  height: mapSize.height,
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <MapCard 
                    initialPosition={mapPosition} 
                    configMode={configMode} 
                    mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
                    flightPlan={selectedPlan}
                    size={mapSize}
                    pageId="preflight"
                  />
                </Box>
                {selectedPlan && (
                  <Box sx={{
                    position: 'absolute',
                    left: forecastPosition.x,
                    top: forecastPosition.y,
                    width: forecastSize.width,
                    height: forecastSize.height,
                  }}>
                    <ForecastPanel
                      flightPlan={selectedPlan}
                      initialPosition={forecastPosition}
                      configMode={configMode}
                      size={forecastSize}
                    />
                  </Box>
                )}
              </>
            )
          )}
        </ContentSection>
      </MainContainer>

      {/* Save Plan Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Flight Plan</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Plan Name"
            fullWidth
            variant="outlined"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={planDescription}
            onChange={(e) => setPlanDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              if (!planName || !selectedPlan) return;
              try {
                await savePlan(planName, selectedPlan, { description: planDescription });
                setSnackbar({ open: true, message: 'Flight plan saved successfully!', severity: 'success' });
                setSaveDialogOpen(false);
                setPlanName('');
                setPlanDescription('');
              } catch (err) {
                setSnackbar({ open: true, message: 'Failed to save flight plan', severity: 'error' });
              }
            }}
            disabled={!planName || loading}
            variant="contained"
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};