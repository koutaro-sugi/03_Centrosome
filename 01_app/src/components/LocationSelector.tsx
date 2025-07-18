import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Button,
  CircularProgress,
  Chip,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  MyLocation as LocationIcon,
  Map as MapIcon,
} from '@mui/icons-material';
import { FlightLocation } from '../types/flightLocation';
import { LocationPicker } from './LocationPicker';
import { useFlightLocation } from '../hooks/useFlightLocation';

interface LocationSelectorProps {
  userId: string;
  label: string;
  value: {
    locationId?: string;
    name: string;
    address: string;
    coordinates: { lat: number; lon: number };
  } | null;
  onChange: (location: {
    locationId?: string;
    name: string;
    address: string;
    coordinates: { lat: number; lon: number };
  } | null) => void;
  onNewLocationCreated?: (location: FlightLocation) => void;
  showSameAsOther?: boolean;
  sameAsOther?: boolean;
  onSameAsOtherChange?: (checked: boolean) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  userId,
  label,
  value,
  onChange,
  onNewLocationCreated,
  showSameAsOther = false,
  sameAsOther = false,
  onSameAsOtherChange,
}) => {
  const { locations, loading, createLocation, incrementUsage } = useFlightLocation(userId);
  const [openPicker, setOpenPicker] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // 選択肢を準備（既存の地点 + 新規作成オプション）
  const options: any[] = [
    ...locations.map(loc => ({
      ...loc,
      label: `${loc.name} - ${loc.address}`,
      type: 'existing',
    })),
    {
      type: 'action',
      action: 'map',
      label: '🗺️ 地図から選択',
    },
  ];

  // 値が変更されたら使用回数を増やす
  useEffect(() => {
    if (value?.locationId) {
      incrementUsage(value.locationId).catch(console.error);
    }
  }, [value?.locationId]);

  const handleLocationPicked = async (pickedLocation: {
    name: string;
    address: string;
    coordinates: { lat: number; lon: number };
    saveToDatabase: boolean;
  }) => {
    setOpenPicker(false);

    if (pickedLocation.saveToDatabase) {
      // DBに保存
      try {
        const newLocation = await createLocation({
          name: pickedLocation.name,
          address: pickedLocation.address,
          coordinates: pickedLocation.coordinates,
        });
        
        onChange({
          locationId: newLocation.locationId,
          name: newLocation.name,
          address: newLocation.address,
          coordinates: newLocation.coordinates,
        });

        if (onNewLocationCreated) {
          onNewLocationCreated(newLocation);
        }
      } catch (err) {
        console.error('Failed to save location:', err);
        // 保存に失敗しても地点は使用
        onChange({
          name: pickedLocation.name,
          address: pickedLocation.address,
          coordinates: pickedLocation.coordinates,
        });
      }
    } else {
      // DBに保存しない（一時的な使用）
      onChange({
        name: pickedLocation.name,
        address: pickedLocation.address,
        coordinates: pickedLocation.coordinates,
      });
    }
  };

  return (
    <>
      <Stack spacing={1}>
        <Autocomplete
          value={value ? { ...value, label: `${value.name} - ${value.address}`, type: 'existing' } : null}
          onChange={(event, newValue) => {
            if (!newValue) {
              onChange(null);
            } else if (newValue.type === 'action' && newValue.action === 'map') {
              setOpenPicker(true);
            } else if (newValue.type === 'existing') {
              onChange({
                locationId: newValue.locationId,
                name: newValue.name,
                address: newValue.address,
                coordinates: newValue.coordinates,
              });
            }
          }}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => {
            setInputValue(newInputValue);
          }}
          options={options}
          loading={loading}
          getOptionLabel={(option) => option.label || ''}
          isOptionEqualToValue={(option, value) => 
            option.locationId === value.locationId || 
            (option.type === 'existing' && value.type === 'existing' && option.name === value.name)
          }
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              {option.type === 'action' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                  <MapIcon />
                  <Typography>{option.label}</Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.address}
                    {option.usageCount > 0 && (
                      <Chip 
                        label={`${option.usageCount}回使用`} 
                        size="small" 
                        sx={{ ml: 1, height: 16 }} 
                      />
                    )}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder="地点を検索または選択"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        
        {value && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}>
            <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {value.coordinates.lat.toFixed(6)}, {value.coordinates.lon.toFixed(6)}
            </Typography>
          </Box>
        )}
      </Stack>

      <LocationPicker
        open={openPicker}
        onClose={() => setOpenPicker(false)}
        onConfirm={handleLocationPicked}
        title={`${label}を選択`}
        userId={userId}
      />
    </>
  );
};