import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/gen2/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
});

// Add KVS permissions to the authenticated role
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'kinesisvideo:GetSignalingChannelEndpoint',
      'kinesisvideo:GetICEServerConfig',
      'kinesisvideo:DescribeSignalingChannel',
      'kinesisvideo:ListSignalingChannels',
      'kinesisvideo:GetDataEndpoint',
      'kinesisvideo:GetHLSStreamingSessionURL',
      'kinesisvideo:GetDASHStreamingSessionURL',
      'kinesisvideo:ConnectAsViewer',
    ],
    resources: ['*'],
  })
);
