import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton, 
  styled,
  Card,
  CardContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider
} from '@mui/material';
import { 
  Settings,
  ExpandLess,
  ExpandMore,
  Speed,
  Navigation,
  Battery80,
  MyLocation,
  Visibility,
  VisibilityOff,
  DragIndicator,
  SignalWifiOff,
  SignalWifi4Bar,
  SignalWifi2Bar
} from '@mui/icons-material';
import { MapCard } from '../components/MapCard';
import { useFlightPlan } from '../contexts/FlightPlanContext';
import { useMAVLinkWebSocket } from '../hooks/useMAVLinkWebSocket';

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

const TelemetryCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'configMode',
})<{ configMode?: boolean }>(({ configMode }) => ({
  position: 'absolute',
  width: 320,
  maxHeight: '80vh',
  overflow: 'auto',
  backgroundColor: '#ffffff',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  cursor: configMode ? 'move' : 'default',
  userSelect: configMode ? 'none' : 'auto',
  border: configMode ? '2px dashed #3498db' : 'none',
}));

const DragHandle = styled(Box)({  
  position: 'absolute',
  top: 8,
  left: 8,
  cursor: 'move',
  color: '#666',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  '&:hover': {
    color: '#3498db',
  },
});

const ResizeHandle = styled(Box)({  
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 20,
  height: 20,
  cursor: 'se-resize',
  '&::before': {
    content: '""',
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRight: '2px solid #666',
    borderBottom: '2px solid #666',
  },
});

interface TelemetryCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  expanded: boolean;
  visible: boolean;
  order: number;
  items: TelemetryItem[];
}

interface TelemetryItem {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  visible: boolean;
}

export const InFlight: React.FC = () => {
  const [configMode, setConfigMode] = useState(false);
  const { selectedPlan } = useFlightPlan();
  
  // EC2 WebSocket接続
  const { telemetry, status, messageCount } = useMAVLinkWebSocket({
    url: 'ws://52.194.5.104:8080',
    reconnectInterval: 5000,
    heartbeatTimeout: 3000,
  });
  const telemetryCardRef = useRef<HTMLDivElement>(null);
  const [telemetryPosition, setTelemetryPosition] = useState({ x: 700, y: 40 });
  const [telemetrySize, setTelemetrySize] = useState({ width: 320, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // テレメトリデータが更新されたらカテゴリも更新
  useEffect(() => {
    setTelemetryCategories(prev => prev.map(category => ({
      ...category,
      items: category.items.map(item => {
        let value = '--';
        switch (item.id) {
          case 'altitude':
            value = telemetry.alt !== undefined ? telemetry.alt.toFixed(1) : '--';
            break;
          case 'groundSpeed':
            value = telemetry.groundSpeed !== undefined ? telemetry.groundSpeed.toFixed(1) : '--';
            break;
          case 'airSpeed':
            value = telemetry.airSpeed !== undefined ? telemetry.airSpeed.toFixed(1) : '--';
            break;
          case 'heading':
            value = telemetry.heading !== undefined ? Math.round(telemetry.heading).toString() : '--';
            break;
          case 'flightMode':
            value = telemetry.flightMode || '--';
            break;
          case 'roll':
            value = telemetry.roll !== undefined ? telemetry.roll.toFixed(1) : '--';
            break;
          case 'pitch':
            value = telemetry.pitch !== undefined ? telemetry.pitch.toFixed(1) : '--';
            break;
          case 'yaw':
            value = telemetry.yaw !== undefined ? telemetry.yaw.toFixed(1) : '--';
            break;
          case 'verticalSpeed':
            value = telemetry.verticalSpeed !== undefined ? telemetry.verticalSpeed.toFixed(0) : '--';
            break;
          case 'voltage':
            value = telemetry.voltage !== undefined ? telemetry.voltage.toFixed(1) : '--';
            break;
          case 'current':
            value = telemetry.current !== undefined ? telemetry.current.toFixed(1) : '--';
            break;
          case 'remaining':
            value = telemetry.batteryRemaining !== undefined ? telemetry.batteryRemaining.toFixed(0) : '--';
            break;
          case 'lat':
            value = telemetry.lat !== undefined ? telemetry.lat.toFixed(6) : '--';
            break;
          case 'lon':
            value = telemetry.lon !== undefined ? telemetry.lon.toFixed(6) : '--';
            break;
          case 'satellites':
            value = telemetry.satellites !== undefined ? telemetry.satellites.toString() : '--';
            break;
          case 'hdop':
            value = telemetry.hdop !== undefined ? telemetry.hdop.toFixed(1) : '--';
            break;
          case 'distanceToHome':
            value = telemetry.distanceToHome !== undefined ? telemetry.distanceToHome.toFixed(1) : '--';
            break;
          case 'relativeAlt':
            value = telemetry.relativeAlt !== undefined ? telemetry.relativeAlt.toFixed(1) : '--';
            break;
          case 'throttle':
            value = telemetry.throttle !== undefined ? telemetry.throttle.toFixed(0) : '--';
            break;
          case 'gpsLock':
            const fixTypes = ['No GPS', 'No Fix', '2D Fix', '3D Fix', 'DGPS', 'RTK Float', 'RTK Fixed', 'Static', 'PPP'];
            value = telemetry.fixType !== undefined && fixTypes[telemetry.fixType] ? fixTypes[telemetry.fixType] : '--';
            break;
          case 'flightDistance':
            value = telemetry.flightDistance !== undefined ? telemetry.flightDistance.toFixed(1) : '--';
            break;
          case 'nextWpDistance':
            value = telemetry.nextWpDistance !== undefined ? telemetry.nextWpDistance.toFixed(1) : '--';
            break;
          case 'flightTime':
            if (telemetry.flightTime !== undefined) {
              const minutes = Math.floor(telemetry.flightTime / 60);
              const seconds = telemetry.flightTime % 60;
              value = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
              value = '--';
            }
            break;
        }
        return { ...item, value };
      })
    })));
  }, [telemetry]);

  const [telemetryCategories, setTelemetryCategories] = useState<TelemetryCategory[]>([
    {
      id: 'flight',
      name: 'Flight Data',
      icon: <Navigation />,
      expanded: true,
      visible: true,
      order: 0,
      items: [
        { id: 'altitude', label: 'Altitude AMSL', value: '--', unit: '', visible: true },
        { id: 'relativeAlt', label: 'Altitude Relative', value: '--', unit: '', visible: true },
        { id: 'groundSpeed', label: 'Ground Speed', value: '--', unit: '', visible: true },
        { id: 'airSpeed', label: 'Air Speed', value: '--', unit: '', visible: true },
        { id: 'heading', label: 'Heading', value: '--', unit: '', visible: true },
        { id: 'throttle', label: 'Throttle', value: '--', unit: '', visible: true },
        { id: 'flightMode', label: 'Flight Mode', value: '--', unit: '', visible: true },
      ],
    },
    {
      id: 'attitude',
      name: 'Attitude',
      icon: <Speed />,
      expanded: false,
      visible: true,
      order: 1,
      items: [
        { id: 'roll', label: 'Roll', value: '--', unit: '', visible: true },
        { id: 'pitch', label: 'Pitch', value: '--', unit: '', visible: true },
        { id: 'yaw', label: 'Yaw', value: '--', unit: '', visible: true },
        { id: 'verticalSpeed', label: 'Vertical Speed', value: '--', unit: '', visible: true },
      ],
    },
    {
      id: 'power',
      name: 'Power & Battery',
      icon: <Battery80 />,
      expanded: false,
      visible: true,
      order: 2,
      items: [
        { id: 'voltage', label: 'Voltage', value: '--', unit: '', visible: true },
        { id: 'current', label: 'Current', value: '--', unit: '', visible: true },
        { id: 'remaining', label: 'Battery Remaining', value: '--', unit: '', visible: true },
        { id: 'flightTime', label: 'Flight Time', value: '--', unit: '', visible: true },
      ],
    },
    {
      id: 'navigation',
      name: 'Navigation',
      icon: <MyLocation />,
      expanded: false,
      visible: true,
      order: 3,
      items: [
        { id: 'lat', label: 'Latitude', value: '--', unit: '', visible: true },
        { id: 'lon', label: 'Longitude', value: '--', unit: '', visible: true },
        { id: 'satellites', label: 'GPS Satellites', value: '--', unit: '', visible: true },
        { id: 'gpsLock', label: 'GPS Lock', value: '--', unit: '', visible: true },
        { id: 'hdop', label: 'HDOP', value: '--', unit: '', visible: true },
        { id: 'distanceToHome', label: 'Distance to Home', value: '--', unit: '', visible: true },
        { id: 'flightDistance', label: 'Flight Distance', value: '--', unit: '', visible: true },
        { id: 'nextWpDistance', label: 'Next WP Distance', value: '--', unit: '', visible: true },
      ],
    },
  ]);

  const handleCategoryExpand = (categoryId: string) => {
    setTelemetryCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
      )
    );
  };

  const handleCategoryVisibility = (categoryId: string) => {
    setTelemetryCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, visible: !cat.visible } : cat
      )
    );
  };

  const handleItemVisibility = (categoryId: string, itemId: string) => {
    setTelemetryCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, visible: !item.visible } : item
              ),
            }
          : cat
      )
    );
  };

  // ドラッグハンドラー
  const handleDragStart = (e: React.MouseEvent) => {
    if (!configMode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - telemetryPosition.x, y: e.clientY - telemetryPosition.y });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setTelemetryPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // リサイズハンドラー
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!configMode) return;
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: telemetrySize.width,
      height: telemetrySize.height,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    setTelemetrySize({
      width: Math.max(280, resizeStart.width + deltaX),
      height: Math.max(300, resizeStart.height + deltaY),
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // マウスイベントリスナー
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragStart]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart]);

  // ステータスアイコンを取得
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <SignalWifi4Bar sx={{ color: '#27ae60', fontSize: 16 }} />;
      case 'weak':
        return <SignalWifi2Bar sx={{ color: '#f39c12', fontSize: 16 }} />;
      case 'connecting':
        return <SignalWifi2Bar sx={{ color: '#3498db', fontSize: 16 }} />;
      case 'error':
        return <SignalWifiOff sx={{ color: '#e74c3c', fontSize: 16 }} />;
      default:
        return <SignalWifiOff sx={{ color: '#e74c3c', fontSize: 16 }} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return `Connected (${messageCount} msgs)`;
      case 'weak':
        return 'Weak Signal';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <MainContainer>
      {/* Header */}
      <HeaderSection>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>
            In-Flight Monitoring
          </Typography>
          <Typography sx={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
            Live Telemetry & Control
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>
            Return to Launch
          </Button>
          <Button size="small" sx={{ color: 'white', fontSize: '10px', minHeight: '22px', textTransform: 'none' }}>
            Emergency Stop
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
          telemetry={telemetry}
          showAircraft={true}
        />
        
        {/* Telemetry Panel Card */}
        <TelemetryCard 
          ref={telemetryCardRef}
          configMode={configMode}
          sx={{ 
            left: telemetryPosition.x, 
            top: telemetryPosition.y,
            width: telemetrySize.width,
            height: telemetrySize.height,
          }}
          onMouseDown={handleDragStart}
        >
          {configMode && (
            <DragHandle>
              <DragIndicator />
            </DragHandle>
          )}
          {configMode && (
            <ResizeHandle onMouseDown={handleResizeStart} />
          )}
          <CardContent sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                  Telemetry Panel
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getStatusIcon()}
                  <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                    {getStatusText()}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 1 }} />
            
            <List
              sx={{
                width: '100%',
                bgcolor: 'background.paper',
                '& .MuiListItemButton-root': {
                  py: 0.5,
                },
                '& .MuiListItemIcon-root': {
                  minWidth: 36,
                },
              }}
            >
              {telemetryCategories
                .sort((a, b) => a.order - b.order)
                .map((category) => (
                  <React.Fragment key={category.id}>
                    {(category.visible || configMode) && (
                      <>
                        <ListItemButton
                          onClick={() => handleCategoryExpand(category.id)}
                          sx={{
                            opacity: category.visible ? 1 : 0.5,
                            backgroundColor: category.expanded ? 'rgba(52, 152, 219, 0.05)' : 'transparent',
                          }}
                        >
                          {configMode && (
                            <ListItemIcon>
                              <DragIndicator sx={{ fontSize: 16 }} />
                            </ListItemIcon>
                          )}
                          <ListItemIcon>{category.icon}</ListItemIcon>
                          <ListItemText 
                            primary={category.name} 
                            primaryTypographyProps={{ fontSize: '14px', fontWeight: 500 }}
                          />
                          {configMode && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCategoryVisibility(category.id);
                              }}
                            >
                              {category.visible ? 
                                <Visibility sx={{ fontSize: 16 }} /> : 
                                <VisibilityOff sx={{ fontSize: 16 }} />
                              }
                            </IconButton>
                          )}
                          {category.expanded ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        
                        <Collapse in={category.expanded} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding>
                            {category.items.map((item) => (
                              (item.visible || configMode) && (
                                <ListItemButton
                                  key={item.id}
                                  sx={{
                                    pl: configMode ? 8 : 6,
                                    opacity: item.visible ? 1 : 0.5,
                                    py: 0.5,
                                  }}
                                >
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography sx={{ fontSize: '13px' }}>{item.label}</Typography>
                                        <Typography sx={{ 
                                          fontSize: '13px', 
                                          fontWeight: 600, 
                                          color: item.value === '--' ? '#e74c3c' : '#3498db' 
                                        }}>
                                          {item.value}
                                        </Typography>
                                      </Box>
                                    }
                                  />
                                  {configMode && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleItemVisibility(category.id, item.id);
                                      }}
                                    >
                                      {item.visible ? 
                                        <Visibility sx={{ fontSize: 16 }} /> : 
                                        <VisibilityOff sx={{ fontSize: 16 }} />
                                      }
                                    </IconButton>
                                  )}
                                </ListItemButton>
                              )
                            ))}
                          </List>
                        </Collapse>
                      </>
                    )}
                  </React.Fragment>
                ))}
            </List>
          </CardContent>
        </TelemetryCard>
      </ContentSection>
    </MainContainer>
  );
};