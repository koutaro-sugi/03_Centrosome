import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { google } from "googleapis";

// Constants
const TZ_OFFSET_MINUTES = 540; // JST = UTC+9 hours = 540 minutes
const ENTRY_ROW_START = 5;
const ENTRY_ROW_END = 19;
const TEMPLATE_SHEET_NAME = "00_Template";

// JST conversion helpers
function toJstDateStr(isoString: string): string {
  const date = new Date(isoString);
  const jstDate = new Date(date.getTime() + TZ_OFFSET_MINUTES * 60 * 1000);
  return jstDate.toISOString().split("T")[0]; // YYYY-MM-DD
}

function toJstYYYYMMDD(isoString: string): string {
  return toJstDateStr(isoString).replace(/-/g, ""); // YYYYMMDD
}

function toJstHHMM(isoString: string): string {
  const date = new Date(isoString);
  const jstDate = new Date(date.getTime() + TZ_OFFSET_MINUTES * 60 * 1000);
  return jstDate.toISOString().substr(11, 5); // HH:mm
}

// Google API clients
async function getSheetsClient() {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_CREDENTIALS_JSON environment variable is not set");
  }

  const credentials = JSON.parse(credentialsJson);
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  const googleAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  await googleAuth.getClient();
  return google.sheets({ version: "v4", auth: googleAuth });
}

async function getDriveClient() {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error("GOOGLE_CREDENTIALS_JSON environment variable is not set");
  }

  const credentials = JSON.parse(credentialsJson);
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  const googleAuth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  await googleAuth.getClient();
  return google.drive({ version: "v3", auth: googleAuth });
}

// Aircraft info from DynamoDB
async function getAircraftInfo(
  aircraftId: string
): Promise<{ name: string } | null> {
  const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const tableName = process.env.AIRCRAFT_TABLE;

  if (!tableName) {
    console.error("AIRCRAFT_TABLE environment variable not set");
    return null;
  }

  try {
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          aircraftId: { S: aircraftId },
        },
      })
    );

    if (response.Item) {
      return {
        name: response.Item.name?.S || "",
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching aircraft info:", error);
    return null;
  }
}

// Check if spreadsheet is in trash
async function isSpreadsheetInTrash(
  drive: any,
  spreadsheetId: string
): Promise<boolean> {
  try {
    const response = await drive.files.get({
      fileId: spreadsheetId,
      fields: "trashed",
      supportsAllDrives: true,
    });
    return response.data.trashed === true;
  } catch (error) {
    console.error("Error checking trash status:", error);
    return true; // Assume trashed if we can't check
  }
}

// Spreadsheet management
async function resolveSpreadsheetId(
  registrationNumber: string,
  aircraftName: string
): Promise<string> {
  const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const tableName = process.env.UAS_LOGBOOK_TABLE;

  if (!tableName) {
    throw new Error("UAS_LOGBOOK_TABLE environment variable not set");
  }

  try {
    // Check existing mapping
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          registrationNumber: { S: registrationNumber },
        },
      })
    );

    if (response.Item?.spreadsheetId?.S) {
      const existingId = response.Item.spreadsheetId.S;

      // Check if the existing spreadsheet is in trash
      const drive = await getDriveClient();
      const inTrash = await isSpreadsheetInTrash(drive, existingId);

      if (inTrash) {
        console.log(
          `Spreadsheet ${existingId} is in trash, deleting mapping and creating new one`
        );
        await dynamoClient.send(
          new DeleteItemCommand({
            TableName: tableName,
            Key: {
              registrationNumber: { S: registrationNumber },
            },
          })
        );
      } else {
        return existingId;
      }
    }

    // Create new spreadsheet
    const templateId = process.env.SHEETS_TEMPLATE_ID;
    if (!templateId) {
      throw new Error("SHEETS_TEMPLATE_ID environment variable not set");
    }

    const drive = await getDriveClient();
    const workbookTitle = `${aircraftName || "機体"}_飛行記録_${registrationNumber}`;

    const parentFolderId = process.env.DRIVE_FOLDER_ID;
    const copyRequest: any = {
      fileId: templateId,
      requestBody: {
        name: workbookTitle,
      },
      supportsAllDrives: true,
    };

    if (parentFolderId) {
      copyRequest.requestBody.parents = [parentFolderId];
    }

    const copyResponse = await drive.files.copy(copyRequest);
    const newSpreadsheetId = copyResponse.data.id;

    if (!newSpreadsheetId) {
      throw new Error("Failed to create new spreadsheet");
    }

    // Share with specified emails
    await ensureShareWithUsers(drive, newSpreadsheetId);

    // Save mapping
    await dynamoClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          registrationNumber: { S: registrationNumber },
          spreadsheetId: { S: newSpreadsheetId },
          aircraftName: { S: aircraftName || "" },
          createdAt: { S: new Date().toISOString() },
        },
      })
    );

    console.log(
      `Created new spreadsheet: ${newSpreadsheetId} for ${registrationNumber}`
    );
    return newSpreadsheetId;
  } catch (error) {
    console.error("Error resolving spreadsheet ID:", error);
    throw error;
  }
}

// Share spreadsheet with users
async function ensureShareWithUsers(drive: any, spreadsheetId: string) {
  const shareEmails = process.env.SHARE_WITH_EMAILS;
  if (!shareEmails) return;

  const emails = shareEmails.split(",").map((email) => email.trim());

  for (const email of emails) {
    if (email) {
      try {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: "writer",
            type: "user",
            emailAddress: email,
          },
          supportsAllDrives: true,
        });
        console.log(`Shared spreadsheet with ${email}`);
      } catch (error) {
        console.error(`Failed to share with ${email}:`, error);
      }
    }
  }
}

// Sheet cache management
let sheetListCache: any = null;

async function clearSheetCache() {
  sheetListCache = null;
}

// Flight log processing
function buildRowForSheet(flightLog: any): string[] {
  return [
    toJstDateStr(flightLog.flightStartTime), // A: 飛行年月日
    flightLog.pilotName || "", // B: 操縦者名
    flightLog.flightPurpose || "", // C: 飛行概要
    flightLog.takeoffLocation?.name || "", // D: 離陸場所
    flightLog.landingLocation?.name || "", // E: 着陸場所
    toJstHHMM(flightLog.flightStartTime), // F: 離陸時刻
    toJstHHMM(flightLog.flightEndTime), // G: 着陸時刻
    "", // H: 飛行時間 (formula)
    "", // I: 総飛行時間 (formula)
    flightLog.remarks || "", // J: 備考
  ];
}

// Find next available row in a sheet (check only column B)
async function findNextRow(
  sheets: any,
  spreadsheetId: string,
  tabName: string
): Promise<number | null> {
  try {
    // B列のみをチェック（数式が入っているO・P列を除外）
    const range = `${tabName}!B${ENTRY_ROW_START}:B${ENTRY_ROW_END}`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: "ROWS",
    });
    const rows: string[][] = (res.data.values as string[][]) || [];
    const totalRows = ENTRY_ROW_END - ENTRY_ROW_START + 1;
    for (let i = 0; i < totalRows; i++) {
      const cellValue = rows[i] ? rows[i][0] : "";
      const hasContent = (cellValue ?? "").toString().trim() !== "";
      if (!hasContent) {
        return ENTRY_ROW_START + i;
      }
    }
    return null; // full
  } catch (error) {
    console.error(`Failed to find next row in ${tabName}: ${error.message}`);
    return null;
  }
}

// Get all sheet names from a spreadsheet
async function getSheetNames(
  sheets: any,
  spreadsheetId: string
): Promise<string[]> {
  if (sheetListCache) {
    return sheetListCache;
  }

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "sheets(properties(title))",
    });
    const sheetNames =
      response.data.sheets?.map((sheet: any) => sheet.properties.title) || [];
    sheetListCache = sheetNames;
    return sheetNames;
  } catch (error) {
    console.error("Failed to get sheet names:", error);
    return [];
  }
}

// Calculate total flight minutes from previous sheets
async function getTotalMinutesBefore(
  sheets: any,
  spreadsheetId: string,
  currentSheetName: string
): Promise<number> {
  try {
    const sheetNames = await getSheetNames(sheets, spreadsheetId);
    let totalMinutes = 0;

    for (const sheetName of sheetNames) {
      if (sheetName === TEMPLATE_SHEET_NAME || sheetName === currentSheetName) {
        continue;
      }

      const range = `${sheetName}!O${ENTRY_ROW_START}:O${ENTRY_ROW_END}`;
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
          valueRenderOption: "UNFORMATTED_VALUE",
        });

        const values = response.data.values || [];
        for (const row of values) {
          if (row[0] && typeof row[0] === "number") {
            totalMinutes += row[0];
          }
        }
      } catch (rangeError) {
        console.warn(`Could not read range ${range}: ${rangeError.message}`);
      }
    }

    return totalMinutes;
  } catch (error) {
    console.error("Error calculating total minutes:", error);
    return 0;
  }
}

// Find or create available sheet
async function findOrCreateAvailableSheet(
  sheets: any,
  spreadsheetId: string,
  flightDate: string
): Promise<{ tabName: string; nextRow: number; created: boolean }> {
  const dateStr = toJstYYYYMMDD(flightDate);
  const sheetNames = await getSheetNames(sheets, spreadsheetId);

  // Filter and sort existing sheets by date
  const dateSheets = sheetNames
    .filter(
      (name) => name.startsWith("飛行記録_") && name !== TEMPLATE_SHEET_NAME
    )
    .sort();

  // Check existing sheets for available rows
  for (const sheetName of dateSheets) {
    const nextRow = await findNextRow(sheets, spreadsheetId, sheetName);
    if (nextRow !== null) {
      return { tabName: sheetName, nextRow, created: false };
    }
  }

  // Create new sheet if none available
  const baseName = `飛行記録_${dateStr}~`;
  let newSheetName = baseName;
  let counter = 2;

  while (sheetNames.includes(newSheetName)) {
    newSheetName = `飛行記録_${dateStr}_${counter}~`;
    counter++;
  }

  // Duplicate template sheet
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

  await clearSheetCache();

  return { tabName: newSheetName, nextRow: ENTRY_ROW_START, created: true };
}

// Get template sheet ID
async function getTemplateSheetId(
  sheets: any,
  spreadsheetId: string
): Promise<number> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title))",
  });

  const templateSheet = response.data.sheets?.find(
    (sheet: any) => sheet.properties.title === TEMPLATE_SHEET_NAME
  );

  if (!templateSheet) {
    throw new Error(`Template sheet "${TEMPLATE_SHEET_NAME}" not found`);
  }

  return templateSheet.properties.sheetId;
}

// Get previous sheet name for formula linking
async function getPreviousSheetName(
  sheets: any,
  spreadsheetId: string,
  currentSheetName: string
): Promise<string | null> {
  const sheetNames = await getSheetNames(sheets, spreadsheetId);
  const dateSheets = sheetNames
    .filter(
      (name) =>
        name.startsWith("飛行記録_") &&
        name !== TEMPLATE_SHEET_NAME &&
        name !== currentSheetName
    )
    .sort();

  return dateSheets.length > 0 ? dateSheets[dateSheets.length - 1] : null;
}

// Set flight time formulas
async function setFlightTimeFormulas(
  sheets: any,
  spreadsheetId: string,
  tabName: string,
  nextRow: number,
  isFirstRowInNewSheet: boolean
): Promise<void> {
  const flightTimeFormula = `=M${nextRow}-L${nextRow}`;

  let totalFlightTimeFormula;
  if (isFirstRowInNewSheet && nextRow === ENTRY_ROW_START) {
    const previousSheetName = await getPreviousSheetName(
      sheets,
      spreadsheetId,
      tabName
    );
    if (previousSheetName) {
      totalFlightTimeFormula = `='${previousSheetName}'!P19+O${nextRow}`;
    } else {
      totalFlightTimeFormula = `=O${nextRow}`;
    }
  } else {
    totalFlightTimeFormula = `=P${nextRow - 1}+O${nextRow}`;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${tabName}!O${nextRow}`,
          values: [[flightTimeFormula]],
        },
        {
          range: `${tabName}!P${nextRow}`,
          values: [[totalFlightTimeFormula]],
        },
      ],
    },
  });
}

// Main handler
export const handler = async (event: any) => {
  console.log("Event received:", JSON.stringify(event));

  try {
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { flightLog, registrationNumber, aircraftName } = body;

    if (!flightLog || !registrationNumber) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = await resolveSpreadsheetId(
      registrationNumber,
      aircraftName || ""
    );

    const { tabName, nextRow, created } = await findOrCreateAvailableSheet(
      sheets,
      spreadsheetId,
      flightLog.flightStartTime
    );

    const rowData = buildRowForSheet(flightLog);
    const range = `${tabName}!A${nextRow}:J${nextRow}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [rowData],
      },
    });

    // Set formulas for flight time calculation
    await setFlightTimeFormulas(
      sheets,
      spreadsheetId,
      tabName,
      nextRow,
      created && nextRow === ENTRY_ROW_START
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({
        ok: true,
        spreadsheetId,
        tabName,
        nextRow: nextRow + 1,
        created,
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
