#!/bin/bash

# Amplify Fullstack Deployment - IAM Permissions Setup Script
# ベストプラクティス: 自動化されたIAM権限設定

set -e

echo "🚀 Amplify Fullstack Deployment - IAM Setup"
echo "=============================================="

# Variables
POLICY_NAME="AmplifyFullstackDeploymentPolicy"
POLICY_FILE="../iam-policy-amplify.json"
ROLE_NAME_PATTERN="AemiliaControlPlaneLambda-CodeBuildRole"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ Error: AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Get account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "ap-northeast-1")

echo "📋 Account ID: $ACCOUNT_ID"
echo "📋 Region: $REGION"

# Find Amplify CodeBuild Role
echo "🔍 Finding Amplify CodeBuild Role..."
ROLE_ARN=$(aws iam list-roles --query "Roles[?contains(RoleName, '$ROLE_NAME_PATTERN')].Arn" --output text)

if [ -z "$ROLE_ARN" ]; then
    echo "⚠️  Amplify CodeBuild Role not found with pattern: $ROLE_NAME_PATTERN"
    echo "📋 Available roles:"
    aws iam list-roles --query "Roles[?contains(RoleName, 'Amplify') || contains(RoleName, 'CodeBuild')].RoleName" --output table
    echo ""
    echo "🔧 Manual setup required:"
    echo "1. Go to AWS Console → IAM → Roles"
    echo "2. Search for your Amplify CodeBuild role"
    echo "3. Add the policy from: $POLICY_FILE"
    exit 1
fi

ROLE_NAME=$(echo $ROLE_ARN | cut -d'/' -f2)
echo "✅ Found role: $ROLE_NAME"
echo "   ARN: $ROLE_ARN"

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo "❌ Error: Policy file not found at $POLICY_FILE"
    exit 1
fi

# Create/Update the policy
echo "🔧 Creating/updating IAM policy: $POLICY_NAME"

# Check if policy already exists
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

if aws iam get-policy --policy-arn "$POLICY_ARN" &>/dev/null; then
    echo "📝 Policy exists, creating new version..."
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "file://$POLICY_FILE" \
        --set-as-default
    echo "✅ Policy updated"
else
    echo "📝 Creating new policy..."
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "file://$POLICY_FILE" \
        --description "Amplify Fullstack Deployment Permissions - CDK Bootstrap, CloudFormation, and AWS Services"
    echo "✅ Policy created"
fi

# Attach policy to role
echo "🔗 Attaching policy to role: $ROLE_NAME"
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "$POLICY_ARN"

echo "✅ Policy attached to role"

# Verify attachment
echo "🔍 Verifying policy attachment..."
if aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query "AttachedPolicies[?PolicyName=='$POLICY_NAME']" --output text | grep -q "$POLICY_NAME"; then
    echo "✅ Policy successfully attached"
else
    echo "❌ Error: Policy attachment verification failed"
    exit 1
fi

echo ""
echo "🎉 IAM Setup Complete!"
echo "=============================================="
echo "✅ Role: $ROLE_NAME"
echo "✅ Policy: $POLICY_NAME"
echo "✅ Policy ARN: $POLICY_ARN"
echo ""
echo "🚀 Next steps:"
echo "1. Go to AWS Amplify Console"
echo "2. Trigger a new deployment"
echo "3. Monitor the build logs for success"
echo ""
echo "📋 If deployment still fails, check:"
echo "   - CDK Bootstrap in region: $REGION"
echo "   - Additional IAM permissions may be needed"