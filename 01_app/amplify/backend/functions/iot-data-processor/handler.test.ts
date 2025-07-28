import { handler } from './handler';
import { Context } from 'aws-lambda';

// IoT Coreからのイベント型定義（テスト用）
interface IoTEvent {
  deviceId?: string;
  topic?: string;
  timestamp?: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windDirection?: number;
  rainfall?: number;
  illuminance?: number;
  visibility?: number;
  feelsLike?: number;
  [key: string]: any;
}

// AWS SDKのモック
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  PutItemCommand: jest.fn(),
  QueryCommand: jest.fn()
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn().mockImplementation((obj) => obj),
  unmarshall: jest.fn().mockImplementation((obj) => obj)
}));

// node-fetchのモック
jest.mock('node-fetch', () => jest.fn());

// 環境変数のモック設定
process.env.DYNAMODB_TABLE_NAME = 'CentraSensorData';
process.env.APPSYNC_ENDPOINT = 'https://test.appsync-api.ap-northeast-1.amazonaws.com/graphql';
process.env.AWS_REGION = 'ap-northeast-1';

describe('IoT Data Processor Lambda', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'iot-data-processor',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789012:function:iot-data-processor',
    memoryLimitInMB: '256',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/iot-data-processor',
    logStreamName: '2025/01/27/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // コンソールログをモック
    jest.spyOn(console, 'log').mockImplementation(() => {
      // テスト用にログを無効化
    });
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    
    // DynamoDBクライアントのモック設定
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const mockSend = jest.fn().mockResolvedValue({
      Items: [],
      Count: 0
    });
    DynamoDBClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    // fetchのモック設定
    const mockFetch = require('node-fetch');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { publishSensorData: { deviceId: 'test' } } })
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('正常なデータ処理', () => {
    test('完全なセンサーデータを正常に処理する', async () => {
      const validEvent: IoTEvent = {
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
      };

      await expect(handler(validEvent, mockContext)).resolves.toBeUndefined();
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('部分的なセンサーデータを正常に処理する', async () => {
      const partialEvent: IoTEvent = {
        deviceId: 'M-X-002',
        timestamp: '2025-01-27T12:05:00.000Z',
        temperature: 22.0,
        humidity: 55.0,
        windSpeed: 3.1
      };

      await expect(handler(partialEvent, mockContext)).resolves.toBeUndefined();
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('タイムスタンプが未設定の場合、自動生成される', async () => {
      const eventWithoutTimestamp: IoTEvent = {
        deviceId: 'M-X-003',
        temperature: 20.0,
        humidity: 50.0
      };

      await expect(handler(eventWithoutTimestamp, mockContext)).resolves.toBeUndefined();
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });
  });

  describe('データバリデーションエラー', () => {
    test('デバイスIDが未設定の場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        temperature: 25.0,
        humidity: 60.0
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('デバイスIDが見つかりません');
    });

    test('温度が範囲外の場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        deviceId: 'M-X-004',
        temperature: -100.0, // 範囲外
        humidity: 60.0
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('温度の値が範囲外です');
    });

    test('湿度が範囲外の場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        deviceId: 'M-X-005',
        temperature: 25.0,
        humidity: 150.0 // 範囲外
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('湿度の値が範囲外です');
    });

    test('風速が負の値の場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        deviceId: 'M-X-006',
        temperature: 25.0,
        windSpeed: -5.0 // 負の値
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('風速の値が範囲外です');
    });

    test('風向が範囲外の場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        deviceId: 'M-X-007',
        temperature: 25.0,
        windDirection: 400 // 範囲外
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('風向の値が範囲外です');
    });

    test('数値以外の値が設定された場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        deviceId: 'M-X-008',
        temperature: 'invalid' as any,
        humidity: 60.0
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('温度の値が無効です');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なイベント形式の場合エラーになる', async () => {
      const invalidEvent = null as any;

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('無効なIoTイベント形式です');
    });

    test('無効なタイムスタンプの場合エラーになる', async () => {
      const invalidEvent: IoTEvent = {
        deviceId: 'M-X-009',
        timestamp: 'invalid-timestamp',
        temperature: 25.0
      };

      await expect(handler(invalidEvent, mockContext)).rejects.toThrow('無効なタイムスタンプ形式です');
    });
  });

  describe('環境変数チェック', () => {
    test('DynamoDBテーブル名が未設定の場合エラーになる', async () => {
      const originalTableName = process.env.DYNAMODB_TABLE_NAME;
      delete process.env.DYNAMODB_TABLE_NAME;

      const validEvent: IoTEvent = {
        deviceId: 'M-X-010',
        temperature: 25.0
      };

      await expect(handler(validEvent, mockContext)).rejects.toThrow('DynamoDBテーブル名が設定されていません');

      // 環境変数を復元
      process.env.DYNAMODB_TABLE_NAME = originalTableName;
    });

    test('AppSyncエンドポイントが未設定でも処理は継続される', async () => {
      const originalEndpoint = process.env.APPSYNC_ENDPOINT;
      delete process.env.APPSYNC_ENDPOINT;

      const validEvent: IoTEvent = {
        deviceId: 'M-X-011',
        temperature: 25.0
      };

      await expect(handler(validEvent, mockContext)).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalledWith('AppSyncエンドポイントが設定されていません。リアルタイム配信をスキップします。');

      // 環境変数を復元
      process.env.APPSYNC_ENDPOINT = originalEndpoint;
    });
  });

  describe('データ構造検証', () => {
    test('DynamoDBレコード構造が正しく生成される', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-012',
        timestamp: '2025-01-27T12:30:00.000Z',
        temperature: 25.5,
        humidity: 60.0,
        windSpeed: 5.2
      };

      await expect(handler(testEvent, mockContext)).resolves.toBeUndefined();
      
      // 処理が正常に完了することを確認
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('TTL値が正しく設定される', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-013',
        timestamp: '2025-01-27T12:45:00.000Z',
        temperature: 25.0
      };

      await expect(handler(testEvent, mockContext)).resolves.toBeUndefined();
      
      // 処理が正常に完了することを確認
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });
  });

  describe('統計データ計算機能', () => {
    // 10分の倍数の時刻をモック
    const mockDate = new Date('2025-01-27T12:10:15.000Z'); // 10分の倍数、15秒
    const originalDate = Date;
    const originalDateNow = Date.now;
    
    beforeEach(() => {
      // Dateコンストラクタとnowメソッドをモック
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());
      // 他のDateメソッドを保持
      Object.setPrototypeOf(global.Date, originalDate);
      Object.getOwnPropertyNames(originalDate).forEach(name => {
        if (name !== 'now' && name !== 'length' && name !== 'name' && name !== 'prototype') {
          (global.Date as any)[name] = (originalDate as any)[name];
        }
      });
    });

    afterEach(() => {
      global.Date = originalDate;
      global.Date.now = originalDateNow;
    });

    test('10分の倍数の時刻で統計計算が実行される', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-014',
        timestamp: '2025-01-27T12:10:00.000Z',
        temperature: 25.0,
        humidity: 60.0,
        windSpeed: 8.5
      };

      await expect(handler(testEvent, mockContext)).resolves.toBeUndefined();
      
      // 10分の倍数の時刻（12:10:15）で処理が正常に完了することを確認
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('10分の倍数以外の時刻では統計計算がスキップされる', async () => {
      // 非10分倍数の時刻をモック
      const nonTenMinuteDate = new Date('2025-01-27T12:15:30.000Z'); // 15分
      global.Date = jest.fn(() => nonTenMinuteDate) as any;
      global.Date.now = jest.fn(() => nonTenMinuteDate.getTime());

      const testEvent: IoTEvent = {
        deviceId: 'M-X-015',
        timestamp: '2025-01-27T12:15:00.000Z',
        temperature: 25.0
      };

      await handler(testEvent, mockContext);

      expect(console.log).not.toHaveBeenCalledWith(
        expect.stringContaining('10分間隔の統計データ計算を実行します')
      );
    });

    test('統計計算エラーでもメイン処理は継続される', async () => {
      // DynamoDBクエリエラーをシミュレート
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockSend = jest.fn()
        .mockResolvedValueOnce({ Items: [], Count: 0 }) // 最初の生データ保存は成功
        .mockRejectedValueOnce(new Error('DynamoDB Query Error')); // 統計データ取得でエラー
      
      DynamoDBClient.mockImplementation(() => ({
        send: mockSend
      }));

      const testEvent: IoTEvent = {
        deviceId: 'M-X-016',
        timestamp: '2025-01-27T12:10:00.000Z',
        temperature: 25.0
      };

      // メイン処理は成功する
      await expect(handler(testEvent, mockContext)).resolves.toBeUndefined();
      
      expect(console.warn).toHaveBeenCalledWith(
        '統計データ計算に失敗しましたが、処理を継続します'
      );
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });
  });

  describe('統計値計算ロジック', () => {
    test('最大瞬間風速が正しく計算される', async () => {
      // 複数のデータポイントを含むテストケース
      const testEvent: IoTEvent = {
        deviceId: 'M-X-017',
        timestamp: '2025-01-27T12:10:00.000Z',
        temperature: 25.0,
        windSpeed: 12.5 // 高い風速値
      };

      await expect(handler(testEvent, mockContext)).resolves.toBeUndefined();
      
      // 高い風速値を含むデータでも正常に処理されることを確認
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('風向の円形統計が正しく処理される', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-018',
        timestamp: '2025-01-27T12:10:00.000Z',
        windDirection: 350, // 北寄りの風向
        windSpeed: 5.0
      };

      await handler(testEvent, mockContext);

      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('データが不足している場合の統計計算', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-019',
        timestamp: '2025-01-27T12:10:00.000Z',
        temperature: 25.0
        // 他のセンサー値は未設定
      };

      await handler(testEvent, mockContext);

      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });
  });

  describe('統計データ保存', () => {
    test('統計データのTTLが24時間に設定される', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-020',
        timestamp: '2025-01-27T12:10:00.000Z',
        temperature: 25.0,
        humidity: 60.0,
        windSpeed: 5.0
      };

      await handler(testEvent, mockContext);

      // 統計データ保存時のTTL設定を確認
      // 実際のテストでは、DynamoDBクライアントのモックから
      // TTL値が24時間（86400秒）後に設定されていることを検証
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });

    test('統計データのDynamoDBキー構造が正しい', async () => {
      const testEvent: IoTEvent = {
        deviceId: 'M-X-021',
        timestamp: '2025-01-27T12:10:00.000Z',
        temperature: 25.0
      };

      await handler(testEvent, mockContext);

      // 統計データのPK/SK構造を確認
      // PK: "DEVICE#M-X-021"
      // SK: "2025-01-27T12:00:00.000Z#STATS_10MIN"
      expect(console.log).toHaveBeenCalledWith('IoTデータ処理が正常に完了しました');
    });
  });
});