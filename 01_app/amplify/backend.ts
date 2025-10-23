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
import * as fs from "fs";
import * as path from "path";
// import { createIoTPolicy, createIoTThingType, createIoTRuleRole, createIoTRule } from './backend/iot/resource';
// import { configureSensorDataTable, createSensorDataTableConfiguration, addTableMonitoring } from './backend/dynamodb/resource';

// 既存のLambda関数を参照するか、新規作成するかを環境変数で制御
const staticLogbookConfig = loadStaticLogbookConfig();
const referencedLambdaArn =
  process.env.LOGBOOK_TO_SHEETS_FUNCTION_ARN ||
  staticLogbookConfig.lambdaArn ||
  undefined;
const referencedLambdaUrl =
  process.env.LOGBOOK_TO_SHEETS_FUNCTION_URL ||
  staticLogbookConfig.lambdaUrl ||
  undefined;
const defaultAllowedOrigins = ["https://41dev.org", "http://localhost:3000"];
const envAllowedOrigins = parseOriginsFromString(
  process.env.LOGBOOK_ALLOWED_ORIGINS ||
    process.env.LOGBOOK_TO_SHEETS_ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGINS
);
const staticAllowedOrigins = staticLogbookConfig.allowedOrigins ?? [];
let resolvedAllowedOrigins =
  envAllowedOrigins.length > 0
    ? sanitizeAllowedOrigins(envAllowedOrigins)
    : staticAllowedOrigins.length > 0
      ? sanitizeAllowedOrigins(staticAllowedOrigins)
      : defaultAllowedOrigins;

if (resolvedAllowedOrigins.includes("*") && resolvedAllowedOrigins.length > 1) {
  resolvedAllowedOrigins = sanitizeAllowedOrigins(
    resolvedAllowedOrigins.filter((origin) => origin !== "*")
  );
}

if (resolvedAllowedOrigins.length === 0) {
  resolvedAllowedOrigins = defaultAllowedOrigins;
}

// 既存のユーザープールを参照するか、新規作成するかを環境変数で制御
const existingUserPoolId = process.env.EXISTING_USER_POOL_ID;
const existingUserPoolClientId = process.env.EXISTING_USER_POOL_CLIENT_ID;
const existingIdentityPoolId = process.env.EXISTING_IDENTITY_POOL_ID;

// 既存Lambda関数がある場合は参照のみ、ない場合は新規作成
const reuseExistingLambda = Boolean(referencedLambdaArn || referencedLambdaUrl);

const logbookToSheets = reuseExistingLambda
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
  const allowedOriginsEnv = resolvedAllowedOrigins.join(",");

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
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "LOGBOOK_ALLOWED_ORIGINS",
    allowedOriginsEnv
  );
  backend.logbookToSheets.resources.lambda.addEnvironment(
    "LOGBOOK_TO_SHEETS_ALLOWED_ORIGINS",
    allowedOriginsEnv
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
      allowedOrigins:
        resolvedAllowedOrigins.length > 0 ? resolvedAllowedOrigins : ["*"],
      allowedMethods: [lambda.HttpMethod.ALL],
      allowedHeaders: ["*"],
    },
  });
  logbookToSheetsUrl = functionUrl.url;
} else {
  // 既存Lambda関数を参照する場合
  logbookToSheetsUrl = referencedLambdaUrl || "";
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
    logbookToSheetsAllowedOrigins: {
      value: resolvedAllowedOrigins.join(","),
      description:
        "Comma-separated allowed origins for logbook-to-sheets Function URL",
    },
  },
});

interface StaticLogbookConfig {
  lambdaArn?: string;
  lambdaUrl?: string;
  allowedOrigins?: string[];
}

function loadStaticLogbookConfig(): StaticLogbookConfig {
  // 静的設定: Lambda ARN/URL と許可オリジンを直接定義
  return {
    lambdaArn:
      "arn:aws:lambda:ap-northeast-1:785197721624:function:amplify-centraweatherdash-logbooktosheetslambdaFAE-VHuRnApm2P8l",
    lambdaUrl:
      "https://gtps2ddwkk5ruvisryxsdlyriy0qzios.lambda-url.ap-northeast-1.on.aws/",
    allowedOrigins: [
      "https://41dev.org",
      "https://oma.41dev.org",
      "http://localhost:3000",
    ],
  };

  // 旧実装（correct_amplify_outputs.json を読み込んでいた）
  /*
  try {
    const configPath = path.join(__dirname, "..", "correct_amplify_outputs.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    const custom = parsed?.custom ?? {};

    const lambdaArn =
      typeof custom.logbookToSheetsArn === "string"
        ? custom.logbookToSheetsArn
        : undefined;
    const lambdaUrl =
      typeof custom.logbookToSheetsUrl === "string"
        ? custom.logbookToSheetsUrl
        : undefined;

    let allowedOrigins: string[] = [];
    if (Array.isArray(custom.logbookToSheetsAllowedOrigins)) {
      allowedOrigins = custom.logbookToSheetsAllowedOrigins;
    } else if (
      custom.logbookToSheetsAllowedOrigins &&
      typeof custom.logbookToSheetsAllowedOrigins === "object" &&
      Array.isArray(custom.logbookToSheetsAllowedOrigins.value)
    ) {
      allowedOrigins = custom.logbookToSheetsAllowedOrigins.value;
    } else if (typeof custom.logbookToSheetsAllowedOrigins === "string") {
      allowedOrigins = parseOriginsFromString(
        custom.logbookToSheetsAllowedOrigins
      );
    } else if (
      custom.logbookToSheetsAllowedOrigins &&
      typeof custom.logbookToSheetsAllowedOrigins === "object" &&
      typeof custom.logbookToSheetsAllowedOrigins.value === "string"
    ) {
      allowedOrigins = parseOriginsFromString(
        custom.logbookToSheetsAllowedOrigins.value
      );
    }

    return {
      lambdaArn,
      lambdaUrl,
      allowedOrigins: sanitizeAllowedOrigins(allowedOrigins),
    };
  } catch (_error) {
    return {};
  }
  */
}

function parseOriginsFromString(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function sanitizeAllowedOrigins(origins: string[]): string[] {
  const unique = origins
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .filter((origin, index, self) => self.indexOf(origin) === index);

  if (unique.includes("*") && unique.length > 1) {
    const withoutWildcard = unique.filter((origin) => origin !== "*");
    if (withoutWildcard.length > 0) {
      return withoutWildcard;
    }
    return ["*"];
  }

  return unique;
}
