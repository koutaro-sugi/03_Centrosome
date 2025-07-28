import outputs from '../amplify_outputs.json';

// IoT Core設定を取得するヘルパー関数
export const getIoTConfig = () => {
  const customConfig = (outputs as any).custom;
  return {
    endpoint: customConfig?.awsIotEndpoint,
    region: customConfig?.awsRegion || 'ap-northeast-1',
    policyName: customConfig?.iotPolicyName
  };
};

export default outputs;