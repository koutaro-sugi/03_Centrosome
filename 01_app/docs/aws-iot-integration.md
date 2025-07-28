# AWS IoT Core Integration Guide

## 概要

CentraアプリケーションからAWS IoT Coreのセンサーデータを取得するための実装ガイドです。

## アーキテクチャ

```
[XF700A Sensor] → [Raspberry Pi] → [AWS IoT Core] → [DynamoDB] → [Lambda] → [API Gateway] → [Centra App]
                                           ↓
                                    [IoT Rule Engine]
```

## 実装オプション

### オプション1: API Gateway + Lambda + DynamoDB（推奨）

1. **IoT Rule設定**
```sql
SELECT *, timestamp() as received_at
FROM 'dt/mado/+/data'
```

DynamoDBアクション:
- Table: MadoSensorData
- Partition key: device_id (String)
- Sort key: timestamp (Number)

2. **Lambda関数（最新データ取得）**
```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const deviceId = event.pathParameters.deviceId;
    
    const params = {
        TableName: 'MadoSensorData',
        KeyConditionExpression: 'device_id = :deviceId',
        ExpressionAttributeValues: {
            ':deviceId': deviceId
        },
        Limit: 1,
        ScanIndexForward: false // 最新のデータを取得
    };
    
    try {
        const result = await dynamodb.query(params).promise();
        
        if (result.Items && result.Items.length > 0) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result.Items[0])
            };
        } else {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: 'No data found' })
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

3. **API Gateway設定**
- REST API
- リソース: `/devices/{deviceId}/latest`
- メソッド: GET
- CORS有効化

### オプション2: WebSocket API（リアルタイム配信）

1. **Lambda関数（WebSocket接続管理）**
```javascript
// Connection Handler
exports.connectHandler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    // DynamoDBに接続情報を保存
    return { statusCode: 200 };
};

// Disconnect Handler
exports.disconnectHandler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    // DynamoDBから接続情報を削除
    return { statusCode: 200 };
};

// Subscribe Handler
exports.subscribeHandler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const { deviceId } = JSON.parse(event.body);
    // サブスクリプション情報を保存
    return { statusCode: 200 };
};
```

2. **IoT Rule（WebSocket配信）**
```javascript
// Lambda関数でWebSocket経由でデータを配信
const AWS = require('aws-sdk');
const apigatewaymanagementapi = new AWS.ApiGatewayManagementApi({
    endpoint: process.env.WEBSOCKET_ENDPOINT
});

exports.broadcastHandler = async (event) => {
    // IoT Coreからのデータ
    const sensorData = event;
    
    // 該当デバイスをサブスクライブしている接続を取得
    const connections = await getSubscribedConnections(sensorData.device_id);
    
    // 各接続にデータを送信
    const postCalls = connections.map(async (connectionId) => {
        try {
            await apigatewaymanagementapi.postToConnection({
                ConnectionId: connectionId,
                Data: JSON.stringify(sensorData)
            }).promise();
        } catch (e) {
            if (e.statusCode === 410) {
                // 接続が切れている場合は削除
                await removeConnection(connectionId);
            }
        }
    });
    
    await Promise.all(postCalls);
};
```

## センサートピック構成

現在の実装:
- トピック: `sdk/test/python`
- デバイスID: `mado-sensor-01`

推奨構成:
```
dt/mado/{device_id}/data
```

例:
- `dt/mado/mado-sensor-01/data` - 実センサー
- `dt/mado/mado-dummy-01/data` - ダミーセンサー1
- `dt/mado/mado-dummy-02/data` - ダミーセンサー2
- `dt/mado/mado-dummy-03/data` - ダミーセンサー3

## データフォーマット

```json
{
  "device_id": "mado-sensor-01",
  "timestamp": "2024-01-24T12:34:56.789Z",
  "data": {
    "temperature": 22.5,
    "humidity": 60.2,
    "pressure": 1013.25,
    "wind_speed": 2.5,
    "wind_direction": 180,
    "rain_1h": 0.0,
    "illuminance": 25.5,
    "visibility": 10.0,
    "feels_like": 21.8
  }
}
```

## 環境変数設定

`.env`ファイルに追加:
```
# API Gateway エンドポイント
REACT_APP_IOT_API_ENDPOINT=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/prod

# WebSocket エンドポイント（オプション）
REACT_APP_IOT_WS_ENDPOINT=wss://your-ws-api-id.execute-api.ap-northeast-1.amazonaws.com/prod
```

## セキュリティ考慮事項

1. **API Key認証**
   - API GatewayでAPI Keyを設定
   - Usage Planで利用制限を設定

2. **CORS設定**
   - 特定のオリジンのみ許可
   - 本番環境では`*`を避ける

3. **データ検証**
   - Lambda関数で入力データを検証
   - DynamoDBへの不正なデータ書き込みを防ぐ

## 実装手順

1. DynamoDBテーブル作成
2. IoT Ruleの作成
3. Lambda関数のデプロイ
4. API Gatewayの設定
5. Centraアプリの環境変数設定
6. 動作確認

## トラブルシューティング

- **CORSエラー**: API GatewayのCORS設定を確認
- **認証エラー**: API Keyが正しく設定されているか確認
- **データが表示されない**: IoT RuleとDynamoDBの設定を確認
- **リアルタイム更新されない**: WebSocket接続状態を確認