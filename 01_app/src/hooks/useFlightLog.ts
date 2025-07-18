import { useState, useCallback, useEffect } from 'react';
import { flightLogAPI } from '../lib/flightLogApi';
import { FlightLog, CreateFlightLogInput, UpdateFlightLogInput } from '../types/flightLog';

interface UseFlightLogReturn {
  flightLogs: FlightLog[];
  loading: boolean;
  error: string | null;
  createFlightLog: (input: CreateFlightLogInput) => Promise<FlightLog>;
  updateFlightLog: (input: UpdateFlightLogInput) => Promise<FlightLog>;
  deleteFlightLog: (date: string, logId: string) => Promise<void>;
  refreshFlightLogs: () => Promise<void>;
}

export const useFlightLog = (userId: string): UseFlightLogReturn => {
  const [flightLogs, setFlightLogs] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 飛行記録一覧を取得
  const fetchFlightLogs = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      const logs = await flightLogAPI.listByUser(userId);
      setFlightLogs(logs);
    } catch (err) {
      console.error('Failed to fetch flight logs:', err);
      setError('飛行記録の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 飛行記録を作成
  const createFlightLog = useCallback(async (input: CreateFlightLogInput): Promise<FlightLog> => {
    try {
      setError(null);
      const newLog = await flightLogAPI.create(userId, input);
      await fetchFlightLogs(); // リストを更新
      return newLog;
    } catch (err) {
      console.error('Failed to create flight log:', err);
      setError('飛行記録の作成に失敗しました');
      throw err;
    }
  }, [userId, fetchFlightLogs]);

  // 飛行記録を更新
  const updateFlightLog = useCallback(async (input: UpdateFlightLogInput): Promise<FlightLog> => {
    try {
      setError(null);
      const updatedLog = await flightLogAPI.update(userId, input);
      await fetchFlightLogs(); // リストを更新
      return updatedLog;
    } catch (err) {
      console.error('Failed to update flight log:', err);
      setError('飛行記録の更新に失敗しました');
      throw err;
    }
  }, [userId, fetchFlightLogs]);

  // 飛行記録を削除
  const deleteFlightLog = useCallback(async (date: string, logId: string): Promise<void> => {
    try {
      setError(null);
      await flightLogAPI.delete(userId, date, logId);
      await fetchFlightLogs(); // リストを更新
    } catch (err) {
      console.error('Failed to delete flight log:', err);
      setError('飛行記録の削除に失敗しました');
      throw err;
    }
  }, [userId, fetchFlightLogs]);

  // 初回ロード
  useEffect(() => {
    fetchFlightLogs();
  }, [fetchFlightLogs]);

  return {
    flightLogs,
    loading,
    error,
    createFlightLog,
    updateFlightLog,
    deleteFlightLog,
    refreshFlightLogs: fetchFlightLogs,
  };
};