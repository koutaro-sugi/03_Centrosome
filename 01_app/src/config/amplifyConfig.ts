// Do NOT import amplify_outputs.json at build time.
// In Gen2 + hosting, amplify_outputs.json is served from public root at runtime.
// This module provides safe access helpers that won't break compile.

export type AmplifyOutputs = {
  custom?: {
    awsRegion?: string;
    awsIotEndpoint?: string;
    iotPolicyName?: string;
    [k: string]: any;
  };
  [k: string]: any;
};

let cachedOutputs: AmplifyOutputs | null = null;

export const loadAmplifyOutputs = async (): Promise<AmplifyOutputs> => {
  if (cachedOutputs) return cachedOutputs;
  // Try window-injected cache from App.tsx if present
  const anyWindow = window as any;
  if (anyWindow.__AMPLIFY_OUTPUTS__) {
    cachedOutputs = anyWindow.__AMPLIFY_OUTPUTS__ as AmplifyOutputs;
    return cachedOutputs;
  }
  // Fallback: fetch from public file
  const res = await fetch(`/amplify_outputs.json?v=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load amplify_outputs.json: ${res.status}`);
  cachedOutputs = (await res.json()) as AmplifyOutputs;
  anyWindow.__AMPLIFY_OUTPUTS__ = cachedOutputs;
  return cachedOutputs;
};

// IoT Core設定を取得するヘルパー関数（非同期）
export const getIoTConfig = async () => {
  const outputs = await loadAmplifyOutputs();
  const customConfig = outputs?.custom || {};
  return {
    endpoint: customConfig.awsIotEndpoint || process.env.REACT_APP_IOT_ENDPOINT,
    region: customConfig.awsRegion || process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
    policyName: customConfig.iotPolicyName,
  };
};

export default {} as AmplifyOutputs;
