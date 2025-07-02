import React, { useState } from 'react';
import { signIn, confirmSignIn } from 'aws-amplify/auth';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  CircularProgress,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface AuthComponentProps {
  onAuthSuccess: () => void;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(6),
  maxWidth: 400,
  margin: 'auto',
  borderRadius: theme.spacing(2),
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
}));

const AuthComponent: React.FC<AuthComponentProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'newPassword'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Attempting to sign in with:', email);

    try {
      const result = await signIn({ username: email, password });
      console.log('Sign in result:', result);

      if (result.isSignedIn) {
        setSuccess(true);
        setTimeout(() => {
          onAuthSuccess();
        }, 500);
      } else if (
        result.nextStep?.signInStep ===
        'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      ) {
        // 新しいパスワードの設定が必要
        setMode('newPassword');
        setError('');
      } else {
        setError('予期しない認証ステップです: ' + result.nextStep?.signInStep);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);

      if (err.message?.includes('UserPool')) {
        setError('認証システムが設定されていません。');
      } else if (err.message?.includes('Incorrect username or password')) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else if (err.message?.includes('User does not exist')) {
        setError(
          'ユーザーが存在しません。管理者にアカウントの作成を依頼してください'
        );
      } else if (err.message?.includes('Password attempts exceeded')) {
        setError(
          'パスワード試行回数を超えました。しばらくしてからお試しください'
        );
      } else {
        setError(err.message || 'サインインに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上である必要があります');
      return;
    }

    setLoading(true);

    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      console.log('New password set result:', result);

      if (result.isSignedIn) {
        setSuccess(true);
        setTimeout(() => {
          onAuthSuccess();
        }, 500);
      } else {
        setError('パスワードの更新に失敗しました');
      }
    } catch (err: any) {
      console.error('New password error:', err);
      if (err.message?.includes('Password does not conform to policy')) {
        setError('パスワードは大文字、小文字、数字、記号を含む必要があります');
      } else {
        setError(err.message || 'パスワードの更新に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StyledPaper elevation={0}>
          <Typography
            variant="h5"
            align="center"
            gutterBottom
            sx={{ fontWeight: 600, mb: 4 }}
          >
            A1 FPV Console
          </Typography>

          {mode === 'signin' && (
            <>
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                管理者から提供されたアカウントでサインインしてください
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  サインインに成功しました
                </Alert>
              )}

              <form onSubmit={handleSignIn}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="メールアドレス"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading || success}
                    variant="outlined"
                    size="medium"
                    autoComplete="email"
                    autoFocus
                  />

                  <TextField
                    fullWidth
                    label="パスワード"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || success}
                    variant="outlined"
                    size="medium"
                    autoComplete="current-password"
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading || success || !email || !password}
                    sx={{
                      textTransform: 'none',
                      py: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : success ? (
                      'サインイン完了'
                    ) : (
                      'サインイン'
                    )}
                  </Button>
                </Stack>
              </form>
            </>
          )}

          {mode === 'newPassword' && (
            <>
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mb: 4 }}
              >
                初回ログインのため、新しいパスワードを設定してください
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  パスワードが更新されました
                </Alert>
              )}

              <form onSubmit={handleNewPassword}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="新しいパスワード"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading || success}
                    variant="outlined"
                    size="medium"
                    autoComplete="new-password"
                    helperText="8文字以上、大文字・小文字・数字・記号を含む"
                    autoFocus
                  />

                  <TextField
                    fullWidth
                    label="新しいパスワード（確認）"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    disabled={loading || success}
                    variant="outlined"
                    size="medium"
                    autoComplete="new-password"
                  />

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={
                      loading || success || !newPassword || !confirmNewPassword
                    }
                    sx={{
                      textTransform: 'none',
                      py: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : success ? (
                      'パスワード更新完了'
                    ) : (
                      'パスワードを更新'
                    )}
                  </Button>
                </Stack>
              </form>
            </>
          )}

          <Typography
            variant="caption"
            align="center"
            color="text.secondary"
            sx={{ display: 'block', mt: 4 }}
          >
            アカウントをお持ちでない方は、管理者にお問い合わせください
          </Typography>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default AuthComponent;
