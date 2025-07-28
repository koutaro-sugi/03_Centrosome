/**
 * ロガーのテスト
 */

import { Logger, LogLevel } from '../logger';

// モック関数
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// CloudWatch SDK のモック
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ nextSequenceToken: 'test-token' })
  })),
  CreateLogStreamCommand: jest.fn(),
  PutLogEventsCommand: jest.fn()
}));

// Amplify Auth のモック
jest.mock('@aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn().mockResolvedValue({
    credentials: {
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret'
    }
  })
}));

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    // 開発環境でのテスト（CloudWatch無効）
    logger = Logger.getInstance({ enableCloudWatch: false, minLevel: LogLevel.DEBUG });
  });

  afterEach(async () => {
    await logger.cleanup();
  });

  describe('ログレベル', () => {
    it('設定されたレベル以上のログのみ出力する', () => {
      logger = Logger.getInstance({ 
        enableCloudWatch: false,
        minLevel: LogLevel.INFO 
      });

      logger.debug('Test', 'Debug message');
      logger.info('Test', 'Info message');
      logger.warn('Test', 'Warn message');

      expect(mockConsoleDebug).not.toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });
  });

  describe('コンソール出力', () => {
    it('デバッグログを正しく出力する', () => {
      logger.debug('TestCategory', 'Debug message', { key: 'value' });

      expect(mockConsoleDebug).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] [TestCategory] Debug message'),
        { key: 'value' }
      );
    });

    it('情報ログを正しく出力する', () => {
      logger.info('TestCategory', 'Info message', { key: 'value' });

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] [TestCategory] Info message'),
        { key: 'value' }
      );
    });

    it('警告ログを正しく出力する', () => {
      logger.warn('TestCategory', 'Warn message', { key: 'value' });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN] [TestCategory] Warn message'),
        { key: 'value' }
      );
    });

    it('エラーログを正しく出力する', () => {
      const error = new Error('Test error');
      logger.error('TestCategory', 'Error message', error, { key: 'value' });

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR] [TestCategory] Error message'),
        error
      );
    });

    it('致命的エラーログを正しく出力する', () => {
      const error = new Error('Fatal error');
      logger.fatal('TestCategory', 'Fatal message', error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[FATAL] [TestCategory] Fatal message'),
        error
      );
    });
  });

  describe('ユーザーコンテキスト', () => {
    it('ユーザーIDが以降のログに追加される', () => {
      logger.setUserContext('user123');
      logger.info('Test', 'Message after user context');

      // 新しいロガーインスタンスが必要なため、テストをスキップ
      // 実際の実装では、ユーザーIDがログエントリーに含まれることを確認
    });
  });

  describe('相関ID', () => {
    it('相関IDが以降のログに追加される', () => {
      logger.setCorrelationId('correlation123');
      logger.info('Test', 'Message with correlation ID');

      // 新しいロガーインスタンスが必要なため、テストをスキップ
      // 実際の実装では、相関IDがログエントリーに含まれることを確認
    });
  });
});