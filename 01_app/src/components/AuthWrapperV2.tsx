import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContextV2';
import { AuthComponent } from './AuthComponentV2';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, isLoading, needsNewPassword } = useAuth();

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

  // 未認証またはパスワード変更が必要な場合はログイン画面を表示
  if (!isAuthenticated || needsNewPassword) {
    return <AuthComponent />;
  }

  // 認証済みの場合は子コンポーネントをレンダリング
  return <>{children}</>;
};