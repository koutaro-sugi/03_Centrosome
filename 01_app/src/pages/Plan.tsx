import React, { useState, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Snackbar, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Stack,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { PlanDetails } from '../components/PlanDetails';
import { PlansSidebar } from '../components/PlansSidebar';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';

// ヘルパー関数：座標から地名を取得
async function getPlaceName(lat: number, lon: number): Promise<string> {
  try {
    const accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?` +
      `types=place,locality,neighborhood&language=en&access_token=${accessToken}`
    );
    const data = await response.json();
    
    // 最も適切な地名を見つける
    const place = data.features?.find((f: any) => 
      f.place_type?.includes('place') || 
      f.place_type?.includes('locality') ||
      f.place_type?.includes('neighborhood')
    );
    
    return place?.text?.toUpperCase() || 'UNKNOWN';
  } catch (error) {
    console.error('Error getting place name:', error);
    return 'UNKNOWN';
  }
}

// ヘルパー関数：プランから座標を抽出
function getTakeoffCoordinates(planData: any): { lat: number; lon: number } | null {
  if (planData.mission?.plannedHomePosition) {
    return {
      lat: planData.mission.plannedHomePosition[0],
      lon: planData.mission.plannedHomePosition[1],
    };
  }
  
  const takeoffItem = planData.mission?.items?.find(
    (item: any) => item.command === 22 // NAV_TAKEOFF
  );
  
  if (takeoffItem?.params) {
    return {
      lat: takeoffItem.params[4] || 0,
      lon: takeoffItem.params[5] || 0,
    };
  }
  
  return null;
}

function getLandingCoordinates(planData: any): { lat: number; lon: number } | null {
  const items = planData.mission?.items || [];
  const landingItem = items.find(
    (item: any) => item.command === 21 // NAV_LAND
  );
  
  if (landingItem?.params) {
    return {
      lat: landingItem.params[4] || 0,
      lon: landingItem.params[5] || 0,
    };
  }
  
  // 着陸コマンドがない場合は最後のウェイポイントを使用
  const lastWaypoint = items.filter(
    (item: any) => item.command === 16 // NAV_WAYPOINT
  ).pop();
  
  if (lastWaypoint?.params) {
    return {
      lat: lastWaypoint.params[4] || 0,
      lon: lastWaypoint.params[5] || 0,
    };
  }
  
  return null;
}

interface PlanInfo {
  aircraft: string;
  pilotInCommand: string;
  omcLocation: string;
  duration: string;
  description: string;
}

export const Plan: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(() => {
    // ローカルストレージから最後に選択したプランIDを取得
    return localStorage.getItem('lastSelectedPlanId') || undefined;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { savePlan, loadPlans } = useFlightPlanStorage();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingPlanData, setPendingPlanData] = useState<any>(null);
  const [pendingPlanName, setPendingPlanName] = useState('');
  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    aircraft: 'DrN-40 (VTOL)',
    pilotInCommand: '',
    omcLocation: '',
    duration: '',
    description: '',
  });

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    // 選択したプランIDをローカルストレージに保存
    localStorage.setItem('lastSelectedPlanId', planId);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // .planファイルのチェック
    if (!file.name.endsWith('.plan')) {
      setSnackbar({
        open: true,
        message: 'Please select a .plan file',
        severity: 'error'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const planData = JSON.parse(content);

        // 基本的なバリデーション
        if (!planData.fileType || planData.fileType !== 'Plan') {
          throw new Error('Invalid flight plan file');
        }

        if (!planData.mission || !planData.mission.items) {
          throw new Error('Mission data not found');
        }

        // 離陸と着陸の座標を取得
        const takeoffCoords = getTakeoffCoordinates(planData);
        const landingCoords = getLandingCoordinates(planData);

        if (!takeoffCoords || !landingCoords) {
          throw new Error('Could not extract takeoff/landing coordinates');
        }

        // 地名を取得
        const takeoffPlace = await getPlaceName(takeoffCoords.lat, takeoffCoords.lon);
        const landingPlace = await getPlaceName(landingCoords.lat, landingCoords.lon);

        // ファイル名を生成
        const planName = `${takeoffPlace} - ${landingPlace}`;

        // ダイアログを開くためにデータを保存
        setPendingPlanData(planData);
        setPendingPlanName(planName);
        setPlanInfo({
          aircraft: 'DrN-40 (VTOL)',
          pilotInCommand: '',
          omcLocation: '',
          duration: '',
          description: `Flight plan from ${takeoffPlace} to ${landingPlace}`,
        });
        setUploadDialogOpen(true);
      } catch (error) {
        console.error('Error parsing flight plan:', error);
        setSnackbar({
          open: true,
          message: 'Failed to upload flight plan',
          severity: 'error'
        });
      }
    };

    reader.onerror = () => {
      setSnackbar({
        open: true,
        message: 'Failed to read file',
        severity: 'error'
      });
    };

    reader.readAsText(file);

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadConfirm = async () => {
    if (!pendingPlanData || !pendingPlanName) return;

    try {
      const result = await savePlan(pendingPlanName, pendingPlanData, planInfo);
      setSnackbar({
        open: true,
        message: 'Flight plan uploaded successfully',
        severity: 'success'
      });
      setUploadDialogOpen(false);
      setPendingPlanData(null);
      setPendingPlanName('');
      
      // プラン一覧を更新
      await loadPlans();
      
      // アップロードしたプランを選択状態にする
      if (result && result.id) {
        setSelectedPlanId(result.id);
        localStorage.setItem('lastSelectedPlanId', result.id);
      }
    } catch (error) {
      console.error('Error saving flight plan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save flight plan',
        severity: 'error'
      });
    }
  };

  const handleUploadCancel = () => {
    setUploadDialogOpen(false);
    setPendingPlanData(null);
    setPendingPlanName('');
    setPlanInfo({
      aircraft: 'DrN-40 (VTOL)',
      pilotInCommand: '',
      omcLocation: '',
      duration: '',
      description: '',
    });
  };

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
        <PlansSidebar 
          selectedPlanId={selectedPlanId}
          onPlanSelect={handlePlanSelect}
          onUploadClick={handleUploadClick}
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
      
      <PlanDetails selectedPlanId={selectedPlanId} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".plan"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Snackbar */}
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

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleUploadCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Flight Plan Information</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Plan Name: {pendingPlanName}
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Aircraft"
                value={planInfo.aircraft}
                onChange={(e) => setPlanInfo({ ...planInfo, aircraft: e.target.value })}
              />
              <TextField
                fullWidth
                label="Pilot in Command"
                value={planInfo.pilotInCommand}
                onChange={(e) => setPlanInfo({ ...planInfo, pilotInCommand: e.target.value })}
              />
              <TextField
                fullWidth
                label="OMC Location"
                value={planInfo.omcLocation}
                onChange={(e) => setPlanInfo({ ...planInfo, omcLocation: e.target.value })}
              />
              <TextField
                fullWidth
                label="Duration"
                value={planInfo.duration}
                onChange={(e) => setPlanInfo({ ...planInfo, duration: e.target.value })}
                placeholder="e.g., 2 hours 30 minutes"
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={planInfo.description}
                onChange={(e) => setPlanInfo({ ...planInfo, description: e.target.value })}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUploadCancel}>Cancel</Button>
          <Button onClick={handleUploadConfirm} variant="contained">
            Save Plan
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};