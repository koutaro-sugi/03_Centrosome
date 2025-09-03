#!/usr/bin/env node
const { google } = require('googleapis');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

async function loadCredentials() {
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
        const c = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        if (c.private_key) c.private_key = c.private_key.replace(/\\n/g, '\n');
        return c;
    }
    const ssmPath = process.env.SSM_GOOGLE_CREDENTIALS_PATH || '/shared/google/sa-json';
    const region = process.env.AWS_REGION || 'ap-northeast-1';
    const ssm = new SSMClient({ region });
    const res = await ssm.send(new GetParameterCommand({ Name: ssmPath, WithDecryption: true }));
    const c = JSON.parse(res.Parameter?.Value || '{}');
    if (c.private_key) c.private_key = c.private_key.replace(/\\n/g, '\n');
    return c;
}

async function getDrive() {
    const auth = new google.auth.GoogleAuth({
        credentials: await loadCredentials(),
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    await auth.getClient();
    return google.drive({ version: 'v3', auth });
}

function usage() {
    console.error('Usage: node scripts/move-drive-file.js <fileId> <destFolderId>');
    process.exit(2);
}

async function main() {
    const fileId = process.argv[2];
    const destFolderId = process.argv[3];
    if (!fileId || !destFolderId) usage();
    const drive = await getDrive();

    const meta = await drive.files.get({
        fileId,
        fields: 'parents,name',
        supportsAllDrives: true,
    });
    const parents = meta.data.parents || [];
    const removeParents = parents.join(',');

    const res = await drive.files.update({
        fileId,
        addParents: destFolderId,
        removeParents,
        supportsAllDrives: true,
        fields: 'id,parents',
    });
    console.log(JSON.stringify({ ok: true, id: res.data.id, parents: res.data.parents }, null, 2));
}

main().catch((e) => {
    console.error(JSON.stringify({ ok: false, error: e.message }, null, 2));
    process.exit(1);
});

