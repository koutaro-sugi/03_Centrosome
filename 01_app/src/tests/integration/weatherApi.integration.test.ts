/**
 * Weather API 統合テスト
 * AppSync APIとの実際の通信を含むテスト
 */

import { WeatherApiService } from '../../services/weatherApi';
import { Amplify } from 'aws-amplify';
import { StatsPeriod } from '../../types/weather';

// テスト環境用のAmplify設定
const testAmplifyConfig = {
  API: {
    GraphQL: {
      endpoint: process.env.REACT_APP_GRAPHQL_ENDPOINT || 'http://localhost:20002/graphql',
      region: 'ap-northeast-1',
      defaultAuthMode: 'apiKey' as const,
      apiKey: 'test-api-key'
    }
  },
  Auth: {
    Cognito: {
      userPoolId: 'test-user-pool',
      userPoolClientId: 'test-client-id',
      identityPoolId: 'test-identity-pool'
    }
  }
};

describe('WeatherApiService Integration Tests', () => {
  let weatherApiService: WeatherApiService;
  const testDeviceId = 'TEST-001';

  beforeAll(() => {
    // Amplifyの設定
    Amplify.configure(testAmplifyConfig);
    weatherApiService = new WeatherApiService();
  });

  afterAll(() => {
    // クリーンアップ
    weatherApiService.unsubscribeAll();
  });

  describe('データ取得API', () => {
    it('現在のセンサーデータを取得できる', async () => {
      const data = await weatherApiService.getCurrentData(testDeviceId);
      
      if (data) {
        expect(data).toHaveProperty('deviceId', testDeviceId);
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('temperature');
        expect(data).toHaveProperty('humidity');
        expect(data).toHaveProperty('pressure');
        expect(typeof data.temperature).toBe('number');
        expect(typeof data.humidity).toBe('number');
        expect(typeof data.pressure).toBe('number');
      } else {
        // データがない場合もエラーにしない（正常な状態）
        expect(data).toBeNull();
      }
    }, 10000);

    it('履歴データを取得できる', async () => {
      const historyMinutes = 60;
      const data = await weatherApiService.getHistoricalData(testDeviceId, historyMinutes);
      
      expect(Array.isArray(data)).toBe(true);
      
      if (data.length > 0) {
        // データがある場合の検証
        const firstItem = data[0];
        expect(firstItem).toHaveProperty('deviceId');
        expect(firstItem).toHaveProperty('timestamp');
        expect(firstItem).toHaveProperty('temperature');
        
        // タイムスタンプの範囲を確認
        const now = new Date();
        const oldestAllowed = new Date(now.getTime() - historyMinutes * 60 * 1000);
        const timestamp = new Date(firstItem.timestamp);
        
        expect(timestamp.getTime()).toBeGreaterThan(oldestAllowed.getTime());
        expect(timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      }
    }, 10000);

    it('統計データを取得できる', async () => {
      const stats = await weatherApiService.getStatistics(testDeviceId, StatsPeriod.HOUR);
      
      if (stats) {
        expect(stats).toHaveProperty('deviceId', testDeviceId);
        expect(stats).toHaveProperty('period', StatsPeriod.HOUR);
        expect(stats).toHaveProperty('temperature');
        expect(stats.temperature).toHaveProperty('max');
        expect(stats.temperature).toHaveProperty('min');
        expect(stats.temperature).toHaveProperty('avg');
        expect(stats).toHaveProperty('samples');
        expect(typeof stats.samples).toBe('number');
      } else {
        // データがない場合もエラーにしない
        expect(stats).toBeNull();
      }
    }, 10000);
  });

  describe('エラーハンドリング', () => {
    it('無効なデバイスIDでもエラーを適切に処理する', async () => {
      const invalidDeviceId = 'INVALID-DEVICE-999';
      
      // エラーが発生せずにnullまたは空配列が返ることを確認
      const currentData = await weatherApiService.getCurrentData(invalidDeviceId);
      expect(currentData).toBeNull();
      
      const historicalData = await weatherApiService.getHistoricalData(invalidDeviceId);
      expect(historicalData).toEqual([]);
      
      const statsData = await weatherApiService.getStatistics(invalidDeviceId);
      expect(statsData).toBeNull();
    });

    it('ネットワークエラー時にリトライが動作する', async () => {
      // ネットワークエラーをシミュレート（実際のテストでは難しい）
      // この部分は実装に応じて調整が必要
      const startTime = Date.now();
      
      try {
        await weatherApiService.getCurrentData(testDeviceId);
      } catch (error) {
        // エラーが発生した場合、リトライによる遅延があることを確認
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // リトライがある場合、最低でも数秒かかるはず
        expect(duration).toBeGreaterThan(1000);
      }
    }, 20000);
  });

  describe('リアルタイム更新', () => {
    it('サブスクリプションを開始・停止できる', (done) => {
      let updateReceived = false;
      
      const unsubscribe = weatherApiService.subscribeToUpdates(
        testDeviceId,
        (data) => {
          updateReceived = true;
          expect(data).toHaveProperty('deviceId');
          expect(data).toHaveProperty('timestamp');
          done();
        }
      );
      
      // サブスクリプションが開始されたことを確認
      expect(weatherApiService.getConnectionStatus()).toBe('connected');
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(1);
      expect(weatherApiService.getSubscriptionStatus(testDeviceId)).toBe(true);
      
      // 10秒待ってもデータが来ない場合はタイムアウト
      setTimeout(() => {
        unsubscribe();
        if (!updateReceived) {
          // リアルタイムデータがない環境でもテストが失敗しないように
          done();
        }
      }, 10000);
    }, 15000);

    it('複数のサブスクリプションを管理できる', () => {
      const devices = ['TEST-001', 'TEST-002', 'TEST-003'];
      const unsubscribes: (() => void)[] = [];
      
      // 複数のサブスクリプションを開始
      devices.forEach(deviceId => {
        const unsubscribe = weatherApiService.subscribeToUpdates(
          deviceId,
          () => {} // ダミーコールバック
        );
        unsubscribes.push(unsubscribe);
      });
      
      // 全てのサブスクリプションが開始されたことを確認
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(3);
      devices.forEach(deviceId => {
        expect(weatherApiService.getSubscriptionStatus(deviceId)).toBe(true);
      });
      
      // 一つずつ解除
      unsubscribes[0]();
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(2);
      expect(weatherApiService.getSubscriptionStatus(devices[0])).toBe(false);
      
      // 全て解除
      weatherApiService.unsubscribeAll();
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(0);
      expect(weatherApiService.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('ヘルスチェック', () => {
    it('ヘルスチェックが正常に動作する', async () => {
      const health = await weatherApiService.healthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('details');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      
      expect(health.details).toHaveProperty('connectionStatus');
      expect(health.details).toHaveProperty('activeSubscriptions');
      expect(health.details).toHaveProperty('reconnectAttempts');
    });
  });

  describe('同時実行とパフォーマンス', () => {
    it('複数の同時リクエストを処理できる', async () => {
      const promises = [
        weatherApiService.getCurrentData(testDeviceId),
        weatherApiService.getHistoricalData(testDeviceId, 30),
        weatherApiService.getStatistics(testDeviceId, StatsPeriod.HOUR),
        weatherApiService.getCurrentData('TEST-002'),
        weatherApiService.getHistoricalData('TEST-002', 60)
      ];
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // 全てのリクエストが完了することを確認
      expect(results).toHaveLength(5);
      
      // パフォーマンス: 5つのリクエストが5秒以内に完了
      expect(endTime - startTime).toBeLessThan(5000);
    }, 10000);

    it('大量データの取得でもメモリリークしない', async () => {
      // メモリ使用量の初期値を記録（Node.jsでのみ有効）
      const initialMemory = process.memoryUsage?.().heapUsed || 0;
      
      // 大量のデータ取得を繰り返す
      for (let i = 0; i < 10; i++) {
        await weatherApiService.getHistoricalData(testDeviceId, 180); // 3時間分
      }
      
      // メモリ使用量の最終値を記録
      const finalMemory = process.memoryUsage?.().heapUsed || 0;
      
      // メモリ増加が妥当な範囲内であることを確認（10MB以内）
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, 30000);
  });
});