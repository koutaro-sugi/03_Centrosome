import React, { useState, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Collapse,
  styled,
} from '@mui/material';
import {
  Search,
  ExpandMore,
  ExpandLess,
  Add,
} from '@mui/icons-material';

// Styled components
export const SubSidebarContainer = styled(Box)({
  width: 280,
  backgroundColor: '#ffffff',
  color: '#2c3e50',
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #e0e0e0',
  height: '100%',
});

export const SearchSection = styled(Box)({
  padding: '8px',
});

export const HeaderSection = styled(Box)({
  backgroundColor: '#32495f',
  padding: '12px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: 'white',
});

export const ListSection = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  backgroundColor: '#ffffff',
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

export const StyledTextField = styled(TextField)({
  '& .MuiInputBase-root': {
    backgroundColor: '#4a5f7a',
    borderRadius: '4px',
    fontSize: '13px',
    height: '32px',
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
      color: 'rgba(255, 255, 255, 0.7)',
      opacity: 1,
    },
  },
  '& .MuiInputAdornment-root .MuiSvgIcon-root': {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '18px',
  },
});

export const DateHeader = styled(Box)({
  padding: '6px 12px',
  backgroundColor: '#e8e8e8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  color: '#333',
  fontSize: '12px',
  fontWeight: 600,
  userSelect: 'none',
  '&:hover': {
    backgroundColor: '#ddd',
  },
});

export interface SubSidebarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  headerTitle: string;
  actionButtonText: string;
  onActionButtonClick: () => void;
  actionButtonIcon?: ReactNode;
  children: ReactNode;
  enableDateGrouping?: boolean;
  dateGroups?: { [key: string]: ReactNode[] };
}

export const SubSidebar: React.FC<SubSidebarProps> = ({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  headerTitle,
  actionButtonText,
  onActionButtonClick,
  actionButtonIcon = <Add />,
  children,
  enableDateGrouping = false,
  dateGroups = {},
}) => {
  const [collapsedDates, setCollapsedDates] = useState<{ [key: string]: boolean }>({});

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates(prev => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  return (
    <SubSidebarContainer>
      {/* Top Dark Section */}
      <Box sx={{ backgroundColor: '#32495f' }}>
        <SearchSection>
          <StyledTextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </SearchSection>

        <HeaderSection>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px', color: 'white' }}>
            {headerTitle}
          </Typography>
          <Button
            size="small"
            variant="contained"
            sx={{
              backgroundColor: '#3498db',
              color: 'white',
              fontSize: '12px',
              padding: '4px 12px',
              minHeight: '28px',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#2980b9',
              },
            }}
            onClick={onActionButtonClick}
            startIcon={actionButtonIcon}
          >
            {actionButtonText}
          </Button>
        </HeaderSection>
      </Box>

      <ListSection>
        {enableDateGrouping && dateGroups ? (
          Object.entries(dateGroups).map(([date, items]) => (
            <Box key={date}>
              <DateHeader onClick={() => toggleDateCollapse(date)}>
                {collapsedDates[date] ? (
                  <ExpandLess sx={{ fontSize: '16px', color: '#666', marginRight: '4px' }} />
                ) : (
                  <ExpandMore sx={{ fontSize: '16px', color: '#666', marginRight: '4px' }} />
                )}
                <Typography sx={{ fontSize: '12px', fontWeight: 600, flex: 1 }}>
                  {date}
                </Typography>
              </DateHeader>
              <Collapse in={!collapsedDates[date]}>
                {items}
              </Collapse>
            </Box>
          ))
        ) : (
          children
        )}
      </ListSection>
    </SubSidebarContainer>
  );
};