import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Box } from '@mui/material';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  return (
    <Authenticator
      formFields={{
        signIn: {
          username: {
            label: 'メールアドレス',
            placeholder: 'メールアドレスを入力',
            isRequired: true,
          },
          password: {
            label: 'パスワード',
            placeholder: 'パスワードを入力',
            isRequired: true,
          },
        },
        signUp: {
          email: {
            label: 'メールアドレス',
            placeholder: 'メールアドレスを入力',
            order: 1,
            isRequired: true,
          },
          password: {
            label: 'パスワード',
            placeholder: 'パスワードを入力',
            order: 2,
            isRequired: true,
          },
          confirm_password: {
            label: 'パスワード（確認）',
            placeholder: 'パスワードを再入力',
            order: 3,
            isRequired: true,
          },
        },
      }}
      components={{
        Header() {
          return (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <img src="/logo.png" alt="Logo" style={{ height: 60 }} />
            </Box>
          );
        },
      }}
    >
      {({ signOut, user }) => (
        <>
          {children}
        </>
      )}
    </Authenticator>
  );
};