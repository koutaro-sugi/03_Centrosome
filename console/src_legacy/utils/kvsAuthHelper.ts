import { fetchAuthSession } from 'aws-amplify/auth';

export interface KVSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  getPromise?: () => Promise<void>;
}

/**
 * Create a credentials provider for KVS SDK
 * This wraps Amplify's auth session to provide credentials in the format KVS SDK expects
 */
export async function getKVSCredentials(): Promise<KVSCredentials> {
  try {
    // Try to get credentials from Amplify (Cognito)
    const session = await fetchAuthSession();

    if (session.credentials) {
      return {
        accessKeyId: session.credentials.accessKeyId,
        secretAccessKey: session.credentials.secretAccessKey,
        sessionToken: session.credentials.sessionToken,
        // KVS SDK expects this method for async credential refresh
        getPromise: async function (this: KVSCredentials) {
          const newSession = await fetchAuthSession({ forceRefresh: true });
          if (newSession.credentials) {
            Object.assign(this, {
              accessKeyId: newSession.credentials.accessKeyId,
              secretAccessKey: newSession.credentials.secretAccessKey,
              sessionToken: newSession.credentials.sessionToken,
            });
          }
        },
      };
    }
  } catch (error) {
    console.error('Failed to get Cognito credentials:', error);
  }

  // Fall back to environment variables
  if (
    import.meta.env.VITE_AWS_ACCESS_KEY_ID &&
    import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
  ) {
    return {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN,
    };
  }

  throw new Error('No AWS credentials available');
}

/**
 * Create a credential provider function for AWS SDK v3
 * This can be used with AWS SDK v3 clients directly
 */
export async function getCredentialProvider() {
  return async () => {
    const session = await fetchAuthSession();

    if (!session.credentials) {
      throw new Error('No credentials available');
    }

    return {
      accessKeyId: session.credentials.accessKeyId,
      secretAccessKey: session.credentials.secretAccessKey,
      sessionToken: session.credentials.sessionToken,
      expiration: session.credentials.expiration,
    };
  };
}
