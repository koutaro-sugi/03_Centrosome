#!/bin/bash

# CDK Bootstrap Setup for Amplify Gen2
# ベストプラクティス: CDK Bootstrap環境準備

set -e

echo "🏗️ CDK Bootstrap Setup for Amplify Gen2"
echo "========================================"

# Get current AWS account and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "ap-northeast-1")

echo "📋 Account ID: $ACCOUNT_ID"
echo "📋 Region: $REGION"

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "📦 Installing AWS CDK..."
    npm install -g aws-cdk@latest
    echo "✅ AWS CDK installed"
else
    echo "✅ AWS CDK already installed: $(cdk --version)"
fi

# Check if already bootstrapped
echo "🔍 Checking CDK Bootstrap status..."
BOOTSTRAP_STACK_NAME="CDKToolkit"

if aws cloudformation describe-stacks --stack-name "$BOOTSTRAP_STACK_NAME" --region "$REGION" &>/dev/null; then
    echo "✅ CDK already bootstrapped in region: $REGION"
    
    # Check bootstrap version
    BOOTSTRAP_VERSION=$(aws ssm get-parameter --name "/cdk-bootstrap/hnb659fds/version" --region "$REGION" --query "Parameter.Value" --output text 2>/dev/null || echo "unknown")
    echo "📋 Bootstrap version: $BOOTSTRAP_VERSION"
    
    if [ "$BOOTSTRAP_VERSION" != "unknown" ] && [ "$BOOTSTRAP_VERSION" -ge "6" ]; then
        echo "✅ Bootstrap version is compatible (>= 6)"
    else
        echo "⚠️  Bootstrap version may be outdated, re-bootstrapping..."
        cdk bootstrap aws://$ACCOUNT_ID/$REGION
    fi
else
    echo "🚀 Bootstrapping CDK for region: $REGION"
    cdk bootstrap aws://$ACCOUNT_ID/$REGION
fi

# Verify bootstrap
echo "🔍 Verifying CDK Bootstrap..."
if aws ssm get-parameter --name "/cdk-bootstrap/hnb659fds/version" --region "$REGION" &>/dev/null; then
    VERSION=$(aws ssm get-parameter --name "/cdk-bootstrap/hnb659fds/version" --region "$REGION" --query "Parameter.Value" --output text)
    echo "✅ CDK Bootstrap verified - Version: $VERSION"
else
    echo "❌ Error: CDK Bootstrap verification failed"
    exit 1
fi

# Check S3 bucket
BUCKET_NAME="cdk-hnb659fds-assets-$ACCOUNT_ID-$REGION"
if aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
    echo "✅ CDK Assets bucket verified: $BUCKET_NAME"
else
    echo "❌ Error: CDK Assets bucket not found: $BUCKET_NAME"
    exit 1
fi

echo ""
echo "🎉 CDK Bootstrap Setup Complete!"
echo "================================="
echo "✅ Account: $ACCOUNT_ID"
echo "✅ Region: $REGION"
echo "✅ Bootstrap Version: $VERSION"
echo "✅ Assets Bucket: $BUCKET_NAME"
echo ""
echo "🚀 Ready for Amplify Fullstack Deployment!"