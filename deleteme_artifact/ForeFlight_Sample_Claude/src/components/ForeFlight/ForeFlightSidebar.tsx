import React from 'react';
import { Box, Typography, ThemeProvider } from '@mui/material';
import { 
  Flight, 
  Map, 
  Image, 
  Description, 
  AirplanemodeActive, 
  LocalAirport, 
  Book, 
  Timeline, 
  Folder, 
  Assistant, 
  LocalGasStation, 
  AccountCircle, 
  School, 
  Logout,
  KeyboardDoubleArrowLeft
} from '@mui/icons-material';
import { foreFlightTheme } from './theme';
import { SidebarProps, MenuItem } from './types';

const defaultMenuItems: MenuItem[] = [
  { id: 'flights', label: 'Flights', icon: 'flight', isActive: true, variant: '14' },
  { id: 'maps', label: 'Maps', icon: 'map', variant: '1' },
  { id: 'imagery', label: 'Imagery', icon: 'image', variant: '2' },
  { id: 'documents', label: 'Documents', icon: 'description', variant: '3' },
  { id: 'aircraft', label: 'Aircraft', icon: 'airplanemodeActive', variant: '4' },
  { id: 'airports', label: 'Airports', icon: 'localAirport', variant: '5' },
  { id: 'logbook', label: 'Logbook', icon: 'book', variant: '6' },
  { id: 'tracklogs', label: 'Track Logs', icon: 'timeline', variant: '7' },
  { id: 'directory', label: 'Directory', icon: 'folder', variant: '8' },
  { id: 'tripassistant', label: 'Trip Assistant', icon: 'assistant', variant: '9' },
  { id: 'jetfuelx', label: 'JetFuelX', icon: 'localGasStation', variant: '10' },
  { id: 'account', label: 'Account', icon: 'accountCircle', variant: '11' },
  { id: 'learnsolve', label: 'Learn & Solve', icon: 'school', variant: '12' },
  { id: 'logout', label: 'Logout', icon: 'logout', variant: '13' },
];

const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    flight: Flight,
    map: Map,
    image: Image,
    description: Description,
    airplanemodeActive: AirplanemodeActive,
    localAirport: LocalAirport,
    book: Book,
    timeline: Timeline,
    folder: Folder,
    assistant: Assistant,
    localGasStation: LocalGasStation,
    accountCircle: AccountCircle,
    school: School,
    logout: Logout,
  };
  
  return iconMap[iconName] || Folder;
};

const ForeFlightSidebar: React.FC<SidebarProps> = ({
  menuItems = defaultMenuItems,
  activeItemId = 'flights',
  onItemClick = () => {},
  width = 165,
  height = 1200,
}) => {
  return (
    <ThemeProvider theme={foreFlightTheme}>
      <Box
        sx={{
          width,
          height,
          backgroundColor: '#1e374f',
          boxShadow: '1px 0px 0px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          overflow: 'hidden',
          fontFamily: 'Helvetica Neue, Arial, sans-serif',
        }}
      >
        {/* Header with collapse icon */}
        <Box
          sx={{
            width: '100%',
            height: 19,
            paddingRight: '1px',
            paddingTop: '2px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
          }}
        >
          <Box
            sx={{
              width: 164,
              height: 17,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Box
              sx={{
                width: 19,
                height: 17,
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <KeyboardDoubleArrowLeft 
                sx={{ 
                  fontSize: 14, 
                  color: 'white',
                  padding: '5px',
                }} 
              />
            </Box>
          </Box>
        </Box>

        {/* Logo Section */}
        <Box
          sx={{
            width: '100%',
            height: 47,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Box
              sx={{
                width: 57,
                height: 40,
                paddingLeft: '12px',
                paddingRight: '5px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                }}
              >
                <Flight sx={{ fontSize: 24, color: 'white' }} />
              </Box>
            </Box>
            <Box
              sx={{
                width: 87,
                height: 30,
                paddingTop: '2px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              <Box
                sx={{
                  width: 87,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: 'white',
                    fontFamily: 'Helvetica Neue, Arial, sans-serif',
                  }}
                >
                  ForeFlight
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Menu Container */}
        <Box
          sx={{
            width: '100%',
            height: 1134,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          {/* First Separator */}
          <Box
            sx={{
              width: '100%',
              height: 21,
              paddingLeft: '8px',
              paddingRight: '8px',
              paddingTop: '10px',
              paddingBottom: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
          >
            <Box
              sx={{
                width: 149,
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            />
          </Box>

          {/* Second Separator */}
          <Box
            sx={{
              width: '100%',
              height: 21,
              paddingLeft: '8px',
              paddingRight: '8px',
              paddingTop: '10px',
              paddingBottom: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
            }}
          >
            <Box
              sx={{
                width: 149,
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            />
          </Box>

          {/* Rectangle placeholder */}
          <Box
            sx={{
              width: '100%',
              height: 630,
              backgroundColor: 'transparent',
            }}
          />

          {/* Margin */}
          <Box
            sx={{
              width: '100%',
              height: 14,
            }}
          />

          {/* Menu Items */}
          {menuItems.map((item, index) => {
            const IconComponent = getIconComponent(item.icon || 'folder');
            const isActive = item.isActive || item.id === activeItemId;
            
            return (
              <Box
                key={item.id}
                sx={{
                  width: '100%',
                  height: index === menuItems.length - 2 ? 32 : 32.41, // Learn & Solve has different height
                  paddingLeft: '4px',
                  paddingRight: '4px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                }}
              >
                <Box
                  onClick={() => onItemClick(item.id)}
                  sx={{
                    width: 157,
                    height: index === menuItems.length - 2 ? 32 : 32.41,
                    borderRadius: '2px',
                    paddingLeft: '9px',
                    paddingTop: index === menuItems.length - 2 ? '7.5px' : '8.2px',
                    paddingBottom: index === menuItems.length - 2 ? '7.5px' : '8.21px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#3498db' : 'transparent',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: isActive ? '#2980b9' : 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 30,
                      minWidth: 30,
                      height: 'auto',
                      marginRight: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <IconComponent 
                      sx={{ 
                        fontSize: 16, 
                        color: 'white',
                      }} 
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontFamily: 'Helvetica Neue, Arial, sans-serif',
                      fontWeight: 400,
                      color: '#ffffff',
                      lineHeight: '16px',
                      paddingRight: '8px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ForeFlightSidebar;