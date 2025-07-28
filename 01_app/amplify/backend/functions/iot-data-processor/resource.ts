import { defineFunction } from '@aws-amplify/backend';

/**
 * IoT Core からの気象データを処理するLambda関数の定義
 * 
 * 機能:
 * - IoT Coreからのデータ受信とバリデーション
 * - DynamoDBへの生データ保存
 * - AppSyncへのリアルタイム配信
 * - エラーハンドリングとログ記録
 */
export const iotDataProcessor = defineFunction({
  name: 'iot-data-processor',
  entry: './handler.ts',
  runtime: 20, // Node.js 20
  timeoutSeconds: 30,
  memoryMB: 256,
  environment: {
    // 環境変数は backend.ts で動的に設定される
    NODE_ENV: 'production'
  }
});