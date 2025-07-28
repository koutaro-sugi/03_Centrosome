/**
 * Weather Dashboard用のカスタムリゾルバー定義
 * AppSync GraphQLのカスタムクエリとサブスクリプション用
 * Amplify Gen2対応のJavaScriptリゾルバー
 */

import { util } from '@aws-appsync/utils';
import { DynamoDBQueryRequest, DynamoDBQueryResponse } from '@aws-appsync/utils/lib/dynamodb';

/**
 * getCurrentSensorData クエリ用リゾルバー
 * 指定されたデバイスの最新センサーデータを取得
 */
export function getCurrentSensorDataRequest(ctx: any): DynamoDBQueryRequest {
  const { deviceId } = ctx.arguments;
  const pk = `DEVICE#${deviceId}`;
  
  // 現在時刻から1時間前までの範囲で検索
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND SK BETWEEN :start AND :end',
      expressionValues: {
        ':pk': util.dynamodb.toDynamoDB(pk),
        ':start': util.dynamodb.toDynamoDB(`${oneHourAgo}#RAW`),
        ':end': util.dynamodb.toDynamoDB(`${now}#RAW`),
      },
    },
    scanIndexForward: false,
    limit: 1,
    filter: {
      expression: '#dataType = :dataType',
      expressionNames: {
        '#dataType': 'dataType',
      },
      expressionValues: {
        ':dataType': util.dynamodb.toDynamoDB('RAW'),
      },
    },
  };
}

export function getCurrentSensorDataResponse(ctx: any) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  
  const items = ctx.result.items;
  if (items.length === 0) {
    return null;
  }
  
  return items[0];
}

/**
 * getRecentSensorData クエリ用リゾルバー
 * 指定された期間の履歴データを取得
 */
export function getRecentSensorDataRequest(ctx: any): DynamoDBQueryRequest {
  const { deviceId, minutes = 60 } = ctx.arguments;
  const pk = `DEVICE#${deviceId}`;
  
  const now = new Date();
  const startTime = new Date(now.getTime() - minutes * 60 * 1000);
  
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND SK BETWEEN :start AND :end',
      expressionValues: {
        ':pk': util.dynamodb.toDynamoDB(pk),
        ':start': util.dynamodb.toDynamoDB(`${startTime.toISOString()}#RAW`),
        ':end': util.dynamodb.toDynamoDB(`${now.toISOString()}#RAW`),
      },
    },
    scanIndexForward: true,
    filter: {
      expression: '#dataType = :dataType',
      expressionNames: {
        '#dataType': 'dataType',
      },
      expressionValues: {
        ':dataType': util.dynamodb.toDynamoDB('RAW'),
      },
    },
  };
}

export function getRecentSensorDataResponse(ctx: any) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  
  return ctx.result.items || [];
}

/**
 * getSensorStats クエリ用リゾルバー
 * 指定された期間の統計データを取得
 */
export function getSensorStatsRequest(ctx: any): DynamoDBQueryRequest {
  const { deviceId, period = 'HOUR' } = ctx.arguments;
  const pk = `DEVICE#${deviceId}`;
  
  const now = new Date();
  let startTime: Date;
  
  if (period === 'HOUR') {
    startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1時間前
  } else {
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24時間前
  }
  
  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND SK BETWEEN :start AND :end',
      expressionValues: {
        ':pk': util.dynamodb.toDynamoDB(pk),
        ':start': util.dynamodb.toDynamoDB(`${startTime.toISOString()}#STATS_10MIN`),
        ':end': util.dynamodb.toDynamoDB(`${now.toISOString()}#STATS_10MIN`),
      },
    },
    scanIndexForward: false,
    limit: 1,
    filter: {
      expression: '#dataType = :dataType',
      expressionNames: {
        '#dataType': 'dataType',
      },
      expressionValues: {
        ':dataType': util.dynamodb.toDynamoDB('STATS_10MIN'),
      },
    },
  };
}

export function getSensorStatsResponse(ctx: any) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  
  const items = ctx.result.items || [];
  if (items.length === 0) {
    return null;
  }
  
  // 最新の統計データを返す
  return items[0];
}

/**
 * onSensorDataUpdate サブスクリプション用リゾルバー
 * リアルタイムデータ更新の通知
 */
export function onSensorDataUpdateRequest(ctx: any) {
  return {
    payload: ctx.arguments,
  };
}

export function onSensorDataUpdateResponse(ctx: any) {
  return ctx.result;
}