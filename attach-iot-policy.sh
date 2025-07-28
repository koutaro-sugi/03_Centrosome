#!/bin/bash

# Cognito Identity PoolのIDを設定
IDENTITY_POOL_ID="ap-northeast-1:551d91f8-9024-4fc8-ac2a-1b60c03ef986"
IOT_POLICY_NAME="CentraIoTPolicy"
REGION="ap-northeast-1"

echo "🔧 Cognito Identity PoolのすべてのIdentityにIoTポリシーをアタッチします"

# 最近のIdentityを取得（最大10個）
echo "📋 Identity一覧を取得中..."
IDENTITIES=$(aws cognito-identity list-identities \
  --identity-pool-id $IDENTITY_POOL_ID \
  --max-results 10 \
  --region $REGION \
  --profile default \
  --query 'Identities[].IdentityId' \
  --output text)

if [ -z "$IDENTITIES" ]; then
  echo "❌ Identityが見つかりません"
  exit 1
fi

echo "🔗 IoTポリシーをアタッチ中..."
for IDENTITY in $IDENTITIES; do
  echo "  - Identity: $IDENTITY"
  
  # IoTポリシーをアタッチ
  aws iot attach-policy \
    --policy-name $IOT_POLICY_NAME \
    --target $IDENTITY \
    --region $REGION \
    --profile default 2>/dev/null || echo "    (すでにアタッチ済み)"
done

echo "✅ 完了！"