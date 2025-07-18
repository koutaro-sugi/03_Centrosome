import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb, TABLE_NAME, EntityType } from './dynamodb';
import { FlightLocation, CreateFlightLocationInput, UpdateFlightLocationInput } from '../types/flightLocation';
import { v4 as uuidv4 } from 'uuid';

// キー生成ヘルパー
export const flightLocationKeys = {
  location: (userId: string, locationId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: `${EntityType.LOCATION}#${locationId}`,
  }),
};

// Flight Location API
export const flightLocationAPI = {
  // 地点を作成
  async create(userId: string, input: CreateFlightLocationInput): Promise<FlightLocation> {
    const now = new Date().toISOString();
    const locationId = uuidv4();
    
    const location: FlightLocation = {
      ...flightLocationKeys.location(userId, locationId),
      entityType: 'LOCATION',
      locationId,
      userId,
      ...input,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    console.log('[flightLocationAPI.create] Creating location:', location);
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: location,
      ConditionExpression: 'attribute_not_exists(PK)',
    });
    
    await dynamodb.send(command);
    console.log('[flightLocationAPI.create] Location created successfully');
    return location;
  },

  // ユーザーの地点一覧を取得（使用頻度順）
  async listByUser(userId: string, limit = 100): Promise<FlightLocation[]> {
    console.log('[flightLocationAPI.listByUser] Fetching locations for user:', userId);
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `${EntityType.USER}#${userId}`,
        ':skPrefix': `${EntityType.LOCATION}#`,
      },
      Limit: limit,
    });
    
    const result = await dynamodb.send(command);
    const locations = (result.Items || []) as FlightLocation[];
    
    console.log('[flightLocationAPI.listByUser] Found locations:', locations.length);
    
    // 使用頻度でソート
    return locations.sort((a, b) => b.usageCount - a.usageCount);
  },

  // 地点を検索（名前または住所）
  async search(userId: string, query: string): Promise<FlightLocation[]> {
    const allLocations = await this.listByUser(userId);
    const lowerQuery = query.toLowerCase();
    
    return allLocations.filter(location => 
      location.name.toLowerCase().includes(lowerQuery) ||
      location.address.toLowerCase().includes(lowerQuery)
    );
  },

  // 地点の使用回数を増やす
  async incrementUsage(userId: string, locationId: string): Promise<void> {
    const now = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: flightLocationKeys.location(userId, locationId),
      UpdateExpression: 'SET usageCount = usageCount + :inc, lastUsedAt = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': now,
      },
    });
    
    await dynamodb.send(command);
  },

  // 地点を更新
  async update(userId: string, input: UpdateFlightLocationInput): Promise<void> {
    const { locationId, ...updates } = input;
    
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
      Key: flightLocationKeys.location(userId, locationId),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    
    await dynamodb.send(command);
  },

  // 地点を削除
  async delete(userId: string, locationId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: flightLocationKeys.location(userId, locationId),
    });
    
    await dynamodb.send(command);
  },

  // 座標から既存の地点を検索（近い地点を探す）
  async findNearbyLocation(userId: string, lat: number, lon: number, radiusKm = 0.01): Promise<FlightLocation | null> {
    const allLocations = await this.listByUser(userId);
    
    // Haversine formula で距離計算
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // 地球の半径 (km)
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    
    // 近い地点を探す
    for (const location of allLocations) {
      const distance = calculateDistance(lat, lon, location.coordinates.lat, location.coordinates.lon);
      if (distance <= radiusKm) {
        return location;
      }
    }
    
    return null;
  },
};