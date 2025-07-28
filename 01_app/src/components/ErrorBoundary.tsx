import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, Stack } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';
import { errorReporter } from '../utils/monitoring/errorReporting';
import { userTracker } from '../utils/monitoring/userTracking';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログをコンソールに出力
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // エラー情報を状態に保存
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // エラーレポーティングシステムに送信
    errorReporter.reportReactError(error, { componentStack: errorInfo.componentStack || '' });
    
    // ユーザートラッキング
    userTracker.track({
      category: 'Error',
      action: 'React Error Boundary',
      label: error.message
    });
  }

  handleReset = () => {
    // エラーカウントが多すぎる場合は完全リロード
    if (this.state.errorCount > 3) {
      userTracker.track({
        category: 'Error',
        action: 'force_reload',
        label: 'error_boundary'
      });
      window.location.reload();
      return;
    }

    userTracker.track({
      category: 'Error',
      action: 'reset_attempt',
      label: 'error_boundary',
      value: this.state.errorCount
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      // デフォルトのエラー画面
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f4f5f7',
            padding: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              padding: 4,
              maxWidth: 500,
              width: '100%',
              textAlign: 'center'
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 60,
                color: 'error.main',
                marginBottom: 2
              }}
            />
            
            <Typography variant="h5" gutterBottom>
              エラーが発生しました
            </Typography>
            
            <Typography 
              variant="body1" 
              color="text.secondary" 
              paragraph
            >
              申し訳ございません。予期しないエラーが発生しました。
            </Typography>

            {/* 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  backgroundColor: '#f5f5f5',
                  padding: 2,
                  borderRadius: 1,
                  marginY: 2,
                  textAlign: 'left'
                }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReset}
                disabled={this.state.errorCount > 3}
              >
                {this.state.errorCount > 3 ? 'リロードが必要です' : '再試行'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => window.location.href = '/'}
              >
                ホームに戻る
              </Button>
            </Stack>

            {this.state.errorCount > 1 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ marginTop: 2, display: 'block' }}
              >
                エラー回数: {this.state.errorCount}
              </Typography>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

// 非同期エラー用のカスタムフック
export const useAsyncError = () => {
  const [, setError] = React.useState();
  
  return React.useCallback(
    (error: Error) => {
      // 非同期エラーもレポート
      errorReporter.reportError(error, {
        component: 'AsyncError',
        action: 'useAsyncError'
      });
      
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
};