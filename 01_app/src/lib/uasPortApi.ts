import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb, TABLE_NAME } from './dynamodb';
import { UASPort, CreateUASPortInput, UpdateUASPortInput } from '../types/uasport';

// UASポートAPI
export const uasPortAPI = {
  // UASポートを作成
  async create(input: CreateUASPortInput): Promise<UASPort> {
    const now = new Date().toISOString();
    
    const item = {
      PK: `UASPORT#${input.uaport_code}`,
      SK: `METADATA#${input.uaport_code}`,
      GSI1PK: 'UASPORT',
      GSI1SK: input.uaport_code,
      entityType: 'UASPORT',
      uaport_code: input.uaport_code,
      common_name: input.common_name,
      full_address: input.full_address,
      location: input.location,
      polygon: input.polygon,
      status: input.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    });
    
    try {
      await dynamodb.send(command);
      return item as UASPort;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error(`UAS Port with code ${input.uaport_code} already exists`);
      }
      throw error;
    }
  },

  // UASポートを取得
  async get(uaport_code: string): Promise<UASPort | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `UASPORT#${uaport_code}`,
        SK: `METADATA#${uaport_code}`,
      },
    });
    
    const result = await dynamodb.send(command);
    return result.Item as UASPort | null;
  },

  // 全UASポートを取得
  async listAll(): Promise<UASPort[]> {
    try {
      // GSI1を使用してクエリを試みる
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'UASPORT',
        },
      });
      
      const result = await dynamodb.send(command);
      return (result.Items || []) as UASPort[];
    } catch (error: any) {
      // GSI1が存在しない場合はScanを使用
      if (error.name === 'ValidationException' && error.message?.includes('GSI1')) {
        console.log('GSI1 not found, falling back to Scan');
        const scanCommand = new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'entityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': 'UASPORT',
          },
        });
        
        const result = await dynamodb.send(scanCommand);
        return (result.Items || []) as UASPort[];
      }
      throw error;
    }
  },

  // UASポートを更新
  async update(input: UpdateUASPortInput): Promise<UASPort> {
    const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames: any = {
      '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues: any = {
      ':updatedAt': new Date().toISOString(),
    };

    if (input.common_name !== undefined) {
      updateExpressions.push('#common_name = :common_name');
      expressionAttributeNames['#common_name'] = 'common_name';
      expressionAttributeValues[':common_name'] = input.common_name;
    }

    if (input.full_address !== undefined) {
      updateExpressions.push('#full_address = :full_address');
      expressionAttributeNames['#full_address'] = 'full_address';
      expressionAttributeValues[':full_address'] = input.full_address;
    }

    if (input.location !== undefined) {
      updateExpressions.push('#location = :location');
      expressionAttributeNames['#location'] = 'location';
      expressionAttributeValues[':location'] = input.location;
    }

    if (input.polygon !== undefined) {
      updateExpressions.push('#polygon = :polygon');
      expressionAttributeNames['#polygon'] = 'polygon';
      expressionAttributeValues[':polygon'] = input.polygon;
    }

    if (input.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = input.status;
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `UASPORT#${input.uaport_code}`,
        SK: `METADATA#${input.uaport_code}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const result = await dynamodb.send(command);
    return result.Attributes as UASPort;
  },

  // UASポートを削除
  async delete(uaport_code: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `UASPORT#${uaport_code}`,
        SK: `METADATA#${uaport_code}`,
      },
    });
    
    await dynamodb.send(command);
  },
};