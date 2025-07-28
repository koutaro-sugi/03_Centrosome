/**
 * 気象データのキャッシュ管理用フック
 * LocalStorageを使用して履歴データをキャッシュし、
 * ページリロード時のデータ復元とパフォーマンス向上を実現
 */

import { useState, useEffect, useCallback } from 'react';
import { SensorData } from '../types/weather';

interface CacheData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface WeatherCacheOptions {
  /** キャッシュ有効期限（ミリ秒）デフォルト: 1時間 */
  ttl?: number;
  /** キャッシュキーのプレフィックス */
  prefix?: string;
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1時間
const CACHE_PREFIX = 'weather_cache_';

/**
 * 気象データキャッシュフック
 */
export function useWeatherCache<T = SensorData[]>(
  key: string,
  options: WeatherCacheOptions = {}
) {
  const { ttl = DEFAULT_TTL, prefix = CACHE_PREFIX } = options;
  const cacheKey = `${prefix}${key}`;

  // キャッシュからデータを取得
  const getCachedData = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData: CacheData<T> = JSON.parse(cached);
      
      // 有効期限チェック
      if (Date.now() > cacheData.expiresAt) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error);
      return null;
    }
  }, [cacheKey]);

  // データをキャッシュに保存
  const setCachedData = useCallback((data: T) => {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('キャッシュ保存エラー:', error);
      // ストレージ容量不足の場合は古いキャッシュを削除
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        clearOldCaches();
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
          }));
        } catch (retryError) {
          console.error('キャッシュ保存再試行エラー:', retryError);
        }
      }
    }
  }, [cacheKey, ttl]);

  // キャッシュをクリア
  const clearCache = useCallback(() => {
    localStorage.removeItem(cacheKey);
  }, [cacheKey]);

  // 古いキャッシュを削除
  const clearOldCaches = () => {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheData: CacheData<any> = JSON.parse(cached);
            if (now > cacheData.expiresAt) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // 無効なキャッシュデータは削除
          localStorage.removeItem(key);
        }
      }
    });
  };

  // 初回マウント時に古いキャッシュをクリーンアップ
  useEffect(() => {
    clearOldCaches();
  }, []);

  return {
    getCachedData,
    setCachedData,
    clearCache,
  };
}

/**
 * 複数デバイスの気象データキャッシュを管理
 */
export function useWeatherDataCache() {
  const [cachedDevices, setCachedDevices] = useState<string[]>([]);

  // キャッシュされているデバイスIDのリストを取得
  useEffect(() => {
    const keys = Object.keys(localStorage);
    const deviceIds = keys
      .filter(key => key.startsWith(CACHE_PREFIX))
      .map(key => key.replace(CACHE_PREFIX, '').split('_')[0])
      .filter((id, index, self) => self.indexOf(id) === index);
    
    setCachedDevices(deviceIds);
  }, []);

  // 全キャッシュをクリア
  const clearAllCaches = useCallback(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    setCachedDevices([]);
  }, []);

  // キャッシュサイズを取得（概算）
  const getCacheSize = useCallback(() => {
    let totalSize = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    });
    
    return totalSize;
  }, []);

  return {
    cachedDevices,
    clearAllCaches,
    getCacheSize,
  };
}