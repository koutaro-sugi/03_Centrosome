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
  Divider,
  ToggleButton,
  ToggleButtonGroup
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
  SignalWifi2Bar,
  BugReport,
  ViewList
} from '@mui/icons-material';
import { MapCard } from '../components/MapCard';
import { useFlightPlan } from '../contexts/FlightPlanContext';
import { useMAVLinkWebSocket } from '../hooks/useMAVLinkWebSocket';
import { TelemetryInspector } from '../components/TelemetryInspector';
import { useLocalStorage } from '../hooks/useLocalStorage';

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
  
  // 画面サイズに基づいてMapCardの初期サイズを計算
  const calculateInitialMapSize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // 画面サイズに応じて適切なサイズを計算
    // デスクトップ: 画面の50-60%程度
    // タブレット: 画面の60-70%程度
    // モバイル: 画面の80-90%程度
    let widthRatio = 0.5;
    let heightRatio = 0.6;
    
    if (screenWidth <= 768) { // モバイル
      widthRatio = 0.85;
      heightRatio = 0.7;
    } else if (screenWidth <= 1024) { // タブレット
      widthRatio = 0.65;
      heightRatio = 0.65;
    } else if (screenWidth <= 1440) { // 小さめのデスクトップ
      widthRatio = 0.55;
      heightRatio = 0.6;
    }
    
    // グリッドにスナップして返す
    const snapToGrid = (value: number, gridSize: number = 20) => {
      return Math.round(value / gridSize) * gridSize;
    };
    
    return {
      width: snapToGrid(Math.min(screenWidth * widthRatio, 1200)), // 最大幅1200px
      height: snapToGrid(Math.min(screenHeight * heightRatio, 800)) // 最大高さ800px
    };
  };
  
  // MapCardの位置とサイズをLocalStorageに保持
  const [mapPosition, setMapPosition] = useLocalStorage('inflight_map_position', { x: 40, y: 40 });
  const [mapSize, setMapSize] = useLocalStorage('inflight_map_size', calculateInitialMapSize());
  
  // LocalStorageから設定を読み込む
  const [telemetryViewMode, setTelemetryViewMode] = useLocalStorage<'list' | 'inspector'>('inflight_telemetry_view_mode', 'list');
  const [telemetryPosition, setTelemetryPosition] = useLocalStorage('inflight_telemetry_position', { x: 700, y: 40 });
  const [telemetrySize, setTelemetrySize] = useLocalStorage('inflight_telemetry_size', { width: 320, height: 500 });
  
  // EC2 WebSocket接続
  const { telemetry, status, messageCount, protocolVersion } = useMAVLinkWebSocket({
    url: 'ws://52.194.5.104:8080',
    reconnectInterval: 5000,
    heartbeatTimeout: 3000,
  });
  const telemetryCardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // テレメトリデータが更新されたらカテゴリの値も更新
  useEffect(() => {
    setTelemetryCategories(prev => {
      const initialCategories = getInitialCategories();
      return prev.map(category => {
        // 初期設定から該当するカテゴリを見つけてアイコンを取得
        const initialCategory = initialCategories.find(c => c.id === category.id);
        return {
          ...category,
          icon: initialCategory?.icon || category.icon, // アイコンを保持
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
      };
    });
  });
  }, [telemetry]);

  // テレメトリカテゴリの初期設定
  const getInitialCategories = (): TelemetryCategory[] => [
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
        { id: 'verticalSpeed', label: 'Vertical Speed', value: '--', unit: '', visible: true },
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
  ];
  
  // LocalStorageから設定を読み込み、なければ初期値を使用
  const [storedCategories, setStoredCategories] = useLocalStorage<any[] | null>('inflight_telemetry_categories', null);
  
  // 初期カテゴリを取得し、保存された設定とマージ
  const initializeCategories = (): TelemetryCategory[] => {
    const initialCategories = getInitialCategories();
    if (!storedCategories) return initialCategories;
    
    // 保存された設定を初期設定とマージ（アイコンは初期設定から取得）
    return initialCategories.map(category => {
      const stored = storedCategories.find((s: any) => s.id === category.id);
      if (stored) {
        return {
          ...category,
          expanded: stored.expanded ?? category.expanded,
          visible: stored.visible ?? category.visible,
          order: stored.order ?? category.order,
          items: category.items.map(item => {
            const storedItem = stored.items?.find((si: any) => si.id === item.id);
            return storedItem ? { ...item, visible: storedItem.visible ?? item.visible } : item;
          })
        };
      }
      return category;
    });
  };
  
  const [telemetryCategories, setTelemetryCategories] = useState<TelemetryCategory[]>(initializeCategories());
  const isInitialMount = useRef(true);
  
  // カテゴリが変更されたらLocalStorageに保存（アイコンを除外）
  useEffect(() => {
    // 初回レンダリング時はスキップ
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const categoriesToStore = telemetryCategories.map(category => ({
      id: category.id,
      expanded: category.expanded,
      visible: category.visible,
      order: category.order,
      items: category.items.map(item => ({
        id: item.id,
        visible: item.visible
      }))
    }));
    setStoredCategories(categoriesToStore);
  }, [telemetryCategories]); // setStoredCategoriesを依存配列から削除

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

  // グリッドスナップ関数
  const snapToGrid = (value: number, gridSize: number = 20) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = snapToGrid(e.clientX - dragStart.x);
    const newY = snapToGrid(e.clientY - dragStart.y);
    
    // 画面境界をチェック - コンポーネント全体が画面内に収まるように
    const minX = 0; // 左端
    const maxX = window.innerWidth - telemetrySize.width; // 右端
    const minY = 0; // 上端
    const maxY = window.innerHeight - telemetrySize.height; // 下端
    
    const boundedX = Math.max(minX, Math.min(maxX, newX));
    const boundedY = Math.max(minY, Math.min(maxY, newY));
    
    setTelemetryPosition({
      x: boundedX,
      y: boundedY,
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
    
    const newWidth = Math.max(280, snapToGrid(resizeStart.width + deltaX));
    const newHeight = Math.max(300, snapToGrid(resizeStart.height + deltaY));
    
    // リサイズ時も画面内に収まるようにチェック
    const maxWidth = window.innerWidth - telemetryPosition.x - 20; // 右端に余裕を持たせる
    const maxHeight = window.innerHeight - telemetryPosition.y - 20; // 下端に余裕を持たせる
    
    const boundedWidth = Math.min(newWidth, maxWidth);
    const boundedHeight = Math.min(newHeight, maxHeight);
    
    setTelemetrySize({
      width: boundedWidth,
      height: boundedHeight,
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
  
  // ウィンドウリサイズ時の境界チェックとMapCardサイズ調整
  useEffect(() => {
    const handleWindowResize = () => {
      // テレメトリパネルが画面内に収まるように位置を調整
      setTelemetryPosition(prev => ({
        x: Math.min(prev.x, Math.max(0, window.innerWidth - telemetrySize.width)),
        y: Math.min(prev.y, Math.max(0, window.innerHeight - telemetrySize.height))
      }));
      
      // MapCardのサイズを画面サイズに応じて自動調整
      if (!configMode) { // 設定モードでない場合のみ
        const newMapSize = calculateInitialMapSize();
        setMapSize(prev => {
          // アスペクト比を維持しつつサイズを調整
          const aspectRatio = prev.width / prev.height;
          const newWidth = newMapSize.width;
          const newHeight = Math.round(newWidth / aspectRatio);
          
          // グリッドにスナップ
          const snapToGrid = (value: number, gridSize: number = 20) => {
            return Math.round(value / gridSize) * gridSize;
          };
          
          return {
            width: snapToGrid(newWidth),
            height: snapToGrid(Math.min(newHeight, window.innerHeight * 0.8))
          };
        });
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [telemetrySize.width, telemetrySize.height, configMode]);

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
    const protocolText = protocolVersion ? ` • MAVLink ${protocolVersion}` : '';
    switch (status) {
      case 'connected':
        return `Connected${protocolText}`;
      case 'weak':
        return `Weak Signal${protocolText}`;
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
            Live Telemetry
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
        {configMode ? (
          <MapCard 
            initialPosition={mapPosition} 
            configMode={configMode} 
            mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
            flightPlan={selectedPlan}
            telemetry={telemetry}
            showAircraft={true}
            size={mapSize}
            onPositionChange={setMapPosition}
            onSizeChange={setMapSize}
            pageId="inflight"
          />
        ) : (
          <Box sx={{
            position: 'absolute',
            left: mapPosition.x,
            top: mapPosition.y,
            width: mapSize.width,
            height: mapSize.height,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <MapCard 
              initialPosition={mapPosition} 
              configMode={configMode} 
              mapStyle="mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0"
              flightPlan={selectedPlan}
              telemetry={telemetry}
              showAircraft={true}
              size={mapSize}
              pageId="inflight"
            />
          </Box>
        )}
        
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
              <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600 }}>
                Telemetry
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getStatusIcon()}
                  <Typography sx={{ fontSize: '11px', color: 'text.secondary' }}>
                    {getStatusText()}
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  value={telemetryViewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setTelemetryViewMode(newMode)}
                  size="small"
                  sx={{ height: 24 }}
                >
                  <ToggleButton value="list" sx={{ py: 0, px: 1 }}>
                    <ViewList sx={{ fontSize: 16 }} />
                  </ToggleButton>
                  <ToggleButton value="inspector" sx={{ py: 0, px: 1 }}>
                    <BugReport sx={{ fontSize: 16 }} />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            
            <Divider sx={{ mb: 1 }} />
            
            {telemetryViewMode === 'list' ? (
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
            ) : (
              <Box sx={{ height: 'calc(100% - 60px)' }}>
                <TelemetryInspector telemetry={telemetry} messageCount={messageCount} />
              </Box>
            )}
          </CardContent>
        </TelemetryCard>
      </ContentSection>
    </MainContainer>
  );
};