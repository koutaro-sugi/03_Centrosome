/**
 * ユーザー操作トラッキング
 * ユーザーのアクションと行動パターンの追跡
 */

import { logger } from '../logger';
import { metrics } from './metrics';

// トラッキングイベントの型定義
export interface TrackingEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

// ページビュー情報
export interface PageViewEvent {
  path: string;
  title: string;
  referrer?: string;
  duration?: number;
}

// ユーザーセッション情報
interface UserSession {
  sessionId: string;
  startTime: number;
  pageViews: number;
  events: number;
  lastActivity: number;
}

/**
 * ユーザートラッキングクラス
 */
export class UserTracker {
  private static instance: UserTracker;
  private session: UserSession;
  private pageStartTime: number = Date.now();
  private isEnabled: boolean;

  private constructor() {
    this.isEnabled = process.env.NODE_ENV === 'production';
    this.session = this.initializeSession();
    this.setupPageTracking();
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(): UserTracker {
    if (!UserTracker.instance) {
      UserTracker.instance = new UserTracker();
    }
    return UserTracker.instance;
  }

  /**
   * セッションの初期化
   */
  private initializeSession(): UserSession {
    const sessionId = this.getOrCreateSessionId();
    
    return {
      sessionId,
      startTime: Date.now(),
      pageViews: 0,
      events: 0,
      lastActivity: Date.now()
    };
  }

  /**
   * セッションIDの取得または作成
   */
  private getOrCreateSessionId(): string {
    const SESSION_KEY = 'centra_session_id';
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分
    
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const { id, timestamp } = JSON.parse(stored);
        
        // セッションタイムアウトチェック
        if (Date.now() - timestamp < SESSION_TIMEOUT) {
          return id;
        }
      }
    } catch (error) {
      logger.debug('UserTracker', 'Failed to retrieve session ID', { error });
    }
    
    // 新しいセッションIDを生成
    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: newId,
        timestamp: Date.now()
      }));
    } catch (error) {
      logger.debug('UserTracker', 'Failed to store session ID', { error });
    }
    
    return newId;
  }

  /**
   * ページトラッキングのセットアップ
   */
  private setupPageTracking() {
    if (typeof window === 'undefined') return;

    // ページ離脱時の処理
    window.addEventListener('beforeunload', () => {
      this.trackPageDuration();
    });

    // ページ表示/非表示の追跡
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackPageDuration();
      } else {
        this.pageStartTime = Date.now();
      }
    });
  }

  /**
   * イベントのトラッキング
   */
  track(event: TrackingEvent) {
    if (!this.isEnabled) {
      logger.debug('UserTracker', 'Tracking event', event);
      return;
    }

    this.session.events++;
    this.session.lastActivity = Date.now();

    // イベントログの記録
    logger.info('UserTracking', `${event.category} - ${event.action}`, {
      ...event,
      sessionId: this.session.sessionId
    });

    // メトリクスの送信
    metrics.putMetric(
      `UserEvent.${event.category}.${event.action}`,
      event.value || 1,
      'Count',
      {
        Operation: event.label || 'default'
      }
    );
  }

  /**
   * ページビューのトラッキング
   */
  trackPageView(event: PageViewEvent) {
    if (!this.isEnabled) {
      logger.debug('UserTracker', 'Page view', event);
      return;
    }

    this.session.pageViews++;
    this.pageStartTime = Date.now();

    // ページビューログの記録
    logger.info('UserTracking', 'Page View', {
      ...event,
      sessionId: this.session.sessionId,
      pageNumber: this.session.pageViews
    });

    // ページビューメトリクスの送信
    metrics.putMetric('PageView', 1, 'Count', {
      Operation: event.path
    });
  }

  /**
   * ページ滞在時間のトラッキング
   */
  private trackPageDuration() {
    const duration = Date.now() - this.pageStartTime;
    
    if (duration > 1000) { // 1秒以上の滞在のみ記録
      metrics.putMetric(
        'PageDuration',
        duration,
        'Milliseconds',
        {
          Operation: window.location.pathname
        }
      );
    }
  }

  /**
   * クリックイベントのトラッキング
   */
  trackClick(elementType: string, elementId?: string, metadata?: Record<string, any>) {
    this.track({
      category: 'UI',
      action: 'click',
      label: elementType,
      metadata: {
        elementId,
        ...metadata
      }
    });
  }

  /**
   * フォーム送信のトラッキング
   */
  trackFormSubmit(formName: string, success: boolean, metadata?: Record<string, any>) {
    this.track({
      category: 'Form',
      action: success ? 'submit_success' : 'submit_error',
      label: formName,
      metadata
    });
  }

  /**
   * 検索のトラッキング
   */
  trackSearch(searchQuery: string, resultCount: number, metadata?: Record<string, any>) {
    this.track({
      category: 'Search',
      action: 'perform',
      label: searchQuery.substring(0, 50), // 最初の50文字のみ
      value: resultCount,
      metadata
    });
  }

  /**
   * API呼び出しのトラッキング
   */
  trackApiCall(operation: string, success: boolean, duration: number) {
    this.track({
      category: 'API',
      action: success ? 'call_success' : 'call_error',
      label: operation,
      value: duration
    });
  }

  /**
   * カスタムタイミングのトラッキング
   */
  trackTiming(category: string, variable: string, duration: number, label?: string) {
    if (!this.isEnabled) {
      logger.debug('UserTracker', 'Timing', { category, variable, duration, label });
      return;
    }

    // タイミングメトリクスの送信
    metrics.putMetric(
      `Timing.${category}.${variable}`,
      duration,
      'Milliseconds',
      {
        Operation: label || 'default'
      }
    );
  }

  /**
   * セッション情報の取得
   */
  getSessionInfo(): UserSession {
    return { ...this.session };
  }

  /**
   * トラッキングの有効/無効切り替え
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    logger.info('UserTracker', `Tracking ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// デフォルトトラッカーのエクスポート
export const userTracker = UserTracker.getInstance();

/**
 * React用トラッキングヘルパー
 */
export const trackingHelpers = {
  // ボタンクリックのトラッキング
  trackButtonClick: (buttonName: string) => {
    userTracker.trackClick('button', buttonName);
  },

  // リンククリックのトラッキング
  trackLinkClick: (linkName: string, destination: string) => {
    userTracker.trackClick('link', linkName, { destination });
  },

  // タブ切り替えのトラッキング
  trackTabChange: (tabName: string) => {
    userTracker.track({
      category: 'UI',
      action: 'tab_change',
      label: tabName
    });
  },

  // エラーのトラッキング
  trackError: (errorType: string, errorMessage: string) => {
    userTracker.track({
      category: 'Error',
      action: errorType,
      label: errorMessage
    });
  }
};