import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  styled,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Flight,
  MenuBook,
  Logout,
  Brightness4,
  Brightness7
} from '@mui/icons-material';
import { useThemeMode } from '../App';
import { LazyImage } from './LazyImage';

const SidebarContainer = styled(Box)(() => ({
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

// const LogoText = styled(Typography)({
//   color: 'white',
//   fontWeight: 'bold',
//   fontSize: '14px',
// });

const MenuContainer = styled(Box)({
  flex: 1,
  paddingTop: 14,
  display: 'flex',
  flexDirection: 'column',
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


const menuItems = [
  { name: 'Aircrafts', icon: Flight, path: '/aircrafts' },
  { name: 'Logbook', icon: MenuBook, path: '/logbook' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleColorMode, mode } = useThemeMode();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    // AuthWrapperで定義されたhandleSignOutを呼び出す
    if ((window as any).handleSignOut) {
      await (window as any).handleSignOut();
    }
  };

  return (
    <SidebarContainer>
      {/* Logo Section */}
      <LogoContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <LazyImage
          src="/logo/Centra.svg" 
          alt="Centrosome"
          height="20px"
          width="auto"
          style={{ 
            filter: 'brightness(0) invert(1)'  // SVGを白色に変換
          }}
        />
        <Tooltip title={mode === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}>
          <IconButton 
            sx={{ 
              color: 'white',
              padding: '4px',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }} 
            onClick={toggleColorMode}
            size="small"
          >
            {mode === 'light' ? <Brightness4 fontSize="small" /> : <Brightness7 fontSize="small" />}
          </IconButton>
        </Tooltip>
      </LogoContainer>


      {/* Main Menu */}
      <MenuContainer>
        <List sx={{ padding: 0 }}>
          {menuItems.map((item) => (
            <ListItem key={item.name} disablePadding>
              <StyledListItemButton 
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
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
        
        <List sx={{ padding: 0, marginBottom: 2 }}>
          <ListItem disablePadding>
            <StyledListItemButton onClick={handleLogout}>
              <StyledListItemIcon>
                <Logout />
              </StyledListItemIcon>
              <StyledListItemText primary="Logout" />
            </StyledListItemButton>
          </ListItem>
        </List>
      </MenuContainer>
    </SidebarContainer>
  );
};