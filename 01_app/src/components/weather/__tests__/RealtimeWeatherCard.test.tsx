/**
 * RealtimeWeatherCard コンポーネントのテスト
 * React Testing Libraryを使用したユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { RealtimeWeatherCard } from '../RealtimeWeatherCard';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { SensorData, ConnectionStatus } from '../../../types/weather';

// useWeatherDataフックをモック
jest.mock('../../../hooks/useWeatherData');
const mockUseWeatherData = useWeatherData as jest.MockedFunction<typeof useWeatherData>;

// Material-UIテーマ
const theme = createTheme();

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// モックデータ
const mockSensorData: SensorData = {
  deviceId: 'M-X-001',
  timestamp: '2025-01-27T12:00:00.000Z',
  temperature: 25.5,
  humidity: 60.0,
  pressure: 1013.2,
  windSpeed: 3.2,
  windDirection: 180,
  rainfall: 0.0,
  illuminance: 50000,
  visibility: 10.0,
  feelsLike: 26.8
};

describe('RealtimeWeatherCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本的な表示', () => {
    it('正常にレンダリングされる', () => {
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      // タイトルの確認
      expect(screen.getByText('リアルタイム気象データ')).toBeInTheDocument();
      
      // デバイスIDの確認
      expect(screen.getByText('デバイス: M-X-001')).toBeInTheDocument();
      
      // 接続状態の確認
      expect(screen.getByText('接続中')).toBeInTheDocument();
    });

    it('カスタムタイトルが表示される', () => {
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard 
            deviceId="M-X-001" 
            title="カスタム気象データ" 
          />
        </TestWrapper>
      );

      expect(screen.getByText('カスタム気象データ')).toBeInTheDocument();
    });
  });

  describe('気象データの表示', () => {
    it('全ての気象データ項目が表示される', () => {
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      // 各気象データ項目の確認
      expect(screen.getByText('気温')).toBeInTheDocument();
      expect(screen.getByText('25.5')).toBeInTheDocument();
      
      expect(screen.getByText('湿度')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      
      expect(screen.getByText('気圧')).toBeInTheDocument();
      expect(screen.getByText('1013.2')).toBeInTheDocument();
      
      expect(screen.getByText('風速')).toBeInTheDocument();
      expect(screen.getByText('3.2')).toBeInTheDocument();
      
      expect(screen.getByText('風向')).toBeInTheDocument();
      expect(screen.getByText('180')).toBeInTheDocument();
      
      expect(screen.getByText('降水量')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument();
      
      expect(screen.getByText('照度')).toBeInTheDocument();
      expect(screen.getByText('50.0k')).toBeInTheDocument(); // 50000 lux = 50.0k lux
      
      expect(screen.getByText('視程')).toBeInTheDocument();
      expect(screen.getByText('10.0')).toBeInTheDocument();
      
      expect(screen.getByText('体感温度')).toBeInTheDocument();
      expect(screen.getByText('26.8')).toBeInTheDocument();
    });

    it('データがない場合に適切なメッセージが表示される', () => {
      mockUseWeatherData.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        connectionStatus: 'disconnected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText('データがありません')).toBeInTheDocument();
      expect(screen.getByText('デバイス「M-X-001」からのデータを待機中です')).toBeInTheDocument();
    });

    it('部分的なデータでも正常に表示される', () => {
      const partialData: SensorData = {
        deviceId: 'M-X-001',
        timestamp: '2025-01-27T12:00:00.000Z',
        temperature: 25.5,
        humidity: 60.0
        // 他のフィールドは未定義
      };

      mockUseWeatherData.mockReturnValue({
        data: partialData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      // 定義されているデータは表示される
      expect(screen.getByText('25.5')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      
      // 未定義のデータは「---」で表示される
      const dashElements = screen.getAllByText('---');
      expect(dashElements.length).toBeGreaterThan(0);
    });
  });

  describe('接続状態の表示', () => {
    it.each([
      ['connected', '接続中'],
      ['disconnected', '切断'],
      ['reconnecting', '再接続中']
    ] as const)('接続状態「%s」が正しく表示される', (status: ConnectionStatus, expectedText: string) => {
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: status,
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中は適切な表示がされる', () => {
      mockUseWeatherData.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        connectionStatus: 'disconnected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('エラー処理', () => {
    it('エラーが発生した場合にエラーメッセージが表示される', () => {
      const mockError = new Error('ネットワークエラー');
      
      mockUseWeatherData.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        connectionStatus: 'disconnected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText('データ取得エラー: ネットワークエラー')).toBeInTheDocument();
    });
  });

  describe('ユーザーインタラクション', () => {
    it('再取得ボタンをクリックするとretry関数が呼ばれる', async () => {
      const mockRetry = jest.fn();
      
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: mockRetry,
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      // ヘッダー内の再取得ボタンをクリック（最初のRefreshIcon）
      const refreshButtons = screen.getAllByTestId('RefreshIcon');
      fireEvent.click(refreshButtons[0]);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('エラー時の再取得ボタンをクリックするとretry関数が呼ばれる', async () => {
      const mockRetry = jest.fn();
      const mockError = new Error('テストエラー');
      
      mockUseWeatherData.mockReturnValue({
        data: null,
        loading: false,
        error: mockError,
        connectionStatus: 'disconnected',
        retry: mockRetry,
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      // エラーアラート内の再取得ボタンをクリック
      const alertRefreshButtons = screen.getAllByTestId('RefreshIcon');
      fireEvent.click(alertRefreshButtons[1]); // 2番目のRefreshIcon（アラート内のボタン）

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('データなし状態の再取得ボタンをクリックするとretry関数が呼ばれる', async () => {
      const mockRetry = jest.fn();
      
      mockUseWeatherData.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        connectionStatus: 'disconnected',
        retry: mockRetry,
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard deviceId="M-X-001" />
        </TestWrapper>
      );

      // データなし状態の再取得ボタンをクリック
      const refreshButtons = screen.getAllByTestId('RefreshIcon');
      fireEvent.click(refreshButtons[refreshButtons.length - 1]); // 最後のボタン（データなし状態のボタン）

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('アニメーション', () => {
    it('データ更新時にアニメーション効果が適用される', async () => {
      // 初期状態のモック設定
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      const { rerender } = render(
        <TestWrapper>
          <RealtimeWeatherCard 
            deviceId="M-X-001" 
            enableAnimation={true}
          />
        </TestWrapper>
      );

      // データ更新
      const updatedData = { ...mockSensorData, temperature: 26.0 };
      mockUseWeatherData.mockReturnValue({
        data: updatedData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      rerender(
        <TestWrapper>
          <RealtimeWeatherCard 
            deviceId="M-X-001" 
            enableAnimation={true}
          />
        </TestWrapper>
      );

      // 更新されたデータが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('26.0')).toBeInTheDocument();
      });
    });

    it('アニメーションが無効の場合は通常表示される', () => {
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      render(
        <TestWrapper>
          <RealtimeWeatherCard 
            deviceId="M-X-001" 
            enableAnimation={false}
          />
        </TestWrapper>
      );

      // データが正常に表示されることを確認
      expect(screen.getByText('25.5')).toBeInTheDocument();
    });
  });

  describe('プロパティの検証', () => {
    it('heightプロパティが適用される', () => {
      mockUseWeatherData.mockReturnValue({
        data: mockSensorData,
        loading: false,
        error: null,
        connectionStatus: 'connected',
        retry: jest.fn(),
        historicalData: [],
        statisticsData: null,
        historicalLoading: false,
        statisticsLoading: false,
        historicalError: null,
        statisticsError: null,
        refetchHistorical: jest.fn(),
        refetchStatistics: jest.fn(),
        refetchAll: jest.fn()
      });

      const { container } = render(
        <TestWrapper>
          <RealtimeWeatherCard 
            deviceId="M-X-001" 
            height={500}
          />
        </TestWrapper>
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ height: '500px' });
    });
  });
});