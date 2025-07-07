import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Typography,
  List,
  ListItem,
  styled,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  Add,
  CloudUpload,
  Download,
  MoreVert,
  Delete,
  Refresh,
} from '@mui/icons-material';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';
import { SlideToConfirm } from './SlideToConfirm';

const SidebarContainer = styled(Box)({
  width: 280,
  backgroundColor: '#ffffff',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
});

const SearchContainer = styled(Box)({
  padding: '8px',
});

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#48607a',
    color: 'white',
    '&:hover': {
      backgroundColor: '#5a6f8a',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: '1px solid #5a6f8a',
  },
  '& .MuiInputBase-input': {
    padding: '6px 12px',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.6)',
      opacity: 1,
    },
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '18px',
  },
});

const HeaderSection = styled(Box)({
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const HeaderTitle = styled(Typography)({
  color: 'white',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.5px',
});

const UploadButton = styled(Button)({
  backgroundColor: '#3498db',
  color: 'white',
  fontSize: '12px',
  padding: '4px 12px',
  minHeight: '28px',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#2980b9',
  },
});

const ContentSection = styled(Box)({
  flex: 1,
  overflow: 'auto',
  backgroundColor: '#f8f9fa',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#f5f5f5',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#c0c0c0',
    borderRadius: '4px',
  },
});

const PlanItem = styled(ListItem)<{ selected?: boolean }>(({ selected }) => ({
  backgroundColor: selected ? '#3498db' : '#ffffff',
  padding: '8px 16px',
  cursor: 'pointer',
  borderBottom: '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'flex-start',
  '&:hover': {
    backgroundColor: selected ? '#3498db' : '#f5f5f5',
  },
}));

const ActionButtons = styled(Box)({
  display: 'flex',
  gap: '4px',
  marginLeft: 'auto',
  alignItems: 'center',
  flexShrink: 0,
});

const PlanName = styled(Typography)<{ selected?: boolean }>(({ selected }) => ({
  color: selected ? 'white' : '#333',
  fontSize: '13px',
  fontWeight: 500,
  marginBottom: '2px',
}));

const PlanDetails = styled(Typography)<{ selected?: boolean }>(({ selected }) => ({
  color: selected ? 'rgba(255, 255, 255, 0.9)' : '#666',
  fontSize: '11px',
}));

const PlanTime = styled(Typography)<{ selected?: boolean }>(({ selected }) => ({
  color: selected ? 'rgba(255, 255, 255, 0.9)' : '#666',
  fontSize: '11px',
  marginTop: '2px',
}));

interface PlansSidebarProps {
  selectedPlanId?: string;
  onPlanSelect?: (planId: string) => void;
  onUploadClick?: () => void;
}

export const PlansSidebar: React.FC<PlansSidebarProps> = ({
  selectedPlanId,
  onPlanSelect,
  onUploadClick,
}) => {
  const [searchText, setSearchText] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlanForMenu, setSelectedPlanForMenu] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any>(null);
  
  const { plans, loading, error, loadPlans, deletePlan } = useFlightPlanStorage();
  
  // 初回ロード
  useEffect(() => {
    let mounted = true;
    
    const load = async () => {
      if (mounted) {
        await loadPlans();
      }
    };
    
    load();
    
    return () => {
      mounted = false;
    };
  }, []); // 依存配列を空にして初回のみ実行

  // 検索フィルタリング
  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, planId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedPlanForMenu(planId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlanForMenu(null);
  };

  const handleDownload = (plan: any) => {
    // プランデータをダウンロード
    const dataStr = JSON.stringify(plan.planData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${plan.name}.plan`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    handleMenuClose();
  };

  const handleDeleteClick = (plan: any) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (planToDelete) {
      try {
        await deletePlan(planToDelete.id);
        await loadPlans(); // リストを再読み込み
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    }
  };

  return (
    <SidebarContainer>
      {/* Top Dark Section */}
      <Box sx={{ backgroundColor: '#32495f' }}>
        {/* Search Bar */}
        <SearchContainer>
          <StyledTextField
            fullWidth
            placeholder="Search plans"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </SearchContainer>

        {/* Header Section */}
        <HeaderSection>
          <HeaderTitle>PLANS</HeaderTitle>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={loadPlans}
              sx={{ 
                color: 'white',
                padding: '4px',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
              disabled={loading}
            >
              <Refresh sx={{ fontSize: 18 }} />
            </IconButton>
            <UploadButton 
              startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
              onClick={onUploadClick}
            >
              Upload Plan
            </UploadButton>
          </Box>
        </HeaderSection>
      </Box>

      {/* Plan List */}
      <ContentSection>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} sx={{ color: '#3498db' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
        ) : filteredPlans.length === 0 ? (
          <Typography sx={{ p: 2, textAlign: 'center', color: '#666', fontSize: '13px' }}>
            No plans found
          </Typography>
        ) : (
          <List disablePadding>
            {filteredPlans.map((plan) => (
              <PlanItem
                key={plan.id}
                selected={selectedPlanId === plan.id}
                onClick={(e) => {
                  // アクションボタンをクリックした場合は選択しない
                  if (!(e.target as HTMLElement).closest('.action-buttons')) {
                    onPlanSelect?.(plan.id);
                  }
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <PlanName selected={selectedPlanId === plan.id}>
                    {plan.departure_code && plan.destination_code 
                      ? `${plan.departure_code} - ${plan.destination_code}`
                      : plan.name}
                  </PlanName>
                  {plan.description && (
                    <PlanDetails selected={selectedPlanId === plan.id}>
                      {plan.description}
                    </PlanDetails>
                  )}
                  <PlanTime selected={selectedPlanId === plan.id}>
                    Uploaded: {formatDate(plan.createdAt)}
                  </PlanTime>
                  <PlanDetails selected={selectedPlanId === plan.id}>
                    Status: {plan.status || 'draft'}
                  </PlanDetails>
                </Box>
                <ActionButtons className="action-buttons">
                  <IconButton
                    size="small"
                    onClick={() => handleDownload(plan)}
                    sx={{ 
                      color: selectedPlanId === plan.id ? 'white' : '#666',
                      '&:hover': { 
                        backgroundColor: selectedPlanId === plan.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                      }
                    }}
                  >
                    <Download fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, plan.id)}
                    sx={{ 
                      color: selectedPlanId === plan.id ? 'white' : '#666',
                      '&:hover': { 
                        backgroundColor: selectedPlanId === plan.id ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' 
                      }
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </ActionButtons>
              </PlanItem>
            ))}
          </List>
        )}
      </ContentSection>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            const plan = plans.find(p => p.id === selectedPlanForMenu);
            if (plan) handleDeleteClick(plan);
          }}
          sx={{ color: '#dc3545', fontSize: '13px' }}
        >
          <Delete sx={{ mr: 1, fontSize: 18 }} />
          Delete Plan
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Plan</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to delete "{planToDelete?.name}"? This action cannot be undone.
          </Typography>
          <SlideToConfirm
            onConfirm={handleDeleteConfirm}
            text="Slide to delete plan"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </SidebarContainer>
  );
};