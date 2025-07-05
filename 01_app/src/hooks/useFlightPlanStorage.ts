import { useState, useCallback } from 'react';
import { flightPlanAPI, FlightPlan } from '../lib/dynamodb';
import { FlightPlan as MissionPlan } from '../contexts/FlightPlanContext';

// 仮のユーザーID（将来的に認証システムから取得）
const TEMP_USER_ID = 'demo-user-001';

export const useFlightPlanStorage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<FlightPlan[]>([]);

  // フライトプランを保存
  const savePlan = useCallback(async (plan: MissionPlan, name: string, description?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const savedPlan = await flightPlanAPI.save({
        id: planId,
        userId: TEMP_USER_ID,
        name,
        description,
        waypoints: plan.mission?.items || [],
        status: 'draft',
        planData: plan, // 元のMissionPlanデータをそのまま保存
      });
      
      console.log('Flight plan saved:', savedPlan);
      return savedPlan;
    } catch (err) {
      console.error('Failed to save flight plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to save flight plan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // フライトプラン一覧を取得
  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedPlans = await flightPlanAPI.listByUser(TEMP_USER_ID);
      setPlans(loadedPlans);
      console.log('Loaded flight plans:', loadedPlans);
      return loadedPlans;
    } catch (err) {
      console.error('Failed to load flight plans:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flight plans');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // 特定のフライトプランを取得
  const loadPlan = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const plan = await flightPlanAPI.get(TEMP_USER_ID, planId);
      if (!plan) {
        throw new Error('Flight plan not found');
      }
      console.log('Loaded flight plan:', plan);
      return plan;
    } catch (err) {
      console.error('Failed to load flight plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flight plan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // フライトプランを更新
  const updatePlan = useCallback(async (planId: string, updates: Partial<FlightPlan>) => {
    setLoading(true);
    setError(null);
    
    try {
      await flightPlanAPI.update(TEMP_USER_ID, planId, updates);
      console.log('Flight plan updated');
      // 更新後は一覧を再読み込み
      await loadPlans();
    } catch (err) {
      console.error('Failed to update flight plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to update flight plan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadPlans]);

  // フライトプランを削除
  const deletePlan = useCallback(async (planId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await flightPlanAPI.delete(TEMP_USER_ID, planId);
      console.log('Flight plan deleted');
      // 削除後は一覧を再読み込み
      await loadPlans();
    } catch (err) {
      console.error('Failed to delete flight plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete flight plan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadPlans]);

  return {
    plans,
    loading,
    error,
    savePlan,
    loadPlans,
    loadPlan,
    updatePlan,
    deletePlan,
  };
};