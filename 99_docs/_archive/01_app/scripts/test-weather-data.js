#!/usr/bin/env node

/**
 * Weather データテストスクリプト
 * IoT Coreにテストデータを送信して、データフローを確認
 */

const AWS = require('aws-sdk');

// AWS設定 - 環境変数から取得
AWS.config.update({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const iotdata = new AWS.IotData({
  endpoint: 'a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com'
});

// テストデータ生成
function generateTestData() {
  return {
    device_id: 'M-X',
    timestamp: new Date().toISOString(),
    location: {
      name: 'mado-experimental',
      lat: 35.6762,
      lon: 139.6503
    },
    data: {
      temperature: 20 + Math.random() * 10,      // 20-30℃
      humidity: 50 + Math.random() * 30,         // 50-80%
      pressure: 1000 + Math.random() * 30,       // 1000-1030 hPa
      wind_speed: Math.random() * 20,            // 0-20 m/s
      wind_direction: Math.random() * 360,       // 0-360度
      rain_1h: Math.random() * 5,                // 0-5mm
      illuminance: 10000 + Math.random() * 90000, // 10000-100000 lux
      visibility: 5 + Math.random() * 15,        // 5-20 km
      feels_like: 18 + Math.random() * 12        // 18-30℃
    }
  };
}

// データ送信
async function sendTestData() {
  const data = generateTestData();
  const topic = 'mado/centra/M-X/telemetry';

  const params = {
    topic: topic,
    payload: JSON.stringify(data),
    qos: 0
  };

  try {
    const result = await iotdata.publish(params).promise();
    console.log('✅ Test data sent successfully:');
    console.log(`   Topic: ${topic}`);
    console.log(`   Device: ${data.device_id}`);
    console.log(`   Temperature: ${data.data.temperature.toFixed(1)}℃`);
    console.log(`   Humidity: ${data.data.humidity.toFixed(1)}%`);
    console.log(`   Wind Speed: ${data.data.wind_speed.toFixed(1)} m/s`);
    console.log(`   Timestamp: ${data.timestamp}`);
    return result;
  } catch (error) {
    console.error('❌ Error sending test data:', error);
    throw error;
  }
}

// DynamoDBデータ確認
async function checkDynamoDB() {
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  const tableName = 'CentraSensorData-nidyepulsvfwxki45wycbk5ae4-NONE';

  const params = {
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': 'DEVICE#M-X'
    },
    ScanIndexForward: false,
    Limit: 5
  };

  try {
    const result = await dynamodb.query(params).promise();
    console.log('\n📊 Latest data in DynamoDB:');
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach((item, index) => {
        console.log(`   [${index + 1}] ${item.timestamp} - Temp: ${item.temperature?.toFixed(1)}℃, Humidity: ${item.humidity?.toFixed(1)}%`);
      });
    } else {
      console.log('   No data found');
    }
    return result;
  } catch (error) {
    console.error('❌ Error querying DynamoDB:', error);
  }
}

// メイン処理
async function main() {
  console.log('🚀 Starting Weather Data Test...\n');

  // 1. テストデータ送信
  console.log('📡 Sending test data to IoT Core...');
  await sendTestData();

  // 2. 少し待つ（データ処理のため）
  console.log('\n⏳ Waiting 3 seconds for data processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 3. DynamoDBデータ確認
  await checkDynamoDB();

  console.log('\n✅ Test completed!');
  console.log('📱 Check your Weather Dashboard to see if the data appears.');
}

// 継続的送信モード
async function continuousMode() {
  console.log('🔄 Starting continuous mode (sending data every 5 seconds)...');
  console.log('   Press Ctrl+C to stop\n');

  setInterval(async () => {
    await sendTestData();
  }, 5000);
}

// コマンドライン引数処理
const args = process.argv.slice(2);
if (args.includes('--continuous')) {
  continuousMode();
} else {
  main().catch(console.error);
}

// 使用方法表示
if (args.includes('--help')) {
  console.log(`
Weather Data Test Script

Usage:
  node test-weather-data.js           # Send one test message
  node test-weather-data.js --continuous  # Send messages every 5 seconds
  node test-weather-data.js --help    # Show this help

This script:
  1. Sends test weather data to IoT Core
  2. Checks if data appears in DynamoDB
  3. Helps verify the data pipeline is working
`);
  process.exit(0);
}