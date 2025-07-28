module.exports = {
  tables: [
    {
      TableName: 'CentraSensorData',
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'deviceId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
        { AttributeName: 'dataType', AttributeType: 'S' }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
      GlobalSecondaryIndexes: [
        {
          IndexName: 'deviceId-timestamp-index',
          KeySchema: [
            { AttributeName: 'deviceId', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        },
        {
          IndexName: 'deviceId-dataType-index',
          KeySchema: [
            { AttributeName: 'deviceId', KeyType: 'HASH' },
            { AttributeName: 'dataType', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        }
      ],
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      }
    }
  ],
  port: 8000
};