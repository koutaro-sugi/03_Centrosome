#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_ALLOWED_ORIGINS = [
  "https://41dev.org",
  "http://localhost:3000",
];

const sourcePath = path.join(PROJECT_ROOT, "correct_amplify_outputs.json");
const amplifyDirPath = path.join(
  PROJECT_ROOT,
  "amplify",
  "amplify_outputs.json"
);
const rootPath = path.join(PROJECT_ROOT, "amplify_outputs.json");
const publicPath = path.join(
  PROJECT_ROOT,
  "public",
  "amplify_outputs.json"
);

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(
      `[sync-amplify-outputs] Failed to read ${filePath}: ${error.message}`
    );
    process.exitCode = 1;
    throw error;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function parseAllowedOrigins(rawValue) {
  if (!rawValue) return [];
  const items = Array.isArray(rawValue)
    ? rawValue
    : String(rawValue)
        .split(",")
        .map((origin) => origin.trim());
  const filtered = items
    .filter((origin) => origin.length > 0)
    .filter((origin, index, self) => self.indexOf(origin) === index);

  if (filtered.includes("*") && filtered.length > 1) {
    const withoutWildcard = filtered.filter((origin) => origin !== "*");
    return withoutWildcard.length > 0 ? withoutWildcard : ["*"];
  }

  return filtered;
}

function resolveAllowedOrigins(base) {
  const envValue =
    process.env.LOGBOOK_ALLOWED_ORIGINS ||
    process.env.LOGBOOK_TO_SHEETS_ALLOWED_ORIGINS ||
    process.env.ALLOWED_ORIGINS;

  const fromEnv = parseAllowedOrigins(envValue);
  if (fromEnv.length > 0) return fromEnv;

  const baseValue = base?.custom?.logbookToSheetsAllowedOrigins;
  const parsedBase = parseAllowedOrigins(baseValue);
  if (parsedBase.length > 0) return parsedBase;

  return DEFAULT_ALLOWED_ORIGINS;
}

function main() {
  const data = readJson(sourcePath);
  data.custom = data.custom || {};

  if (process.env.LOGBOOK_TO_SHEETS_FUNCTION_URL) {
    data.custom.logbookToSheetsUrl =
      process.env.LOGBOOK_TO_SHEETS_FUNCTION_URL;
  }

  if (process.env.LOGBOOK_TO_SHEETS_FUNCTION_ARN) {
    data.custom.logbookToSheetsArn =
      process.env.LOGBOOK_TO_SHEETS_FUNCTION_ARN;
  }

  data.custom.logbookToSheetsAllowedOrigins = resolveAllowedOrigins(data);

  const targets = [
    amplifyDirPath,
    rootPath,
    publicPath,
    path.join(PROJECT_ROOT, "src", "amplify_outputs.json"),
  ];

  targets.forEach((target) => writeJson(target, data));

  console.log(
    `[sync-amplify-outputs] Wrote amplify outputs to ${targets
      .map((p) => path.relative(PROJECT_ROOT, p))
      .join(", ")}`
  );
}

main();
