import React, { createContext, useContext } from 'react';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

interface DynamoDBContextType {
  client: DynamoDBClient;
}

const DynamoDBContext = createContext<DynamoDBContextType | undefined>(undefined);

// DynamoDBクライアントの設定
const client = new DynamoDBClient({
  region: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
  },
});

export const DynamoDBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DynamoDBContext.Provider value={{ client }}>
      {children}
    </DynamoDBContext.Provider>
  );
};

export const useDynamoDB = () => {
  const context = useContext(DynamoDBContext);
  if (!context) {
    throw new Error('useDynamoDB must be used within a DynamoDBProvider');
  }
  return context;
};