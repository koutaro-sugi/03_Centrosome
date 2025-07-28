/**
 * セキュリティコンテキスト
 * Cognito認証との統合とトークン管理
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchAuthSession, AuthTokens } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';

interface SecurityContextType {
  isAuthenticated: boolean;
  authTokens: AuthTokens | null;
  refreshToken: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  lastTokenRefresh: Date | null;
  tokenExpiresAt: Date | null;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState<Date | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);

  /**
   * トークンの取得と検証
   */
  const fetchAndValidateTokens = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      
      if (session.tokens) {
        setAuthTokens(session.tokens);
        setIsAuthenticated(true);
        setLastTokenRefresh(new Date());
        
        // トークンの有効期限を計算
        if (session.tokens.accessToken?.payload?.exp) {
          const expiresAt = new Date(session.tokens.accessToken.payload.exp * 1000);
          setTokenExpiresAt(expiresAt);
          
          // 有効期限の5分前に自動リフレッシュを設定
          const refreshTime = expiresAt.getTime() - Date.now() - 5 * 60 * 1000;
          if (refreshTime > 0) {
            setTimeout(() => {
              refreshToken();
            }, refreshTime);
          }
        }
      } else {
        setIsAuthenticated(false);
        setAuthTokens(null);
        setTokenExpiresAt(null);
      }
    } catch (error) {
      console.error('Failed to fetch auth session:', error);
      setIsAuthenticated(false);
      setAuthTokens(null);
      setTokenExpiresAt(null);
    }
  }, []);

  /**
   * トークンのリフレッシュ
   */
  const refreshToken = useCallback(async () => {
    try {
      await fetchAndValidateTokens();
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      // リフレッシュ失敗時は再ログインを促す
      setIsAuthenticated(false);
    }
  }, [fetchAndValidateTokens]);

  /**
   * トークンの有効性を検証
   */
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.accessToken) {
        return false;
      }
      
      // トークンの有効期限をチェック
      const exp = session.tokens.accessToken.payload?.exp;
      if (exp) {
        const expiresAt = new Date(exp * 1000);
        if (expiresAt <= new Date()) {
          console.warn('Token expired');
          await refreshToken();
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }, [refreshToken]);

  /**
   * 初期化とイベントリスナーの設定
   */
  useEffect(() => {
    // 初期トークン取得
    fetchAndValidateTokens();

    // 認証イベントのリスナー設定
    const listener = Hub.listen('auth', async (data) => {
      switch (data.payload.event) {
        case 'signedIn':
        case 'tokenRefresh':
          await fetchAndValidateTokens();
          break;
        case 'signedOut':
          setIsAuthenticated(false);
          setAuthTokens(null);
          setTokenExpiresAt(null);
          break;
        case 'tokenRefresh_failure':
          console.error('Token refresh failed');
          setIsAuthenticated(false);
          break;
      }
    });

    // クリーンアップ
    return () => {
      listener();
    };
  }, [fetchAndValidateTokens]);

  /**
   * 定期的なトークン検証（1分ごと）
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isAuthenticated) {
        const isValid = await validateToken();
        if (!isValid) {
          console.warn('Token validation failed during periodic check');
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateToken]);

  return (
    <SecurityContext.Provider
      value={{
        isAuthenticated,
        authTokens,
        refreshToken,
        validateToken,
        lastTokenRefresh,
        tokenExpiresAt,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};