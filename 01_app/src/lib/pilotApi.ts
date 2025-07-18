import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb, TABLE_NAME, EntityType } from './dynamodb';
import { Pilot, CreatePilotInput, UpdatePilotInput } from '../types/pilot';
import { v4 as uuidv4 } from 'uuid';

// キー生成ヘルパー
export const pilotKeys = {
  pilot: (userId: string, pilotId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: `${EntityType.PILOT}#${pilotId}`,
  }),
};

// Pilot API
export const pilotAPI = {
  // パイロットを作成
  async create(userId: string, input: CreatePilotInput): Promise<Pilot> {
    const now = new Date().toISOString();
    const pilotId = uuidv4();
    
    const pilot: Pilot = {
      ...pilotKeys.pilot(userId, pilotId),
      entityType: 'PILOT',
      pilotId,
      userId,
      ...input,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: pilot,
      ConditionExpression: 'attribute_not_exists(PK)',
    });
    
    await dynamodb.send(command);
    return pilot;
  },

  // ユーザーのパイロット一覧を取得
  async listByUser(userId: string): Promise<Pilot[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `${EntityType.USER}#${userId}`,
        ':skPrefix': `${EntityType.PILOT}#`,
      },
    });
    
    const result = await dynamodb.send(command);
    const pilots = (result.Items || []) as Pilot[];
    
    // アクティブなパイロットを上位に、名前順でソート
    return pilots.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'ja');
    });
  },

  // パイロットを更新
  async update(userId: string, input: UpdatePilotInput): Promise<void> {
    const { pilotId, ...updates } = input;
    
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
      Key: pilotKeys.pilot(userId, pilotId),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    
    await dynamodb.send(command);
  },

  // パイロットを削除（論理削除）
  async delete(userId: string, pilotId: string): Promise<void> {
    await this.update(userId, { pilotId, isActive: false });
  },

  // パイロットを物理削除（開発用）
  async hardDelete(userId: string, pilotId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: pilotKeys.pilot(userId, pilotId),
    });
    
    await dynamodb.send(command);
  },
};