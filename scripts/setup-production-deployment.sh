#!/bin/bash

# Amplify Production Deployment - Complete Setup
# ベストプラクティス: 本格的なproduction環境セットアップ

set -e

echo "🚀 Amplify Production Deployment - Complete Setup"
echo "=================================================="
echo ""

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

# Check prerequisites
echo "🔍 Checking Prerequisites..."

if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI first."
    exit 1
fi
print_status "AWS CLI found"

if ! aws sts get-caller-identity &>/dev/null; then
    print_error "AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi
print_status "AWS CLI configured"

if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi
print_status "Node.js found: $(node --version)"

if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install npm first."
    exit 1
fi
print_status "npm found: $(npm --version)"

# Get AWS info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "ap-northeast-1")
print_info "Account: $ACCOUNT_ID"
print_info "Region: $REGION"

echo ""

# Step 1: CDK Bootstrap
echo "🏗️ Step 1: CDK Bootstrap Setup"
echo "=============================="
./scripts/setup-cdk-bootstrap.sh

echo ""

# Step 2: IAM Permissions
echo "🔧 Step 2: IAM Permissions Setup"
echo "================================"
./scripts/setup-amplify-permissions.sh

echo ""

# Step 3: Verify Amplify App
echo "🔍 Step 3: Amplify App Verification"
echo "=================================="

print_info "Checking for Amplify apps..."
APPS=$(aws amplify list-apps --region "$REGION" --query 'apps[].{Name:name,AppId:appId,Domain:defaultDomain}' --output table 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "$APPS"
    print_status "Amplify apps found"
else
    print_warning "Could not list Amplify apps. You may need to create the app manually."
fi

echo ""

# Step 4: Final Instructions
echo "🎯 Step 4: Deployment Instructions"
echo "=================================="

print_info "Manual steps to complete deployment:"
echo ""
echo "1. 🌐 Go to AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify/home?region=$REGION"
echo ""
echo "2. 📱 If app doesn't exist, create new app:"
echo "   - Choose 'Host web app'"
echo "   - Connect to GitHub: 03_Centrosome"
echo "   - Branch: main"
echo "   - App name: centra-weather-dashboard"
echo ""
echo "3. ⚙️  Build settings (should auto-detect amplify.yml):"
echo "   - Verify build specification is correct"
echo "   - Check service role has the new permissions"
echo ""
echo "4. 🚀 Deploy:"
echo "   - Click 'Save and deploy'"
echo "   - Monitor build logs for success"
echo ""
echo "5. 🎉 Test:"
echo "   - Access the deployed URL"
echo "   - Test authentication with: test@example.com / TestPass123!"
echo "   - Verify Weather Dashboard functionality"

echo ""
print_status "Production deployment setup complete!"
print_info "You can now deploy your Amplify fullstack application."

echo ""
echo "📋 Troubleshooting:"
echo "   - If build still fails, check IAM permissions in AWS Console"
echo "   - Verify CDK bootstrap version is >= 6"
echo "   - Check CloudFormation events for detailed error messages"