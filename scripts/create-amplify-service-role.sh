#!/bin/bash

# Amplify Service Role Creation Script
# ベストプラクティス: 自動化されたAmplify Service Role作成

set -e

echo "🏗️ Amplify Service Role Creation"
echo "================================"

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
ROLE_NAME="AmplifyServiceRole-CentraWeatherDashboard"
POLICY_NAME="AmplifyFullstackDeploymentPolicy"
POLICY_FILE="./iam-policy-amplify.json"

print_info "Account: $ACCOUNT_ID"
print_info "Region: $REGION"
print_info "Creating role: $ROLE_NAME"

# Step 1: Create Trust Policy for Amplify Service
echo "📝 Creating trust policy..."
TRUST_POLICY_FILE="/tmp/amplify-trust-policy.json"
cat > "$TRUST_POLICY_FILE" << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "amplify.amazonaws.com",
          "codebuild.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

print_status "Trust policy created"

# Step 2: Check if role already exists
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
    print_warning "Role $ROLE_NAME already exists"
    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
    print_info "Existing role ARN: $ROLE_ARN"
else
    # Create the IAM role
    print_info "Creating IAM role: $ROLE_NAME"
    ROLE_ARN=$(aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document "file://$TRUST_POLICY_FILE" \
        --description "Service role for Amplify Centra Weather Dashboard with full deployment permissions" \
        --query 'Role.Arn' \
        --output text)
    
    print_status "Role created: $ROLE_ARN"
fi

# Step 3: Create/Update custom policy
POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"

if aws iam get-policy --policy-arn "$POLICY_ARN" &>/dev/null; then
    print_info "Policy exists, creating new version..."
    aws iam create-policy-version \
        --policy-arn "$POLICY_ARN" \
        --policy-document "file://$POLICY_FILE" \
        --set-as-default
    print_status "Policy updated"
else
    print_info "Creating new policy..."
    aws iam create-policy \
        --policy-name "$POLICY_NAME" \
        --policy-document "file://$POLICY_FILE" \
        --description "Amplify Fullstack Deployment Permissions - CDK Bootstrap, CloudFormation, and AWS Services"
    print_status "Policy created"
fi

# Step 4: Attach AWS managed policies (required for Amplify)
echo "🔗 Attaching AWS managed policies..."

AWS_MANAGED_POLICIES=(
    "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"
    "arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess"
)

for policy in "${AWS_MANAGED_POLICIES[@]}"; do
    if aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query "AttachedPolicies[?PolicyArn=='$policy']" --output text | grep -q "$policy"; then
        print_info "Policy already attached: $(basename $policy)"
    else
        aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$policy"
        print_status "Attached policy: $(basename $policy)"
    fi
done

# Step 5: Attach custom policy
print_info "Attaching custom policy..."
if aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query "AttachedPolicies[?PolicyArn=='$POLICY_ARN']" --output text | grep -q "$POLICY_ARN"; then
    print_info "Custom policy already attached"
else
    aws iam attach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN"
    print_status "Custom policy attached"
fi

# Step 6: Wait for IAM consistency
print_info "Waiting for IAM consistency..."
sleep 10

# Step 7: Verify role and permissions
print_info "Verifying role setup..."
ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyName' --output text)
print_status "Role verification complete"

# Cleanup
rm -f "$TRUST_POLICY_FILE"

echo ""
echo "🎉 Amplify Service Role Setup Complete!"
echo "======================================="
print_status "Role Name: $ROLE_NAME"
print_status "Role ARN: $ROLE_ARN"
print_info "Attached Policies: $ATTACHED_POLICIES"

echo ""
echo "📋 Next Steps:"
echo "1. Use this role ARN in Amplify Console"
echo "2. Create or update your Amplify app with this service role"
echo "3. Ensure the role is selected in Build settings"

echo ""
echo "🔗 Role ARN for copy-paste:"
echo "$ROLE_ARN"