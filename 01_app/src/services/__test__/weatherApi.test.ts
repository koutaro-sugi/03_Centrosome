/**
 * Weather API Service テストファイル
 * WeatherApiServiceクラスの単体テスト
 */

import { WeatherApiService, WeatherApiError } from '../weatherApi';
import { SensorData, SensorStats, StatsPeriod } from '../../types/weather';

// AWS Amplifyのモック
jest.mock('aws-amplify/api', () => ({
  generateClient: jest.fn(() => ({
    graphql: jest.fn()
  }))
}));

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn()
}));

import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

describe('WeatherApiService', () => {
  // テストのタイムアウトを10秒に設定
  jest.setTimeout(10000);
  let weatherApiService: WeatherApiService;
  let mockClient: any;
  let mockFetchAuthSession: jest.MockedFunction<typeof fetchAuthSession>;

  beforeEach(() => {
    // モッククライアントの設定
    mockClient = {
      graphql: jest.fn()
    };
    (generateClient as jest.Mock).mockReturnValue(mockClient);
    
    // 認証セッションのモック
    mockFetchAuthSession = fetchAuthSession as jest.MockedFunction<typeof fetchAuthSession>;
    mockFetchAuthSession.mockResolvedValue({
      tokens: {
        idToken: {
          toString: () => 'mock-token',
          payload: {
            exp: Math.floor(Date.now() / 1000) + 3600 // 1時間後に期限切れ
          }
        }
      }
    } as any);

    weatherApiService = new WeatherApiService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    weatherApiService.unsubscribeAll();
  });

  describe('getCurrentData', () => {
    it('現在のセンサーデータを正常に取得できる', async () => {
      // テストデータの準備（修正されたクエリに対応）
      const mockResponse = {
        data: {
          listByDeviceAndTime: {
            items: [{
              deviceId: 'M-X-001',
              timestamp: '2025-01-27T12:00:00.000Z',
              temperature: 25.5,
              humidity: 60.0,
              pressure: 1013.25,
              windSpeed: 5.2,
              windDirection: 180,
              rainfall: 0.0,
              illuminance: 50000,
              visibility: 10.0,
              feelsLike: 26.0
            }]
          }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      // テスト実行
      const result = await weatherApiService.getCurrentData('M-X-001');

      // 検証
      expect(result).toEqual({
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        temperature: 25.5,
        humidity: 60.0,
        pressure: 1013.25,
        windSpeed: 5.2,
        windDirection: 180,
        rainfall: 0.0,
        illuminance: 50000,
        visibility: 10.0,
        feelsLike: 26.0
      });

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('GetCurrentSensorData'),
        variables: { deviceId: 'M-X-001' }
      });
    });

    it('データが存在しない場合はnullを返す', async () => {
      const mockResponse = {
        data: {
          listByDeviceAndTime: {
            items: []
          }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      const result = await weatherApiService.getCurrentData('M-X-001');

      expect(result).toBeNull();
    });

    it('GraphQLエラーが発生した場合は例外をスローする', async () => {
      // 新しいサービスインスタンスを作成
      const testService = new WeatherApiService();
      
      const mockResponse = {
        data: null,
        errors: [{
          message: 'GraphQLエラーが発生しました',
          extensions: { code: 'INTERNAL_ERROR' }
        }]
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      await expect(testService.getCurrentData('M-X-001'))
        .rejects.toThrow(WeatherApiError);
    });
  });

  describe('getHistoricalData', () => {
    it('履歴データを正常に取得できる', async () => {
      const mockResponse = {
        data: {
          listByDeviceAndTime: {
            items: [
              {
                deviceId: 'M-X-001',
                timestamp: '2025-01-27T11:00:00.000Z',
                temperature: 24.0,
                humidity: 65.0,
                windSpeed: 4.5
              },
              {
                deviceId: 'M-X-001',
                timestamp: '2025-01-27T12:00:00.000Z',
                temperature: 25.5,
                humidity: 60.0,
                windSpeed: 5.2
              }
            ]
          }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      const result = await weatherApiService.getHistoricalData('M-X-001', 60);

      expect(result).toHaveLength(2);
      expect(result[0].deviceId).toBe('M-X-001');
      expect(result[1].temperature).toBe(25.5);

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('GetHistoricalData'),
        variables: {
          deviceId: 'M-X-001',
          startTime: expect.any(String)
        }
      });
    });

    it('デフォルトで60分間のデータを取得する', async () => {
      const mockResponse = {
        data: {
          listByDeviceAndTime: { items: [] }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      await weatherApiService.getHistoricalData('M-X-001');

      const callArgs = mockClient.graphql.mock.calls[0][0];
      const startTime = new Date(callArgs.variables.startTime);
      const expectedTime = new Date(Date.now() - 60 * 60 * 1000);
      
      // 時間の差が1秒以内であることを確認
      expect(Math.abs(startTime.getTime() - expectedTime.getTime())).toBeLessThan(1000);
    });
  });

  describe('getStatistics', () => {
    it('統計データを正常に取得できる', async () => {
      const mockResponse = {
        data: {
          listByDeviceAndTime: {
            items: [{
              deviceId: 'M-X-001',
              period: 'HOUR',
              startTime: '2025-01-27T11:00:00.000Z',
              endTime: '2025-01-27T12:00:00.000Z',
              temperatureMax: 26.0,
              temperatureMin: 24.0,
              temperatureAvg: 25.0,
              windSpeedMax: 8.5,
              windSpeedMin: 3.2,
              windSpeedAvg: 5.8,
              samples: 60
            }]
          }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      const result = await weatherApiService.getStatistics('M-X-001', StatsPeriod.HOUR);

      expect(result).toEqual({
        deviceId: 'M-X-001',
        period: 'HOUR',
        startTime: '2025-01-27T11:00:00.000Z',
        endTime: '2025-01-27T12:00:00.000Z',
        temperature: {
          max: 26.0,
          min: 24.0,
          avg: 25.0
        },
        windSpeed: {
          max: 8.5,
          min: 3.2,
          avg: 5.8
        },
        samples: 60
      });
    });

    it('統計データが存在しない場合はnullを返す', async () => {
      const mockResponse = {
        data: {
          listByDeviceAndTime: {
            items: []
          }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      const result = await weatherApiService.getStatistics('M-X-001');

      expect(result).toBeNull();
    });
  });

  describe('subscribeToUpdates', () => {
    it('サブスクリプションを正常に開始できる', () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      const callback = jest.fn();
      const unsubscribe = weatherApiService.subscribeToUpdates('M-X-001', callback);

      expect(mockClient.graphql).toHaveBeenCalledWith({
        query: expect.stringContaining('OnSensorDataUpdate'),
        variables: { deviceId: 'M-X-001' }
      });

      expect(mockSubscription.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('サブスクリプションでデータを受信した時にコールバックが呼ばれる', () => {
      const mockUnsubscribe = jest.fn();
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: mockUnsubscribe
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      const callback = jest.fn();
      weatherApiService.subscribeToUpdates('M-X-001', callback);

      // subscribeの引数を取得
      const subscribeOptions = mockSubscription.subscribe.mock.calls[0][0];

      // データ受信をシミュレート（新しいスキーマに対応）
      const mockData = {
        data: {
          onCreateCentraSensorData: {
            deviceId: 'M-X-001',
            timestamp: '2025-01-27T12:00:00.000Z',
            temperature: 25.5
          }
        }
      };

      subscribeOptions.next(mockData);

      expect(callback).toHaveBeenCalledWith({
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        temperature: 25.5
      });
    });

    it('サブスクリプションエラー時に再接続を試行する', (done) => {
      const mockUnsubscribe = jest.fn();
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: mockUnsubscribe
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      const callback = jest.fn();
      weatherApiService.subscribeToUpdates('M-X-001', callback);

      const subscribeOptions = mockSubscription.subscribe.mock.calls[0][0];

      // エラーをシミュレート
      subscribeOptions.error(new Error('接続エラー'));

      // 接続状態が'reconnecting'になることを確認
      expect(weatherApiService.getConnectionStatus()).toBe('reconnecting');

      // 少し待って再接続が試行されることを確認
      setTimeout(() => {
        expect(mockClient.graphql).toHaveBeenCalledTimes(2); // 初回 + 再接続
        done();
      }, 1100); // retryDelay(1000ms)より少し長く待つ
    });
  });

  describe('認証エラーハンドリング', () => {
    it('トークンが期限切れの場合、自動的にリフレッシュする', async () => {
      // 新しいWeatherApiServiceインスタンスを作成してテスト
      const testService = new WeatherApiService();
      
      // 期限切れのトークンを設定
      mockFetchAuthSession.mockResolvedValueOnce({
        tokens: {
          idToken: {
            toString: () => 'expired-token',
            payload: {
              exp: Math.floor(Date.now() / 1000) - 3600 // 1時間前に期限切れ
            }
          }
        }
      } as any);

      // リフレッシュ後の新しいトークン
      mockFetchAuthSession.mockResolvedValueOnce({
        tokens: {
          idToken: {
            toString: () => 'refreshed-token',
            payload: {
              exp: Math.floor(Date.now() / 1000) + 3600
            }
          }
        }
      } as any);

      const mockResponse = {
        data: {
          listByDeviceTypeAndTime: { items: [] }
        }
      };

      mockClient.graphql.mockResolvedValue(mockResponse);

      await testService.getCurrentData('M-X-001');

      // fetchAuthSessionが2回呼ばれることを確認（期限切れ検出 + リフレッシュ）
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
      expect(mockFetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
    });

    it('認証トークンが取得できない場合はエラーをスローする', async () => {
      // 新しいサービスインスタンスを作成
      const testService = new WeatherApiService();
      
      mockFetchAuthSession.mockResolvedValue({
        tokens: null
      } as any);

      await expect(testService.getCurrentData('M-X-001'))
        .rejects.toThrow(WeatherApiError);
    });
  });

  describe('リトライ機能', () => {
    it('ネットワークエラー時にリトライする', async () => {
      // 新しいサービスインスタンスを作成
      const testService = new WeatherApiService();
      
      // 最初の2回はエラー、3回目は成功
      mockClient.graphql
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            listByDeviceTypeAndTime: { items: [] }
          }
        });

      const result = await testService.getCurrentData('M-X-001');

      expect(mockClient.graphql).toHaveBeenCalledTimes(3);
      expect(result).toBeNull();
    });

    it('最大リトライ回数を超えた場合はエラーをスローする', async () => {
      // 新しいサービスインスタンスを作成
      const testService = new WeatherApiService();
      
      mockClient.graphql.mockRejectedValue(new Error('Persistent error'));

      await expect(testService.getCurrentData('M-X-001'))
        .rejects.toThrow(WeatherApiError);

      // maxRetries(3) + 初回 = 4回呼ばれる
      expect(mockClient.graphql).toHaveBeenCalledTimes(4);
    });
  });

  describe('接続状態管理', () => {
    it('初期状態では接続状態がdisconnectedである', () => {
      expect(weatherApiService.getConnectionStatus()).toBe('disconnected');
    });

    it('サブスクリプション開始時に接続状態がconnectedになる', () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      weatherApiService.subscribeToUpdates('M-X-001', jest.fn());

      expect(weatherApiService.getConnectionStatus()).toBe('connected');
    });

    it('全サブスクリプション停止時に接続状態がdisconnectedになる', () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      weatherApiService.subscribeToUpdates('M-X-001', jest.fn());
      weatherApiService.unsubscribeAll();

      expect(weatherApiService.getConnectionStatus()).toBe('disconnected');
    });

    it('アクティブなサブスクリプション数を正しく取得できる', () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      expect(weatherApiService.getActiveSubscriptionCount()).toBe(0);

      weatherApiService.subscribeToUpdates('M-X-001', jest.fn());
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(1);

      weatherApiService.subscribeToUpdates('M-X-002', jest.fn());
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(2);

      weatherApiService.unsubscribeAll();
      expect(weatherApiService.getActiveSubscriptionCount()).toBe(0);
    });

    it('特定デバイスのサブスクリプション状態を取得できる', () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);

      expect(weatherApiService.getSubscriptionStatus('M-X-001')).toBe(false);

      weatherApiService.subscribeToUpdates('M-X-001', jest.fn());
      expect(weatherApiService.getSubscriptionStatus('M-X-001')).toBe(true);
      expect(weatherApiService.getSubscriptionStatus('M-X-002')).toBe(false);
    });
  });

  describe('健全性チェック', () => {
    it('正常状態でhealthyを返す', async () => {
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);
      weatherApiService.subscribeToUpdates('M-X-001', jest.fn());

      const health = await weatherApiService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.connectionStatus).toBe('connected');
      expect(health.details.activeSubscriptions).toBe(1);
      expect(health.details.reconnectAttempts).toBe(0);
    });

    it('再接続中はdegradedを返す', async () => {
      // 新しいサービスインスタンスを作成
      const testService = new WeatherApiService();
      
      const mockSubscription = {
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      };

      mockClient.graphql.mockReturnValue(mockSubscription);
      testService.subscribeToUpdates('M-X-001', jest.fn());

      // エラーをシミュレートして再接続状態にする
      const subscribeOptions = mockSubscription.subscribe.mock.calls[0][0];
      subscribeOptions.error(new Error('接続エラー'));

      const health = await testService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.details.connectionStatus).toBe('reconnecting');
    });
  });
});