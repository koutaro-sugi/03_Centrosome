import { defineBackend, defineFunction } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
// import { iotDataProcessor } from './backend/functions/iot-data-processor/resource';
import { Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
// import { createIoTPolicy, createIoTThingType, createIoTRuleRole, createIoTRule } from './backend/iot/resource';
// import { configureSensorDataTable, createSensorDataTableConfiguration, addTableMonitoring } from './backend/dynamodb/resource';

// Logbook to Sheets 関数を定義
const logbookToSheets = defineFunction({
  name: "logbook-to-sheets",
  entry: "./functions/logbook-to-sheets/handler.ts",
  runtime: 20,
  timeout: 60,
  memoryMB: 512,
});

export const backend = defineBackend({
  auth,
  data,
  logbookToSheets,
  // iotDataProcessor,
});

// 基本的な設定のみ（IoT設定は後で追加）
const stack = Stack.of(backend.auth.resources.authenticatedUserIamRole);
const region = stack.region;
const accountId = stack.account;

// DynamoDB table for UAS logbook spreadsheet mapping
const uasLogbookSheetsTable = new dynamodb.Table(stack, "UASLogbookSheets", {
  partitionKey: {
    name: "registrationNumber",
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  tableName: "UASLogbookSheets",
});

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

// Environment variables for logbook-to-sheets function
backend.logbookToSheets.resources.lambda.addEnvironment(
  "SHEETS_TEMPLATE_ID",
  process.env.SHEETS_TEMPLATE_ID || ""
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "UAS_LOGBOOK_TABLE",
  uasLogbookSheetsTable.tableName
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "GOOGLE_CREDENTIALS_JSON",
  process.env.GOOGLE_CREDENTIALS_JSON || ""
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "DRIVE_FOLDER_ID",
  process.env.DRIVE_FOLDER_ID || ""
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "SHARE_WITH_EMAILS",
  process.env.SHARE_WITH_EMAILS || ""
);
backend.logbookToSheets.resources.lambda.addEnvironment(
  "AIRCRAFT_TABLE",
  backend.data.resources.tables["Aircraft"].tableName
);

// Function URL with proper CORS configuration
const functionUrl = backend.logbookToSheets.resources.lambda.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ["*"],
    allowedMethods: [lambda.HttpMethod.ALL],
    allowedHeaders: ["*"],
  },
});

// 基本的な出力設定
backend.addOutput({
  custom: {
    awsRegion: {
      value: region,
      description: "AWS Region",
    },
    logbookToSheetsUrl: functionUrl.url,
  },
});
