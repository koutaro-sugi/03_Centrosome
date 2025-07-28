import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
// import { iotDataProcessor } from './backend/functions/iot-data-processor/resource';
import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
// import { createIoTPolicy, createIoTThingType, createIoTRuleRole, createIoTRule } from './backend/iot/resource';
// import { configureSensorDataTable, createSensorDataTableConfiguration, addTableMonitoring } from './backend/dynamodb/resource';

export const backend = defineBackend({
  auth,
  data,
  // iotDataProcessor,
});

// 基本的な設定のみ（IoT設定は後で追加）
const stack = Stack.of(backend.auth.resources.authenticatedUserIamRole);
const region = stack.region;
const accountId = stack.account;

// 基本的な出力設定
backend.addOutput({
  custom: {
    awsRegion: {
      value: region,
      description: 'AWS Region'
    }
  }
});