import { Context } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import fetch from 'node-fetch';

// 環境変数の型定義（将来の拡張用）
// interface EnvironmentVariables {
//   DYNAMODB_TABLE_NAME: string;
//   APPSYNC_ENDPOINT: string;
//   AWS_REGION: string;
// }

// IoT Coreからのイベント型定義
interface IoTEvent {
  deviceId?: string;
  topic?: string;
  timestamp?: string;
  temperature?: number;      // 温度 (℃)
  humidity?: number;         // 湿度 (%)
  pressure?: number;         // 気圧 (hPa)
  windSpeed?: number;        // 風速 (m/s)
  windDirection?: number;    // 風向 (degrees)
  rainfall?: number;         // 降水量 (mm)
  illuminance?: number;      // 照度 (lux)
  visibility?: number;       // 視程 (km)
  feelsLike?: number;       // 体感温度 (℃)
  [key: string]: any;       // その他のフィールド
}

// Madoセンサーからの生データ型定義
interface MadoSensorData {
  deviceId: string;
  timestamp: string;
  temperature?: number;      // 温度 (℃)
  humidity?: number;         // 湿度 (%)
  pressure?: number;         // 気圧 (hPa)
  windSpeed?: number;        // 風速 (m/s)
  windDirection?: number;    // 風向 (degrees)
  rainfall?: number;         // 降水量 (mm)
  illuminance?: number;      // 照度 (lux)
  visibility?: number;       // 視程 (km)
  feelsLike?: number;       // 体感温度 (℃)
}

// DynamoDB保存用のレコード型定義
interface DynamoDBRecord {
  PK: string;              // "DEVICE#M-X"
  SK: string;              // "2025-01-27T12:00:00.000Z#RAW"
  type: string;            // "RAW"
  deviceId: string;
  timestamp: string;
  ttl: number;            // 1時間後のTTL
  temperature?: number | undefined;
  humidity?: number | undefined;
  pressure?: number | undefined;
  windSpeed?: number | undefined;
  windDirection?: number | undefined;
  rainfall?: number | undefined;
  illuminance?: number | undefined;
  visibility?: number | undefined;
  feelsLike?: number | undefined;
}

// 統計データ保存用のレコード型定義
interface DynamoDBStatsRecord {
  PK: string;              // "DEVICE#M-X"
  SK: string;              // "2025-01-27T12:00:00.000Z#STATS_10MIN"
  type: string;            // "STATS_10MIN"
  deviceId: string;
  timestamp: string;
  ttl: number;            // 24時間後のTTL
  period: string;         // "HOUR" | "DAY"
  startTime: string;      // 統計期間開始時刻
  endTime: string;        // 統計期間終了時刻
  samples: number;        // サンプル数
  
  // 各気象要素の統計値
  temperatureMax?: number;
  temperatureMin?: number;
  temperatureAvg?: number;
  humidityMax?: number;
  humidityMin?: number;
  humidityAvg?: number;
  pressureMax?: number;
  pressureMin?: number;
  pressureAvg?: number;
  windSpeedMax?: number;
  windSpeedMin?: number;
  windSpeedAvg?: number;
  windDirectionMax?: number;
  windDirectionMin?: number;
  windDirectionAvg?: number;
  rainfallMax?: number;
  rainfallMin?: number;
  rainfallAvg?: number;
  illuminanceMax?: number;
  illuminanceMin?: number;
  illuminanceAvg?: number;
  visibilityMax?: number;
  visibilityMin?: number;
  visibilityAvg?: number;
  feelsLikeMax?: number;
  feelsLikeMin?: number;
  feelsLikeAvg?: number;
}

// 統計値計算用の型定義
interface StatsValues {
  max: number;
  min: number;
  avg: number;
}

// 統計計算結果の型定義
interface CalculatedStats {
  temperature?: StatsValues | undefined;
  humidity?: StatsValues | undefined;
  pressure?: StatsValues | undefined;
  windSpeed?: StatsValues | undefined;
  windDirection?: StatsValues | undefined;
  rainfall?: StatsValues | undefined;
  illuminance?: StatsValues | undefined;
  visibility?: StatsValues | undefined;
  feelsLike?: StatsValues | undefined;
  samples: number;
}

// AWS クライアントの初期化
const dynamoClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'ap-northeast-1' 
});

/**
 * IoTイベントからセンサーデータを抽出・バリデーション
 */
function validateAndExtractSensorData(event: IoTEvent): MadoSensorData {
  console.log('受信したIoTイベント:', JSON.stringify(event, null, 2));
  
  // イベントデータの基本構造チェック
  if (!event || typeof event !== 'object') {
    throw new Error('無効なIoTイベント形式です');
  }
  
  // デバイスIDの検証
  const deviceId = event.deviceId || event.topic?.split('/')[1];
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('デバイスIDが見つかりません');
  }
  
  // タイムスタンプの検証と生成
  const timestamp = event.timestamp || new Date().toISOString();
  if (!isValidTimestamp(timestamp)) {
    throw new Error('無効なタイムスタンプ形式です');
  }
  
  // センサーデータの抽出と数値バリデーション
  const sensorData: MadoSensorData = {
    deviceId,
    timestamp
  };
  
  // 各センサー値の検証と設定
  if (event.temperature !== undefined) {
    sensorData.temperature = validateNumericValue(event.temperature, -50, 60, '温度');
  }
  
  if (event.humidity !== undefined) {
    sensorData.humidity = validateNumericValue(event.humidity, 0, 100, '湿度');
  }
  
  if (event.pressure !== undefined) {
    sensorData.pressure = validateNumericValue(event.pressure, 800, 1200, '気圧');
  }
  
  if (event.windSpeed !== undefined) {
    sensorData.windSpeed = validateNumericValue(event.windSpeed, 0, 100, '風速');
  }
  
  if (event.windDirection !== undefined) {
    sensorData.windDirection = validateNumericValue(event.windDirection, 0, 360, '風向');
  }
  
  if (event.rainfall !== undefined) {
    sensorData.rainfall = validateNumericValue(event.rainfall, 0, 1000, '降水量');
  }
  
  if (event.illuminance !== undefined) {
    sensorData.illuminance = validateNumericValue(event.illuminance, 0, 200000, '照度');
  }
  
  if (event.visibility !== undefined) {
    sensorData.visibility = validateNumericValue(event.visibility, 0, 50, '視程');
  }
  
  if (event.feelsLike !== undefined) {
    sensorData.feelsLike = validateNumericValue(event.feelsLike, -60, 70, '体感温度');
  }
  
  console.log('バリデーション済みセンサーデータ:', sensorData);
  return sensorData;
}

/**
 * タイムスタンプの妥当性チェック
 */
function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.getTime() > 0;
}

/**
 * 数値の範囲バリデーション
 */
function validateNumericValue(value: any, min: number, max: number, fieldName: string): number {
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    console.warn(`${fieldName}の値が数値ではありません: ${value}`);
    throw new Error(`${fieldName}の値が無効です`);
  }
  
  if (numValue < min || numValue > max) {
    console.warn(`${fieldName}の値が範囲外です: ${numValue} (範囲: ${min}-${max})`);
    throw new Error(`${fieldName}の値が範囲外です`);
  }
  
  return numValue;
}

/**
 * DynamoDBへの生データ保存
 */
async function saveRawDataToDynamoDB(sensorData: MadoSensorData): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DynamoDBテーブル名が設定されていません');
  }
  
  // TTL設定（1時間後）
  const ttl = Math.floor(Date.now() / 1000) + (60 * 60); // 1時間
  
  const record: DynamoDBRecord = {
    PK: `DEVICE#${sensorData.deviceId}`,
    SK: `${sensorData.timestamp}#RAW`,
    type: 'RAW',
    deviceId: sensorData.deviceId,
    timestamp: sensorData.timestamp,
    ttl,
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    pressure: sensorData.pressure,
    windSpeed: sensorData.windSpeed,
    windDirection: sensorData.windDirection,
    rainfall: sensorData.rainfall,
    illuminance: sensorData.illuminance,
    visibility: sensorData.visibility,
    feelsLike: sensorData.feelsLike
  };
  
  // DynamoDBアイテムの作成
  const putCommand = new PutItemCommand({
    TableName: tableName,
    Item: marshall(record, {
      removeUndefinedValues: true,
      convertEmptyValues: false
    })
  });
  
  try {
    await dynamoClient.send(putCommand);
    console.log('DynamoDBへの保存が完了しました:', record.PK, record.SK);
  } catch (error) {
    console.error('DynamoDB保存エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`DynamoDBへの保存に失敗しました: ${errorMessage}`);
  }
}

/**
 * 過去10分間の生データを取得
 */
async function getRecentRawData(deviceId: string, minutes: number = 10): Promise<MadoSensorData[]> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DynamoDBテーブル名が設定されていません');
  }

  // 10分前の時刻を計算
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - (minutes * 60 * 1000));
  
  const queryCommand = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :startSK AND :endSK',
    FilterExpression: '#type = :type',
    ExpressionAttributeNames: {
      '#type': 'type'
    },
    ExpressionAttributeValues: marshall({
      ':pk': `DEVICE#${deviceId}`,
      ':startSK': `${startTime.toISOString()}#RAW`,
      ':endSK': `${endTime.toISOString()}#RAW`,
      ':type': 'RAW'
    })
  });

  try {
    const result = await dynamoClient.send(queryCommand);
    
    if (!result.Items || result.Items.length === 0) {
      console.log(`過去${minutes}分間のデータが見つかりません: ${deviceId}`);
      return [];
    }

    // DynamoDBアイテムをMadoSensorData形式に変換
    const rawDataList: MadoSensorData[] = result.Items.map(item => {
      const unmarshalled = unmarshall(item);
      return {
        deviceId: unmarshalled.deviceId,
        timestamp: unmarshalled.timestamp,
        temperature: unmarshalled.temperature,
        humidity: unmarshalled.humidity,
        pressure: unmarshalled.pressure,
        windSpeed: unmarshalled.windSpeed,
        windDirection: unmarshalled.windDirection,
        rainfall: unmarshalled.rainfall,
        illuminance: unmarshalled.illuminance,
        visibility: unmarshalled.visibility,
        feelsLike: unmarshalled.feelsLike
      };
    });

    console.log(`過去${minutes}分間のデータを${rawDataList.length}件取得しました: ${deviceId}`);
    return rawDataList;

  } catch (error) {
    console.error('生データ取得エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`生データの取得に失敗しました: ${errorMessage}`);
  }
}

/**
 * 統計値を計算（最大・最小・平均）
 */
function calculateStats(values: number[]): StatsValues | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const validValues = values.filter(v => v !== undefined && v !== null && !isNaN(v));
  if (validValues.length === 0) {
    return undefined;
  }

  const max = Math.max(...validValues);
  const min = Math.min(...validValues);
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  const avg = sum / validValues.length;

  return {
    max: Math.round(max * 100) / 100,  // 小数点以下2桁で丸める
    min: Math.round(min * 100) / 100,
    avg: Math.round(avg * 100) / 100
  };
}

/**
 * 風向の統計値を計算（角度の特別処理）
 */
function calculateWindDirectionStats(directions: number[]): StatsValues | undefined {
  if (directions.length === 0) {
    return undefined;
  }

  const validDirections = directions.filter(d => d !== undefined && d !== null && !isNaN(d));
  if (validDirections.length === 0) {
    return undefined;
  }

  // 風向は角度なので、単純な平均ではなく円形統計を使用
  let sinSum = 0;
  let cosSum = 0;

  validDirections.forEach(direction => {
    const radians = (direction * Math.PI) / 180;
    sinSum += Math.sin(radians);
    cosSum += Math.cos(radians);
  });

  const avgRadians = Math.atan2(sinSum / validDirections.length, cosSum / validDirections.length);
  let avgDegrees = (avgRadians * 180) / Math.PI;
  
  // 負の角度を正の角度に変換
  if (avgDegrees < 0) {
    avgDegrees += 360;
  }

  const max = Math.max(...validDirections);
  const min = Math.min(...validDirections);

  return {
    max: Math.round(max * 100) / 100,
    min: Math.round(min * 100) / 100,
    avg: Math.round(avgDegrees * 100) / 100
  };
}

/**
 * 10分間の統計データを計算
 */
function calculateTenMinuteStats(rawDataList: MadoSensorData[]): CalculatedStats {
  if (rawDataList.length === 0) {
    return { samples: 0 };
  }

  // 各気象要素の値を配列に抽出
  const temperatures = rawDataList.map(d => d.temperature).filter(v => v !== undefined) as number[];
  const humidities = rawDataList.map(d => d.humidity).filter(v => v !== undefined) as number[];
  const pressures = rawDataList.map(d => d.pressure).filter(v => v !== undefined) as number[];
  const windSpeeds = rawDataList.map(d => d.windSpeed).filter(v => v !== undefined) as number[];
  const windDirections = rawDataList.map(d => d.windDirection).filter(v => v !== undefined) as number[];
  const rainfalls = rawDataList.map(d => d.rainfall).filter(v => v !== undefined) as number[];
  const illuminances = rawDataList.map(d => d.illuminance).filter(v => v !== undefined) as number[];
  const visibilities = rawDataList.map(d => d.visibility).filter(v => v !== undefined) as number[];
  const feelsLikes = rawDataList.map(d => d.feelsLike).filter(v => v !== undefined) as number[];

  const stats: CalculatedStats = {
    samples: rawDataList.length
  };

  // 各気象要素の統計値を計算
  const temperatureStats = calculateStats(temperatures);
  if (temperatureStats) stats.temperature = temperatureStats;
  
  const humidityStats = calculateStats(humidities);
  if (humidityStats) stats.humidity = humidityStats;
  
  const pressureStats = calculateStats(pressures);
  if (pressureStats) stats.pressure = pressureStats;
  
  const windSpeedStats = calculateStats(windSpeeds);
  if (windSpeedStats) stats.windSpeed = windSpeedStats;
  
  const windDirectionStats = calculateWindDirectionStats(windDirections);  // 風向は特別処理
  if (windDirectionStats) stats.windDirection = windDirectionStats;
  
  const rainfallStats = calculateStats(rainfalls);
  if (rainfallStats) stats.rainfall = rainfallStats;
  
  const illuminanceStats = calculateStats(illuminances);
  if (illuminanceStats) stats.illuminance = illuminanceStats;
  
  const visibilityStats = calculateStats(visibilities);
  if (visibilityStats) stats.visibility = visibilityStats;
  
  const feelsLikeStats = calculateStats(feelsLikes);
  if (feelsLikeStats) stats.feelsLike = feelsLikeStats;

  console.log('統計データ計算完了:', {
    samples: stats.samples,
    hasTemperature: !!stats.temperature,
    hasHumidity: !!stats.humidity,
    hasWindSpeed: !!stats.windSpeed,
    maxWindSpeed: stats.windSpeed?.max
  });

  return stats;
}

/**
 * 統計データをDynamoDBに保存
 */
async function saveStatsToDynamoDB(deviceId: string, stats: CalculatedStats, periodStart: Date, periodEnd: Date): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DynamoDBテーブル名が設定されていません');
  }

  // TTL設定（24時間後）
  const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24時間

  const statsRecord: DynamoDBStatsRecord = {
    PK: `DEVICE#${deviceId}`,
    SK: `${periodStart.toISOString()}#STATS_10MIN`,
    type: 'STATS_10MIN',
    deviceId,
    timestamp: periodStart.toISOString(),
    ttl,
    period: 'HOUR',
    startTime: periodStart.toISOString(),
    endTime: periodEnd.toISOString(),
    samples: stats.samples
  };

  // 統計値をレコードに設定
  if (stats.temperature) {
    statsRecord.temperatureMax = stats.temperature.max;
    statsRecord.temperatureMin = stats.temperature.min;
    statsRecord.temperatureAvg = stats.temperature.avg;
  }

  if (stats.humidity) {
    statsRecord.humidityMax = stats.humidity.max;
    statsRecord.humidityMin = stats.humidity.min;
    statsRecord.humidityAvg = stats.humidity.avg;
  }

  if (stats.pressure) {
    statsRecord.pressureMax = stats.pressure.max;
    statsRecord.pressureMin = stats.pressure.min;
    statsRecord.pressureAvg = stats.pressure.avg;
  }

  if (stats.windSpeed) {
    statsRecord.windSpeedMax = stats.windSpeed.max;
    statsRecord.windSpeedMin = stats.windSpeed.min;
    statsRecord.windSpeedAvg = stats.windSpeed.avg;
  }

  if (stats.windDirection) {
    statsRecord.windDirectionMax = stats.windDirection.max;
    statsRecord.windDirectionMin = stats.windDirection.min;
    statsRecord.windDirectionAvg = stats.windDirection.avg;
  }

  if (stats.rainfall) {
    statsRecord.rainfallMax = stats.rainfall.max;
    statsRecord.rainfallMin = stats.rainfall.min;
    statsRecord.rainfallAvg = stats.rainfall.avg;
  }

  if (stats.illuminance) {
    statsRecord.illuminanceMax = stats.illuminance.max;
    statsRecord.illuminanceMin = stats.illuminance.min;
    statsRecord.illuminanceAvg = stats.illuminance.avg;
  }

  if (stats.visibility) {
    statsRecord.visibilityMax = stats.visibility.max;
    statsRecord.visibilityMin = stats.visibility.min;
    statsRecord.visibilityAvg = stats.visibility.avg;
  }

  if (stats.feelsLike) {
    statsRecord.feelsLikeMax = stats.feelsLike.max;
    statsRecord.feelsLikeMin = stats.feelsLike.min;
    statsRecord.feelsLikeAvg = stats.feelsLike.avg;
  }

  // DynamoDBアイテムの作成
  const putCommand = new PutItemCommand({
    TableName: tableName,
    Item: marshall(statsRecord, {
      removeUndefinedValues: true,
      convertEmptyValues: false
    })
  });

  try {
    await dynamoClient.send(putCommand);
    console.log('統計データのDynamoDB保存が完了しました:', statsRecord.PK, statsRecord.SK);
    
    // 最大瞬間風速の特別ログ出力
    if (stats.windSpeed?.max) {
      console.log(`最大瞬間風速: ${stats.windSpeed.max} m/s (${deviceId}, ${periodStart.toISOString()})`);
    }
    
  } catch (error) {
    console.error('統計データDynamoDB保存エラー:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`統計データのDynamoDB保存に失敗しました: ${errorMessage}`);
  }
}

/**
 * 統計データ計算と保存の実行
 */
async function calculateAndSaveStats(deviceId: string): Promise<void> {
  try {
    console.log('統計データ計算開始:', deviceId);

    // 現在時刻を10分単位に丸める
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 
                              now.getHours(), Math.floor(now.getMinutes() / 10) * 10, 0, 0);
    const periodStart = new Date(periodEnd.getTime() - (10 * 60 * 1000)); // 10分前

    console.log('統計期間:', {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    });

    // 過去10分間の生データを取得
    const rawDataList = await getRecentRawData(deviceId, 10);

    if (rawDataList.length === 0) {
      console.log('統計計算用のデータが不足しています:', deviceId);
      return;
    }

    // 統計値を計算
    const stats = calculateTenMinuteStats(rawDataList);

    // 統計データをDynamoDBに保存
    await saveStatsToDynamoDB(deviceId, stats, periodStart, periodEnd);

    console.log('統計データ計算・保存が完了しました:', {
      deviceId,
      samples: stats.samples,
      maxWindSpeed: stats.windSpeed?.max
    });

  } catch (error) {
    console.error('統計データ計算・保存エラー:', error);
    // 統計計算の失敗はシステム全体を停止させない
    console.warn('統計データ計算に失敗しましたが、処理を継続します');
  }
}

/**
 * 10分間隔での統計計算が必要かチェック
 */
function shouldCalculateStats(): boolean {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  
  // 10分の倍数の時刻（0分、10分、20分、30分、40分、50分）で
  // かつ秒が0-30の範囲内の場合に統計計算を実行
  return (minutes % 10 === 0) && (seconds <= 30);
}

/**
 * AppSyncへのリアルタイム配信
 */
async function publishToAppSync(sensorData: MadoSensorData): Promise<void> {
  const endpoint = process.env.APPSYNC_ENDPOINT;
  if (!endpoint) {
    console.warn('AppSyncエンドポイントが設定されていません。リアルタイム配信をスキップします。');
    return;
  }
  
  // GraphQL Mutationの構築
  const mutation = `
    mutation PublishSensorData($input: SensorDataInput!) {
      publishSensorData(input: $input) {
        deviceId
        timestamp
        temperature
        humidity
        pressure
        windSpeed
        windDirection
        rainfall
        illuminance
        visibility
        feelsLike
      }
    }
  `;
  
  const variables = {
    input: sensorData
  };
  
  try {
    console.log('AppSyncへのリアルタイム配信開始:', sensorData.deviceId);
    
    // AppSync GraphQL APIへのHTTPリクエスト
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.APPSYNC_API_KEY || '',
        // 注意: 本番環境では適切な認証方式（IAM、Cognito等）を使用
      },
      body: JSON.stringify({
        query: mutation,
        variables: variables
      })
    });
    
    if (!response.ok) {
      throw new Error(`AppSync API呼び出しエラー: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('AppSync GraphQLエラー:', result.errors);
      throw new Error(`GraphQLエラー: ${JSON.stringify(result.errors)}`);
    }
    
    console.log('AppSyncリアルタイム配信完了:', result.data?.publishSensorData?.deviceId);
    
  } catch (error) {
    console.error('AppSync配信エラー:', error);
    // リアルタイム配信の失敗はシステム全体を停止させない
    console.warn('リアルタイム配信に失敗しましたが、処理を継続します');
  }
}

/**
 * メインのLambdaハンドラー関数
 */
export const handler = async (event: IoTEvent, context: Context): Promise<void> => {
  console.log('IoTデータ処理Lambda開始:', context.awsRequestId);
  console.log('受信イベント:', JSON.stringify(event, null, 2));
  
  try {
    // 1. データのバリデーションと抽出
    const sensorData = validateAndExtractSensorData(event);
    
    // 2. DynamoDBへの生データ保存
    await saveRawDataToDynamoDB(sensorData);
    
    // 3. AppSyncへのリアルタイム配信
    await publishToAppSync(sensorData);
    
    // 4. 10分間隔での統計データ計算と保存
    if (shouldCalculateStats()) {
      console.log('10分間隔の統計データ計算を実行します:', sensorData.deviceId);
      await calculateAndSaveStats(sensorData.deviceId);
    }
    
    console.log('IoTデータ処理が正常に完了しました');
    
  } catch (error) {
    console.error('IoTデータ処理エラー:', error);
    
    // エラーメトリクスの送信（CloudWatch）
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('エラー詳細:', {
      requestId: context.awsRequestId,
      error: errorMessage,
      stack: errorStack,
      event: JSON.stringify(event)
    });
    
    // Lambda関数の失敗として扱う
    throw error;
  }
};