import React, { useRef, useEffect, useState } from 'react';
import { Box, Paper, styled, IconButton } from '@mui/material';
import { Close, Visibility } from '@mui/icons-material';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

// Mapbox token check removed for production

const DraggableCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isAbsolute',
})<{ isAbsolute?: boolean }>(({ isAbsolute = true }) => ({
  position: isAbsolute ? 'absolute' : 'relative',
  backgroundColor: 'white',
  boxShadow: isAbsolute ? '0 4px 8px rgba(0, 0, 0, 0.15)' : 'none',
  borderRadius: isAbsolute ? '8px' : '0',
  overflow: 'hidden',
  userSelect: 'none',
  width: isAbsolute ? 'auto' : '100%',
  height: isAbsolute ? 'auto' : '100%',
}));

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
  zIndex: 1000, // Mapboxのウォーターマークより上に表示
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
  telemetry?: any; // テレメトリデータ
  showAircraft?: boolean; // 機体を表示するか
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  size?: { width: number; height: number };
  pageId?: string; // ページごとに異なる位置を保存するためのID
}

export const MapCard: React.FC<MapCardProps> = ({ 
  initialPosition = { x: 100, y: 100 },
  configMode = false,
  mapStyle = 'mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0',
  flightPlan = null,
  telemetry = null,
  showAircraft = false,
  onPositionChange,
  onSizeChange,
  size: propSize,
  pageId = 'default'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const aircraftMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const debugTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(propSize || { width: 600, height: 400 });
  const [resizeStart, setResizeStart] = useState({ width: 600, height: 600, x: 0, y: 0 });
  const [showStatus, setShowStatus] = useState(false);
  
  // マップの位置を保存・復元するための関数
  const saveMapState = (map: mapboxgl.Map) => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();
    
    const state = {
      center: [center.lng, center.lat],
      zoom,
      bearing,
      pitch
    };
    
    localStorage.setItem(`map_state_${pageId}`, JSON.stringify(state));
  };
  
  const loadMapState = () => {
    const savedState = localStorage.getItem(`map_state_${pageId}`);
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch (e) {
        console.error('Failed to parse saved map state:', e);
      }
    }
    // デフォルト値
    return {
      center: [139.6917, 35.6895], // 東京
      zoom: 10,
      bearing: 0,
      pitch: 0
    };
  };

  // Mapbox初期化
  useEffect(() => {
    if (!mapContainer.current) return;

    // 既存のマップがあれば削除
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    try {
      // 保存された状態を読み込み
      const savedState = loadMapState();
      
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: savedState.center as [number, number],
        zoom: savedState.zoom,
        bearing: savedState.bearing,
        pitch: savedState.pitch,
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
        // Map loaded successfully
      });

      map.on('error', (e) => {
        console.error('Map error:', e);
      });

      map.on('style.load', () => {
        // Style loaded
      });

      mapRef.current = map;
      
      // マップの状態が変更されたら保存
      let saveTimer: NodeJS.Timeout;
      const handleMapChange = () => {
        // デバウンスで保存（頻繁な保存を防ぐ）
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          if (mapRef.current) {
            saveMapState(mapRef.current);
          }
        }, 500);
      };
      
      map.on('moveend', handleMapChange);
      map.on('zoomend', handleMapChange);
      map.on('pitchend', handleMapChange);
      map.on('rotateend', handleMapChange);

      // リサイズ対応
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainer.current);

      return () => {
        clearTimeout(saveTimer);
        map.off('moveend', handleMapChange);
        map.off('zoomend', handleMapChange);
        map.off('pitchend', handleMapChange);
        map.off('rotateend', handleMapChange);
        resizeObserver.disconnect();
        if (aircraftMarkerRef.current) {
          aircraftMarkerRef.current.remove();
          aircraftMarkerRef.current = null;
        }
        // 最後の状態を保存
        if (mapRef.current) {
          saveMapState(mapRef.current);
        }
        map.remove();
        mapRef.current = null;
      };
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }, [mapStyle]);

  // 機影マーカーの要素を保持するref
  const aircraftElementRef = useRef<HTMLDivElement | null>(null);

  // 機影の作成（初回のみ）
  useEffect(() => {
    if (!mapRef.current) return;
    
    // showAircraftがfalseになったら機体を削除
    if (!showAircraft && aircraftMarkerRef.current) {
      aircraftMarkerRef.current.remove();
      aircraftMarkerRef.current = null;
      aircraftElementRef.current = null;
      return;
    }
  }, [showAircraft]);

  // デバウンス用のタイマーref
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 機影の位置更新（デバウンス付き）
  useEffect(() => {
    if (!mapRef.current || !showAircraft || !telemetry?.lat || !telemetry?.lon) return;

    const map = mapRef.current;

    // 既存のタイマーをクリア
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // 50msのデバウンスで更新
    updateTimerRef.current = setTimeout(() => {
      // 機影マーカーがない場合のみ作成
      if (!aircraftMarkerRef.current && mapRef.current) {
        
        // 要素を作成
        const el = document.createElement('div');
        el.className = 'mapboxgl-aircraft-marker'; // クラス名を追加
        el.style.cssText = `
          width: 40px;
          height: 40px;
          position: relative;
          transform-origin: center;
          /* アニメーションを無効化 */
          transition: none !important;
          opacity: 1 !important;
        `;
        
        // 内部にimg要素を追加
        const img = document.createElement('img');
        img.src = '/drn40.svg';
        img.style.cssText = `
          width: 100%;
          height: 100%;
          filter: brightness(0) invert(1) drop-shadow(0 0 2px rgba(0,0,0,0.8)) drop-shadow(0 0 1px rgba(0,0,0,1));
          pointer-events: none;
          /* アニメーションを無効化 */
          transition: none !important;
        `;
        el.appendChild(img);

        // マーカーを作成
        try {
          aircraftMarkerRef.current = new mapboxgl.Marker({
            element: el,
            rotationAlignment: 'map',
            pitchAlignment: 'map',
            rotation: telemetry.heading || 0,
            // パフォーマンス最適化オプション
            offset: [0, 0],
            anchor: 'center',
            draggable: false,
          })
            .setLngLat([telemetry.lon, telemetry.lat])
            .addTo(map);
        } catch (error) {
          console.error('Failed to create aircraft marker:', error);
        }
      } else if (aircraftMarkerRef.current) {
        // 位置と回転を更新
        try {
          // DOMを直接操作してパフォーマンスを向上
          const marker = aircraftMarkerRef.current;
          const element = marker.getElement();
          
          // 位置を更新
          marker.setLngLat([telemetry.lon, telemetry.lat]);
          
          // 回転を更新
          if (telemetry.heading !== undefined) {
            marker.setRotation(telemetry.heading);
          }
          
          // DOM要素のスタイルを強制的に無効化
          if (element) {
            element.style.transition = 'none';
            element.style.opacity = '1';
          }
        } catch (error) {
          console.error('Failed to update aircraft position:', error);
        }
      }

      // マップの中心を機体位置に移動
      if (telemetry.connected && mapRef.current) {
        const currentZoom = mapRef.current.getZoom();
        const currentCenter = mapRef.current.getCenter();
        const distance = Math.sqrt(
          Math.pow(currentCenter.lng - telemetry.lon, 2) + 
          Math.pow(currentCenter.lat - telemetry.lat, 2)
        );
        
        // ズームレベルと移動距離に応じて動作を変更
        if (currentZoom < 10) {
          // ズームアウト時：大きな移動のみ追従
          if (distance > 0.01) { // 約0.01度以上の移動のみ
            mapRef.current.panTo([telemetry.lon, telemetry.lat], {
              duration: 500,
              easing: (t) => t,
            });
          }
        } else if (currentZoom < 14) {
          // 中間ズーム：スムーズな追従
          mapRef.current.panTo([telemetry.lon, telemetry.lat], {
            duration: 300,
            easing: (t) => t,
          });
        } else {
          // ズームイン時：細かく追従
          mapRef.current.easeTo({
            center: [telemetry.lon, telemetry.lat],
            duration: 200,
            easing: (t) => t,
          });
        }
      }
    }, 50); // 50msのデバウンス

    // クリーンアップ
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [telemetry, showAircraft]);

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
      
      // 画面境界をチェック - コンポーネント全体が画面内に収まるように
      const minX = 0; // 左端
      const maxX = window.innerWidth - size.width; // 右端
      const minY = 0; // 上端
      const maxY = window.innerHeight - size.height; // 下端
      
      const boundedX = Math.max(minX, Math.min(maxX, newX));
      const boundedY = Math.max(minY, Math.min(maxY, newY));
      
      setPosition({ x: boundedX, y: boundedY });
      onPositionChange?.({ x: boundedX, y: boundedY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(300, snapToGrid(resizeStart.width + deltaX));
      const newHeight = Math.max(300, snapToGrid(resizeStart.height + deltaY));
      
      // リサイズ時も画面内に収まるようにチェック
      const maxWidth = window.innerWidth - position.x - 20; // 右端に余裕を持たせる
      const maxHeight = window.innerHeight - position.y - 20; // 下端に余裕を持たせる
      
      const boundedWidth = Math.min(newWidth, maxWidth);
      const boundedHeight = Math.min(newHeight, maxHeight);
      
      setSize({ width: boundedWidth, height: boundedHeight });
      onSizeChange?.({ width: boundedWidth, height: boundedHeight });
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
  }, [isDragging, isResizing, dragStart, resizeStart, size.width, size.height]);
  
  // ウィンドウリサイズ時の境界チェック
  useEffect(() => {
    const handleWindowResize = () => {
      if (configMode) {
        // 画面内に収まるように位置を調整
        setPosition(prev => ({
          x: Math.min(prev.x, Math.max(0, window.innerWidth - size.width)),
          y: Math.min(prev.y, Math.max(0, window.innerHeight - size.height))
        }));
      }
    };
    
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [configMode, size.width, size.height]);

  // 3秒おきのデバッグ出力
  useEffect(() => {
    if (telemetry && flightPlan) {
      // 既存のタイマーをクリア
      if (debugTimerRef.current) {
        clearInterval(debugTimerRef.current);
      }
      
      // 3秒おきにデバッグ情報を出力
      debugTimerRef.current = setInterval(() => {
        const currentWP = telemetry.currentWaypoint || 0;
        
        // 現在ハイライトされているウェイポイントのラベルを計算
        if (flightPlan.mission?.items) {
          const item = flightPlan.mission.items[currentWP];
          if (item && item.type === 'SimpleItem') {
            let label = '';
            if (item.command === 22) { // TAKEOFF
              label = 'T';
            } else if (item.command === 21) { // LANDING
              label = 'L';
            } else {
              // 通常のウェイポイント（Command 16）
              // CurrentWaypoint = ハイライトすべきラベル
              label = String(currentWP);
            }
            console.log(`[WP Debug] Current waypoint index: ${currentWP}, Label: "${label}"`);
            console.log(`[WP Highlight] Highlighting waypoint: Label="${label}", Index=${currentWP}, Command=${item.command}`);
          }
        }
      }, 3000);
    }
    
    return () => {
      if (debugTimerRef.current) {
        clearInterval(debugTimerRef.current);
      }
    };
  }, [telemetry?.currentWaypoint, flightPlan]);

  // .planファイルのデータが更新されたときの処理
  useEffect(() => {
    if (!mapRef.current || !flightPlan) return;

    const map = mapRef.current;

    // マップがロードされているか確認し、少し遅延を入れる
    const updatePlan = () => {
      if (!map.loaded()) {
        setTimeout(updatePlan, 100);
        return;
      }
      // スタイルが完全にロードされているか確認
      if (!map.isStyleLoaded()) {
        setTimeout(updatePlan, 100);
        return;
      }
      updateFlightPlan(map, flightPlan, telemetry);
    };

    updatePlan();
  }, [flightPlan, telemetry?.currentWaypoint, telemetry?.missionCurrent]); // telemetryの変更も監視

  const updateFlightPlan = (map: mapboxgl.Map, flightPlan: any, telemetry: any) => {
    try {
      
      // 既存のflightPlanレイヤーを削除（エラーハンドリング付き）
      try {
        // パスレイヤーを削除
        if (map.getLayer('plan-path-line')) map.removeLayer('plan-path-line');
        if (map.getSource('plan-path')) map.removeSource('plan-path');
        
        // 個別のウェイポイントレイヤーを削除（ラベルと円の両方）
        const layers = map.getStyle().layers;
        if (layers) {
          // レイヤーIDを収集（削除中にリストが変更されるのを防ぐ）
          const layersToRemove = layers
            .filter(layer => layer.id.startsWith('waypoint-'))
            .map(layer => layer.id);
          
          // 収集したレイヤーを削除
          layersToRemove.forEach(layerId => {
            try {
              if (map.getLayer(layerId)) {
                map.removeLayer(layerId);
              }
            } catch (e) {
              console.warn(`Failed to remove layer ${layerId}:`, e);
            }
          });
        }
        
        // 個別のウェイポイントソースを削除
        const sources = map.getStyle().sources;
        if (sources) {
          // ソースIDを収集
          const sourcesToRemove = Object.keys(sources)
            .filter(sourceId => sourceId.startsWith('waypoint-'));
          
          // 収集したソースを削除
          sourcesToRemove.forEach(sourceId => {
            try {
              if (map.getSource(sourceId)) {
                map.removeSource(sourceId);
              }
            } catch (e) {
              console.warn(`Failed to remove source ${sourceId}:`, e);
            }
          });
        }
      } catch (e) {
        console.warn('Error removing existing layers:', e);
      }

    // mission itemsから座標を抽出
    const coordinates: [number, number][] = [];
    const waypoints: any[] = [];

    flightPlan.mission.items.forEach((item: any, index: number) => {
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
          
          let label: string;
          let sortOrder: number;
          
          if (item.command === 22) { // TAKEOFF
            label = 'T';
            sortOrder = 0; // TAKEOFFは常に0番
          } else if (item.command === 21) { // LANDING
            label = 'L';
            sortOrder = 999; // LANDINGは最後
          } else {
            // 通常のウェイポイント（Command 16）
            // QGC仕様：doJumpIdをそのまま表示ラベルとして使用
            label = item.doJumpId ? String(item.doJumpId) : String(index + 1);
            sortOrder = index;
          }
          
          waypoints.push({
            type: 'Feature',
            properties: {
              index: index + 1,  // 1ベースのインデックス
              missionIndex: index, // 0ベースのMAVLinkインデックス
              altitude: item.Altitude || item.params[6], // params[6]が高度の場合もある
              command: item.command,
              isTakeoff: item.command === 22,
              isLanding: item.command === 21, // NAV_LAND
              label: label,
              sortOrder: sortOrder, // QGC仕様に合わせた順序
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
          'line-color': '#c97400',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.5,  // ズーム5以下: 1.5px
            10, 2,   // ズーム10: 2px
            15, 3,   // ズーム15: 3px
            20, 4    // ズーム20以上: 4px
          ],
        },
      });

      // ウェイポイントをsortOrderでソート（小さい順）
      const sortedWaypoints = [...waypoints].sort((a, b) => 
        (a.properties.sortOrder || 0) - (b.properties.sortOrder || 0)
      );

      // 各ウェイポイントを個別のレイヤーとして追加
      sortedWaypoints.forEach((waypoint, index) => {
        // ユニークIDを生成（indexを使用して重複を防ぐ）
        const waypointId = `waypoint-${index}-${waypoint.properties.sortOrder || 0}`;
        
        // 個別のソースを作成
        map.addSource(waypointId, {
          type: 'geojson',
          data: waypoint,
        });

        // 現在のウェイポイント番号を取得（telemetryから）
        const currentWaypointIndex = telemetry?.currentWaypoint || telemetry?.missionCurrent || 0;
        
        // QGC仕様：CurrentWaypoint = ハイライトすべきラベル
        // ラベルが現在のウェイポイント番号と一致するものをハイライト
        const isNextWaypoint = waypoint.properties.label === String(currentWaypointIndex);
        
        // 円レイヤーを追加（先に追加）
        map.addLayer({
          id: `${waypointId}-circle`,
          type: 'circle',
          source: waypointId,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 4,    // ズーム5以下: 4px
              10, 8,   // ズーム10: 8px
              15, 12,  // ズーム15: 12px
              20, 16   // ズーム20以上: 16px
            ],
            'circle-color': isNextWaypoint ? 'rgb(0, 157, 0)' : '#c97400', // 次のウェイポイントは緑
            'circle-stroke-width': 0,
            'circle-stroke-color': 'transparent',
          },
        });
        
        // ラベルレイヤーを追加（円の上に表示）
        map.addLayer({
          id: `${waypointId}-label`,
          type: 'symbol',
          source: waypointId,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 8,    // ズーム5以下: 8px
              10, 10,  // ズーム10: 10px
              15, 12,  // ズーム15: 12px
              20, 14   // ズーム20以上: 14px
            ],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-anchor': 'center',
            'text-offset': [0, 0],
            'text-allow-overlap': true,   // ラベルの重なりを許可（常に表示）
            'text-ignore-placement': true, // 他の要素を無視して配置
            'text-optional': false,        // ラベルを必須にする
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'transparent',
            'text-halo-width': 0,
          },
        });
      });

      // 離陸地点と着陸地点を見つける
      const takeoffPoint = waypoints.find(wp => wp.properties.isTakeoff);
      const landingPoint = waypoints.find(wp => wp.properties.isLanding);
      
      if (takeoffPoint && landingPoint) {
        // 離陸地点と着陸地点の中心を計算
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(takeoffPoint.geometry.coordinates);
        bounds.extend(landingPoint.geometry.coordinates);
        
        // すべてのウェイポイントを含むようにboundsを拡張
        waypoints.forEach(wp => {
          bounds.extend(wp.geometry.coordinates);
        });
        
        
        // マップが完全に準備できてから移動
        setTimeout(() => {
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 1500,
          });
        }, 100);
      } else if (coordinates.length > 0) {
        // 離陸・着陸地点が見つからない場合は最初の座標にズーム
        
        setTimeout(() => {
          map.flyTo({
            center: coordinates[0],
            zoom: 14,
            duration: 1500,
          });
        }, 100);
      }
    }
    } catch (error) {
      console.error('Error updating flight plan:', error);
    }
  };

  return (
    <DraggableCard
      isAbsolute={configMode}
      style={configMode ? {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      } : {}}
    >
      {configMode && (
        <MoveHandle onMouseDown={handleMoveStart} />
      )}
      <MapContainer ref={mapContainer} />
      {showStatus && (
        <StatusPanel>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>Flight Status</h4>
            <IconButton 
              size="small" 
              onClick={() => setShowStatus(false)}
              sx={{ padding: 0, marginLeft: 1 }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        <div className="status-item">
          <span>Aircraft:</span>
          <span>Drone Alpha</span>
        </div>
        <div className="status-item">
          <span>Altitude:</span>
          <span>120m</span>
        </div>
        <div className="status-item">
          <span>Speed:</span>
          <span>45km/h</span>
        </div>
        <div className="status-item">
          <span>Battery:</span>
          <span style={{ color: '#4CAF50' }}>85%</span>
        </div>
        <div className="status-item">
          <span>Flight Time:</span>
          <span>12:34</span>
        </div>
        <div className="status-item">
          <span>GPS Signal:</span>
          <span style={{ color: '#4CAF50' }}>Good</span>
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