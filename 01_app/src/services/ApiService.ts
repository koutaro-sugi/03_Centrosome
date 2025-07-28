import { fetchAuthSession } from 'aws-amplify/auth';

// APIエラークラス
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// APIレスポンスの型
interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  status: number;
}

// リトライ設定
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
}

// APIサービス基底クラス
export class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryCondition: (error) => {
        // 401, 403以外のエラーはリトライ
        return error.status !== 401 && error.status !== 403;
      },
      ...retryConfig
    };
  }

  // 認証ヘッダーの取得
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken) {
        throw new ApiError('No authentication token available', 401);
      }

      // トークンの有効期限チェック
      const payload = session.tokens.idToken.payload;
      const exp = payload.exp as number;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (currentTime >= exp) {
        // トークンが期限切れの場合、リフレッシュを試みる
        const refreshedSession = await fetchAuthSession({ forceRefresh: true });
        
        if (!refreshedSession.tokens?.idToken) {
          throw new ApiError('Failed to refresh authentication token', 401);
        }
        
        return {
          'Authorization': `Bearer ${refreshedSession.tokens.idToken.toString()}`
        };
      }

      return {
        'Authorization': `Bearer ${session.tokens.idToken.toString()}`
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Authentication failed', 401, 'AUTH_ERROR', error);
    }
  }

  // リトライロジック
  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    retryCount = 0
  ): Promise<Response> {
    try {
      const response = await requestFn();
      
      // 401エラーの場合、1回だけトークンリフレッシュしてリトライ
      if (response.status === 401 && retryCount === 0) {
        await fetchAuthSession({ forceRefresh: true });
        return this.retryRequest(requestFn, retryCount + 1);
      }
      
      return response;
    } catch (error: any) {
      // ネットワークエラーなどの場合
      if (
        retryCount < this.retryConfig.maxRetries &&
        this.retryConfig.retryCondition?.(error)
      ) {
        await new Promise(resolve => 
          setTimeout(resolve, this.retryConfig.retryDelay * Math.pow(2, retryCount))
        );
        return this.retryRequest(requestFn, retryCount + 1);
      }
      
      throw error;
    }
  }

  // HTTPリクエストの実行
  protected async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const authHeaders = await this.getAuthHeaders();
      const url = `${this.baseUrl}${endpoint}`;
      
      const requestFn = () => fetch(url, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...authHeaders,
          ...options.headers
        }
      });

      const response = await this.retryRequest(requestFn);
      
      // レスポンスの処理
      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiError(
          data.message || `Request failed with status ${response.status}`,
          response.status,
          data.code,
          data
        );
      }

      return {
        data,
        status: response.status
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        return {
          error,
          status: error.status
        };
      }

      // ネットワークエラーなど
      const apiError = new ApiError(
        error.message || 'Network request failed',
        0,
        'NETWORK_ERROR',
        error
      );

      return {
        error: apiError,
        status: 0
      };
    }
  }

  // GET リクエスト
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? 
      '?' + new URLSearchParams(params).toString() : '';
    
    const response = await this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET'
    });

    if (response.error) {
      throw response.error;
    }

    return response.data!;
  }

  // POST リクエスト
  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.error) {
      throw response.error;
    }

    return response.data!;
  }

  // PUT リクエスト
  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.error) {
      throw response.error;
    }

    return response.data!;
  }

  // DELETE リクエスト
  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE'
    });

    if (response.error) {
      throw response.error;
    }

    return response.data!;
  }
}