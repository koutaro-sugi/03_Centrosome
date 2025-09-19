import { defineBackend, defineFunction } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
// import { iotDataProcessor } from './backend/functions/iot-data-processor/resource';
import { Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cognito from "aws-cdk-lib/aws-cognito";
// import { createIoTPolicy, createIoTThingType, createIoTRuleRole, createIoTRule } from './backend/iot/resource';
// import { configureSensorDataTable, createSensorDataTableConfiguration, addTableMonitoring } from './backend/dynamodb/resource';

// 既存のLambda関数を参照するか、新規作成するかを環境変数で制御
const existingLambdaArn = process.env.LOGBOOK_TO_SHEETS_FUNCTION_ARN;
const existingLambdaUrl = process.env.LOGBOOK_TO_SHEETS_FUNCTION_URL;

// 既存のユーザープールを参照するか、新規作成するかを環境変数で制御
const existingUserPoolId = process.env.EXISTING_USER_POOL_ID;
const existingUserPoolClientId = process.env.EXISTING_USER_POOL_CLIENT_ID;
const existingIdentityPoolId = process.env.EXISTING_IDENTITY_POOL_ID;

// 既存Lambda関数がある場合は参照のみ、ない場合は新規作成
const logbookToSheets = existingLambdaArn
  ? undefined // 既存関数を参照する場合はdefineFunctionしない
  : defineFunction({
      name: "logbook-to-sheets",
      entry: "./functions/logbook-to-sheets/handler.ts",
      runtime: 20,
      timeoutSeconds: 60,
      memoryMB: 512,
    });

export const backend = defineBackend({
  auth,
  data,
  ...(logbookToSheets && { logbookToSheets }),
  // iotDataProcessor,
});

// 基本的な設定のみ（IoT設定は後で追加）
const stack = Stack.of(backend.auth.resources.authenticatedUserIamRole);

// 既存のユーザープールを参照する場合の処理
if (existingUserPoolId) {
  // 既存のユーザープールを参照
  const existingUserPool = cognito.UserPool.fromUserPoolId(
    stack,
    "ExistingUserPool",
    existingUserPoolId
  );

  // 既存のユーザープールクライアントを参照
  const existingUserPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
    stack,
    "ExistingUserPoolClient",
    existingUserPoolClientId || ""
  );

  // 既存のアイデンティティプールを参照
  const existingIdentityPool = cognito.CfnIdentityPool.fromCfnIdentityPoolId(
    stack,
    "ExistingIdentityPool",
    existingIdentityPoolId || ""
  );

  // 既存のリソースをAmplifyの出力として設定
  // Note: Amplify Gen2では既存リソースの出力は環境変数で制御
  console.log(`Using existing User Pool: ${existingUserPoolId}`);
  console.log(`Using existing User Pool Client: ${existingUserPoolClientId}`);
  console.log(`Using existing Identity Pool: ${existingIdentityPoolId}`);
}
const region = stack.region;
const accountId = stack.account;

// DynamoDB table for UAS logbook spreadsheet mapping
// Use existing table if present to avoid name collision across stacks
const uasLogbookTableName =
  process.env.UAS_LOGBOOK_TABLE_NAME || "UASLogbookSheets";
const uasLogbookSheetsTable = dynamodb.Table.fromTableName(
  stack,
  "UASLogbookSheets",
  uasLogbookTableName
);

// 既存Lambda関数がある場合は権限設定をスキップ
if (logbookToSheets) {
  // Grant logbook-to-sheets function access to the table
  backend.logbookToSheets.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      resources: [uasLogbookSheetsTable.tableArn],
    })
  );

  // Grant access to DynamoDB tables for aircraft lookup
  backend.logbookToSheets.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:GetItem", "dynamodb:Query"],
      resources: [backend.data.resources.tables["Aircraft"].tableArn],
    })
  );
}

// 既存Lambda関数がある場合は環境変数設定をスキップ
if (logbookToSheets) {
  // Environment variables for logbook-to-sheets function
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "SHEETS_TEMPLATE_ID",
    process.env.SHEETS_TEMPLATE_ID || ""
  );
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "UAS_LOGBOOK_TABLE",
    uasLogbookTableName
  );
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "DRIVE_FOLDER_ID",
    process.env.DRIVE_FOLDER_ID || ""
  );
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "PARENT_DRIVE_FOLDER_ID",
    process.env.PARENT_DRIVE_FOLDER_ID || ""
  );
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "SHARE_WITH_EMAILS",
    process.env.SHARE_WITH_EMAILS || ""
  );
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "AIRCRAFT_TABLE",
    backend.data.resources.tables["Aircraft"].tableName
  );

  // Centralized secret via SSM Parameter Store (SecureString)
  // Use SSM path from env at synth time, or default shared path
  const ssmGoogleCredentialsPath =
    process.env.SSM_GOOGLE_CREDENTIALS_PATH || "/shared/google/sa-json";

  // Configure Amplify runtime shim to resolve SSM parameters into env vars at cold start and refresh
  const amplifySsmEnvConfig = JSON.stringify({
    GOOGLE_CREDENTIALS_JSON: {
      path: ssmGoogleCredentialsPath,
      sharedPath: ssmGoogleCredentialsPath,
    },
  });

  backend.logbookToSheets.resources.lambda.addEnvironment(
    "AMPLIFY_SSM_ENV_CONFIG",
    amplifySsmEnvConfig
  );

  // Grant SSM read permissions (restrict to shared/google/* path) and KMS decrypt
  backend.logbookToSheets.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
      ],
      resources: [
        `arn:aws:ssm:${region}:${accountId}:parameter/shared/google/*`,
        `arn:aws:ssm:${region}:${accountId}:parameter${ssmGoogleCredentialsPath.startsWith("/") ? ssmGoogleCredentialsPath : "/" + ssmGoogleCredentialsPath}`,
      ],
    })
  );

  backend.logbookToSheets.resources.lambda.addToRolePolicy(
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["kms:Decrypt"],
      resources: ["*"],
    })
  );
}

// Function URL設定と出力
let logbookToSheetsUrl: string;

if (logbookToSheets) {
  // 新規作成するLambda関数の場合
  const functionUrl = backend.logbookToSheets.resources.lambda.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.NONE,
    cors: {
      allowedOrigins: ["*"],
      allowedMethods: [lambda.HttpMethod.ALL],
      allowedHeaders: ["*"],
    },
  });
  logbookToSheetsUrl = functionUrl.url;
} else {
  // 既存Lambda関数を参照する場合
  logbookToSheetsUrl = existingLambdaUrl || "";
}

// 基本的な出力設定
backend.addOutput({
  custom: {
    awsRegion: {
      value: region,
      description: "AWS Region",
    },
    logbookToSheetsUrl: logbookToSheetsUrl,
    parentFolderId: {
      value: process.env.PARENT_DRIVE_FOLDER_ID || "",
      description:
        "Google Drive parent folder ID for frontend-created workbooks",
    },
  },
});
