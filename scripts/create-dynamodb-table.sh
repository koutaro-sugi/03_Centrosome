#!/bin/bash

# MadoSensorDataテーブルの作成スクリプト

echo "Creating MadoSensorData DynamoDB table..."

aws dynamodb create-table \
  --table-name MadoSensorData \
  --attribute-definitions \
    AttributeName=device_id,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=device_id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --tags \
    Key=Project,Value=Centra \
    Key=Environment,Value=Production \
    Key=Purpose,Value=MadoSensorData

# テーブル作成の完了を待つ
echo "Waiting for table to be created..."
aws dynamodb wait table-exists --table-name MadoSensorData

# TTL設定（1時間後に自動削除）
echo "Configuring TTL..."
aws dynamodb update-time-to-live \
  --table-name MadoSensorData \
  --time-to-live-specification \
    Enabled=true,AttributeName=ttl

echo "MadoSensorData table created successfully!"

# テーブル情報の表示
echo "Table description:"
aws dynamodb describe-table --table-name MadoSensorData --query 'Table.{Name:TableName,Status:TableStatus,ItemCount:ItemCount}' --output json