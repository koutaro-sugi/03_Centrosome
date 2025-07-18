import { useState, useCallback, useEffect } from 'react';
import { flightLocationAPI } from '../lib/flightLocationApi';
import { FlightLocation, CreateFlightLocationInput } from '../types/flightLocation';

interface UseFlightLocationReturn {
  locations: FlightLocation[];
  loading: boolean;
  error: string | null;
  searchLocations: (query: string) => Promise<FlightLocation[]>;
  createLocation: (input: CreateFlightLocationInput) => Promise<FlightLocation>;
  incrementUsage: (locationId: string) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  findNearbyLocation: (lat: number, lon: number) => Promise<FlightLocation | null>;
  refreshLocations: () => Promise<void>;
}

export const useFlightLocation = (userId: string): UseFlightLocationReturn => {
  const [locations, setLocations] = useState<FlightLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 地点一覧を取得
  const fetchLocations = useCallback(async () => {
    if (!userId) return;
    
    console.log('[useFlightLocation] Fetching locations for user:', userId);
    try {
      setLoading(true);
      setError(null);
      const locs = await flightLocationAPI.listByUser(userId);
      console.log('[useFlightLocation] Fetched locations:', locs.length, locs);
      setLocations(locs);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      setError('地点の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 地点を検索
  const searchLocations = useCallback(async (query: string): Promise<FlightLocation[]> => {
    try {
      return await flightLocationAPI.search(userId, query);
    } catch (err) {
      console.error('Failed to search locations:', err);
      return [];
    }
  }, [userId]);

  // 地点を作成
  const createLocation = useCallback(async (input: CreateFlightLocationInput): Promise<FlightLocation> => {
    try {
      setError(null);
      console.log('[useFlightLocation] Creating location:', input);
      const newLocation = await flightLocationAPI.create(userId, input);
      console.log('[useFlightLocation] Location created:', newLocation);
      await fetchLocations(); // リストを更新
      console.log('[useFlightLocation] Locations refreshed, count:', locations.length);
      return newLocation;
    } catch (err) {
      console.error('Failed to create location:', err);
      setError('地点の作成に失敗しました');
      throw err;
    }
  }, [userId, fetchLocations, locations.length]);

  // 使用回数を増やす
  const incrementUsage = useCallback(async (locationId: string): Promise<void> => {
    try {
      await flightLocationAPI.incrementUsage(userId, locationId);
      await fetchLocations(); // リストを更新（使用頻度順の並び替えのため）
    } catch (err) {
      console.error('Failed to increment usage:', err);
    }
  }, [userId, fetchLocations]);

  // 近くの地点を探す
  const findNearbyLocation = useCallback(async (lat: number, lon: number): Promise<FlightLocation | null> => {
    try {
      return await flightLocationAPI.findNearbyLocation(userId, lat, lon);
    } catch (err) {
      console.error('Failed to find nearby location:', err);
      return null;
    }
  }, [userId]);

  // 地点を削除
  const deleteLocation = useCallback(async (locationId: string): Promise<void> => {
    try {
      setError(null);
      await flightLocationAPI.delete(userId, locationId);
      await fetchLocations(); // リストを更新
    } catch (err) {
      console.error('Failed to delete location:', err);
      setError('地点の削除に失敗しました');
      throw err;
    }
  }, [userId, fetchLocations]);

  // 初回ロード
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    loading,
    error,
    searchLocations,
    createLocation,
    incrementUsage,
    deleteLocation,
    findNearbyLocation,
    refreshLocations: fetchLocations,
  };
};