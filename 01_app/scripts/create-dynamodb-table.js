// DynamoDBテーブル作成スクリプト
// 実行: node scripts/create-dynamodb-table.js

const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

// 環境変数または直接設定
const config = {
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const client = new DynamoDBClient(config);
const TABLE_NAME = 'CentrosomeData';

async function createTable() {
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' }, // Partition Key
      { AttributeName: 'SK', KeyType: 'RANGE' }, // Sort Key
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'entityType', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST', // オンデマンド課金
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EntityTypeIndex',
        KeySchema: [
          { AttributeName: 'entityType', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  };

  try {
    // テーブルの存在確認
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`Table ${TABLE_NAME} already exists.`);
      return;
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') {
        throw err;
      }
    }

    // テーブル作成
    console.log(`Creating table ${TABLE_NAME}...`);
    const result = await client.send(new CreateTableCommand(params));
    console.log('Table created successfully:', result.TableDescription.TableArn);
    
    // テーブルがアクティブになるまで待機
    let tableActive = false;
    while (!tableActive) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      tableActive = Table.TableStatus === 'ACTIVE';
      console.log(`Table status: ${Table.TableStatus}`);
    }
    
    console.log('Table is now active and ready to use!');
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

// 実行
createTable();