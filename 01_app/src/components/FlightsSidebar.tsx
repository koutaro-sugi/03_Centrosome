import React from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Button,
  Typography,
  List,
  ListItem,
  styled,
  Collapse,
} from '@mui/material';
import {
  Search,
  Add,
  ExpandMore,
  ChevronRight,
} from '@mui/icons-material';

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

const AddButton = styled(Button)({
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

const DateGroupHeader = styled(Box)({
  backgroundColor: '#e8e8e8',
  padding: '6px 12px',
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': {
    backgroundColor: '#ddd',
  },
});

const DateText = styled(Typography)({
  color: '#333',
  fontSize: '12px',
  fontWeight: 600,
  marginLeft: '4px',
});

const FlightItem = styled(ListItem)({
  backgroundColor: '#ffffff',
  padding: '8px 16px',
  cursor: 'pointer',
  borderBottom: '1px solid #e0e0e0',
  '&:hover': {
    backgroundColor: '#f5f5f5',
  },
  '&.selected': {
    backgroundColor: '#3498db',
  },
});

const FlightRoute = styled(Typography)({
  color: '#333',
  fontSize: '13px',
  fontWeight: 500,
  marginBottom: '2px',
});

const FlightDetails = styled(Typography)({
  color: '#666',
  fontSize: '11px',
});

const FlightTime = styled(Typography)({
  color: '#666',
  fontSize: '11px',
  marginTop: '2px',
});

interface FlightGroup {
  date: string;
  flights: {
    id: string;
    route: string;
    aircraft: string;
    departureTime: string;
    etd: string;
    selected?: boolean;
  }[];
}

export const FlightsSidebar: React.FC = () => {
  const [searchText, setSearchText] = React.useState('');
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>(['JULY 2025']);

  const flightGroups: FlightGroup[] = [
    {
      date: 'JULY 2025',
      flights: [
        {
          id: '1',
          route: 'FUJ to NGS (IFR)',
          aircraft: '5,000´ MSL in AA',
          departureTime: 'ETA 12:25 AM JST',
          etd: 'ETD 12:15 AM',
          selected: true,
        },
      ],
    },
  ];

  const toggleGroup = (date: string) => {
    setExpandedGroups(prev =>
      prev.includes(date)
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  return (
    <SidebarContainer>
      {/* Top Dark Section */}
      <Box sx={{ backgroundColor: '#32495f' }}>
        {/* Search Bar */}
        <SearchContainer>
          <StyledTextField
            fullWidth
            placeholder="Search flights"
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
          <HeaderTitle>FLIGHTS</HeaderTitle>
          <AddButton startIcon={<Add />}>
            Add New
          </AddButton>
        </HeaderSection>
      </Box>

      {/* Flight List */}
      <ContentSection>
        {flightGroups.map((group) => (
          <Box key={group.date}>
            <DateGroupHeader onClick={() => toggleGroup(group.date)}>
              {expandedGroups.includes(group.date) ? (
                <ExpandMore sx={{ fontSize: '16px', color: '#666' }} />
              ) : (
                <ChevronRight sx={{ fontSize: '16px', color: '#666' }} />
              )}
              <DateText>{group.date}</DateText>
            </DateGroupHeader>
            <Collapse in={expandedGroups.includes(group.date)}>
              <List disablePadding>
                {group.flights.map((flight) => (
                  <FlightItem
                    key={flight.id}
                    className={flight.selected ? 'selected' : ''}
                  >
                    <Box sx={{ width: '100%' }}>
                      <FlightRoute sx={{ color: flight.selected ? 'white' : '#333' }}>
                        {flight.route}
                      </FlightRoute>
                      <FlightDetails sx={{ color: flight.selected ? 'rgba(255, 255, 255, 0.9)' : '#666' }}>
                        {flight.aircraft}
                      </FlightDetails>
                      <FlightTime sx={{ color: flight.selected ? 'rgba(255, 255, 255, 0.9)' : '#666' }}>
                        {flight.departureTime} {flight.etd}
                      </FlightTime>
                      <FlightDetails sx={{ color: flight.selected ? 'rgba(255, 255, 255, 0.9)' : '#666' }}>
                        DIRECT
                      </FlightDetails>
                    </Box>
                  </FlightItem>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </ContentSection>
    </SidebarContainer>
  );
};