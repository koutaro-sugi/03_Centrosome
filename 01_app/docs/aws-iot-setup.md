# AWS IoT Core セットアップガイド

## 1. IoT Thing とポリシーの設定

### 既存のThingを確認
```bash
aws iot list-things
```

### ポリシーの更新
```bash
# 既存のポリシーを更新
aws iot create-policy-version \
  --policy-name mado-sensor-policy \
  --policy-document file://centra_iot_policy.json \
  --set-as-default
```

## 2. DynamoDBテーブルの作成

```bash
aws dynamodb create-table \
  --table-name MadoSensorData \
  --attribute-definitions \
    AttributeName=device_id,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=device_id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

## 3. IoT Ruleの作成

```bash
aws iot create-topic-rule \
  --rule-name MadoSensorDataToDynamoDB \
  --topic-rule-payload '{
    "sql": "SELECT *, timestamp() as timestamp FROM '\''dt/mado/+/data'\''",
    "description": "Store Mado sensor data to DynamoDB",
    "actions": [{
      "dynamoDBv2": {
        "roleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/IoTToDynamoDBRole",
        "putItem": {
          "tableName": "MadoSensorData"
        }
      }
    }],
    "ruleDisabled": false
  }'
```

## 4. Lambda関数の作成

### 最新データ取得用Lambda

`getMadoSensorData/index.js`:
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
        ScanIndexForward: false
    };
    
    try {
        const result = await dynamodb.query(params).promise();
        
        if (result.Items && result.Items.length > 0) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
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
        console.error('Error:', error);
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

### デプロイ
```bash
# Lambda関数の作成
aws lambda create-function \
  --function-name getMadoSensorData \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/LambdaExecutionRole \
  --handler index.handler \
  --zip-file fileb://function.zip
```

## 5. API Gatewayの設定

```bash
# REST APIの作成
aws apigateway create-rest-api \
  --name MadoSensorAPI \
  --description "API for Mado sensor data"

# リソースとメソッドの追加
# /devices/{deviceId}/latest - GET
```

## 6. Raspberry Piでの実行

### 新しいスクリプトを使用
```bash
# 環境変数を設定
export DEVICE_ID=mado-sensor-01
export AWS_IOT_CERT_DIR=/home/pi/MadoOS/connect_device_package
export AWS_IOT_ENDPOINT=a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com

# 実行
python3 /home/pi/MadoOS/software/xf700a_aws_iot_centra.py
```

### systemdサービスの更新
```bash
sudo nano /etc/systemd/system/xf700a-iot.service
```

```ini
[Unit]
Description=XF700A AWS IoT Centra Service
After=network.target

[Service]
Type=simple
User=pi
Environment="DEVICE_ID=mado-sensor-01"
Environment="AWS_IOT_CERT_DIR=/home/pi/MadoOS/connect_device_package"
Environment="AWS_IOT_ENDPOINT=a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com"
ExecStart=/usr/bin/python3 /home/pi/MadoOS/software/xf700a_aws_iot_centra.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# サービスの再起動
sudo systemctl daemon-reload
sudo systemctl restart xf700a-iot
sudo systemctl status xf700a-iot
```

## 7. Centraアプリの設定

`.env`ファイル:
```
REACT_APP_IOT_API_ENDPOINT=https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod
```

## 8. 動作確認

### IoT Coreでメッセージ確認
```bash
# AWS IoTコンソールのテストクライアントで以下をサブスクライブ
dt/mado/+/data
```

### DynamoDBデータ確認
```bash
aws dynamodb scan --table-name MadoSensorData --limit 5
```

### API経由でデータ取得
```bash
curl https://YOUR_API_ID.execute-api.ap-northeast-1.amazonaws.com/prod/devices/mado-sensor-01/latest
```

## トラブルシューティング

1. **証明書エラー**
   - 証明書ファイルのパスと権限を確認
   - `chmod 600 *.pem *.key`

2. **接続エラー**
   - エンドポイントURLが正しいか確認
   - ポリシーが適切に設定されているか確認

3. **データが表示されない**
   - IoT Ruleが正しく動作しているか確認
   - DynamoDBにデータが書き込まれているか確認
   - API GatewayのCORS設定を確認