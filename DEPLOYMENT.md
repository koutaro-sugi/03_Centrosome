# 🚀 Centra Weather Dashboard - Production Deployment Guide

## Overview

This guide provides **best practices** for deploying the Centra Weather Dashboard to AWS Amplify with full IAM permissions and CDK bootstrap setup.

## ✅ Prerequisites

- [x] AWS CLI installed and configured
- [x] Node.js 18+ and npm installed  
- [x] AWS Account with administrative access
- [x] GitHub repository access

## 🎯 Architecture

**Production Deployment Stack:**
- **Frontend**: React app hosted on Amplify Hosting
- **Backend**: AWS AppSync + DynamoDB + Lambda + Cognito
- **Authentication**: Cognito User Pool (permanent resources)
- **Real-time**: WebSocket subscriptions
- **Infrastructure**: CDK-based (AWS Cloud Development Kit)

## 🚀 Quick Start

### Automated Setup (Recommended)

```bash
# Clone and navigate to project
cd /path/to/03_Centra

# Run the complete setup script
./scripts/setup-production-deployment.sh
```

This script will:
1. ✅ Verify prerequisites
2. ✅ Setup CDK Bootstrap
3. ✅ Configure IAM permissions
4. ✅ Provide deployment instructions

### Manual Setup

If you prefer manual control:

#### 1. CDK Bootstrap

```bash
./scripts/setup-cdk-bootstrap.sh
```

#### 2. IAM Permissions

```bash
./scripts/setup-amplify-permissions.sh
```

#### 3. Amplify Console Setup

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. **Create new app** → **Host web app**
3. **Connect GitHub** → Select `03_Centrosome` → Branch: `main`
4. **App name**: `centra-weather-dashboard`
5. **Build settings**: Auto-detected from `amplify.yml`
6. **Service role**: Verify it has the new IAM policies
7. **Deploy**

## 🔧 Configuration

### Environment Variables

The app supports the following environment variables:

```bash
# API Configuration
REACT_APP_API_TIMEOUT=30000
REACT_APP_RETRY_ATTEMPTS=3

# Development
NODE_ENV=production
```

### Build Specification

The project uses `amplify.yml` for build configuration:

```yaml
version: 1
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
```

## 🔒 Security & Best Practices

### IAM Permissions

The deployment requires specific IAM permissions for:
- **CDK Bootstrap**: SSM Parameter access
- **CloudFormation**: Stack management
- **AWS Services**: Lambda, Cognito, AppSync, DynamoDB
- **S3**: CDK asset storage

### Authentication

- **User Pool**: `ap-northeast-1_5QLR2XnAb`
- **Client ID**: `6ks3s0hmq5bn1qrbc4q0oolnhr`
- **Test User**: `test@example.com` / `TestPass123!`

### Configuration Management

- ✅ **No hardcoded values**: Dynamic configuration loading
- ✅ **Type-safe**: TypeScript configuration management
- ✅ **Environment-aware**: Development vs Production settings
- ✅ **Auto-reload**: Configuration change detection

## 📋 Testing

### Authentication Test

1. Access the deployed URL
2. Login with test credentials:
   - Email: `test@example.com`
   - Password: `TestPass123!`
3. Navigate to Weather Dashboard
4. Verify M-X sensor data display

### Feature Testing

- ✅ **Real-time data**: M-X sensor updates
- ✅ **Authentication**: Login/logout flows
- ✅ **Navigation**: All pages accessible
- ✅ **Logbook**: Flight record creation
- ✅ **Google Sheets**: Integration working

## 🔍 Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Error
```
Error: SSM Parameter /cdk-bootstrap/hnb659fds/version not found
```
**Solution**: Run `./scripts/setup-cdk-bootstrap.sh`

#### 2. IAM Permission Denied
```
Error: AccessDeniedException - ssm:GetParameter
```
**Solution**: Run `./scripts/setup-amplify-permissions.sh`

#### 3. Build Timeout
```
Error: Command failed with exit code 1
```
**Solution**: Check CloudFormation events for detailed errors

### Debug Commands

```bash
# Check CDK Bootstrap status
aws ssm get-parameter --name "/cdk-bootstrap/hnb659fds/version" --region ap-northeast-1

# List IAM policies for Amplify role
aws iam list-attached-role-policies --role-name YOUR_AMPLIFY_ROLE

# Check CloudFormation stacks
aws cloudformation list-stacks --region ap-northeast-1
```

## 📞 Support

### Logs and Monitoring

- **Build logs**: Available in Amplify Console
- **CloudFormation**: Check stack events for deployment issues
- **CloudWatch**: Application and Lambda logs

### Documentation

- **AWS Amplify Gen2**: [Official Documentation](https://docs.amplify.aws/react/)
- **CDK Bootstrap**: [CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)
- **IAM Best Practices**: [AWS IAM Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

## 🎉 Success Checklist

- [ ] CDK Bootstrap completed
- [ ] IAM permissions configured
- [ ] Amplify app created and connected
- [ ] Build completes successfully
- [ ] Authentication works with test user
- [ ] Weather dashboard displays M-X data
- [ ] All features functional

**Congratulations! Your Centra Weather Dashboard is now deployed with production-ready best practices!** 🚀