import { Amplify } from 'aws-amplify';

// 動的にAmplify設定を読み込み
const configureAmplify = async () => {
  try {
    // プロダクション環境用の設定
    const outputs = {
      version: '1',
      auth: {
        user_pool_id: 'ap-northeast-1_s6cMW37Ke',
        aws_region: 'ap-northeast-1',
        user_pool_client_id: '5u1b0p9ff13ids8mbgkvo3hkvt',
        identity_pool_id: 'ap-northeast-1:551d91f8-9024-4fc8-ac2a-1b60c03ef986',
        mfa_configuration: 'OFF',
        standard_required_attributes: ['email'],
        username_attributes: ['email'],
        user_verification_types: ['email'],
        mfa_methods: [],
        password_policy: {
          min_length: 8,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: true,
          require_uppercase: true,
        },
        unauthenticated_identities_enabled: false,
      },
    };

    Amplify.configure(outputs);
  } catch (error) {
    console.error('Amplify configuration error:', error);
    console.info('Using embedded configuration for production deployment.');
  }
};

// Amplifyを設定
configureAmplify();
