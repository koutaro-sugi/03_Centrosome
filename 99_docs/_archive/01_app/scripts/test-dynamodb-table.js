/**
 * CentraSensorDataテーブルの設定テストスクリプト
 * DynamoDBテーブルの構造とTTL設定を検証
 */

const { DynamoDBClient, DescribeTableCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });

/**
 * テーブル構造の検証
 */
async function validateTableStructure() {
  try {
    const command = new DescribeTableCommand({
      TableName: 'CentraSensorData'
    });
    
    const response = await client.send(command);
    const table = response.Table;
    
    console.log('=== CentraSensorData テーブル構造 ===');
    console.log('テーブル名:', table.TableName);
    console.log('テーブル状態:', table.TableStatus);
    console.log('請求モード:', table.BillingModeSummary?.BillingMode || 'PROVISIONED');
    
    // キー構造の確認
    console.log('\n=== キー構造 ===');
    table.KeySchema.forEach(key => {
      console.log(`${key.KeyType}: ${key.AttributeName}`);
    });
    
    // 属性定義の確認
    console.log('\n=== 属性定義 ===');
    table.AttributeDefinitions.forEach(attr => {
      console.log(`${attr.AttributeName}: ${attr.AttributeType}`);
    });
    
    // GSI（Global Secondary Index）の確認
    if (table.GlobalSecondaryIndexes) {
      console.log('\n=== Global Secondary Indexes ===');
      table.GlobalSecondaryIndexes.forEach(gsi => {
        console.log(`インデックス名: ${gsi.IndexName}`);
        console.log('キー構造:');
        gsi.KeySchema.forEach(key => {
          console.log(`  ${key.KeyType}: ${key.AttributeName}`);
        });
        console.log('状態:', gsi.IndexStatus);
        console.log('---');
      });
    }
    
    // TTL設定の確認
    if (table.TimeToLiveDescription) {
      console.log('\n=== TTL設定 ===');
      console.log('TTL属性:', table.TimeToLiveDescription.AttributeName);
      console.log('TTL状態:', table.TimeToLiveDescription.TimeToLiveStatus);
    }
    
    return true;
  } catch (error) {
    console.error('テーブル構造の検証に失敗:', error.message);
    return false;
  }
}

/**
 * サンプルデータの挿入テスト
 */
async function testDataInsertion() {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const ttl = Math.floor(now.getTime() / 1000) + 3600; // 1時間後
    
    // RAWデータのサンプル
    const rawData = {
      PK: 'DEVICE#M-X',
      SK: `${timestamp}#RAW`,
      type: 'RAW',
      deviceId: 'M-X',
      timestamp: timestamp,
      ttl: ttl,
      temperature: 25.5,
      humidity: 60.2,
      pressure: 1013.25,
      windSpeed: 3.2,
      windDirection: 180,
      rainfall: 0.0,
      illuminance: 50000,
      visibility: 10.0,
      feelsLike: 26.1
    };
    
    const command = new PutItemCommand({
      TableName: 'CentraSensorData',
      Item: marshall(rawData)
    });
    
    await client.send(command);
    console.log('✅ RAWデータの挿入に成功');
    
    // STATSデータのサンプル
    const statsData = {
      PK: 'DEVICE#M-X',
      SK: `${timestamp}#STATS_10MIN`,
      type: 'STATS_10MIN',
      deviceId: 'M-X',
      timestamp: timestamp,
      ttl: Math.floor(now.getTime() / 1000) + 86400, // 24時間後
      temperatureMax: 27.2,
      temperatureMin: 23.8,
      temperatureAvg: 25.5,
      humidityMax: 65.0,
      humidityMin: 55.0,
      humidityAvg: 60.2,
      windSpeedMax: 5.1,
      windSpeedMin: 1.2,
      windSpeedAvg: 3.2,
      samples: 60,
      period: 'HOUR',
      startTime: new Date(now.getTime() - 600000).toISOString(), // 10分前
      endTime: timestamp
    };
    
    const statsCommand = new PutItemCommand({
      TableName: 'CentraSensorData',
      Item: marshall(statsData)
    });
    
    await client.send(statsCommand);
    console.log('✅ STATSデータの挿入に成功');
    
    return true;
  } catch (error) {
    console.error('データ挿入テストに失敗:', error.message);
    return false;
  }
}

/**
 * メイン実行関数
 */
async function main() {
  console.log('CentraSensorDataテーブルの設定テストを開始...\n');
  
  // テーブル構造の検証
  const structureValid = await validateTableStructure();
  
  if (structureValid) {
    console.log('\n=== データ挿入テスト ===');
    await testDataInsertion();
  }
  
  console.log('\nテスト完了');
}

// スクリプト実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  validateTableStructure,
  testDataInsertion
};