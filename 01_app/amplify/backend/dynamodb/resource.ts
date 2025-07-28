import { Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

/**
 * CentraSensorDataテーブルのTTL設定とインデックス設定
 * 設計書に基づくDynamoDBテーブル設定
 * 要件7.2, 6.5に対応
 */
export function configureSensorDataTable(stack: Stack, table: dynamodb.Table) {
  // TTL設定
  // RAW: 1時間（3600秒）、STATS_10MIN: 24時間（86400秒）
  table.addTimeToLiveAttribute({
    attributeName: 'ttl',
  });

  // 追加のテーブル設定
  // Point-in-time recovery（ポイントインタイム復旧）を有効化
  table.addPropertyOverride('PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled', true);

  // 削除保護を有効化（本番環境用）
  table.addPropertyOverride('DeletionProtectionEnabled', false); // 開発環境では無効

  // 請求モードをオンデマンドに設定（コスト最適化）
  table.addPropertyOverride('BillingMode', 'PAY_PER_REQUEST');

  return table;
}

/**
 * カスタムDynamoDBテーブル設定
 * Amplifyの自動生成テーブルに追加の設定を適用
 * 設計書の要件7.2, 6.5に基づく設定
 */
export function createSensorDataTableConfiguration(stack: Stack) {
  // テーブル設定のメタデータ
  const tableConfig = {
    tableName: 'CentraSensorData',
    description: 'Weather Dashboard sensor data storage with TTL and GSI',
    partitionKey: {
      name: 'PK',
      type: 'String',
      format: 'DEVICE#{deviceId}',
      example: 'DEVICE#M-X'
    },
    sortKey: {
      name: 'SK',
      type: 'String',
      format: '{timestamp}#{type}',
      example: '2025-01-27T12:00:00.000Z#RAW'
    },
    ttlAttribute: {
      name: 'ttl',
      type: 'Number',
      description: 'UNIX timestamp for automatic deletion',
      values: {
        RAW: '3600 seconds (1 hour)',
        STATS_10MIN: '86400 seconds (24 hours)'
      }
    },
    gsi: [
      {
        indexName: 'GSI1-deviceId-timestamp',
        partitionKey: 'deviceId',
        sortKey: 'timestamp',
        description: 'Query by device and time range for historical data'
      },
      {
        indexName: 'GSI2-deviceId-type',
        partitionKey: 'deviceId',
        sortKey: 'type',
        description: 'Query by device and data type (RAW/STATS_10MIN)'
      },
    ],
    billingMode: 'PAY_PER_REQUEST',
    pointInTimeRecovery: true,
    deletionProtection: false // 開発環境
  };

  // CloudFormationテンプレートにメタデータを追加
  stack.templateOptions.metadata = {
    ...stack.templateOptions.metadata,
    SensorDataTableConfig: tableConfig,
  };

  return tableConfig;
}

/**
 * DynamoDBテーブルのモニタリング設定
 */
export function addTableMonitoring(stack: Stack, table: dynamodb.Table) {
  // CloudWatchアラームの設定
  const readThrottleAlarm = table.metricThrottledRequestsForRead({
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }).createAlarm(stack, 'SensorDataReadThrottleAlarm', {
    threshold: 10,
    evaluationPeriods: 2,
    alarmDescription: 'CentraSensorData table read throttling detected',
  });

  const writeThrottleAlarm = table.metricThrottledRequestsForWrite({
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }).createAlarm(stack, 'SensorDataWriteThrottleAlarm', {
    threshold: 10,
    evaluationPeriods: 2,
    alarmDescription: 'CentraSensorData table write throttling detected',
  });

  return {
    readThrottleAlarm,
    writeThrottleAlarm,
  };
}