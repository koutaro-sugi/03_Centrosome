import { defineAuth } from '@aws-amplify/backend';

// 既存のユーザープールを参照するか、新規作成するかを環境変数で制御
const existingUserPoolId = process.env.EXISTING_USER_POOL_ID;
const existingUserPoolClientId = process.env.EXISTING_USER_POOL_CLIENT_ID;
const existingIdentityPoolId = process.env.EXISTING_IDENTITY_POOL_ID;

export const auth = existingUserPoolId 
  ? defineAuth({
      loginWith: {
        email: true,
      },
      userAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      // 既存のユーザープールを参照
      userPoolId: existingUserPoolId,
      userPoolClientId: existingUserPoolClientId,
      identityPoolId: existingIdentityPoolId,
    })
  : defineAuth({
      loginWith: {
        email: true,
      },
      userAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    });