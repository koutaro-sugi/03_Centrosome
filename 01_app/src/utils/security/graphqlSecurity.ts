/**
 * GraphQLセキュリティ設定
 * リクエストインターセプターと深度制限
 */

import { GraphQLError } from 'graphql';
import { sanitizeGraphQLParams } from './sanitizer';

// GraphQL深度制限設定
export const GRAPHQL_MAX_DEPTH = 10;
export const GRAPHQL_MAX_ALIASES = 15;
export const GRAPHQL_MAX_TOKENS = 1000;

/**
 * GraphQLクエリの深度を計算
 */
export const calculateQueryDepth = (query: any, depth: number = 0): number => {
  if (!query || typeof query !== 'object') {
    return depth;
  }

  let maxDepth = depth;

  Object.keys(query).forEach(key => {
    if (key === '__typename') return;
    
    const value = query[key];
    if (typeof value === 'object' && value !== null) {
      const currentDepth = calculateQueryDepth(value, depth + 1);
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  });

  return maxDepth;
};

/**
 * GraphQLクエリのエイリアス数をカウント
 */
export const countQueryAliases = (query: any): number => {
  if (!query || typeof query !== 'object') {
    return 0;
  }

  let aliasCount = 0;
  const queryString = JSON.stringify(query);
  const aliasMatches = queryString.match(/\w+\s*:/g);
  
  if (aliasMatches) {
    aliasCount = aliasMatches.length;
  }

  return aliasCount;
};

/**
 * GraphQLクエリの検証
 */
export const validateGraphQLQuery = (query: any): { valid: boolean; error?: string } => {
  try {
    // 深度チェック
    const depth = calculateQueryDepth(query);
    if (depth > GRAPHQL_MAX_DEPTH) {
      return {
        valid: false,
        error: `Query depth ${depth} exceeds maximum allowed depth of ${GRAPHQL_MAX_DEPTH}`,
      };
    }

    // エイリアス数チェック
    const aliasCount = countQueryAliases(query);
    if (aliasCount > GRAPHQL_MAX_ALIASES) {
      return {
        valid: false,
        error: `Query contains ${aliasCount} aliases, exceeding maximum of ${GRAPHQL_MAX_ALIASES}`,
      };
    }

    // トークン数チェック（簡易的な実装）
    const queryString = JSON.stringify(query);
    const tokenCount = queryString.split(/\s+/).length;
    if (tokenCount > GRAPHQL_MAX_TOKENS) {
      return {
        valid: false,
        error: `Query contains approximately ${tokenCount} tokens, exceeding maximum of ${GRAPHQL_MAX_TOKENS}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Query validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * GraphQLエラーハンドラー
 * セキュリティ関連のエラーを適切に処理
 */
export const handleGraphQLSecurityError = (error: GraphQLError): void => {
  // エラーメッセージからセンシティブな情報を除去
  const sanitizedMessage = error.message
    .replace(/User \d+/g, 'User [REDACTED]')
    .replace(/Token: .+/g, 'Token: [REDACTED]')
    .replace(/IP: \d+\.\d+\.\d+\.\d+/g, 'IP: [REDACTED]');

  console.error('GraphQL Security Error:', {
    message: sanitizedMessage,
    code: error.extensions?.code || 'UNKNOWN',
    timestamp: new Date().toISOString(),
  });

  // セキュリティイベントのログ記録（将来的にCloudWatchに送信）
  if (error.extensions?.code === 'UNAUTHENTICATED' || 
      error.extensions?.code === 'FORBIDDEN') {
    logSecurityEvent({
      type: 'graphql_auth_error',
      severity: 'warning',
      details: sanitizedMessage,
    });
  }
};

/**
 * セキュリティイベントのログ記録
 */
interface SecurityEvent {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: string;
  timestamp?: string;
  userId?: string;
}

export const logSecurityEvent = (event: SecurityEvent): void => {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // 開発環境ではコンソールに出力
  if (process.env.NODE_ENV === 'development') {
    console.log('[Security Event]', logEntry);
  }

  // 本番環境では CloudWatch や外部サービスに送信
  // TODO: CloudWatch Logs への送信実装
};

/**
 * レート制限の実装（簡易版）
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export const checkRateLimit = (
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      severity: 'warning',
      details: `Rate limit exceeded for ${identifier}`,
    });
    return false;
  }

  entry.count++;
  return true;
};

/**
 * セキュアなGraphQLクライアント設定
 */
export const createSecureGraphQLConfig = (authToken?: string) => {
  return {
    headers: {
      'Authorization': authToken ? `Bearer ${authToken}` : '',
      'X-Request-ID': generateRequestId(),
      'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
    },
    // リクエストインターセプター
    requestInterceptor: (request: any) => {
      // クエリの検証
      const validation = validateGraphQLQuery(request.query);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // パラメータのサニタイゼーション
      if (request.variables) {
        request.variables = sanitizeGraphQLParams(request.variables, GRAPHQL_MAX_DEPTH);
      }

      return request;
    },
    // レスポンスインターセプター
    responseInterceptor: (response: any) => {
      // エラーレスポンスの処理
      if (response.errors) {
        response.errors.forEach((error: GraphQLError) => {
          handleGraphQLSecurityError(error);
        });
      }

      return response;
    },
  };
};

/**
 * リクエストIDの生成
 */
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};