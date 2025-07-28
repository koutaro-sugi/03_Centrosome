/**
 * 気象データ型定義のテスト
 * 型定義が正しくインポートでき、期待通りに動作することを確認
 */

import {
  SensorData,
  SensorStats,
  StatsValues,
  StatsPeriod,
  WeatherDataType,
  DynamoDBWeatherRecord,
  ConnectionStatus,
  WeatherDataHookResult,
  WeatherApiConfig
} from '../weather';

describe('Weather Types', () => {
  describe('SensorData', () => {
    it('should create valid SensorData object', () => {
      const sensorData: SensorData = {
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        temperature: 25.5,
        humidity: 60,
        pressure: 1013.25,
        windSpeed: 5.2,
        windDirection: 180,
        rainfall: 0,
        illuminance: 50000,
        visibility: 10,
        feelsLike: 26.8
      };

      expect(sensorData.deviceId).toBe('M-X-001');
      expect(sensorData.temperature).toBe(25.5);
      expect(typeof sensorData.timestamp).toBe('string');
    });

    it('should allow optional fields to be undefined', () => {
      const minimalSensorData: SensorData = {
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z'
      };

      expect(minimalSensorData.temperature).toBeUndefined();
      expect(minimalSensorData.humidity).toBeUndefined();
    });
  });

  describe('SensorStats', () => {
    it('should create valid SensorStats object', () => {
      const statsValues: StatsValues = {
        max: 30,
        min: 20,
        avg: 25
      };

      const sensorStats: SensorStats = {
        deviceId: 'M-X-001',
        period: 'HOUR',
        startTime: '2025-01-27T11:00:00.000Z',
        endTime: '2025-01-27T12:00:00.000Z',
        temperature: statsValues,
        samples: 60
      };

      expect(sensorStats.deviceId).toBe('M-X-001');
      expect(sensorStats.temperature?.max).toBe(30);
      expect(sensorStats.samples).toBe(60);
    });
  });

  describe('Enums', () => {
    it('should have correct StatsPeriod values', () => {
      expect(StatsPeriod.HOUR).toBe('HOUR');
      expect(StatsPeriod.DAY).toBe('DAY');
    });

    it('should have correct WeatherDataType values', () => {
      expect(WeatherDataType.TEMPERATURE).toBe('temperature');
      expect(WeatherDataType.HUMIDITY).toBe('humidity');
      expect(WeatherDataType.WIND_SPEED).toBe('windSpeed');
      expect(WeatherDataType.PRESSURE).toBe('pressure');
    });
  });

  describe('DynamoDBWeatherRecord', () => {
    it('should create valid RAW type record', () => {
      const rawRecord: DynamoDBWeatherRecord = {
        PK: 'DEVICE#M-X-001',
        SK: '2025-01-27T12:00:00.000Z#RAW',
        type: 'RAW',
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        ttl: 1706356800, // 1時間後のTTL（3600秒）
        temperature: 25.5,
        humidity: 60,
        pressure: 1013.25,
        windSpeed: 5.2,
        windDirection: 180,
        rainfall: 0,
        illuminance: 50000,
        visibility: 10,
        feelsLike: 26.8
      };

      expect(rawRecord.type).toBe('RAW');
      expect(rawRecord.PK).toBe('DEVICE#M-X-001');
      expect(rawRecord.SK).toBe('2025-01-27T12:00:00.000Z#RAW');
      expect(rawRecord.temperature).toBe(25.5);
    });

    it('should create valid STATS_10MIN type record', () => {
      const statsRecord: DynamoDBWeatherRecord = {
        PK: 'DEVICE#M-X-001',
        SK: '2025-01-27T12:00:00.000Z#STATS_10MIN',
        type: 'STATS_10MIN',
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        ttl: 1706443200, // 24時間後のTTL（86400秒）
        // 統計データフィールド
        temperatureMax: 30,
        temperatureMin: 20,
        temperatureAvg: 25,
        humidityMax: 80,
        humidityMin: 40,
        humidityAvg: 60,
        windSpeedMax: 10.5,
        windSpeedMin: 2.1,
        windSpeedAvg: 5.2,
        samples: 60,
        period: 'HOUR',
        startTime: '2025-01-27T11:00:00.000Z',
        endTime: '2025-01-27T12:00:00.000Z'
      };

      expect(statsRecord.type).toBe('STATS_10MIN');
      expect(statsRecord.temperatureMax).toBe(30);
      expect(statsRecord.temperatureMin).toBe(20);
      expect(statsRecord.temperatureAvg).toBe(25);
      expect(statsRecord.samples).toBe(60);
      expect(statsRecord.period).toBe('HOUR');
    });

    it('should allow minimal RAW record', () => {
      const minimalRawRecord: DynamoDBWeatherRecord = {
        PK: 'DEVICE#M-X-001',
        SK: '2025-01-27T12:00:00.000Z#RAW',
        type: 'RAW',
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        ttl: 1706356800
      };

      expect(minimalRawRecord.type).toBe('RAW');
      expect(minimalRawRecord.temperature).toBeUndefined();
    });

    it('should allow minimal STATS record', () => {
      const minimalStatsRecord: DynamoDBWeatherRecord = {
        PK: 'DEVICE#M-X-001',
        SK: '2025-01-27T12:00:00.000Z#STATS_10MIN',
        type: 'STATS_10MIN',
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        ttl: 1706443200
      };

      expect(minimalStatsRecord.type).toBe('STATS_10MIN');
      expect(minimalStatsRecord.temperatureMax).toBeUndefined();
    });
  });

  describe('ConnectionStatus', () => {
    it('should accept valid connection status values', () => {
      const connected: ConnectionStatus = 'connected';
      const disconnected: ConnectionStatus = 'disconnected';
      const reconnecting: ConnectionStatus = 'reconnecting';

      expect(connected).toBe('connected');
      expect(disconnected).toBe('disconnected');
      expect(reconnecting).toBe('reconnecting');
    });
  });

  describe('WeatherDataHookResult', () => {
    it('should create valid hook result object', () => {
      const hookResult: WeatherDataHookResult = {
        data: null,
        loading: true,
        error: null,
        connectionStatus: 'connecting' as ConnectionStatus,
        retry: jest.fn()
      };

      expect(hookResult.loading).toBe(true);
      expect(hookResult.data).toBeNull();
      expect(typeof hookResult.retry).toBe('function');
    });
  });

  describe('WeatherApiConfig', () => {
    it('should create valid API config object', () => {
      const apiConfig: WeatherApiConfig = {
        graphqlEndpoint: 'https://example.appsync-api.ap-northeast-1.amazonaws.com/graphql',
        authConfig: {
          type: 'AMAZON_COGNITO_USER_POOLS',
          jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        region: 'ap-northeast-1'
      };

      expect(apiConfig.region).toBe('ap-northeast-1');
      expect(apiConfig.authConfig.type).toBe('AMAZON_COGNITO_USER_POOLS');
    });
  });

  describe('DynamoDB Utilities', () => {
    // DynamoDBユーティリティ関数のテストは別ファイルで実装予定
    // 01_app/src/utils/__test__/dynamodbUtils.test.ts
    it('should be tested in separate utility test file', () => {
      expect(true).toBe(true);
    });
  });
});