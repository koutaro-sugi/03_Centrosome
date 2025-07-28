// Jest setup file for Lambda function tests

// AWS SDK mocks
const mockSend = jest.fn().mockResolvedValue({});
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  PutItemCommand: jest.fn()
}));

jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn().mockImplementation((obj) => obj)
}));

jest.mock('node-fetch', () => jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    data: {
      publishSensorData: {
        deviceId: 'test-device'
      }
    }
  })
}));