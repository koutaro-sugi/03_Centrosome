/**
 * Weather API Service
 * AppSyncを使用した気象データのAPI通信サービス
 * リアルタイムデータ取得、履歴データ取得、統計データ取得、WebSocket Subscription管理を提供
 */

import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { GraphQLResult } from '@aws-amplify/api-graphql';
import {
  SensorData,
  SensorStats,
  StatsPeriod,
  ConnectionStatus,
} from '../types/weather';
import {
  sanitizeDeviceId,
  sanitizeTimestamp,
  sanitizeGraphQLParams
} from '../utils/security/sanitizer';
import {
  checkRateLimit,
  createSecureGraphQLConfig,
} from '../utils/security/graphqlSecurity';

/**
 * GraphQLクエリ定義
 * Amplify Gen2のスキーマに基づく正確なクエリ
 */
const GET_CURRENT_SENSOR_DATA = `
  query GetCurrentSensorData($deviceId: ID!) {
    listByDeviceAndTime(
      deviceId: $deviceId
      sortDirection: DESC
      limit: 1
      filter: { type: { eq: RAW } }
    ) {
      items {
        deviceId
        timestamp
        temperature
        humidity
        pressure
        windSpeed
        windDirection
        rainfall
        illuminance
        visibility
        feelsLike
      }
    }
  }
`;

const GET_HISTORICAL_DATA = `
  query GetHistoricalData($deviceId: ID!, $startTime: AWSDateTime!) {
    listByDeviceAndTime(
      deviceId: $deviceId
      timestamp: { ge: $startTime }
      filter: { type: { eq: RAW } }
      sortDirection: ASC
    ) {
      items {
        deviceId
        timestamp
        temperature
        humidity
        pressure
        windSpeed
        windDirection
        rainfall
        illuminance
        visibility
        feelsLike
      }
    }
  }
`;

const GET_STATISTICS_DATA = `
  query GetStatisticsData($deviceId: ID!, $period: CentraSensorDataPeriod!) {
    listByDeviceAndTime(
      deviceId: $deviceId
      sortDirection: DESC
      limit: 6
      filter: { 
        and: [
          { type: { eq: STATS_10MIN } }
          { period: { eq: $period } }
        ]
      }
    ) {
      items {
        deviceId
        timestamp
        period
        startTime
        endTime
        temperatureMax
        temperatureMin
        temperatureAvg
        humidityMax
        humidityMin
        humidityAvg
        windSpeedMax
        windSpeedMin
        windSpeedAvg
        pressureMax
        pressureMin
        pressureAvg
        windDirectionMax
        windDirectionMin
        windDirectionAvg
        rainfallMax
        rainfallMin
        rainfallAvg
        illuminanceMax
        illuminanceMin
        illuminanceAvg
        visibilityMax
        visibilityMin
        visibilityAvg
        feelsLikeMax
        feelsLikeMin
        feelsLikeAvg
        samples
      }
    }
  }
`;

const SENSOR_DATA_SUBSCRIPTION = `
  subscription OnSensorDataUpdate($deviceId: ID!) {
    onCreateCentraSensorData(
      filter: { 
        and: [
          { deviceId: { eq: $deviceId } }
          { type: { eq: RAW } }
        ]
      }
    ) {
      deviceId
      timestamp
      temperature
      humidity
      pressure
      windSpeed
      windDirection
      rainfall
      illuminance
      visibility
      feelsLike
    }
  }
`;

/**
 * APIエラークラス
 */
export class WeatherApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WeatherApiError';
  }
}

/**
 * リトライ設定
 */
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

/**
 * Subscription管理用の型
 */
interface SubscriptionManager {
  subscription: any;
  callback: (data: SensorData) => void;
  deviceId: string;
  isActive: boolean;
}

/**
 * Weather API Service クラス
 * AppSyncクライアントを使用した気象データAPI通信を管理
 */
export class WeatherApiService {
  private client: any;
  private retryConfig: RetryConfig;
  private subscriptions: Map<string, SubscriptionManager>;
  private connectionStatus: ConnectionStatus;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    // AppSyncクライアントの初期化
    this.client = generateClient();
    
    // リトライ設定
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      ...retryConfig
    };

    // Subscription管理
    this.subscriptions = new Map();
    this.connectionStatus = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * 認証トークンの取得と検証
   */
  private async getAuthToken(): Promise<string> {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        throw new WeatherApiError('認証トークンが取得できません', 'AUTH_TOKEN_MISSING');
      }

      // トークンの有効期限チェック
      const payload = session.tokens.idToken.payload;
      const exp = payload.exp as number;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (currentTime >= exp) {
        // トークンが期限切れの場合、リフレッシュを試みる
        const refreshedSession = await fetchAuthSession({ forceRefresh: true });
        
        if (!refreshedSession.tokens?.idToken) {
          throw new WeatherApiError('認証トークンのリフレッシュに失敗しました', 'AUTH_TOKEN_REFRESH_FAILED');
        }
        
        return refreshedSession.tokens.idToken.toString();
      }

      return session.tokens.idToken.toString();
    } catch (error) {
      if (error instanceof WeatherApiError) throw error;
      throw new WeatherApiError('認証処理でエラーが発生しました', 'AUTH_ERROR', error);
    }
  }

  /**
   * リトライ機能付きGraphQLクエリ実行
   * 指数バックオフによるリトライ機構を実装
   */
  private async executeWithRetry<T>(
    operation: () => Promise<GraphQLResult<T>>,
    retryCount = 0
  ): Promise<T> {
    try {
      const result = await operation();
      
      // GraphQLエラーの詳細な処理
      if (result && result.errors && result.errors.length > 0) {
        const error = result.errors[0];
        const errorCode = error.extensions?.code as string;
        const errorMessage = error.message || 'GraphQLクエリでエラーが発生しました';
        
        // エラーコード別の詳細な処理
        switch (errorCode) {
          case 'UNAUTHORIZED':
            throw new WeatherApiError('認証エラー: トークンが無効です', 'UNAUTHORIZED', error);
          case 'FORBIDDEN':
            throw new WeatherApiError('アクセス権限がありません', 'FORBIDDEN', error);
          case 'VALIDATION_ERROR':
            throw new WeatherApiError('入力データが無効です', 'VALIDATION_ERROR', error);
          case 'INTERNAL_ERROR':
            throw new WeatherApiError('サーバー内部エラーが発生しました', 'INTERNAL_ERROR', error);
          default:
            throw new WeatherApiError(errorMessage, errorCode || 'GRAPHQL_ERROR', error);
        }
      }

      if (!result || !result.data) {
        throw new WeatherApiError('データが取得できませんでした', 'NO_DATA');
      }

      return result.data;
    } catch (error: any) {
      // 認証エラーの場合、1回だけトークンリフレッシュしてリトライ
      if ((error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') && retryCount === 0) {
        try {
          console.log('認証トークンをリフレッシュしています...');
          await fetchAuthSession({ forceRefresh: true });
          return this.executeWithRetry(operation, retryCount + 1);
        } catch (refreshError) {
          throw new WeatherApiError(
            '認証トークンのリフレッシュに失敗しました',
            'AUTH_REFRESH_FAILED',
            refreshError
          );
        }
      }

      // リトライ可能なエラーの場合
      if (retryCount < this.retryConfig.maxRetries && this.shouldRetry(error)) {
        // 指数バックオフによる遅延計算（ジッターを追加）
        const baseDelay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
        const jitter = Math.random() * 0.1 * baseDelay; // 10%のジッター
        const delay = baseDelay + jitter;
        
        console.log(`リトライ ${retryCount + 1}/${this.retryConfig.maxRetries} を ${Math.round(delay)}ms 後に実行します`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1);
      }

      // 最終的なエラー処理
      if (error instanceof WeatherApiError) {
        throw error;
      }
      
      throw new WeatherApiError(
        error.message || 'API呼び出しでエラーが発生しました',
        'API_ERROR',
        error
      );
    }
  }

  /**
   * リトライ可能なエラーかどうかを判定
   * 一時的なエラーのみリトライし、永続的なエラーは即座に失敗させる
   */
  private shouldRetry(error: any): boolean {
    // リトライ可能なエラーコード
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'INTERNAL_ERROR',
      'API_ERROR',
      'SERVICE_UNAVAILABLE',
      'THROTTLING_ERROR',
      'CONNECTION_ERROR'
    ];
    
    // リトライ不可能なエラーコード（即座に失敗）
    const nonRetryableCodes = [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'BAD_REQUEST'
    ];
    
    // 明示的にリトライ不可能なエラーは除外
    if (nonRetryableCodes.includes(error.code)) {
      return false;
    }
    
    // リトライ可能なエラーコードをチェック
    if (retryableCodes.includes(error.code)) {
      return true;
    }
    
    // HTTPステータスコードによる判定
    if (error.status) {
      // 5xx系エラー（サーバーエラー）はリトライ
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      // 429 (Too Many Requests) もリトライ
      if (error.status === 429) {
        return true;
      }
    }
    
    // エラーメッセージによる判定
    const retryableMessages = [
      'Network error',
      'Connection timeout',
      'Service temporarily unavailable',
      'Rate limit exceeded',
      'Persistent error'
    ];
    
    return retryableMessages.some(msg => 
      error.message?.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * 現在のセンサーデータを取得
   * 要件1.1: リアルタイムデータ表示
   */
  async getCurrentData(deviceId: string): Promise<SensorData | null> {
    try {
      // デバイスIDのサニタイゼーション
      const sanitizedDeviceId = sanitizeDeviceId(deviceId);
      if (!sanitizedDeviceId) {
        throw new WeatherApiError('無効なデバイスIDです', 'INVALID_DEVICE_ID');
      }
      
      // レート制限チェック
      if (!checkRateLimit(`current_data_${sanitizedDeviceId}`)) {
        throw new WeatherApiError('レート制限に達しました', 'RATE_LIMIT_EXCEEDED');
      }
      
      console.log(`現在のセンサーデータを取得中: ${sanitizedDeviceId}`);
      
      // 認証トークンを事前に取得・検証
      const authToken = await this.getAuthToken();
      
      // セキュアなGraphQL設定を適用
      const secureConfig = createSecureGraphQLConfig(authToken);
      
      const data = await this.executeWithRetry(() =>
        this.client.graphql({
          query: GET_CURRENT_SENSOR_DATA,
          variables: sanitizeGraphQLParams({ deviceId: sanitizedDeviceId }),
          ...secureConfig
        })
      );

      const items = (data as any).listByDeviceAndTime?.items;
      if (!items || items.length === 0) {
        console.log(`デバイス ${deviceId} の現在データが見つかりません`);
        return null;
      }

      const sensorData = this.transformToSensorData(items[0]);
      console.log(`現在のセンサーデータ取得完了:`, sensorData);
      return sensorData;
    } catch (error) {
      console.error('現在のセンサーデータ取得エラー:', error);
      
      // エラーの詳細情報をログ出力
      if (error instanceof WeatherApiError) {
        console.error(`エラーコード: ${error.code}, 詳細:`, error.details);
      }
      
      throw error;
    }
  }

  /**
   * 履歴データを取得
   * 要件2.1: 履歴データ表示
   */
  async getHistoricalData(deviceId: string, minutes: number = 60): Promise<SensorData[]> {
    try {
      // デバイスIDのサニタイゼーション
      const sanitizedDeviceId = sanitizeDeviceId(deviceId);
      if (!sanitizedDeviceId) {
        throw new WeatherApiError('無効なデバイスIDです', 'INVALID_DEVICE_ID');
      }
      
      // レート制限チェック
      if (!checkRateLimit(`historical_data_${sanitizedDeviceId}`)) {
        throw new WeatherApiError('レート制限に達しました', 'RATE_LIMIT_EXCEEDED');
      }
      
      console.log(`履歴データを取得中: ${sanitizedDeviceId}, 期間: ${minutes}分`);
      
      // 認証トークンを事前に取得・検証
      const authToken = await this.getAuthToken();
      
      // 開始時刻を計算（指定された分数前から現在まで）
      const startTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();
      const sanitizedStartTime = sanitizeTimestamp(startTime);
      if (!sanitizedStartTime) {
        throw new WeatherApiError('無効なタイムスタンプです', 'INVALID_TIMESTAMP');
      }
      
      console.log(`履歴データ取得期間: ${sanitizedStartTime} ～ 現在`);
      
      // セキュアなGraphQL設定を適用
      const secureConfig = createSecureGraphQLConfig(authToken);
      
      const data = await this.executeWithRetry(() =>
        this.client.graphql({
          query: GET_HISTORICAL_DATA,
          variables: sanitizeGraphQLParams({ 
            deviceId: sanitizedDeviceId, 
            startTime: sanitizedStartTime 
          }),
          ...secureConfig
        })
      );

      const items = (data as any).listByDeviceAndTime?.items || [];
      console.log(`履歴データ取得完了: ${items.length}件`);
      
      // データを時系列順にソートして返す
      const historicalData = items
        .map((item: any) => this.transformToSensorData(item))
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      return historicalData;
    } catch (error) {
      console.error('履歴データ取得エラー:', error);
      
      // エラーの詳細情報をログ出力
      if (error instanceof WeatherApiError) {
        console.error(`エラーコード: ${error.code}, 詳細:`, error.details);
      }
      
      throw error;
    }
  }

  /**
   * 統計データを取得
   * 要件3.1: 統計情報計算と表示
   */
  async getStatistics(deviceId: string, period: StatsPeriod = StatsPeriod.HOUR): Promise<SensorStats | null> {
    try {
      // デバイスIDのサニタイゼーション
      const sanitizedDeviceId = sanitizeDeviceId(deviceId);
      if (!sanitizedDeviceId) {
        throw new WeatherApiError('無効なデバイスIDです', 'INVALID_DEVICE_ID');
      }
      
      // レート制限チェック
      if (!checkRateLimit(`stats_data_${sanitizedDeviceId}_${period}`)) {
        throw new WeatherApiError('レート制限に達しました', 'RATE_LIMIT_EXCEEDED');
      }
      
      console.log(`統計データを取得中: ${sanitizedDeviceId}, 期間: ${period}`);
      
      // 認証トークンを事前に取得・検証
      const authToken = await this.getAuthToken();
      
      // セキュアなGraphQL設定を適用
      const secureConfig = createSecureGraphQLConfig(authToken);
      
      const data = await this.executeWithRetry(() =>
        this.client.graphql({
          query: GET_STATISTICS_DATA,
          variables: sanitizeGraphQLParams({ 
            deviceId: sanitizedDeviceId, 
            period 
          }),
          ...secureConfig
        })
      );

      const items = (data as any).listByDeviceAndTime?.items;
      if (!items || items.length === 0) {
        console.log(`デバイス ${deviceId} の統計データ（${period}）が見つかりません`);
        return null;
      }

      // 最新の統計データを取得（配列の最初の要素）
      const latestStats = this.transformToSensorStats(items[0]);
      console.log(`統計データ取得完了:`, latestStats);
      
      return latestStats;
    } catch (error) {
      console.error('統計データ取得エラー:', error);
      
      // エラーの詳細情報をログ出力
      if (error instanceof WeatherApiError) {
        console.error(`エラーコード: ${error.code}, 詳細:`, error.details);
      }
      
      throw error;
    }
  }

  /**
   * リアルタイムデータ更新のサブスクリプション開始
   * 要件1.4: WebSocketを使用したリアルタイム更新
   */
  subscribeToUpdates(
    deviceId: string,
    callback: (data: SensorData) => void
  ): () => void {
    try {
      // 既存のサブスクリプションがある場合は停止
      if (this.subscriptions.has(deviceId)) {
        console.log(`既存のサブスクリプション（${deviceId}）を停止します`);
        this.unsubscribe(deviceId);
      }

      console.log(`サブスクリプション開始: ${deviceId}`);
      
      const subscription = this.client.graphql({
        query: SENSOR_DATA_SUBSCRIPTION,
        variables: { deviceId }
      }).subscribe({
        next: (result: any) => {
          try {
            // データ構造の確認とログ出力
            console.log('サブスクリプションデータ受信:', result);
            
            const sensorData = result.data?.onCreateCentraSensorData;
            if (sensorData) {
              const transformedData = this.transformToSensorData(sensorData);
              callback(transformedData);
              this.connectionStatus = 'connected';
              this.reconnectAttempts = 0;
              console.log('センサーデータ配信完了:', transformedData);
            } else {
              console.warn('サブスクリプションデータが空です:', result);
            }
          } catch (error) {
            console.error('サブスクリプションデータ処理エラー:', error);
            // データ処理エラーでもサブスクリプション自体は継続
          }
        },
        error: (error: any) => {
          console.error('サブスクリプションエラー:', error);
          this.connectionStatus = 'disconnected';
          
          // エラーの詳細をログ出力
          if (error.errors) {
            error.errors.forEach((err: any, index: number) => {
              console.error(`GraphQLエラー ${index + 1}:`, err);
            });
          }
          
          // 自動再接続を試行
          this.handleSubscriptionError(deviceId, callback);
        },
        complete: () => {
          console.log(`サブスクリプション完了: ${deviceId}`);
          this.connectionStatus = 'disconnected';
        }
      });

      // サブスクリプション管理に追加
      this.subscriptions.set(deviceId, {
        subscription,
        callback,
        deviceId,
        isActive: true
      });

      this.connectionStatus = 'connected';
      console.log(`サブスクリプション登録完了: ${deviceId}`);

      // アンサブスクライブ関数を返す
      return () => this.unsubscribe(deviceId);
    } catch (error) {
      console.error('サブスクリプション開始エラー:', error);
      this.connectionStatus = 'disconnected';
      throw new WeatherApiError(
        'サブスクリプションの開始に失敗しました',
        'SUBSCRIPTION_ERROR',
        error
      );
    }
  }

  /**
   * サブスクリプションエラーハンドリングと自動再接続
   * 要件1.3: 自動再接続機能
   */
  private async handleSubscriptionError(deviceId: string, callback: (data: SensorData) => void): Promise<void> {
    // 最大再接続試行回数をチェック
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`最大再接続試行回数（${this.maxReconnectAttempts}）に達しました`);
      this.connectionStatus = 'disconnected';
      
      // 最終的な接続失敗をコールバックで通知（エラーデータとして）
      const errorData: SensorData = {
        deviceId,
        timestamp: new Date().toISOString(),
        temperature: undefined // エラー状態を示すためundefinedに設定
      };
      
      try {
        callback(errorData);
      } catch (callbackError) {
        console.error('エラーコールバック実行エラー:', callbackError);
      }
      
      return;
    }

    this.connectionStatus = 'reconnecting';
    this.reconnectAttempts++;

    // 指数バックオフで再接続を試行（ジッター付き）
    const baseDelay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, this.reconnectAttempts - 1);
    const jitter = Math.random() * 0.1 * baseDelay; // 10%のジッター
    const delay = Math.min(baseDelay + jitter, 30000); // 最大30秒に制限
    
    console.log(`再接続試行 ${this.reconnectAttempts}/${this.maxReconnectAttempts} を ${Math.round(delay)}ms 後に実行`);
    
    setTimeout(async () => {
      try {
        // 認証トークンの有効性を確認してから再接続
        await this.getAuthToken();
        
        // 既存のサブスクリプションをクリーンアップ
        const existingManager = this.subscriptions.get(deviceId);
        if (existingManager && existingManager.subscription) {
          try {
            existingManager.subscription.unsubscribe();
          } catch (unsubError) {
            console.warn('既存サブスクリプションの停止でエラー:', unsubError);
          }
        }
        
        // 新しいサブスクリプションを開始
        this.subscribeToUpdates(deviceId, callback);
      } catch (reconnectError) {
        console.error('再接続エラー:', reconnectError);
        
        // 認証エラーの場合は再接続を停止
        if (reconnectError instanceof WeatherApiError && 
            (reconnectError.code === 'UNAUTHORIZED' || reconnectError.code === 'FORBIDDEN')) {
          console.error('認証エラーのため再接続を停止します');
          this.connectionStatus = 'disconnected';
          return;
        }
        
        // その他のエラーの場合は再度再接続を試行
        this.handleSubscriptionError(deviceId, callback);
      }
    }, delay);
  }

  /**
   * 特定デバイスのサブスクリプション停止
   */
  private unsubscribe(deviceId: string): void {
    const manager = this.subscriptions.get(deviceId);
    if (manager) {
      if (manager.subscription && typeof manager.subscription.unsubscribe === 'function') {
        manager.subscription.unsubscribe();
      }
      manager.isActive = false;
      this.subscriptions.delete(deviceId);
    }
  }

  /**
   * 全サブスクリプションの停止
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((manager) => {
      if (manager.subscription && typeof manager.subscription.unsubscribe === 'function') {
        manager.subscription.unsubscribe();
      }
    });
    this.subscriptions.clear();
    this.connectionStatus = 'disconnected';
  }

  /**
   * 接続状態の取得
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * アクティブなサブスクリプション数を取得
   */
  getActiveSubscriptionCount(): number {
    return Array.from(this.subscriptions.values()).filter(manager => manager.isActive).length;
  }

  /**
   * 特定デバイスのサブスクリプション状態を取得
   */
  getSubscriptionStatus(deviceId: string): boolean {
    const manager = this.subscriptions.get(deviceId);
    return manager ? manager.isActive : false;
  }

  /**
   * 再接続試行回数をリセット
   * 手動再接続時に使用
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  /**
   * サービスの健全性チェック
   * 定期的な接続状態確認に使用
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      connectionStatus: ConnectionStatus;
      activeSubscriptions: number;
      reconnectAttempts: number;
      lastError?: string;
    };
  }> {
    const activeSubscriptions = this.getActiveSubscriptionCount();
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (this.connectionStatus === 'connected' && this.reconnectAttempts === 0) {
      status = 'healthy';
    } else if (this.connectionStatus === 'reconnecting' || this.reconnectAttempts > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        connectionStatus: this.connectionStatus,
        activeSubscriptions,
        reconnectAttempts: this.reconnectAttempts
      }
    };
  }

  /**
   * DynamoDBレコードをSensorDataに変換
   */
  private transformToSensorData(item: any): SensorData {
    return {
      deviceId: item.deviceId,
      timestamp: item.timestamp,
      temperature: item.temperature,
      humidity: item.humidity,
      pressure: item.pressure,
      windSpeed: item.windSpeed,
      windDirection: item.windDirection,
      rainfall: item.rainfall,
      illuminance: item.illuminance,
      visibility: item.visibility,
      feelsLike: item.feelsLike
    };
  }

  /**
   * DynamoDBレコードをSensorStatsに変換
   */
  private transformToSensorStats(item: any): SensorStats {
    return {
      deviceId: item.deviceId,
      period: item.period,
      startTime: item.startTime,
      endTime: item.endTime,
      temperature: item.temperatureMax ? {
        max: item.temperatureMax,
        min: item.temperatureMin,
        avg: item.temperatureAvg
      } : undefined,
      humidity: item.humidityMax ? {
        max: item.humidityMax,
        min: item.humidityMin,
        avg: item.humidityAvg
      } : undefined,
      windSpeed: item.windSpeedMax ? {
        max: item.windSpeedMax,
        min: item.windSpeedMin,
        avg: item.windSpeedAvg
      } : undefined,
      pressure: item.pressureMax ? {
        max: item.pressureMax,
        min: item.pressureMin,
        avg: item.pressureAvg
      } : undefined,
      windDirection: item.windDirectionMax ? {
        max: item.windDirectionMax,
        min: item.windDirectionMin,
        avg: item.windDirectionAvg
      } : undefined,
      rainfall: item.rainfallMax ? {
        max: item.rainfallMax,
        min: item.rainfallMin,
        avg: item.rainfallAvg
      } : undefined,
      illuminance: item.illuminanceMax ? {
        max: item.illuminanceMax,
        min: item.illuminanceMin,
        avg: item.illuminanceAvg
      } : undefined,
      visibility: item.visibilityMax ? {
        max: item.visibilityMax,
        min: item.visibilityMin,
        avg: item.visibilityAvg
      } : undefined,
      feelsLike: item.feelsLikeMax ? {
        max: item.feelsLikeMax,
        min: item.feelsLikeMin,
        avg: item.feelsLikeAvg
      } : undefined,
      samples: item.samples || 0
    };
  }
}

/**
 * シングルトンインスタンス
 * アプリケーション全体で単一のWeatherApiServiceインスタンスを使用
 */
export const weatherApiService = new WeatherApiService();