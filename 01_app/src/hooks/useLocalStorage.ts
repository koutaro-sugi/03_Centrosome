import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
): [T, (value: SetValue<T>) => void] {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;

  // LocalStorageから初期値を読み込む
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 値をLocalStorageに保存
  const setValue = useCallback((value: SetValue<T>) => {
    try {
      setStoredValue(prevValue => {
        // 関数の場合は現在の値を渡して実行
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        window.localStorage.setItem(key, serialize(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, serialize]);

  // 他のタブでの変更を検知
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(deserialize(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  return [storedValue, setValue];
}

// 複数の設定を一括で管理するフック
export function useAppSettings() {
  const [telemetryPosition, setTelemetryPosition] = useLocalStorage('inflight_telemetry_position', { x: 700, y: 40 });
  const [telemetrySize, setTelemetrySize] = useLocalStorage('inflight_telemetry_size', { width: 320, height: 500 });
  const [telemetryViewMode, setTelemetryViewMode] = useLocalStorage<'list' | 'inspector'>('inflight_telemetry_view_mode', 'list');
  const [telemetryCategories, setTelemetryCategories] = useLocalStorage('inflight_telemetry_categories', null);

  return {
    telemetryPosition,
    setTelemetryPosition,
    telemetrySize,
    setTelemetrySize,
    telemetryViewMode,
    setTelemetryViewMode,
    telemetryCategories,
    setTelemetryCategories,
  };
}