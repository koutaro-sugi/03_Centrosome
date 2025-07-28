import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { 
  signIn,
  signOut,
  confirmSignIn,
  getCurrentUser,
  fetchAuthSession,
  SignInInput,
  SignInOutput,
  ConfirmSignInInput
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsNewPassword: boolean;
  error: Error | null;
}

interface AuthContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<SignInOutput>;
  signOut: () => Promise<void>;
  confirmNewPassword: (newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    needsNewPassword: false,
    error: null
  });

  // 認証状態の初期化
  const checkAuthState = useCallback(async () => {
    console.log('[AuthV2] Checking auth state...');
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (user && session.tokens?.idToken) {
        console.log('[AuthV2] User is authenticated');
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          needsNewPassword: false,
          error: null
        });
      } else {
        console.log('[AuthV2] User is not authenticated');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          needsNewPassword: false,
          error: null
        });
      }
    } catch (error) {
      console.log('[AuthV2] No authenticated user');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        needsNewPassword: false,
        error: null
      });
    }
  }, []);

  // サインイン
  const handleSignIn = useCallback(async (username: string, password: string): Promise<SignInOutput> => {
    console.log('[AuthV2] Sign in attempt');
    setAuthState(prev => ({ ...prev, error: null }));

    try {
      const result = await signIn({ username, password } as SignInInput);
      console.log('[AuthV2] Sign in result:', result);
      
      if (result.isSignedIn) {
        console.log('[AuthV2] User is fully signed in');
        await checkAuthState();
      } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('[AuthV2] New password required');
        setAuthState(prev => ({
          ...prev,
          needsNewPassword: true,
          isLoading: false
        }));
      }
      
      return result;
    } catch (error: any) {
      console.error('[AuthV2] Sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error as Error
      }));
      throw error;
    }
  }, [checkAuthState]);

  // 新しいパスワードの確認
  const confirmNewPassword = useCallback(async (newPassword: string) => {
    console.log('[AuthV2] Confirming new password');
    setAuthState(prev => ({ ...prev, error: null }));

    try {
      const input: ConfirmSignInInput = {
        challengeResponse: newPassword
      };
      
      const result = await confirmSignIn(input);
      console.log('[AuthV2] Confirm sign in result:', result);
      
      if (result.isSignedIn) {
        console.log('[AuthV2] Password changed successfully, user is signed in');
        setAuthState(prev => ({
          ...prev,
          needsNewPassword: false
        }));
        await checkAuthState();
      }
    } catch (error: any) {
      console.error('[AuthV2] Confirm new password error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error as Error
      }));
      throw error;
    }
  }, [checkAuthState]);

  // サインアウト
  const handleSignOut = useCallback(async () => {
    console.log('[AuthV2] Signing out');
    try {
      await signOut();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        needsNewPassword: false,
        error: null
      });
    } catch (error: any) {
      console.error('[AuthV2] Sign out error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error as Error
      }));
      throw error;
    }
  }, []);

  // エラーのクリア
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Hubイベントリスナー
  useEffect(() => {
    const hubListener = Hub.listen('auth', ({ payload }) => {
      console.log('[AuthV2] Hub event:', payload.event);
      switch (payload.event) {
        case 'signedIn':
          checkAuthState();
          break;
        case 'signedOut':
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            needsNewPassword: false,
            error: null
          });
          break;
      }
    });

    // 初期化
    checkAuthState();

    return () => hubListener();
  }, [checkAuthState]);

  const contextValue: AuthContextType = {
    ...authState,
    signIn: handleSignIn,
    signOut: handleSignOut,
    confirmNewPassword,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;