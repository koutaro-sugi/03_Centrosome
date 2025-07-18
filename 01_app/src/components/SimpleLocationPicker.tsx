import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Stack,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { SlideToConfirm } from './SlideToConfirm';
import { useFlightLocation } from '../hooks/useFlightLocation';

interface SimpleLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (location: {
    name: string;
    address: string;
    coordinates: { lat: number; lon: number };
    saveToDatabase: boolean;
  }) => void;
  title?: string;
  userId: string;
}

export const SimpleLocationPicker: React.FC<SimpleLocationPickerProps> = ({
  open,
  onClose,
  onConfirm,
  title = '地点を選択',
  userId,
}) => {
  const { locations, deleteLocation, refreshLocations } = useFlightLocation(userId);
  
  // ダイアログが開いたときにリセット
  useEffect(() => {
    if (open) {
      refreshLocations();
      // リセット
      setSelectedLocation(null);
      setCustomName('');
      setCustomAddress('');
      setSearchQuery('');
      setSelectedTag('');
    }
  }, [open, refreshLocations]);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lon: number;
    address: string;
    name: string;
  } | null>(null);
  const [saveToDatabase] = useState(false); // 履歴画面では常に保存しない
  const [error, setError] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  // handleSelectPresetは使わなくなったので削除

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm({
        name: customName || selectedLocation.name,
        address: customAddress || selectedLocation.address,
        coordinates: {
          lat: selectedLocation.lat,
          lon: selectedLocation.lon,
        },
        saveToDatabase,
      });
    }
  };

  // すべてのタグを収集（重複なし）
  const allTags = Array.from(
    new Set(
      locations
        .filter(loc => loc.tags && loc.tags.length > 0)
        .flatMap(loc => loc.tags || [])
    )
  ).sort();

  const filteredLocations = locations.filter(loc => {
    // 検索クエリでフィルタ
    const matchesSearch = searchQuery === '' || 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    // タグでフィルタ
    const matchesTag = selectedTag === '' || 
      (loc.tags && loc.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, locationId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedLocationId(locationId);
    const location = locations.find(l => l.locationId === locationId);
    if (location) {
      setSelectedLocationName(location.name);
    }
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLocationId(null);
  };

  const handleDeleteLocation = async (locationId: string) => {
    console.log('[SimpleLocationPicker] handleDeleteLocation called with:', locationId);
    try {
      console.log('[SimpleLocationPicker] Deleting location...');
      await deleteLocation(locationId);
      console.log('[SimpleLocationPicker] Location deleted successfully');
      
      setShowDeleteConfirm(false);
      
      // 削除後に一覧をリフレッシュ
      console.log('[SimpleLocationPicker] Refreshing locations...');
      await refreshLocations();
      console.log('[SimpleLocationPicker] Locations refreshed');
      
      // 選択された地点が削除された場合はリセット
      if (selectedLocation && selectedLocationId === locationId) {
        setSelectedLocation(null);
        setCustomName('');
        setCustomAddress('');
      }
      
      // 削除処理完了後にIDをリセット
      setSelectedLocationId(null);
      setSelectedLocationName('');
      setAnchorEl(null);
    } catch (err) {
      console.error('[SimpleLocationPicker] Failed to delete location:', err);
      setError('地点の削除に失敗しました');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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


          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              placeholder="地点を検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="medium"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                sx: {
                  height: 48,
                  '& input': {
                    padding: '12px 0',
                  },
                },
              }}
            />
            {allTags.length > 0 && (
              <FormControl sx={{ minWidth: 140 }}>
                <InputLabel 
                  sx={{ 
                    top: '50%',
                    transform: selectedTag ? 'translate(14px, -50%) scale(0.75)' : 'translate(14px, -50%)',
                    transformOrigin: 'left',
                    '&.Mui-focused': {
                      transform: 'translate(14px, -50%) scale(0.75)',
                    },
                  }}
                >
                  タグ
                </InputLabel>
                <Select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  label="タグ"
                  size="medium"
                  sx={{ 
                    height: 48,
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.5,
                    },
                  }}
                >
                  <MenuItem value="">すべて</MenuItem>
                  {allTags.map(tag => (
                    <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            <List>
              {filteredLocations.map((location) => (
                <ListItem 
                  key={location.locationId} 
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, location.locationId)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    onClick={() => {
                      setSelectedLocation({
                        lat: location.coordinates.lat,
                        lon: location.coordinates.lon,
                        name: location.name,
                        address: location.address,
                      });
                      setCustomName(location.name);
                      setCustomAddress(location.address);
                    }}
                    selected={selectedLocation?.name === location.name}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography>{location.name}</Typography>
                          {location.tags && location.tags.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {location.tags.map(tag => (
                                <Chip
                                  key={tag}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          {(() => {
                            const cleanAddress = location.address.replace(/^日本、?/, '').trim();
                            const match = cleanAddress.match(/^(.+?[都道府県])/);
                            return match ? match[1] : cleanAddress;
                          })()}
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
              {filteredLocations.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="保存された地点がありません"
                    secondary="新しい地点を登録してください"
                  />
                </ListItem>
              )}
            </List>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem
              onClick={() => {
                setShowDeleteConfirm(true);
                setAnchorEl(null); // メニューを閉じるが、selectedLocationIdは保持
              }}
            >
              削除
            </MenuItem>
          </Menu>

          {selectedLocation && (
            <>
              <Divider />
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  選択した地点
                </Typography>
                <TextField
                  fullWidth
                  label="地点名"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth
                  label="住所"
                  value={customAddress.replace(/^日本、/, '').replace(/^日本/, '')}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  座標: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lon.toFixed(6)}
                </Typography>
              </Box>
            </>
          )}

        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedLocation || !customName || !customAddress}
        >
          この地点を選択
        </Button>
      </DialogActions>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>地点を削除</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 3 }}>
            「{selectedLocationName}」を削除しますか？
          </Typography>
          <SlideToConfirm
            onConfirm={async () => {
              console.log('[SimpleLocationPicker] SlideToConfirm onConfirm triggered');
              console.log('[SimpleLocationPicker] selectedLocationId:', selectedLocationId);
              if (selectedLocationId) {
                await handleDeleteLocation(selectedLocationId);
              } else {
                console.log('[SimpleLocationPicker] No selectedLocationId!');
              }
            }}
            text="スワイプして削除"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowDeleteConfirm(false);
            setSelectedLocationId(null);
            setSelectedLocationName('');
          }}>キャンセル</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};