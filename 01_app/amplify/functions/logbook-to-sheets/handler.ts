import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { google } from "googleapis";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Constants
const ENTRY_ROW_START = 5;
const ENTRY_ROW_END = 19;
const TEMPLATE_SHEET_NAME = "00_Template";

// JST helpers
const TZ_OFFSET_MIN = 9 * 60;
function toJstDate(isoOrDate: string | Date): Date {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60 * 1000);
}
function toJstYmd(iso: string): string {
  const d = toJstDate(iso);
  return d.toISOString().slice(0, 10);
}
function toJstHHmm(iso: string): string {
  const d = toJstDate(iso);
  return d.toISOString().slice(11, 16);
}

// Google clients
async function getGoogleClients() {
  const credsRaw = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credsRaw) throw new Error("Missing GOOGLE_CREDENTIALS_JSON");
  const credentials = JSON.parse(credsRaw);
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  await auth.getClient();
  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}

// DDB mapping
function getDdb() {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  return DynamoDBDocumentClient.from(client);
}

async function getMappedSpreadsheetId(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  registrationNumber: string,
  aircraftId: string
): Promise<string | null> {
  const compositeKey = `${registrationNumber}#${aircraftId}`;
  const res = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { compositeKey },
    })
  );
  return (res.Item as any)?.spreadsheetId || null;
}

async function putMappedSpreadsheetId(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  registrationNumber: string,
  aircraftId: string,
  spreadsheetId: string
) {
  // JST時刻で更新日時を記録
  const now = new Date();
  const jstTime = new Date(now.getTime() + TZ_OFFSET_MIN * 60 * 1000);
  const compositeKey = `${registrationNumber}#${aircraftId}`;

  await ddb.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        compositeKey,
        registrationNumber,
        aircraftId,
        spreadsheetId,
        updatedAt: jstTime.toISOString(),
      },
    })
  );
}

async function deleteMappedSpreadsheetId(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  registrationNumber: string,
  aircraftId: string
) {
  const compositeKey = `${registrationNumber}#${aircraftId}`;
  await ddb.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { compositeKey },
    })
  );
}

// Create new spreadsheet from template into target folder
async function createSpreadsheetFromTemplate(
  drive: any,
  title: string,
  parentFolderIdOverride?: string
): Promise<string> {
  const templateId = process.env.SHEETS_TEMPLATE_ID;
  if (!templateId) throw new Error("Missing SHEETS_TEMPLATE_ID");

  // フォルダ分岐ロジック:
  // - フロントエンド指定時: PARENT_DRIVE_FOLDER_ID 直下（本番用）
  // - 未指定時: DRIVE_FOLDER_ID（テスト用サブフォルダ）
  const targetFolderId = parentFolderIdOverride
    ? process.env.PARENT_DRIVE_FOLDER_ID // フロントエンド: 本番用親フォルダ直下
    : process.env.DRIVE_FOLDER_ID; // CLI/テスト: テスト用サブフォルダ

  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: targetFolderId
      ? { name: title, parents: [targetFolderId] }
      : { name: title },
    supportsAllDrives: true,
  });
  const id = copy.data.id as string;
  if (!id) throw new Error("Failed to create spreadsheet");
  return id;
}

// Check if a spreadsheet is in Google Drive trash (or already deleted)
async function isSpreadsheetInTrash(
  drive: any,
  spreadsheetId: string
): Promise<boolean> {
  try {
    const meta = await drive.files.get({
      fileId: spreadsheetId,
      fields: "trashed",
      supportsAllDrives: true,
    });
    return Boolean(meta.data.trashed);
  } catch (_e) {
    // Treat not found as trashed/deleted to trigger recreation
    return true;
  }
}

async function listSheetNames(
  sheets: any,
  spreadsheetId: string
): Promise<string[]> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  return (meta.data.sheets || [])
    .map((s: any) => s.properties?.title)
    .filter(Boolean);
}

async function getTemplateSheetId(
  sheets: any,
  spreadsheetId: string
): Promise<number> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = (meta.data.sheets || []).find(
    (s: any) => s.properties?.title === TEMPLATE_SHEET_NAME
  );
  if (!sheet)
    throw new Error(`Template sheet not found: ${TEMPLATE_SHEET_NAME}`);
  return sheet.properties.sheetId as number;
}

async function duplicateTemplateAs(
  sheets: any,
  spreadsheetId: string,
  newSheetName: string
) {
  const templateSheetId = await getTemplateSheetId(sheets, spreadsheetId);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          duplicateSheet: {
            sourceSheetId: templateSheetId,
            newSheetName,
          },
        },
      ],
    },
  });
}

// Ensure spreadsheet uses JST and Japanese locale
async function ensureSpreadsheetSettings(sheets: any, spreadsheetId: string) {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSpreadsheetProperties: {
              properties: {
                timeZone: "Asia/Tokyo",
                locale: "ja_JP",
              },
              fields: "timeZone,locale",
            },
          },
        ],
      },
    });
  } catch (_e) {
    // non-fatal; proceed even if settings update fails
  }
}

async function findNextRow(
  sheets: any,
  spreadsheetId: string,
  tabName: string
): Promise<number | null> {
  const range = `${tabName}!B${ENTRY_ROW_START}:B${ENTRY_ROW_END}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: "ROWS",
  });
  const rows: string[][] = (res.data.values as string[][]) || [];
  const total = ENTRY_ROW_END - ENTRY_ROW_START + 1;
  for (let i = 0; i < total; i++) {
    const v = rows[i]?.[0] ?? "";
    if (String(v).trim() === "") return ENTRY_ROW_START + i;
  }
  return null;
}

async function findOrCreateTargetSheet(
  sheets: any,
  spreadsheetId: string,
  ymd: string
): Promise<{ tabName: string; nextRow: number }> {
  const names = await listSheetNames(sheets, spreadsheetId);
  const candidates = names
    .filter((n) => n.startsWith("飛行記録_") && n !== TEMPLATE_SHEET_NAME)
    .sort();
  for (const nm of candidates) {
    const row = await findNextRow(sheets, spreadsheetId, nm);
    if (row) return { tabName: nm, nextRow: row };
  }
  // create new sheet for the date
  const base = `飛行記録_${ymd}`;
  let newName = `${base}~`;
  let c = 2;
  while (names.includes(newName)) {
    newName = `${base}_${c}~`;
    c++;
  }
  await duplicateTemplateAs(sheets, spreadsheetId, newName);
  return { tabName: newName, nextRow: ENTRY_ROW_START };
}

function buildRow(flightLog: any): {
  date: string; // formula or string
  pilotName: string;
  summary: string;
  from: string;
  to: string;
  off: string; // formula or string
  on: string; // formula or string
  safety: string;
} {
  // Prefer DATE()/TIME() formulas for reliable calc in sheets
  const ymd = (
    flightLog.flightDate
      ? flightLog.flightDate
      : toJstYmd(flightLog.flightStartTime)
  ) as string | undefined;
  let dateFormula = "";
  if (ymd) {
    const [y, m, d] = ymd.split("-").map((v: string) => parseInt(v, 10));
    if (y && m && d) dateFormula = `=DATE(${y},${m},${d})`;
  }

  function toTimeFormula(iso?: string): string {
    if (!iso) return "";
    const hhmm = toJstHHmm(iso); // "HH:mm"
    const [h, mm] = hhmm.split(":").map((v) => parseInt(v, 10));
    if (Number.isFinite(h) && Number.isFinite(mm)) return `=TIME(${h},${mm},0)`;
    return "";
  }

  return {
    date: dateFormula || (ymd ?? ""),
    pilotName: flightLog.pilotName || "",
    summary: flightLog.flightPurpose || flightLog.remarks || "",
    from: flightLog.takeoffLocation?.name || "",
    to: flightLog.landingLocation?.name || "",
    off: toTimeFormula(flightLog.flightStartTime),
    on: toTimeFormula(flightLog.flightEndTime),
    safety: flightLog.safety || "",
  };
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  // Handle CORS preflight early
  const method = event?.requestContext?.http?.method || "";
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: "",
    };
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const flightLog = body.flightLog || {};
    const parentFolderIdOverride: string | undefined =
      body.folderId || undefined;
    const registrationNumber: string =
      body.registrationNumber || flightLog.registrationNumber;
    const aircraftId: string = body.aircraftId || flightLog.aircraftId || "";
    const aircraftName: string = body.aircraftName || "";
    if (!registrationNumber) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          ok: false,
          message: "registrationNumber is required",
        }),
      };
    }
    if (!aircraftId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          ok: false,
          message: "aircraftId is required",
        }),
      };
    }

    const { sheets, drive } = await getGoogleClients();

    // resolve or create spreadsheet per registrationNumber + aircraftId
    const tableName = process.env.UAS_LOGBOOK_TABLE;
    if (!tableName) throw new Error("Missing UAS_LOGBOOK_TABLE");
    const ddb = getDdb();
    let spreadsheetId = await getMappedSpreadsheetId(
      ddb,
      tableName,
      registrationNumber,
      aircraftId
    );

    if (spreadsheetId) {
      const trashed = await isSpreadsheetInTrash(drive, spreadsheetId);
      if (trashed) {
        await deleteMappedSpreadsheetId(
          ddb,
          tableName,
          registrationNumber,
          aircraftId
        );
        spreadsheetId = null as any;
      }
    }

    if (!spreadsheetId) {
      const title = aircraftName
        ? `${aircraftName}_飛行記録_${registrationNumber}`
        : `飛行記録_${registrationNumber}`;
      spreadsheetId = await createSpreadsheetFromTemplate(
        drive,
        title,
        parentFolderIdOverride
      );
      // Set timezone/locale for new spreadsheets
      await ensureSpreadsheetSettings(sheets, spreadsheetId);
      await putMappedSpreadsheetId(
        ddb,
        tableName,
        registrationNumber,
        aircraftId,
        spreadsheetId
      );
    }
    // Also enforce settings when reusing an existing sheet (idempotent)
    await ensureSpreadsheetSettings(sheets, spreadsheetId);

    const ymd = flightLog.flightDate
      ? flightLog.flightDate.replace(/-/g, "")
      : toJstYmd(flightLog.flightStartTime).replace(/-/g, "");
    const { tabName, nextRow } = await findOrCreateTargetSheet(
      sheets,
      spreadsheetId,
      ymd
    );

    const row = buildRow(flightLog);

    // Batch update: B, D, G, H, I, L, M, Q（O/Pは数式のため未挿入）
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: "USER_ENTERED",
        data: [
          // G2: 機体登録記号（テンプレにあるが念のため毎回設定）
          { range: `${tabName}!G2`, values: [[registrationNumber]] },
          { range: `${tabName}!B${nextRow}`, values: [[row.date]] },
          { range: `${tabName}!D${nextRow}`, values: [[row.pilotName]] },
          { range: `${tabName}!G${nextRow}`, values: [[row.summary]] },
          { range: `${tabName}!H${nextRow}`, values: [[row.from]] },
          { range: `${tabName}!I${nextRow}`, values: [[row.to]] },
          { range: `${tabName}!L${nextRow}`, values: [[row.off]] },
          { range: `${tabName}!M${nextRow}`, values: [[row.on]] },
          { range: `${tabName}!Q${nextRow}`, values: [[row.safety]] },
        ],
      },
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: true,
        spreadsheetId,
        tabName,
        nextRow: nextRow + 1,
      }),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: false,
        message: e.message || "Internal error",
      }),
    };
  }
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    // Allow all origins or restrict to your domains
    "Access-Control-Allow-Origin": "*",
    // Allow typical headers used by fetch
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Requested-With",
    // Allow required methods
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    // Cache preflight
    "Access-Control-Max-Age": "86400",
  };
}
