/**
 * DynamoDB統合テスト
 * DynamoDB Localを使用したデータベース操作のテスト
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SensorData, SensorStats, StatsPeriod } from '../../types/weather';
import { createSensorDataKey, createStatsDataKey, calculateTTL } from '../../utils/dynamodbUtils';

describe('DynamoDB Integration Tests', () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  const tableName = 'CentraSensorData';
  
  beforeAll(() => {
    // DynamoDB Localに接続
    dynamoClient = new DynamoDBClient({
      endpoint: 'http://localhost:8000',
      region: 'local',
      credentials: {
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy'
      }
    });
    
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  });

  afterAll(() => {
    dynamoClient.destroy();
  });

  describe('センサーデータの保存と取得', () => {
    const testDeviceId = 'TEST-001';
    const testTimestamp = new Date().toISOString();
    
    const testSensorData: SensorData = {
      deviceId: testDeviceId,
      timestamp: testTimestamp,
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

    it('センサーデータを保存できる', async () => {
      const { PK, SK } = createSensorDataKey(testDeviceId, testTimestamp);
      const ttl = calculateTTL(60); // 1時間のTTL
      
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          PK,
          SK,
          dataType: 'RAW',
          ttl,
          ...testSensorData
        }
      });
      
      await docClient.send(command);
      
      // データが保存されたことを確認
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: { PK, SK }
      });
      
      const response = await docClient.send(getCommand);
      expect(response.Item).toBeDefined();
      expect(response.Item?.temperature).toBe(25.5);
      expect(response.Item?.humidity).toBe(60.0);
    });

    it('デバイスIDで履歴データをクエリできる', async () => {
      // 複数のテストデータを作成
      const testData: SensorData[] = [];
      const baseTime = new Date();
      
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(baseTime.getTime() - i * 10 * 60 * 1000).toISOString();
        testData.push({
          ...testSensorData,
          timestamp,
          temperature: 24 + i * 0.5
        });
      }
      
      // バッチ書き込み
      const putRequests = testData.map(data => {
        const { PK, SK } = createSensorDataKey(data.deviceId, data.timestamp);
        return {
          PutRequest: {
            Item: {
              PK,
              SK,
              dataType: 'RAW',
              ttl: calculateTTL(60),
              ...data
            }
          }
        };
      });
      
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests
        }
      }));
      
      // GSIを使用してクエリ
      const queryCommand = new QueryCommand({
        TableName: tableName,
        IndexName: 'deviceId-timestamp-index',
        KeyConditionExpression: 'deviceId = :deviceId AND #ts BETWEEN :start AND :end',
        ExpressionAttributeNames: {
          '#ts': 'timestamp'
        },
        ExpressionAttributeValues: {
          ':deviceId': testDeviceId,
          ':start': new Date(baseTime.getTime() - 60 * 60 * 1000).toISOString(),
          ':end': new Date().toISOString()
        },
        ScanIndexForward: false // 新しい順に取得
      });
      
      const response = await docClient.send(queryCommand);
      expect(response.Items).toBeDefined();
      expect(response.Items?.length).toBeGreaterThan(0);
      expect(response.Items?.[0].deviceId).toBe(testDeviceId);
    });
  });

  describe('統計データの保存と取得', () => {
    const testDeviceId = 'TEST-002';
    const testPeriod = StatsPeriod.HOUR;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
    
    const testStatsData: SensorStats = {
      deviceId: testDeviceId,
      period: testPeriod,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      temperature: {
        max: 26.0,
        min: 24.0,
        avg: 25.0
      },
      humidity: {
        max: 65.0,
        min: 55.0,
        avg: 60.0
      },
      pressure: {
        max: 1014.0,
        min: 1012.5,
        avg: 1013.25
      },
      windSpeed: {
        max: 8.5,
        min: 3.2,
        avg: 5.8
      },
      rainfall: {
        max: 2.0,
        min: 0.0,
        avg: 0.5
      },
      illuminance: {
        max: 60000,
        min: 40000,
        avg: 50000
      },
      visibility: {
        max: 10.0,
        min: 8.0,
        avg: 9.5
      },
      samples: 60
    };

    it('統計データを保存できる', async () => {
      const { PK, SK } = createStatsDataKey(testDeviceId, testPeriod, endTime.toISOString());
      const ttl = calculateTTL(1440); // 24時間のTTL
      
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          PK,
          SK,
          dataType: 'STATS',
          timestamp: endTime.toISOString(),
          ttl,
          ...testStatsData
        }
      });
      
      await docClient.send(command);
      
      // データが保存されたことを確認
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: { PK, SK }
      });
      
      const response = await docClient.send(getCommand);
      expect(response.Item).toBeDefined();
      expect(response.Item?.period).toBe(testPeriod);
      expect(response.Item?.temperature.max).toBe(26.0);
      expect(response.Item?.samples).toBe(60);
    });

    it('デバイスとデータタイプで統計データをクエリできる', async () => {
      // 異なる期間の統計データを作成
      const periods = [StatsPeriod.TEN_MINUTES, StatsPeriod.HOUR, StatsPeriod.DAY];
      
      const putRequests = periods.map(period => {
        const { PK, SK } = createStatsDataKey(testDeviceId, period, endTime.toISOString());
        return {
          PutRequest: {
            Item: {
              PK,
              SK,
              dataType: 'STATS',
              timestamp: endTime.toISOString(),
              ttl: calculateTTL(1440),
              ...testStatsData,
              period
            }
          }
        };
      });
      
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: putRequests
        }
      }));
      
      // データタイプでクエリ
      const queryCommand = new QueryCommand({
        TableName: tableName,
        IndexName: 'deviceId-dataType-index',
        KeyConditionExpression: 'deviceId = :deviceId AND dataType = :dataType',
        ExpressionAttributeValues: {
          ':deviceId': testDeviceId,
          ':dataType': 'STATS'
        }
      });
      
      const response = await docClient.send(queryCommand);
      expect(response.Items).toBeDefined();
      expect(response.Items?.length).toBeGreaterThanOrEqual(periods.length);
      response.Items?.forEach(item => {
        expect(item.dataType).toBe('STATS');
        expect(periods).toContain(item.period);
      });
    });
  });

  describe('TTL機能', () => {
    it('TTLが正しく設定される', async () => {
      const testDeviceId = 'TEST-003';
      const timestamp = new Date().toISOString();
      const { PK, SK } = createSensorDataKey(testDeviceId, timestamp);
      
      // 1時間のTTL
      const ttl = calculateTTL(60);
      const expectedTTL = Math.floor(Date.now() / 1000) + 60 * 60;
      
      const command = new PutCommand({
        TableName: tableName,
        Item: {
          PK,
          SK,
          deviceId: testDeviceId,
          timestamp,
          dataType: 'RAW',
          ttl,
          temperature: 25.0
        }
      });
      
      await docClient.send(command);
      
      const getCommand = new GetCommand({
        TableName: tableName,
        Key: { PK, SK }
      });
      
      const response = await docClient.send(getCommand);
      expect(response.Item?.ttl).toBeDefined();
      expect(Math.abs(response.Item?.ttl - expectedTTL)).toBeLessThan(5); // 5秒の誤差を許容
    });
  });

  describe('エラーケース', () => {
    it('存在しないアイテムの取得はundefinedを返す', async () => {
      const { PK, SK } = createSensorDataKey('NON-EXISTENT', '2025-01-01T00:00:00.000Z');
      
      const command = new GetCommand({
        TableName: tableName,
        Key: { PK, SK }
      });
      
      const response = await docClient.send(command);
      expect(response.Item).toBeUndefined();
    });

    it('不正なクエリはエラーを返す', async () => {
      const queryCommand = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'invalidKey = :value',
        ExpressionAttributeValues: {
          ':value': 'test'
        }
      });
      
      await expect(docClient.send(queryCommand)).rejects.toThrow();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データの書き込みが適切な時間内に完了する', async () => {
      const testDeviceId = 'PERF-TEST';
      const itemCount = 100;
      const startTime = Date.now();
      
      // 100件のデータを作成
      const putRequests = [];
      for (let i = 0; i < itemCount; i++) {
        const timestamp = new Date(Date.now() - i * 60 * 1000).toISOString();
        const { PK, SK } = createSensorDataKey(testDeviceId, timestamp);
        
        putRequests.push({
          PutRequest: {
            Item: {
              PK,
              SK,
              deviceId: testDeviceId,
              timestamp,
              dataType: 'RAW',
              ttl: calculateTTL(60),
              temperature: 20 + Math.random() * 10,
              humidity: 50 + Math.random() * 30
            }
          }
        });
        
        // DynamoDBのバッチ制限（25件）に対応
        if (putRequests.length === 25 || i === itemCount - 1) {
          await docClient.send(new BatchWriteCommand({
            RequestItems: {
              [tableName]: putRequests.splice(0, putRequests.length)
            }
          }));
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 100件の書き込みが5秒以内に完了することを確認
      expect(duration).toBeLessThan(5000);
      
      // データ数を確認
      const queryCommand = new QueryCommand({
        TableName: tableName,
        IndexName: 'deviceId-timestamp-index',
        KeyConditionExpression: 'deviceId = :deviceId',
        ExpressionAttributeValues: {
          ':deviceId': testDeviceId
        }
      });
      
      const response = await docClient.send(queryCommand);
      expect(response.Items?.length).toBe(itemCount);
    }, 10000);
  });
});