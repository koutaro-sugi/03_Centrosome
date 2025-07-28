import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { AuthComponent } from './AuthComponent';
// import { amplifyIotService } from '../services/amplifyIotService'; // 削除予定

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // IoT接続処理は削除（新しいWeather実装で対応）

  // ローディング中の表示
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          backgroundColor: '#f4f5f7'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // 未認証の場合はログイン画面を表示
  if (!isAuthenticated) {
    return <AuthComponent />;
  }

  // 認証済みの場合は子コンポーネントをレンダリング
  return <>{children}</>;
};