/**
 * エラーレポーティングシステム
 * グローバルエラーハンドリングとCloudWatchへの送信
 */

import { logger } from '../logger';
import { metrics } from './metrics';

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

/**
 * エラー報告クラス
 */
export class ErrorReporter {
  private static instance: ErrorReporter;
  private context: ErrorContext = {};
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  /**
   * 初期化処理
   */
  private initialize() {
    if (typeof window !== 'undefined' && !this.isInitialized) {
      // グローバルエラーハンドラー
      window.addEventListener('error', this.handleGlobalError.bind(this));
      
      // Promise rejectionハンドラー
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
      
      // React エラーバウンダリーからの呼び出しに対応
      this.isInitialized = true;
      
      logger.info('ErrorReporter', 'Error reporting initialized');
    }
  }

  /**
   * エラーコンテキストの設定
   */
  setContext(context: Partial<ErrorContext>) {
    this.context = { ...this.context, ...context };
  }

  /**
   * エラーの報告
   */
  reportError(error: Error, additionalContext?: Partial<ErrorContext>) {
    const fullContext = {
      ...this.context,
      ...additionalContext,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // エラーの分類
    const errorType = this.classifyError(error);
    
    // メトリクスの送信
    metrics.recordError(errorType, error, fullContext);
    
    // ログの記録
    logger.error('ErrorReporter', `${errorType}: ${error.message}`, error, fullContext);
    
    // エラーの詳細情報を収集
    const errorDetails = this.collectErrorDetails(error, fullContext);
    
    // 開発環境では詳細をコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report: ${errorType}`);
      console.error('Error:', error);
      console.table(errorDetails);
      console.groupEnd();
    }
  }

  /**
   * グローバルエラーハンドラー
   */
  private handleGlobalError(event: ErrorEvent) {
    const error = event.error || new Error(event.message);
    
    this.reportError(error, {
      component: 'Global',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  }

  /**
   * 未処理のPromise rejectionハンドラー
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.reportError(error, {
      component: 'Promise',
      action: 'unhandledRejection'
    });
  }

  /**
   * エラーの分類
   */
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    const name = error.name;
    
    // ネットワークエラー
    if (message.includes('network') || message.includes('fetch') || name === 'NetworkError') {
      return 'NetworkError';
    }
    
    // 認証エラー
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'AuthenticationError';
    }
    
    // 型エラー
    if (name === 'TypeError') {
      return 'TypeError';
    }
    
    // 参照エラー
    if (name === 'ReferenceError') {
      return 'ReferenceError';
    }
    
    // 構文エラー
    if (name === 'SyntaxError') {
      return 'SyntaxError';
    }
    
    // GraphQLエラー
    if (message.includes('graphql')) {
      return 'GraphQLError';
    }
    
    // その他
    return 'UnknownError';
  }

  /**
   * エラー詳細の収集
   */
  private collectErrorDetails(error: Error, context: ErrorContext): Record<string, any> {
    const details: Record<string, any> = {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context
    };
    
    // ブラウザ情報
    if (typeof window !== 'undefined') {
      details.browser = {
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      };
      
      // パフォーマンス情報
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        details.memory = {
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        };
      }
    }
    
    return details;
  }

  /**
   * React Error Boundaryからの報告
   */
  reportReactError(error: Error, errorInfo: { componentStack: string }) {
    this.reportError(error, {
      component: 'React',
      metadata: {
        componentStack: errorInfo.componentStack
      }
    });
  }

  /**
   * API エラーの報告
   */
  reportApiError(operation: string, error: Error, request?: any, response?: any) {
    this.reportError(error, {
      component: 'API',
      action: operation,
      metadata: {
        request: request ? JSON.stringify(request) : undefined,
        response: response ? JSON.stringify(response) : undefined,
        statusCode: response?.status
      }
    });
  }

  /**
   * カスタムエラーの報告
   */
  reportCustomError(category: string, message: string, metadata?: Record<string, any>) {
    const error = new Error(message);
    error.name = category;
    
    this.reportError(error, {
      component: 'Custom',
      metadata
    });
  }
}

// デフォルトエラーレポーターのエクスポート
export const errorReporter = ErrorReporter.getInstance();