import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
  List,
  ListItem,
  styled,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Search,
  Refresh,
} from '@mui/icons-material';
import { useFlightPlanStorage } from '../hooks/useFlightPlanStorage';

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

interface PreFlightSidebarProps {
  selectedPlanId?: string;
  onPlanSelect?: (planId: string) => void;
}

export const PreFlightSidebar: React.FC<PreFlightSidebarProps> = ({
  selectedPlanId,
  onPlanSelect,
}) => {
  const [searchText, setSearchText] = useState('');
  const { plans, loading, error, loadPlans } = useFlightPlanStorage();
  
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
  }, []);

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
          <HeaderTitle>FLIGHT PLANS</HeaderTitle>
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
                onClick={() => onPlanSelect?.(plan.id)}
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
              </PlanItem>
            ))}
          </List>
        )}
      </ContentSection>
    </SidebarContainer>
  );
};