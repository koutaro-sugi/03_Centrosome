/**
 * 統合ロギングシステム
 * 開発環境ではコンソール出力、本番環境ではCloudWatch Logsへ送信
 */

import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { fetchAuthSession } from '@aws-amplify/auth';

// ログレベル定義
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// ログエントリーの型定義
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  category: string;
  userId?: string;
  metadata?: Record<string, any>;
  error?: Error;
  correlationId?: string;
}

// ロガー設定
interface LoggerConfig {
  logGroupName: string;
  logStreamPrefix: string;
  batchSize: number;
  flushInterval: number;
  minLevel: LogLevel;
  enableCloudWatch: boolean;
}

// デフォルト設定
const defaultConfig: LoggerConfig = {
  logGroupName: '/aws/centra/weather-dashboard',
  logStreamPrefix: 'web-',
  batchSize: 100,
  flushInterval: 5000, // 5秒
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableCloudWatch: process.env.NODE_ENV === 'production'
};

/**
 * 統合ロガークラス
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private cloudWatchClient?: CloudWatchLogsClient;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private logStreamName?: string;
  private sequenceToken?: string;
  private isInitialized = false;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.initialize();
  }

  /**
   * シングルトンインスタンスの取得
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * 初期化処理
   */
  private async initialize() {
    if (this.config.enableCloudWatch) {
      try {
        // CloudWatchクライアントの初期化
        const session = await fetchAuthSession();
        this.cloudWatchClient = new CloudWatchLogsClient({
          region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
          credentials: session.credentials
        });

        // ログストリーム名の生成
        this.logStreamName = `${this.config.logStreamPrefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // ログストリームの作成
        await this.createLogStream();
        
        // フラッシュタイマーの設定
        this.startFlushTimer();
        
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize CloudWatch logger:', error);
        this.config.enableCloudWatch = false;
      }
    }
  }

  /**
   * ログストリームの作成
   */
  private async createLogStream() {
    if (!this.cloudWatchClient || !this.logStreamName) return;

    try {
      await this.cloudWatchClient.send(new CreateLogStreamCommand({
        logGroupName: this.config.logGroupName,
        logStreamName: this.logStreamName
      }));
    } catch (error: any) {
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error;
      }
    }
  }

  /**
   * フラッシュタイマーの開始
   */
  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * ログエントリーの記録
   */
  private log(entry: Omit<LogEntry, 'timestamp'>) {
    // レベルチェック
    if (entry.level < this.config.minLevel) return;

    const fullEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    // 開発環境または CloudWatch が無効な場合はコンソール出力
    if (!this.config.enableCloudWatch) {
      this.logToConsole(fullEntry);
    } else {
      // バッファに追加
      this.logBuffer.push(fullEntry);
      
      // バッチサイズに達したらフラッシュ
      if (this.logBuffer.length >= this.config.batchSize) {
        this.flush();
      }
    }
  }

  /**
   * コンソールへのログ出力
   */
  private logToConsole(entry: LogEntry) {
    const prefix = `[${entry.timestamp}] [${LogLevel[entry.level]}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata || {});
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata || {});
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata || {});
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error || entry.metadata || {});
        break;
    }
  }

  /**
   * CloudWatch Logs へのフラッシュ
   */
  async flush() {
    if (!this.cloudWatchClient || !this.logStreamName || this.logBuffer.length === 0) {
      return;
    }

    const events = this.logBuffer.splice(0, this.config.batchSize);
    
    try {
      const logEvents = events.map(entry => ({
        timestamp: new Date(entry.timestamp).getTime(),
        message: JSON.stringify({
          level: LogLevel[entry.level],
          category: entry.category,
          message: entry.message,
          userId: entry.userId,
          metadata: entry.metadata,
          correlationId: entry.correlationId,
          error: entry.error ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name
          } : undefined
        })
      }));

      const command = new PutLogEventsCommand({
        logGroupName: this.config.logGroupName,
        logStreamName: this.logStreamName,
        logEvents,
        sequenceToken: this.sequenceToken
      });

      const response = await this.cloudWatchClient.send(command);
      this.sequenceToken = response.nextSequenceToken;
      
    } catch (error) {
      console.error('Failed to send logs to CloudWatch:', error);
      // 失敗したログをコンソールに出力
      events.forEach(entry => this.logToConsole(entry));
    }
  }

  /**
   * デバッグログ
   */
  debug(category: string, message: string, metadata?: Record<string, any>) {
    this.log({ level: LogLevel.DEBUG, category, message, metadata });
  }

  /**
   * 情報ログ
   */
  info(category: string, message: string, metadata?: Record<string, any>) {
    this.log({ level: LogLevel.INFO, category, message, metadata });
  }

  /**
   * 警告ログ
   */
  warn(category: string, message: string, metadata?: Record<string, any>) {
    this.log({ level: LogLevel.WARN, category, message, metadata });
  }

  /**
   * エラーログ
   */
  error(category: string, message: string, error?: Error, metadata?: Record<string, any>) {
    this.log({ level: LogLevel.ERROR, category, message, error, metadata });
  }

  /**
   * 致命的エラーログ
   */
  fatal(category: string, message: string, error?: Error, metadata?: Record<string, any>) {
    this.log({ level: LogLevel.FATAL, category, message, error, metadata });
  }

  /**
   * ユーザーコンテキストの設定
   */
  setUserContext(userId: string) {
    // 以降のログにユーザーIDを自動追加
    const originalLog = this.log.bind(this);
    this.log = (entry) => {
      originalLog({ ...entry, userId });
    };
  }

  /**
   * 相関IDの設定
   */
  setCorrelationId(correlationId: string) {
    // 以降のログに相関IDを自動追加
    const originalLog = this.log.bind(this);
    this.log = (entry) => {
      originalLog({ ...entry, correlationId });
    };
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }
}

// デフォルトロガーのエクスポート
export const logger = Logger.getInstance();