import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper, styled, IconButton } from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

// デバッグ用（本番環境では削除してください）
console.log('Mapbox token exists:', !!process.env.REACT_APP_MAPBOX_ACCESS_TOKEN);

const DraggableCard = styled(Paper)({
  position: 'absolute',
  backgroundColor: 'white',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
  borderRadius: '8px',
  overflow: 'hidden',
  userSelect: 'none',
});

const MapContainer = styled(Box)({
  width: '100%',
  height: '100%',
  position: 'relative',
  '& .mapboxgl-canvas': {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
});

const StatusPanel = styled(Box)({
  position: 'absolute',
  top: 10,
  left: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '12px 16px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  minWidth: 200,
  zIndex: 5,
  fontSize: '12px',
  '& h4': {
    margin: '0 0 8px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#32495f',
  },
  '& .status-item': {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    '& span:first-of-type': {
      color: '#666',
    },
    '& span:last-of-type': {
      fontWeight: 500,
      color: '#333',
    },
  },
});

const ResizeHandle = styled(Box)({
  position: 'absolute',
  right: 0,
  bottom: 0,
  width: 20,
  height: 20,
  cursor: 'nwse-resize',
  backgroundColor: 'transparent',
  '&::after': {
    content: '""',
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: '0 0 12px 12px',
    borderColor: 'transparent transparent #999 transparent',
  },
});

const MoveHandle = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 40,
  backgroundColor: 'rgba(50, 73, 95, 0.3)',
  cursor: 'move',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  borderBottom: '1px solid rgba(50, 73, 95, 0.2)',
  '&:hover': {
    backgroundColor: 'rgba(50, 73, 95, 0.4)',
  },
  '&::after': {
    content: '"⋮⋮⋮"',
    color: '#32495f',
    fontSize: '14px',
    letterSpacing: '2px',
    fontWeight: 'bold',
  },
});

interface MapCardProps {
  initialPosition?: { x: number; y: number };
  configMode?: boolean;
  mapStyle?: string;
  flightPlan?: any; // TODO: 型定義を追加
}

export const MapCard: React.FC<MapCardProps> = ({ 
  initialPosition = { x: 100, y: 100 },
  configMode = false,
  mapStyle = 'mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0',
  flightPlan = null
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 600, height: 600 });
  const [resizeStart, setResizeStart] = useState({ width: 600, height: 600, x: 0, y: 0 });
  const [showStatus, setShowStatus] = useState(true);

  // Mapbox初期化
  useEffect(() => {
    if (!mapContainer.current) return;

    // 既存のマップがあれば削除
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      console.log('Initializing map with style:', mapStyle); // デバッグログ
      
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [139.6917, 35.6895], // 東京
        zoom: 10,
        testMode: false, // v3の新しいオプション
      });

      // Add navigation controls (zoom and rotation)
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      // Add scale control
      map.addControl(new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
      }), 'bottom-left');

      map.on('load', () => {
        console.log('Map loaded successfully');
        // スタイル情報を確認
        const loadedStyle = map.getStyle();
        console.log('Loaded style name:', loadedStyle?.name);
        console.log('Loaded style sources:', Object.keys(loadedStyle?.sources || {}));
      });

      map.on('error', (e) => {
        console.error('Map error:', e);
        if (e.error?.message) {
          console.error('Error details:', e.error.message);
        }
      });

      map.on('style.load', () => {
        console.log('Style loaded event fired');
        // デフォルトでは何も表示しない
      });

      mapRef.current = map;

      // リサイズ対応
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainer.current);

      return () => {
        resizeObserver.disconnect();
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }, [mapStyle]);

  // グリッドスナップ関数
  const snapToGrid = (value: number, gridSize: number = 20) => {
    return Math.round(value / gridSize) * gridSize;
  };

  // ドラッグ開始
  const handleMoveStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // ドラッグ中
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = snapToGrid(e.clientX - dragStart.x);
      const newY = snapToGrid(e.clientY - dragStart.y);
      setPosition({ x: newX, y: newY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(300, snapToGrid(resizeStart.width + deltaX));
      const newHeight = Math.max(300, snapToGrid(resizeStart.height + deltaY));
      setSize({ width: newWidth, height: newHeight });
    }
  };

  // ドラッグ終了
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // グローバルイベントリスナー
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  // .planファイルのデータが更新されたときの処理
  useEffect(() => {
    if (!mapRef.current || !flightPlan) return;

    const map = mapRef.current;

    // マップがロードされているか確認
    if (!map.loaded()) {
      map.once('load', () => {
        updateFlightPlan(map, flightPlan);
      });
      return;
    }

    updateFlightPlan(map, flightPlan);
  }, [flightPlan]);

  const updateFlightPlan = (map: mapboxgl.Map, flightPlan: any) => {
    try {
      console.log('Updating flight plan:', flightPlan);
      
      // 既存のflightPlanレイヤーを削除
      if (map.getLayer('plan-path-line')) map.removeLayer('plan-path-line');
      if (map.getSource('plan-path')) map.removeSource('plan-path');
      if (map.getLayer('plan-waypoints')) map.removeLayer('plan-waypoints');
      if (map.getLayer('plan-waypoint-labels')) map.removeLayer('plan-waypoint-labels');
      if (map.getSource('plan-waypoints')) map.removeSource('plan-waypoints');

    // mission itemsから座標を抽出
    const coordinates: [number, number][] = [];
    const waypoints: any[] = [];

    flightPlan.mission.items.forEach((item: any, index: number) => {
      console.log(`Item ${index}:`, item);
      
      if (item.type === 'SimpleItem' && item.params) {
        let lat, lng;
        
        // MAVLinkのコマンドによって座標の位置が異なる
        if (item.command === 16) { // NAV_WAYPOINT
          lat = item.params[4];
          lng = item.params[5];
        } else if (item.command === 22) { // NAV_TAKEOFF
          // TAKEOFFは通常現在位置で実行されるが、plannedHomePositionを使用
          if (flightPlan.mission.plannedHomePosition) {
            lat = flightPlan.mission.plannedHomePosition[0];
            lng = flightPlan.mission.plannedHomePosition[1];
          } else {
            // plannedHomePositionがない場合はスキップ
            console.warn('TAKEOFF command but no plannedHomePosition found');
            return;
          }
        } else {
          // その他のコマンドも params[4], params[5] を試す
          lat = item.params[4];
          lng = item.params[5];
        }
        
        // 座標の検証
        if (lat !== undefined && lng !== undefined && 
            lat !== null && lng !== null &&
            lat >= -90 && lat <= 90 && 
            lng >= -180 && lng <= 180) {
          coordinates.push([lng, lat]); // GeoJSONは[longitude, latitude]の順
          waypoints.push({
            type: 'Feature',
            properties: {
              index: index + 1,
              altitude: item.Altitude || item.params[6], // params[6]が高度の場合もある
              command: item.command,
              isTakeoff: item.command === 22,
              isLanding: item.command === 21, // NAV_LAND
            },
            geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
          });
        } else {
          console.warn(`Invalid or missing coordinates at item ${index}: lat=${lat}, lng=${lng}, command=${item.command}`);
        }
      }
    });

    console.log(`Found ${coordinates.length} waypoints:`, coordinates);
    
    if (coordinates.length > 0) {
      // 飛行経路を追加
      map.addSource('plan-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      });

      map.addLayer({
        id: 'plan-path-line',
        type: 'line',
        source: 'plan-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FF6B6B',
          'line-width': 3,
        },
      });

      // ウェイポイントを追加
      map.addSource('plan-waypoints', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: waypoints,
        },
      });

      map.addLayer({
        id: 'plan-waypoints',
        type: 'circle',
        source: 'plan-waypoints',
        paint: {
          'circle-radius': [
            'case',
            ['get', 'isTakeoff'], 12,  // TAKEOFFは大きく
            ['get', 'isLanding'], 12,  // LANDINGも大きく
            8  // その他は通常サイズ
          ],
          'circle-color': [
            'case',
            ['get', 'isTakeoff'], '#4CAF50',  // 緑
            ['get', 'isLanding'], '#2196F3',   // 青
            '#FF6B6B'  // 赤（通常のウェイポイント）
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      
      // ウェイポイントのラベルを追加
      map.addLayer({
        id: 'plan-waypoint-labels',
        type: 'symbol',
        source: 'plan-waypoints',
        layout: {
          'text-field': ['get', 'index'],
          'text-size': 12,
          'text-offset': [0, -1.5],
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });

      // 最初の座標にズーム
      map.flyTo({
        center: coordinates[0],
        zoom: 14,
      });
    }
    } catch (error) {
      console.error('Error updating flight plan:', error);
    }
  };

  return (
    <DraggableCard
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {configMode && (
        <MoveHandle onMouseDown={handleMoveStart} />
      )}
      <MapContainer ref={mapContainer} />
      {showStatus && (
        <StatusPanel>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>フライトステータス</h4>
            <IconButton 
              size="small" 
              onClick={() => setShowStatus(false)}
              sx={{ padding: 0, marginLeft: 1 }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        <div className="status-item">
          <span>機体:</span>
          <span>Drone Alpha</span>
        </div>
        <div className="status-item">
          <span>高度:</span>
          <span>120m</span>
        </div>
        <div className="status-item">
          <span>速度:</span>
          <span>45km/h</span>
        </div>
        <div className="status-item">
          <span>バッテリー:</span>
          <span style={{ color: '#4CAF50' }}>85%</span>
        </div>
        <div className="status-item">
          <span>飛行時間:</span>
          <span>12:34</span>
        </div>
        <div className="status-item">
          <span>GPS信号:</span>
          <span style={{ color: '#4CAF50' }}>良好</span>
        </div>
        </StatusPanel>
      )}
      {!showStatus && (
        <IconButton
          onClick={() => setShowStatus(true)}
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
          }}
          size="small"
        >
          <Visibility />
        </IconButton>
      )}
      {configMode && (
        <ResizeHandle onMouseDown={handleResizeStart} />
      )}
    </DraggableCard>
  );
};