/**
 * AWS設定ファイル
 * 実際のセンサー統合用の設定
 */

export const awsConfig = {
  // AWS IoT Core設定
  iot: {
    // 実際のエンドポイント（検出済み）
    // Prefer REACT_APP_IOT_ENDPOINT; fallback to legacy REACT_APP_AWS_IOT_ENDPOINT
    endpoint: process.env.REACT_APP_IOT_ENDPOINT || process.env.REACT_APP_AWS_IOT_ENDPOINT || 'a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com',
    region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
    // トピック設定（実際のセンサートピックに合わせて更新）
    topics: {
      sensorData: 'mado/centra/+/telemetry',  // 実際のトピック
      sensorStatus: 'mado/centra/+/status',
      sensorCommand: 'mado/centra/+/command'
    }
  },

  // AppSync設定
  appSync: {
    // 実際のエンドポイント（検出済み）
    endpoint: process.env.REACT_APP_APPSYNC_ENDPOINT || 'https://vsfj6mnadvadtbtem3v4z5jc6a.appsync-api.ap-northeast-1.amazonaws.com/graphql',
    apiId: 'nidyepulsvfwxki45wycbk5ae4',
    region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
    authenticationType: 'AMAZON_COGNITO_USER_POOLS' as const
  },

  // Cognito設定
  cognito: {
    userPoolId: process.env.REACT_APP_USER_POOL_ID || 'ap-northeast-1_YOUR_POOL_ID',
    userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'YOUR_CLIENT_ID',
    region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1'
  },

  // DynamoDB設定
  dynamodb: {
    // 注意: MadoSensorDataテーブルは存在しない。CentrosomeDataを使用する可能性あり
    tableName: process.env.REACT_APP_DYNAMODB_TABLE || 'CentrosomeData',
    region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1'
  },

  // デバイス設定（実際のIoT Thing）
  devices: [
    { id: 'M-X', name: 'Madoセンサー', location: '窓' }
  ]
};
