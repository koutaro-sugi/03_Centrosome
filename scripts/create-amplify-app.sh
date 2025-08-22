#!/bin/bash

# Amplify App Creation and Configuration Script
# ベストプラクティス: 自動化されたAmplify App作成・設定

set -e

echo "🚀 Amplify App Creation and Configuration"
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}📋 $1${NC}"
}

# Variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "ap-northeast-1")
APP_NAME="centra-weather-dashboard"
ROLE_NAME="AmplifyServiceRole-CentraWeatherDashboard"

print_info "Account: $ACCOUNT_ID"
print_info "Region: $REGION"
print_info "App Name: $APP_NAME"

# Step 1: Check if service role exists
print_info "Checking for service role..."
if ! aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    print_error "Service role $ROLE_NAME does not exist!"
    print_info "Please run: ./scripts/create-amplify-service-role.sh first"
    exit 1
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
print_status "Service role found: $ROLE_ARN"

# Step 2: Check if app already exists
print_info "Checking for existing Amplify app..."
APP_ID=""
EXISTING_APPS=$(aws amplify list-apps --region "$REGION" --query "apps[?name=='$APP_NAME'].appId" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_APPS" ] && [ "$EXISTING_APPS" != "None" ]; then
    APP_ID="$EXISTING_APPS"
    print_warning "App already exists with ID: $APP_ID"
    
    # Update the service role for existing app
    print_info "Updating service role for existing app..."
    aws amplify update-app \
        --app-id "$APP_ID" \
        --iam-service-role "$ROLE_ARN" \
        --region "$REGION"
    print_status "Service role updated for existing app"
else
    # Step 3: Create new Amplify app
    print_info "Creating new Amplify app: $APP_NAME"
    
    # Create app configuration
    APP_CONFIG=$(cat << EOF
{
    "name": "$APP_NAME",
    "description": "Centra Weather Dashboard - Real-time weather monitoring with M-X sensor integration",
    "repository": "https://github.com/koutaro-sugi/03_Centrosome",
    "platform": "WEB",
    "iamServiceRole": "$ROLE_ARN",
    "environmentVariables": {
        "AMPLIFY_DIFF_DEPLOY": "false",
        "AMPLIFY_MONOREPO_APP_ROOT": "01_app"
    },
    "buildSpec": "version: 1\nbackend:\n  phases:\n    build:\n      commands:\n        - cd 01_app\n        - npm ci --cache .npm\n        - npx ampx pipeline-deploy --branch \\$AWS_BRANCH --app-id \\$AWS_APP_ID --debug\nfrontend:\n  phases:\n    preBuild:\n      commands:\n        - cd 01_app\n        - npm ci --cache .npm\n    build:\n      commands:\n        - npm run build\n  artifacts:\n    baseDirectory: 01_app/build\n    files:\n      - \"**/*\"\n  cache:\n    paths:\n      - 01_app/.npm/**/*\n      - 01_app/node_modules/**/*"
}
EOF
)
    
    # Create the app
    APP_RESULT=$(aws amplify create-app \
        --name "$APP_NAME" \
        --description "Centra Weather Dashboard - Real-time weather monitoring with M-X sensor integration" \
        --iam-service-role "$ROLE_ARN" \
        --platform "WEB" \
        --environment-variables "AMPLIFY_DIFF_DEPLOY=false,AMPLIFY_MONOREPO_APP_ROOT=01_app" \
        --region "$REGION")
    
    APP_ID=$(echo "$APP_RESULT" | jq -r '.app.appId')
    APP_ARN=$(echo "$APP_RESULT" | jq -r '.app.appArn')
    DEFAULT_DOMAIN=$(echo "$APP_RESULT" | jq -r '.app.defaultDomain')
    
    print_status "App created successfully!"
    print_info "App ID: $APP_ID"
    print_info "App ARN: $APP_ARN"
    print_info "Default Domain: $DEFAULT_DOMAIN"
fi

# Step 4: Create/Update build spec
print_info "Setting up build specification..."

BUILD_SPEC='version: 1
backend:
  phases:
    build:
      commands:
        - cd 01_app
        - npm ci --cache .npm
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --debug
frontend:
  phases:
    preBuild:
      commands:
        - cd 01_app
        - npm ci --cache .npm
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: 01_app/build
    files:
      - "**/*"
  cache:
    paths:
      - 01_app/.npm/**/*
      - 01_app/node_modules/**/*'

aws amplify update-app \
    --app-id "$APP_ID" \
    --build-spec "$BUILD_SPEC" \
    --region "$REGION"

print_status "Build specification updated"

# Step 5: Display next steps
echo ""
echo "🎉 Amplify App Setup Complete!"
echo "=============================="
print_status "App Name: $APP_NAME"
print_status "App ID: $APP_ID"
print_status "Service Role: $ROLE_NAME"
print_status "Region: $REGION"

echo ""
echo "📋 Next Steps - Manual Configuration Required:"
echo "============================================="
echo ""
echo "1. 🌐 Open Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
echo ""
echo "2. 🔗 Connect Repository:"
echo "   - Click 'Connect repository'"
echo "   - Choose 'GitHub'"
echo "   - Select repository: 03_Centrosome"
echo "   - Branch: main"
echo "   - Monorepo: 01_app"
echo ""
echo "3. ⚙️  Verify Build Settings:"
echo "   - Build specification should be auto-populated"
echo "   - Service role: $ROLE_NAME should be selected"
echo "   - Advanced settings → Environment variables:"
echo "     AMPLIFY_MONOREPO_APP_ROOT = 01_app"
echo ""
echo "4. 🚀 Deploy:"
echo "   - Click 'Save and deploy'"
echo "   - Monitor build logs for success"
echo ""
echo "5. 🎯 Test Deployment:"
echo "   - Access the deployed URL"
echo "   - Test authentication: test@example.com / TestPass123!"
echo "   - Verify Weather Dashboard functionality"

echo ""
print_info "App ID for reference: $APP_ID"
print_info "Console URL: https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"