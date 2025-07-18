import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb, TABLE_NAME, EntityType } from './dynamodb';
import { Aircraft, CreateAircraftInput, UpdateAircraftInput } from '../types/aircraft';
import { v4 as uuidv4 } from 'uuid';

// キー生成ヘルパー
export const aircraftKeys = {
  aircraft: (userId: string, aircraftId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: `${EntityType.AIRCRAFT}#${aircraftId}`,
  }),
};

// Aircraft API
export const aircraftAPI = {
  // 機体を作成
  async create(userId: string, input: CreateAircraftInput): Promise<Aircraft> {
    const now = new Date().toISOString();
    const aircraftId = uuidv4();
    
    const aircraft: Aircraft = {
      ...aircraftKeys.aircraft(userId, aircraftId),
      entityType: 'AIRCRAFT',
      aircraftId,
      userId,
      ...input,
      totalFlightTime: 0,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: aircraft,
      ConditionExpression: 'attribute_not_exists(PK)',
    });
    
    await dynamodb.send(command);
    return aircraft;
  },

  // ユーザーの機体一覧を取得
  async listByUser(userId: string): Promise<Aircraft[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `${EntityType.USER}#${userId}`,
        ':skPrefix': `${EntityType.AIRCRAFT}#`,
      },
    });
    
    const result = await dynamodb.send(command);
    const aircrafts = (result.Items || []) as Aircraft[];
    
    // アクティブな機体を上位に、名前順でソート
    return aircrafts.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'ja');
    });
  },

  // 機体を更新
  async update(userId: string, input: UpdateAircraftInput): Promise<void> {
    const { aircraftId, ...updates } = input;
    
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });
    
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: aircraftKeys.aircraft(userId, aircraftId),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    
    await dynamodb.send(command);
  },

  // 飛行時間を追加
  async addFlightTime(userId: string, aircraftId: string, minutes: number): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: aircraftKeys.aircraft(userId, aircraftId),
      UpdateExpression: 'SET totalFlightTime = totalFlightTime + :minutes, updatedAt = :now',
      ExpressionAttributeValues: {
        ':minutes': minutes,
        ':now': new Date().toISOString(),
      },
    });
    
    await dynamodb.send(command);
  },

  // 機体を削除（論理削除）
  async delete(userId: string, aircraftId: string): Promise<void> {
    await this.update(userId, { aircraftId, isActive: false });
  },

  // 機体を物理削除（開発用）
  async hardDelete(userId: string, aircraftId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: aircraftKeys.aircraft(userId, aircraftId),
    });
    
    await dynamodb.send(command);
  },
};