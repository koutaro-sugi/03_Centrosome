import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb, TABLE_NAME, EntityType } from './dynamodb';
import { FlightLog, CreateFlightLogInput, UpdateFlightLogInput, FlightSquawk } from '../types/flightLog';
import { v4 as uuidv4 } from 'uuid';

// キー生成ヘルパー
export const flightLogKeys = {
  flightLog: (userId: string, date: string, logId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: `${EntityType.FLIGHTLOG}#${date}#${logId}`,
  }),
};

// Flight Log API
export const flightLogAPI = {
  // 飛行記録を作成
  async create(userId: string, input: CreateFlightLogInput): Promise<FlightLog> {
    const now = new Date().toISOString();
    const logId = uuidv4();
    
    const flightLog: FlightLog = {
      ...flightLogKeys.flightLog(userId, input.flightDate, logId),
      entityType: 'FLIGHTLOG',
      logId,
      userId,
      ...input,
      squawks: [],
      createdAt: now,
      updatedAt: now,
      status: 'DRAFT',
    };
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: flightLog,
      ConditionExpression: 'attribute_not_exists(PK)',
    });
    
    await dynamodb.send(command);
    return flightLog;
  },

  // 飛行記録を取得
  async get(userId: string, date: string, logId: string): Promise<FlightLog | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: flightLogKeys.flightLog(userId, date, logId),
    });
    
    const result = await dynamodb.send(command);
    return result.Item as FlightLog | null;
  },

  // ユーザーの飛行記録一覧を取得
  async listByUser(userId: string, limit = 50): Promise<FlightLog[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `${EntityType.USER}#${userId}`,
        ':skPrefix': `${EntityType.FLIGHTLOG}#`,
      },
      ScanIndexForward: false, // 新しい順に取得
      Limit: limit,
    });
    
    const result = await dynamodb.send(command);
    return (result.Items || []) as FlightLog[];
  },

  // 特定日付の飛行記録を取得
  async listByDate(userId: string, date: string): Promise<FlightLog[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `${EntityType.USER}#${userId}`,
        ':skPrefix': `${EntityType.FLIGHTLOG}#${date}`,
      },
      ScanIndexForward: false,
    });
    
    const result = await dynamodb.send(command);
    return (result.Items || []) as FlightLog[];
  },

  // 飛行記録を更新
  async update(userId: string, input: UpdateFlightLogInput): Promise<FlightLog> {
    const { logId, ...updates } = input;
    
    // まず既存の記録を取得
    const existing = await this.findByLogId(userId, logId);
    if (!existing) {
      throw new Error('Flight log not found');
    }
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // 更新可能なフィールドを動的に構築
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
    
    // 更新日時を追加
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: flightLogKeys.flightLog(userId, existing.flightDate, logId),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const result = await dynamodb.send(command);
    return result.Attributes as FlightLog;
  },

  // 不具合事項を追加
  async addSquawk(userId: string, logId: string, squawk: Omit<FlightSquawk, 'id' | 'timestamp'>): Promise<FlightSquawk> {
    const existing = await this.findByLogId(userId, logId);
    if (!existing) {
      throw new Error('Flight log not found');
    }
    
    const newSquawk: FlightSquawk = {
      id: uuidv4(),
      ...squawk,
      timestamp: new Date().toISOString(),
    };
    
    const updatedSquawks = [...(existing.squawks || []), newSquawk];
    
    await this.update(userId, {
      logId,
      squawks: updatedSquawks,
    });
    
    return newSquawk;
  },

  // 飛行記録を削除
  async delete(userId: string, date: string, logId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: flightLogKeys.flightLog(userId, date, logId),
    });
    
    await dynamodb.send(command);
  },

  // logIdから飛行記録を検索（日付が不明な場合）
  async findByLogId(userId: string, logId: string): Promise<FlightLog | null> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'logId = :logId',
      ExpressionAttributeValues: {
        ':pk': `${EntityType.USER}#${userId}`,
        ':skPrefix': `${EntityType.FLIGHTLOG}#`,
        ':logId': logId,
      },
      Limit: 1,
    });
    
    const result = await dynamodb.send(command);
    return result.Items?.[0] as FlightLog | null;
  },
};