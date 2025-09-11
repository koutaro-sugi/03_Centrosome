#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseDotenv(content) {
  const out = {};
  content.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1);
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  });
  return out;
}

const dotenvPath = process.argv[2] || path.join('01_app', '.env');
const targetJson = process.argv[3] || path.join('scripts', 'amplify', 'env.auto.json');

const content = fs.readFileSync(dotenvPath, 'utf8');
const env = parseDotenv(content);

// pick REACT_APP_* plus known backend keys if present in .env
const picked = {};
for (const [k, v] of Object.entries(env)) {
  if (k.startsWith('REACT_APP_')) picked[k] = v;
}
['SHEETS_TEMPLATE_ID','DRIVE_FOLDER_ID','PARENT_DRIVE_FOLDER_ID','SHARE_WITH_EMAILS','SSM_GOOGLE_CREDENTIALS_PATH']
  .forEach((k) => { if (env[k]) picked[k] = env[k]; });

// default for SSM path if not provided
if (!picked.SSM_GOOGLE_CREDENTIALS_PATH) {
  picked.SSM_GOOGLE_CREDENTIALS_PATH = '/shared/google/sa-json';
}

fs.mkdirSync(path.dirname(targetJson), { recursive: true });
fs.writeFileSync(targetJson, JSON.stringify(picked, null, 2));
console.log(targetJson);

