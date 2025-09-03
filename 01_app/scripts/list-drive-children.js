#!/usr/bin/env node
/*
  List children of a Google Drive folder or shared drive root.
  Usage:
    node scripts/list-drive-children.js <folderIdOrUrl>

  Credentials:
    - Reads GOOGLE_CREDENTIALS_JSON from env, or
    - Reads SSM parameter at SSM_GOOGLE_CREDENTIALS_PATH (SecureString)
*/

const { google } = require('googleapis');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

async function loadCredentialsFromEnvOrSsm() {
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        if (creds.private_key) {
            creds.private_key = creds.private_key.replace(/\\n/g, '\n');
        }
        return creds;
    }
    const ssmPath = process.env.SSM_GOOGLE_CREDENTIALS_PATH || '/shared/google/sa-json';
    const region = process.env.AWS_REGION || 'ap-northeast-1';
    const ssm = new SSMClient({ region });
    const res = await ssm.send(new GetParameterCommand({ Name: ssmPath, WithDecryption: true }));
    const value = res.Parameter?.Value;
    if (!value) throw new Error(`SSM parameter not found: ${ssmPath}`);
    const creds = JSON.parse(value);
    if (creds.private_key) {
        creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    return creds;
}

function extractId(input) {
    if (!input) throw new Error('Missing folderIdOrUrl');
    if (input.includes('/')) {
        const m = input.match(/\/folders\/([^/?#]+)/);
        if (m) return m[1];
    }
    return input;
}

async function getDriveClient() {
    const credentials = await loadCredentialsFromEnvOrSsm();
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.readonly',
        ],
    });
    await auth.getClient();
    return google.drive({ version: 'v3', auth });
}

async function isSharedDrive(drive, id) {
    try {
        await drive.drives.get({ driveId: id });
        return true;
    } catch {
        return false;
    }
}

async function listChildren() {
    const arg = process.argv[2];
    if (!arg) {
        console.error('Usage: node scripts/list-drive-children.js <folderIdOrUrl>');
        process.exit(1);
    }
    const id = extractId(arg);
    const drive = await getDriveClient();
    const isDrive = await isSharedDrive(drive, id);

    let nextPageToken = undefined;
    const files = [];

    if (isDrive) {
        // List root of shared drive
        do {
            const res = await drive.files.list({
                corpora: 'drive',
                driveId: id,
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
                q: 'trashed = false',
                fields: 'nextPageToken, files(id,name,mimeType,parents,driveId)',
                pageSize: 1000,
                pageToken: nextPageToken,
            });
            files.push(...(res.data.files || []));
            nextPageToken = res.data.nextPageToken || undefined;
        } while (nextPageToken);
    } else {
        // List children of a folder
        do {
            const res = await drive.files.list({
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
                q: `'${id}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id,name,mimeType,parents,driveId)',
                pageSize: 1000,
                pageToken: nextPageToken,
            });
            files.push(...(res.data.files || []));
            nextPageToken = res.data.nextPageToken || undefined;
        } while (nextPageToken);
    }

    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const others = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    console.log('\nFolders:');
    folders.forEach(f => console.log(` - ${f.name} (${f.id})`));
    console.log('\nFiles:');
    others.forEach(f => console.log(` - ${f.name} (${f.id}) [${f.mimeType}]`));
}

listChildren().catch((e) => {
    console.error('Error:', e?.message || e);
    process.exit(1);
});

