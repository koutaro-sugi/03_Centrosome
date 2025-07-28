# Centra Madoセンサー統合ガイド

## 概要

このガイドでは、Centra Weather DashboardとMadoセンサー（M-X）の統合手順を説明します。

## 現在の構成

### AWS リソース

| リソース | 値 | 状態 |
|---------|-----|------|
| IoT Thing | M-X | ✅ 設定済み |
| IoT Endpoint | a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com | ✅ 設定済み |
| MQTTトピック | dt/mado/+/data | ✅ 設定済み |
| IoT Rule | MadoSensorDataToDynamoDB | ✅ 有効 |
| DynamoDB Table | MadoSensorData | ❌ 未作成 |
| AppSync API | amplifyData (nidyepulsvfwxki45wycbk5ae4) | ✅ 設定済み |
| Cognito User Pool | centra-prod-user-pool | ✅ 設定済み |

### 問題点

1. **DynamoDBテーブルが存在しない**
   - IoT RuleがMadoSensorDataテーブルに書き込もうとしているが、テーブルが存在しない
   - そのため、センサーデータが保存されていない

2. **AppSyncスキーマの確認が必要**
   - 既存のAppSync APIがセンサーデータ用のスキーマを持っているか不明

## セットアップ手順

### 1. DynamoDBテーブルの作成

```bash
# テーブル作成スクリプトを実行
bash /Users/koutarosugi/Developer/03_Centra/scripts/create-dynamodb-table.sh
```

### 2. 環境変数の設定

`.env`ファイルを作成し、以下の内容を設定：

```env
# AWS設定
REACT_APP_AWS_REGION=ap-northeast-1
REACT_APP_IOT_ENDPOINT=a12ai23qgl4xhl-ats.iot.ap-northeast-1.amazonaws.com
REACT_APP_APPSYNC_ENDPOINT=https://vsfj6mnadvadtbtem3v4z5jc6a.appsync-api.ap-northeast-1.amazonaws.com/graphql

# Cognito設定（実際の値に置き換えてください）
REACT_APP_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
REACT_APP_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXX

# DynamoDBテーブル
REACT_APP_DYNAMODB_TABLE=MadoSensorData
```

### 3. Cognitoユーザープールの確認

```bash
# ユーザープールの詳細を取得
aws cognito-idp list-user-pools --max-results 10 | grep centra-prod-user-pool -A 5
```

### 4. センサーデータの確認

テーブル作成後、以下のコマンドでデータが保存されているか確認：

```bash
# 最新のセンサーデータを確認
aws dynamodb scan --table-name MadoSensorData --limit 5 --scan-filter '{
  "device_id": {
    "AttributeValueList": [{"S": "M-X"}],
    "ComparisonOperator": "EQ"
  }
}'
```

### 5. IoT Coreでのリアルタイムモニタリング

AWS IoTコンソールのMQTTテストクライアントで以下のトピックをサブスクライブ：

```
dt/mado/+/data
```

## トラブルシューティング

### センサーデータが表示されない場合

1. **IoT Ruleのエラーを確認**
   ```bash
   aws iot get-topic-rule --rule-name MadoSensorDataToDynamoDB | jq '.rule.errorAction'
   ```

2. **CloudWatchログを確認**
   ```bash
   aws logs tail /aws/iot/rules/MadoSensorDataToDynamoDB --follow
   ```

3. **センサーの接続状態を確認**
   ```bash
   aws iot describe-thing --thing-name M-X
   ```

### 認証エラーが発生する場合

1. Cognitoユーザープールの設定を確認
2. AppSyncの認証設定を確認
3. トークンの有効期限を確認

## 次のステップ

1. **Lambda関数の作成**（オプション）
   - センサーデータの変換処理
   - 統計データの計算
   - AppSyncへのデータ配信

2. **アラート機能の実装**
   - しきい値を超えた場合の通知
   - SNSまたはメール通知

3. **データの可視化強化**
   - 長期間のデータ分析
   - 複数センサーの比較表示

## 参考リンク

- [AWS IoT Core ドキュメント](https://docs.aws.amazon.com/iot/)
- [AWS AppSync ドキュメント](https://docs.aws.amazon.com/appsync/)
- [DynamoDB ベストプラクティス](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)