import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  fetchAuthSession,
  confirmSignIn,
  getCurrentUser,
  AuthUser,
  JWT
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

// 認証状態の型定義
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
}

// 認証コンテキストの型定義
interface AuthContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  confirmNewPassword: (newPassword: string) => Promise<any>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// サインイン結果の型定義
interface SignInResult {
  isSignedIn: boolean;
  nextStep?: {
    signInStep: string;
  };
}

// トークンの有効期限チェック
const isTokenExpired = (token: JWT | undefined): boolean => {
  if (!token) return true;
  
  try {
    const payload = token.payload;
    const exp = payload.exp as number;
    const currentTime = Math.floor(Date.now() / 1000);
    // 5分前に期限切れとみなす（バッファ）
    return currentTime >= exp - 300;
  } catch {
    return true;
  }
};

// 認証エラークラス
class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// コンテキスト作成
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // リフレッシュ中フラグ（重複実行防止）
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<void> | null>(null);

  // 認証状態の初期化
  const initializeAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (user && session.tokens?.idToken && !isTokenExpired(session.tokens.idToken)) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.log('User not authenticated');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, []);

  // セッションのリフレッシュ
  const refreshSession = useCallback(async () => {
    // 既にリフレッシュ中の場合は既存のPromiseを返す
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;
    
    refreshPromise.current = (async () => {
      try {
        const session = await fetchAuthSession({ forceRefresh: true });
        
        if (!session.tokens?.idToken) {
          throw new AuthError('Failed to refresh session');
        }

        const user = await getCurrentUser();
        setAuthState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          error: null
        }));
      } catch (error) {
        console.error('Session refresh failed:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error as Error
        });
        throw error;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  // サインイン
  const signIn = useCallback(async (username: string, password: string): Promise<SignInResult> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await amplifySignIn({ username, password });
      
      if (result.isSignedIn) {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();
        
        if (!session.tokens?.idToken) {
          throw new AuthError('Failed to obtain authentication tokens');
        }

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        // パスワード変更が必要な場合、ローディングを解除
        setAuthState(prev => ({
          ...prev,
          isLoading: false
        }));
      }

      return result;
    } catch (error: any) {
      const authError = new AuthError(
        error.message || 'Sign in failed',
        error.name,
        error
      );
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: authError
      }));
      
      throw authError;
    }
  }, []);

  // サインアウト
  const signOut = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));

    try {
      await amplifySignOut({ global: true });
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      const authError = new AuthError(
        'Sign out failed',
        error.name,
        error
      );
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: authError
      }));
      
      throw authError;
    }
  }, []);

  // 新しいパスワードの確認
  const confirmNewPassword = useCallback(async (newPassword: string) => {
    console.log('[AuthContext] confirmNewPassword called');
    try {
      const result = await confirmSignIn({ 
        challengeResponse: newPassword
      });
      
      console.log('[AuthContext] confirmSignIn result:', result);
      
      if (result.isSignedIn) {
        // 認証成功後の初期化
        console.log('[AuthContext] User is signed in, fetching user data...');
        const user = await getCurrentUser();
        const session = await fetchAuthSession();
        
        console.log('[AuthContext] User:', user);
        console.log('[AuthContext] Session has tokens:', !!session.tokens?.idToken);
        
        if (session.tokens?.idToken) {
          console.log('[AuthContext] Setting authenticated state');
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } else {
          console.log('[AuthContext] No tokens found, setting unauthenticated state');
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      } else {
        console.log('[AuthContext] User is not signed in yet');
        setAuthState(prev => ({
          ...prev,
          isLoading: false
        }));
      }
      
      return result;
    } catch (error: any) {
      console.error('[AuthContext] confirmNewPassword error:', error);
      const authError = new AuthError(
        'Password confirmation failed',
        error.name,
        error
      );
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: authError
      }));
      
      throw authError;
    }
  }, []);

  // エラーのクリア
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Hubイベントリスナー
  useEffect(() => {
    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          initializeAuth();
          break;
        case 'signedOut':
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          break;
        case 'tokenRefresh':
        case 'tokenRefresh_failure':
          initializeAuth();
          break;
      }
    });

    // 初期化
    initializeAuth();

    return () => hubListener();
  }, [initializeAuth]);

  // トークンの定期チェック（5分ごと）
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const checkInterval = setInterval(async () => {
      try {
        const session = await fetchAuthSession();
        if (isTokenExpired(session.tokens?.idToken)) {
          await refreshSession();
        }
      } catch (error) {
        console.error('Token check failed:', error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(checkInterval);
  }, [authState.isAuthenticated, refreshSession]);

  const contextValue: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    confirmNewPassword,
    refreshSession,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// カスタムフック
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;