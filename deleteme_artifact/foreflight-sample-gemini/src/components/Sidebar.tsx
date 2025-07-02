import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  styled
} from '@mui/material';
import {
  FlightTakeoff,
  Map,
  Image,
  Description,
  Flight,
  LocationOn,
  MenuBook,
  Timeline,
  Folder,
  TripOrigin,
  LocalGasStation,
  AccountCircle
} from '@mui/icons-material';

const SidebarContainer = styled(Box)(({ theme }) => ({
  width: 165,
  height: '100vh',
  backgroundColor: '#1e374f',
  boxShadow: '1px 0px 1px rgba(0, 0, 0, 0.2)',
  display: 'flex',
  flexDirection: 'column',
}));

const LogoContainer = styled(Box)({
  height: 47,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 12px',
});

const LogoText = styled(Typography)({
  color: 'white',
  fontWeight: 'bold',
  fontSize: '14px',
});

const MenuContainer = styled(Box)({
  flex: 1,
  paddingTop: 14,
});

const StyledListItemButton = styled(ListItemButton)<{ selected?: boolean }>(({ selected }) => ({
  height: 32.41,
  margin: '0 4px',
  borderRadius: 2,
  paddingLeft: 9,
  paddingTop: 8.2,
  paddingBottom: 8.21,
  backgroundColor: selected ? '#3498db' : 'transparent',
  '&:hover': {
    backgroundColor: selected ? '#3498db' : 'rgba(255, 255, 255, 0.08)',
  },
  minHeight: 32,
}));

const StyledListItemIcon = styled(ListItemIcon)({
  minWidth: 30,
  color: 'white',
  '& .MuiSvgIcon-root': {
    fontSize: '14px',
  },
});

const StyledListItemText = styled(ListItemText)({
  '& .MuiTypography-root': {
    color: 'white',
    fontSize: '14px',
    fontWeight: 400,
    paddingRight: 8,
  },
});

const SeparatorDivider = styled(Divider)({
  backgroundColor: 'rgba(255, 255, 255, 0.15)',
  margin: '10px 8px',
});

const menuItems = [
  { name: 'Flights', icon: FlightTakeoff, selected: true },
  { name: 'Maps', icon: Map },
  { name: 'Imagery', icon: Image },
  { name: 'Documents', icon: Description },
  { name: 'Aircraft', icon: Flight },
  { name: 'Airports', icon: LocationOn },
  { name: 'Logbook', icon: MenuBook },
  { name: 'Track Logs', icon: Timeline },
  { name: 'Directory', icon: Folder },
  { name: 'Trip Assistant', icon: TripOrigin },
];

const bottomMenuItems = [
  { name: 'JetFuelX', icon: LocalGasStation },
  { name: 'Account', icon: AccountCircle },
];

export const Sidebar: React.FC = () => {
  return (
    <SidebarContainer>
      {/* Logo Section */}
      <LogoContainer>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FlightTakeoff sx={{ color: 'white', fontSize: '20px', mr: 1 }} />
          <LogoText>ForeFlight</LogoText>
        </Box>
      </LogoContainer>

      <SeparatorDivider />
      <SeparatorDivider />

      {/* Main Menu */}
      <MenuContainer>
        <List sx={{ padding: 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <StyledListItemButton selected={item.selected}>
                <StyledListItemIcon>
                  <item.icon />
                </StyledListItemIcon>
                <StyledListItemText primary={item.name} />
              </StyledListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Bottom section with spacer */}
        <Box sx={{ flexGrow: 1 }} />
        
        <List sx={{ padding: 0 }}>
          {bottomMenuItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <StyledListItemButton>
                <StyledListItemIcon>
                  <item.icon />
                </StyledListItemIcon>
                <StyledListItemText primary={item.name} />
              </StyledListItemButton>
            </ListItem>
          ))}
        </List>
      </MenuContainer>
    </SidebarContainer>
  );
};