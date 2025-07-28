import { defineFunction } from '@aws-amplify/backend';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Stack } from 'aws-cdk-lib';

// IoT Thingポリシーの定義
export const createIoTPolicy = (stack: Stack) => {
  const iotThingPolicy = new iot.CfnPolicy(stack, 'CentraIoTPolicy', {
    policyName: 'CentraIoTPolicy',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'iot:Connect',
            'iot:Publish',
            'iot:Subscribe',
            'iot:Receive',
            'iot:GetThingShadow',
            'iot:UpdateThingShadow'
          ],
          Resource: '*'
        }
      ]
    }
  });

  return iotThingPolicy;
};

// IoT Thing Type の定義（センサーデバイス用）
export const createIoTThingType = (stack: Stack) => {
  const thingType = new iot.CfnThingType(stack, 'MadoSensorThingType', {
    thingTypeName: 'MadoSensorDevice',
    thingTypeProperties: {
      thingTypeDescription: 'Thing type for Mado weather sensor devices',
      searchableAttributes: ['deviceId', 'location', 'sensorType']
    }
  });

  return thingType;
};

// Lambda IoT Rule用のIAMロール作成
export const createIoTRuleRole = (stack: Stack, lambdaFunction: lambda.Function) => {
  const iotRuleRole = new iam.Role(stack, 'IoTToLambdaRole', {
    assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
    inlinePolicies: {
      LambdaInvokePolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'lambda:InvokeFunction'
            ],
            resources: [lambdaFunction.functionArn]
          })
        ]
      })
    }
  });

  return iotRuleRole;
};

// IoT Ruleの作成（センサーデータをLambda関数に送信）
export const createIoTRule = (stack: Stack, roleArn: string, lambdaFunction: lambda.Function) => {
  const iotRule = new iot.CfnTopicRule(stack, 'MadoSensorDataToLambda', {
    ruleName: 'MadoSensorDataToLambda',
    topicRulePayload: {
      sql: "SELECT *, timestamp() as timestamp, topic(3) as deviceId FROM 'dt/mado/+/data'",
      description: 'Process Mado sensor data through Lambda function',
      actions: [
        {
          lambda: {
            functionArn: lambdaFunction.functionArn
          }
        }
      ],
      ruleDisabled: false,
      errorAction: {
        cloudwatchLogs: {
          logGroupName: '/aws/iot/rule/MadoSensorDataToLambda/error',
          roleArn: roleArn
        }
      }
    }
  });

  // Lambda関数にIoT Coreからの呼び出し許可を追加
  lambdaFunction.addPermission('IoTRuleInvokePermission', {
    principal: new iam.ServicePrincipal('iot.amazonaws.com'),
    sourceArn: iotRule.attrArn
  });

  return iotRule;
};