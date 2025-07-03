import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper, styled } from '@mui/material';
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
}

export const MapCard: React.FC<MapCardProps> = ({ 
  initialPosition = { x: 100, y: 100 },
  configMode = false,
  mapStyle = 'mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 600, height: 600 });
  const [resizeStart, setResizeStart] = useState({ width: 600, height: 600, x: 0, y: 0 });

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
      {configMode && (
        <ResizeHandle onMouseDown={handleResizeStart} />
      )}
    </DraggableCard>
  );
};