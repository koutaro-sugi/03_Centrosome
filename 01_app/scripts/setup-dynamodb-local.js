/**
 * DynamoDB Local セットアップスクリプト
 * CI/CD環境でのテーブル作成
 */

const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const REGION = process.env.AWS_REGION || 'us-east-1';

// DynamoDBクライアントの設定
const client = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
});

// CentraSensorDataテーブルの定義
const tableDefinition = {
  TableName: 'CentraSensorData',
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' }
  ],
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'deviceId', AttributeType: 'S' },
    { AttributeName: 'timestamp', AttributeType: 'S' },
    { AttributeName: 'dataType', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'deviceId-timestamp-index',
      KeySchema: [
        { AttributeName: 'deviceId', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    },
    {
      IndexName: 'deviceId-dataType-index',
      KeySchema: [
        { AttributeName: 'deviceId', KeyType: 'HASH' },
        { AttributeName: 'dataType', KeyType: 'RANGE' }
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
    }
  ],
  BillingMode: 'PROVISIONED',
  ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  StreamSpecification: {
    StreamEnabled: true,
    StreamViewType: 'NEW_AND_OLD_IMAGES'
  },
  TimeToLiveSpecification: {
    AttributeName: 'ttl',
    Enabled: true
  }
};

async function setupDynamoDBLocal() {
  try {
    console.log('Setting up DynamoDB Local...');
    console.log(`Endpoint: ${ENDPOINT}`);

    // 既存のテーブルを確認
    const listTablesCommand = new ListTablesCommand({});
    const { TableNames = [] } = await client.send(listTablesCommand);
    console.log('Existing tables:', TableNames);

    // テーブルが存在しない場合のみ作成
    if (!TableNames.includes(tableDefinition.TableName)) {
      console.log(`Creating table: ${tableDefinition.TableName}`);
      const createTableCommand = new CreateTableCommand(tableDefinition);
      await client.send(createTableCommand);
      console.log('Table created successfully');
    } else {
      console.log(`Table ${tableDefinition.TableName} already exists`);
    }

    // テーブルの状態を確認
    console.log('Setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up DynamoDB Local:', error);
    process.exit(1);
  }
}

// 接続を待つ
async function waitForDynamoDBLocal(maxAttempts = 30) {
  console.log('Waiting for DynamoDB Local to be ready...');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const command = new ListTablesCommand({});
      await client.send(command);
      console.log('DynamoDB Local is ready');
      return;
    } catch (error) {
      console.log(`Attempt ${i + 1}/${maxAttempts}: DynamoDB Local not ready yet`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('DynamoDB Local failed to start');
}

// メイン処理
(async () => {
  try {
    await waitForDynamoDBLocal();
    await setupDynamoDBLocal();
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
})();