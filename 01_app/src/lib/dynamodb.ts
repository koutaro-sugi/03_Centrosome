import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { fetchAuthSession } from "aws-amplify/auth";
import { nowJST, toJSTDateString } from "../utils/dateTime";

// デバッグログは開発環境のみ
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.log("AWS Config:", {
    region: process.env.REACT_APP_AWS_REGION,
    accessKeyId:
      process.env.REACT_APP_AWS_ACCESS_KEY_ID?.substring(0, 10) + "...",
    hasSecret: !!process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  });
}

// DynamoDBクライアントの設定（Amplify認証を使用）
const createDynamoDBClient = async () => {
  try {
    // Amplifyの認証セッションから認証情報を取得
    const session = await fetchAuthSession();
    
    if (session.tokens?.idToken) {
      // 認証されたユーザーの場合、Amplifyの認証情報を使用
      return new DynamoDBClient({
        region: process.env.REACT_APP_AWS_REGION || "ap-northeast-1",
        credentials: session.credentials,
      });
    } else {
      // 認証されていない場合、環境変数またはデフォルト認証を使用
      return new DynamoDBClient({
        region: process.env.REACT_APP_AWS_REGION || "ap-northeast-1",
        ...(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? {
          credentials: {
            accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
          },
        } : {}),
      });
    }
  } catch (error) {
    console.error('[DynamoDB] Failed to get auth session:', error);
    // フォールバック: 環境変数またはデフォルト認証を使用
    return new DynamoDBClient({
      region: process.env.REACT_APP_AWS_REGION || "ap-northeast-1",
      ...(process.env.REACT_APP_AWS_ACCESS_KEY_ID && process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? {
        credentials: {
          accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
        },
      } : {}),
    });
  }
};

// DocumentClientでJSONを直接扱えるように
export const createDynamoDBDocumentClient = async () => {
  const client = await createDynamoDBClient();
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true, // undefined値を自動的に削除
    },
  });
};

// 後方互換性のためのエクスポート
export const dynamodb = {
  send: async (command: any): Promise<any> => {
    const docClient = await createDynamoDBDocumentClient();
    return docClient.send(command);
  }
};

// 同期版のDynamoDBクライアント（非推奨だが後方互換性のため）
let cachedClient: DynamoDBDocumentClient | null = null;

const getCachedClient = async () => {
  if (!cachedClient) {
    cachedClient = await createDynamoDBDocumentClient();
  }
  return cachedClient;
};

// 既存のコードとの互換性を保つため、dynamodbを直接使用可能にする
export const dynamodbSync = {
  send: async (command: any): Promise<any> => {
    const client = await getCachedClient();
    return client.send(command);
  }
};

// テーブル名
export const TABLE_NAME =
  process.env.REACT_APP_DYNAMODB_TABLE || "CentrosomeData";

// エンティティタイプ
export enum EntityType {
  USER = "USER",
  AIRCRAFT = "AIRCRAFT",
  PLAN = "PLAN",
  FLIGHT = "FLIGHT",
  TELEMETRY = "TELEMETRY",
  FLIGHTLOG = "FLIGHTLOG",
  LOCATION = "LOCATION",
  PILOT = "PILOT",
}

// 型定義
export interface FlightPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  aircraft?: string;
  departure_code?: string; // 出発地のUASポートコード
  destination_code?: string; // 目的地のUASポートコード
  waypoints: any[]; // MissionPlannerの形式に従う
  createdAt: string;
  updatedAt: string;
  status: "draft" | "active" | "completed" | "archived";
  planData: any; // 元の.planファイルの内容
  overview?: {
    aircraft: string;
    duration: string;
    description: string;
  };
}

// キー生成ヘルパー
export const keys = {
  user: (userId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: "PROFILE",
  }),

  flightPlan: (userId: string, planId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: `${EntityType.PLAN}#${planId}`,
  }),

  // 日付でソートできるようにタイムスタンプを含める
  flightPlanWithDate: (userId: string, date: string, planId: string) => ({
    PK: `${EntityType.USER}#${userId}`,
    SK: `${EntityType.PLAN}#${date}#${planId}`,
  }),
};

// API関数
export const flightPlanAPI = {
  // フライトプランを保存
  async save(
    plan: Omit<FlightPlan, "createdAt" | "updatedAt">
  ): Promise<FlightPlan> {
    const now = nowJST();
    const fullPlan: FlightPlan = {
      ...plan,
      createdAt: now,
      updatedAt: now,
    };

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.flightPlanWithDate(plan.userId, toJSTDateString(now), plan.id),
        ...fullPlan,
        entityType: EntityType.PLAN,
      },
    });

    await dynamodb.send(command);
    return fullPlan;
  },

  // フライトプランを取得
  async get(userId: string, planId: string): Promise<FlightPlan | null> {
    // 日付が分からない場合は、QueryでSKをプレフィックス検索
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "id = :planId",
      ExpressionAttributeValues: {
        ":pk": `${EntityType.USER}#${userId}`,
        ":skPrefix": `${EntityType.PLAN}#`,
        ":planId": planId,
      },
    });

    const result = await dynamodb.send(command);
    return result.Items?.[0] as FlightPlan | null;
  },

  // ユーザーの全フライトプランを取得
  async listByUser(userId: string): Promise<FlightPlan[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": `${EntityType.USER}#${userId}`,
        ":skPrefix": `${EntityType.PLAN}#`,
      },
      ScanIndexForward: false, // 新しい順に取得
    });

    const result = await dynamodb.send(command);
    return (result.Items || []) as FlightPlan[];
  },

  // フライトプランを更新
  async update(
    userId: string,
    planId: string,
    updates: Partial<FlightPlan>
  ): Promise<void> {
    // まず既存のプランを取得してキーを特定
    const existingPlan = await this.get(userId, planId);
    if (!existingPlan) {
      throw new Error("Flight plan not found");
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: keys.flightPlanWithDate(
        userId,
        existingPlan.createdAt.split("T")[0],
        planId
      ),
      UpdateExpression:
        "SET #name = :name, #desc = :desc, #status = :status, #waypoints = :waypoints, #planData = :planData, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#name": "name",
        "#desc": "description",
        "#status": "status",
        "#waypoints": "waypoints",
        "#planData": "planData",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":name": updates.name || existingPlan.name,
        ":desc": updates.description || existingPlan.description,
        ":status": updates.status || existingPlan.status,
        ":waypoints": updates.waypoints || existingPlan.waypoints,
        ":planData": updates.planData || existingPlan.planData,
        ":updatedAt": new Date().toISOString(),
      },
    });

    await dynamodb.send(command);
  },

  // フライトプランを削除
  async delete(userId: string, planId: string): Promise<void> {
    const existingPlan = await this.get(userId, planId);
    if (!existingPlan) {
      throw new Error("Flight plan not found");
    }

    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: keys.flightPlanWithDate(
        userId,
        existingPlan.createdAt.split("T")[0],
        planId
      ),
    });

    await dynamodb.send(command);
  },
};
