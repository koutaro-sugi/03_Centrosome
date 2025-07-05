import React, { useState, useEffect, useRef } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import { Settings, CloudUpload, CloudDownload, UploadFile } from '@mui/icons-material';
import { MapCard } from '../components/MapCard';
import { useFlightPlan } from '../contexts/FlightPlanContext';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';

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
  const { selectedPlan, updateFlightPlan } = useFlightPlan();
  const { plans, loading, error, savePlan, loadPlans, loadPlan } = useFlightPlanStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // ローカルファイルから.planファイルを読み込む
  const handleLocalFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイル拡張子の確認
    if (!file.name.endsWith('.plan')) {
      setSnackbar({ 
        open: true, 
        message: '.planファイルを選択してください', 
        severity: 'error' 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const planData = JSON.parse(content);

        // 基本的な検証
        if (!planData.fileType || planData.fileType !== 'Plan') {
          throw new Error('無効なフライトプランファイルです');
        }

        if (!planData.mission || !planData.mission.items) {
          throw new Error('ミッションデータが見つかりません');
        }

        // FlightPlanContextに設定
        updateFlightPlan(planData);
        setSnackbar({ 
          open: true, 
          message: `${file.name}を読み込みました`, 
          severity: 'success' 
        });
      } catch (error) {
        console.error('Error parsing flight plan:', error);
        setSnackbar({ 
          open: true, 
          message: 'ファイルの読み込みに失敗しました', 
          severity: 'error' 
        });
      }
    };

    reader.onerror = () => {
      setSnackbar({ 
        open: true, 
        message: 'ファイルの読み込みに失敗しました', 
        severity: 'error' 
      });
    };

    reader.readAsText(file);
    
    // ファイル入力をリセット（同じファイルを再度選択できるように）
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
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
            startIcon={<UploadFile sx={{ fontSize: 14 }} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Load Local Plan
          </Button>
          <Button 
            size="small" 
            sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}
            startIcon={<CloudDownload sx={{ fontSize: 14 }} />}
            onClick={() => {
              loadPlans();
              setLoadDialogOpen(true);
            }}
          >
            Load Cloud Plan
          </Button>
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
          >
            <Settings fontSize="small" />
          </IconButton>
        </Box>
      </HeaderSection>

      {/* Content with Grid Background */}
      <ContentSection configMode={configMode}>
        <MapCard 
          initialPosition={{ x: 40, y: 40 }} 
          configMode={configMode} 
          mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
          flightPlan={selectedPlan}
        />
      </ContentSection>

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
                await savePlan(selectedPlan, planName, planDescription);
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

      {/* Load Plan Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load Flight Plan</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : plans.length === 0 ? (
            <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
              No saved flight plans found
            </Typography>
          ) : (
            <List>
              {plans.map((plan) => (
                <ListItemButton 
                  key={plan.id}
                  onClick={async () => {
                    try {
                      const loadedPlan = await loadPlan(plan.id);
                      if (loadedPlan && loadedPlan.planData) {
                        updateFlightPlan(loadedPlan.planData);
                        setSnackbar({ open: true, message: 'Flight plan loaded successfully!', severity: 'success' });
                        setLoadDialogOpen(false);
                      }
                    } catch (err) {
                      setSnackbar({ open: true, message: 'Failed to load flight plan', severity: 'error' });
                    }
                  }}
                >
                  <ListItemText 
                    primary={plan.name}
                    secondary={
                      <>
                        {plan.description && <Typography variant="body2">{plan.description}</Typography>}
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(plan.createdAt).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Cancel</Button>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".plan"
        style={{ display: 'none' }}
        onChange={handleLocalFileUpload}
      />
    </MainContainer>
  );
};