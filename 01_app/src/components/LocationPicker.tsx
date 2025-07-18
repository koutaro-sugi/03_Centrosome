import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import mapboxgl from 'mapbox-gl';
import { formatAddressToTownLevel } from '../types/flightLocation';
import { flightLocationAPI } from '../lib/flightLocationApi';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || '';

// デバッグ用ログ
console.log('Mapbox Access Token:', mapboxgl.accessToken ? 'Set' : 'Not set');
console.log('Token length:', mapboxgl.accessToken.length);

interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (location: {
    name: string;
    address: string;
    coordinates: { lat: number; lon: number };
    saveToDatabase: boolean;
    tag?: string;
    nearbyLocationId?: string;
  }) => void;
  title?: string;
  defaultLocation?: { lat: number; lon: number };
  userId: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  open,
  onClose,
  onConfirm,
  title = '地点を選択',
  defaultLocation,
  userId,
}) => {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapMoveTimeout = useRef<NodeJS.Timeout | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lon: number;
    address: string;
    name: string;
  } | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(false);
  const [locationTag, setLocationTag] = useState('');
  const [customLocationName, setCustomLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [nearbyLocation, setNearbyLocation] = useState<any>(null);

  // 現在位置を取得
  const getCurrentLocation = () => {
    setGettingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('お使いのブラウザは位置情報に対応していません');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (map.current) {
          // アニメーションなしで即座に移動
          map.current.jumpTo({
            center: [longitude, latitude],
            zoom: 15,
          });
          
          // 住所を取得しない（地図移動のmoveイベントで取得される）
        }
        
        setGettingLocation(false);
      },
      (error) => {
        console.error('位置情報の取得に失敗しました:', error);
        setError('位置情報の取得に失敗しました');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // 座標から住所を取得
  const getAddressFromCoordinates = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    setNearbyLocation(null);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?` +
        `types=address,place,locality,neighborhood&language=ja&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const fullAddress = feature.place_name || '';
        // 日本を除去してから整形
        const cleanAddress = fullAddress.replace(/^日本、/, '').replace(/^日本/, '');
        const formattedAddress = formatAddressToTownLevel(cleanAddress);
        
        // 地名を取得（市区町村名または地域名）
        const place = data.features.find((f: any) => 
          f.place_type?.includes('place') || 
          f.place_type?.includes('locality')
        );
        const placeName = place?.text || formattedAddress;

        setSelectedLocation({
          lat,
          lon,
          address: cleanAddress,
          name: placeName,
        });
        // カスタム地点名をデフォルトで設定
        setCustomLocationName(placeName);
        
        // 10m以内の既存地点をチェック
        try {
          const nearby = await flightLocationAPI.findNearbyLocation(
            userId,
            lat,
            lon,
            0.01 // 10m = 0.01km
          );
          if (nearby) {
            setNearbyLocation(nearby);
            // 既存の地点情報で上書き
            setSelectedLocation({
              lat: nearby.coordinates.lat,
              lon: nearby.coordinates.lon,
              address: nearby.address,
              name: nearby.name,
            });
            setCustomLocationName(nearby.name);
            // 既存地点のタグを設定
            if (nearby.tags && nearby.tags.length > 0) {
              setLocationTag(nearby.tags[0]);
            }
          }
        } catch (err) {
          console.error('近隣地点の検索に失敗:', err);
        }
      } else {
        setSelectedLocation({
          lat,
          lon,
          address: '住所不明',
          name: '不明な地点',
        });
        setCustomLocationName('不明な地点');
      }
    } catch (err) {
      console.error('住所の取得に失敗しました:', err);
      setError('住所の取得に失敗しました');
      setSelectedLocation({
        lat,
        lon,
        address: '住所取得エラー',
        name: '不明な地点',
      });
      setCustomLocationName('不明な地点');
    } finally {
      setLoading(false);
    }
  };

  // ダイアログが開いたときにリセット
  useEffect(() => {
    if (open) {
      // リセット
      setSaveToDatabase(false);  // デフォルトをオフに変更
      setLocationTag('');
      setCustomLocationName('');
      setNearbyLocation(null);
      setError(null);
    }
  }, [open]);

  // マップを初期化
  useEffect(() => {
    console.log('LocationPicker useEffect triggered. open:', open, 'container:', mapContainer);
    
    if (!open || !mapContainer) {
      console.log('Dialog not open or container not ready');
      return;
    }

    // 初期位置はデフォルトロケーションがある場合のみ設定
    const initialCenter: [number, number] | null = defaultLocation 
      ? [defaultLocation.lon, defaultLocation.lat]
      : null;

    try {
      // Mapboxトークンの確認
      if (!mapboxgl.accessToken) {
        console.error('Mapbox access token is not set');
        setError('地図の初期化に失敗しました（トークンエラー）');
        return;
      }

      // マップを作成
      console.log('Creating map with container:', mapContainer);
      console.log('Container dimensions:', {
        width: mapContainer.offsetWidth,
        height: mapContainer.offsetHeight
      });
      console.log('Map center:', initialCenter);
      
      // 初期位置がない場合は東京を仮の中心に（現在位置取得まで）
      map.current = new mapboxgl.Map({
        container: mapContainer,
        style: 'mapbox://styles/ksugi/cm9rvsjrm00b401sshlns89e0',
        center: initialCenter || [139.6917, 35.6895], // 東京
        zoom: initialCenter ? 15 : 5, // 初期位置がない場合は広域表示
        fadeDuration: 0, // フェードアニメーションを無効化
      });

      // スタイルロード完了を待つ
      map.current.on('style.load', () => {
        console.log('Map style loaded successfully');
      });

      // マップロード完了を待つ
      map.current.on('load', () => {
        console.log('Map loaded successfully');
      });

      // マップエラーハンドリング
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('地図の読み込みに失敗しました');
      });

      // 地図移動時のイベント
      const handleMapMove = () => {
        // 前のタイムアウトをクリア
        if (mapMoveTimeout.current) {
          clearTimeout(mapMoveTimeout.current);
        }

        // 移動中フラグを立てる（地点は表示したままにする）
        setLoading(true);

        // 地図が止まってから住所を取得
        mapMoveTimeout.current = setTimeout(() => {
          const center = map.current!.getCenter();
          getAddressFromCoordinates(center.lat, center.lng);
        }, 500); // 500ms後に住所取得
      };

      // 地図移動イベントをリッスン
      map.current.on('move', handleMapMove);

      // 初期位置の住所を取得
      if (defaultLocation) {
        getAddressFromCoordinates(defaultLocation.lat, defaultLocation.lon);
      } else {
        // 現在位置を自動取得（デフォルト位置なし）
        setTimeout(() => {
          getCurrentLocation();
        }, 100);
      }

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('地図の初期化に失敗しました');
    }

    return () => {
      if (mapMoveTimeout.current) {
        clearTimeout(mapMoveTimeout.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [open, mapContainer, defaultLocation, userId]); // getAddressFromCoordinatesは関数内で定義されているため依存配列に含めない

  const handleConfirm = () => {
    if (selectedLocation) {
      const confirmData = {
        name: customLocationName || selectedLocation.name,
        address: selectedLocation.address,
        coordinates: {
          lat: selectedLocation.lat,
          lon: selectedLocation.lon,
        },
        saveToDatabase: nearbyLocation ? false : saveToDatabase, // 既存地点がある場合は保存しない
        tag: locationTag,
        nearbyLocationId: nearbyLocation?.locationId, // 既存地点のIDを渡す
      };
      console.log('[LocationPicker] Confirming location:', confirmData);
      console.log('[LocationPicker] nearbyLocation:', nearbyLocation);
      console.log('[LocationPicker] saveToDatabase checkbox:', saveToDatabase);
      onConfirm(confirmData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon />
            {title}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={2}>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ position: 'relative' }}>
            {/* 説明テキスト - 左上に配置 */}
            <Box
              sx={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 2,
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                px: 2,
                py: 1,
                borderRadius: 1,
                boxShadow: 2,
                maxWidth: '60%',
              }}
            >
              <Typography variant="body2" fontWeight="bold">
                地図を動かして選択
              </Typography>
            </Box>

            <Box
              ref={setMapContainer}
              sx={{
                width: '100%',
                height: 400,
                minHeight: 400,
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: '#f0f0f0',
                position: 'relative',
                '& .mapboxgl-canvas': {
                  width: '100% !important',
                  height: '100% !important',
                },
              }}
            />
            
            {/* 中央固定のピン */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'none',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <LocationIcon
                sx={{
                  fontSize: 48,
                  color: '#d32f2f',
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                }}
              />
              {/* ピンの底部に点を追加 */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'rgba(0,0,0,0.3)',
                  mt: -1.5,
                }}
              />
            </Box>
            
            {/* 現在位置ボタン - 大きく押しやすく */}
            <IconButton
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              sx={{
                position: 'absolute',
                bottom: 80,
                right: 10,
                bgcolor: 'primary.main',
                color: 'white',
                width: 56,
                height: 56,
                boxShadow: 3,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.400',
                },
              }}
            >
              {gettingLocation ? <CircularProgress size={24} color="inherit" /> : <MyLocationIcon />}
            </IconButton>

            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={16} />
                <Typography variant="caption">住所を取得中...</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ 
            p: 2, 
            bgcolor: selectedLocation ? 'primary.main' : 'grey.200', 
            color: selectedLocation ? 'white' : 'text.secondary', 
            borderRadius: 1,
            minHeight: 140, // 最小高さを設定
          }}>
            {selectedLocation ? (
              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  選択した地点
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="地点名"
                  value={customLocationName}
                  onChange={(e) => setCustomLocationName(e.target.value)}
                  InputLabelProps={{
                    shrink: true, // ラベルを常に上に表示
                  }}
                  sx={{ 
                    bgcolor: 'transparent',
                    '& .MuiInputBase-input': { color: 'text.primary' },
                    '& .MuiInputLabel-root': {
                      color: '#fff',
                      fontWeight: 600,
                      backgroundColor: 'rgba(33, 150, 243, 0.9)',
                      px: 1,
                      borderRadius: 1,
                      '&.Mui-focused': {
                        color: '#fff',
                      },
                    },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(10px)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#fff',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#fff',
                      },
                    },
                    mt: 0.5,
                  }}
                />
                <Typography variant="body2" sx={{ opacity: loading ? 0.6 : 1 }}>
                  {loading ? '住所を更新中...' : selectedLocation.address}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lon.toFixed(6)}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" align="center">
                地図を動かして地点を選択してください
              </Typography>
            )}
          </Box>

          {!nearbyLocation && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={saveToDatabase}
                  onChange={(e) => setSaveToDatabase(e.target.checked)}
                />
              }
              label="この地点をデータベースに保存する（次回から検索で選択可能）"
            />
          )}

          {nearbyLocation && (
            <Alert severity="info" sx={{ mt: 1 }}>
              10m以内に既存の地点「{nearbyLocation.name}」があります。
              {nearbyLocation.usageCount > 0 && `（${nearbyLocation.usageCount}回使用）`}
            </Alert>
          )}

          {saveToDatabase && !nearbyLocation && (
            <TextField
              fullWidth
              label="タグ（例：境町実証、○○プロジェクト）"
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
              placeholder="実証名やプロジェクト名を入力"
              size="small"
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          size="large"
          disabled={!selectedLocation || loading}
          sx={{ 
            py: 1.5,
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          この地点を選択
        </Button>
      </DialogActions>
    </Dialog>
  );
};