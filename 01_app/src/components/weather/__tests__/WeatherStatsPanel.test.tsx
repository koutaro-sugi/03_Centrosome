/**
 * WeatherStatsPanel コンポーネントのテスト
 * 統計情報パネルの表示機能とハイライト機能をテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { WeatherStatsPanel } from '../WeatherStatsPanel';
import { StatsPeriod, SensorStats } from '../../../types/weather';

// useWeatherStatisticsフックのモック
const mockUseWeatherStatistics = jest.fn();
jest.mock('../../../hooks/useWeatherData', () => ({
  useWeatherStatistics: (deviceId: string, period: StatsPeriod) => mockUseWeatherStatistics(deviceId, period)
}));

// Material-UIテーマ
const theme = createTheme();

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// モックデータ
const mockStatsData: SensorStats = {
  deviceId: 'M-X-001',
  period: 'HOUR',
  startTime: '2025-01-27T11:00:00.000Z',
  endTime: '2025-01-27T12:00:00.000Z',
  temperature: { max: 25.5, min: 20.1, avg: 22.8 },
  humidity: { max: 85.2, min: 60.3, avg: 72.7 },
  windSpeed: { max: 8.5, min: 2.1, avg: 5.3 },
  pressure: { max: 1015, min: 1012, avg: 1013 },
  windDirection: { max: 270, min: 90, avg: 180 },
  rainfall: { max: 0.5, min: 0.0, avg: 0.1 },
  illuminance: { max: 50000, min: 1000, avg: 25000 },
  visibility: { max: 10.0, min: 5.0, avg: 7.5 },
  feelsLike: { max: 26.0, min: 19.5, avg: 22.5 },
  samples: 360
};

const mockHighWindStatsData: SensorStats = {
  ...mockStatsData,
  windSpeed: { max: 15.2, min: 8.1, avg: 11.5 }
};

describe('WeatherStatsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('正常な統計データ表示', () => {
    beforeEach(() => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });
    });

    test('統計情報が正しく表示される', () => {
      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      // ヘッダーの確認
      expect(screen.getByText('統計情報')).toBeInTheDocument();
      expect(screen.getByText('過去1時間')).toBeInTheDocument();
      expect(screen.getByText('360サンプル')).toBeInTheDocument();

      // 各統計項目の確認
      expect(screen.getByText('気温')).toBeInTheDocument();
      expect(screen.getByText('25.5°C')).toBeInTheDocument(); // 最大値
      expect(screen.getByText('22.8°C')).toBeInTheDocument(); // 平均値
      expect(screen.getByText('20.1°C')).toBeInTheDocument(); // 最小値

      expect(screen.getByText('湿度')).toBeInTheDocument();
      expect(screen.getByText('85.2%')).toBeInTheDocument();

      expect(screen.getByText('風速')).toBeInTheDocument();
      expect(screen.getByText('8.5m/s')).toBeInTheDocument();
    });

    test('期間情報が正しく表示される', () => {
      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      // 期間の表示確認（日本語ロケール）
      expect(screen.getByText(/期間:/)).toBeInTheDocument();
    });

    test('DAY期間の場合、適切なラベルが表示される', () => {
      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" period={StatsPeriod.DAY} />
        </TestWrapper>
      );

      expect(screen.getByText('過去24時間')).toBeInTheDocument();
    });
  });

  describe('最大瞬間風速のハイライト機能', () => {
    test('風速が閾値を超えた場合、ハイライト表示される', () => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockHighWindStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" windSpeedHighlightThreshold={10} />
        </TestWrapper>
      );

      // 警告メッセージの確認
      expect(screen.getByText(/最大瞬間風速が10m\/sを超えています/)).toBeInTheDocument();
      expect(screen.getAllByText(/15\.2m\/s/)).toHaveLength(2); // 警告メッセージと統計値の両方に表示される

      // 注意チップの確認
      expect(screen.getByText('注意')).toBeInTheDocument();
    });

    test('風速が閾値以下の場合、ハイライト表示されない', () => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" windSpeedHighlightThreshold={10} />
        </TestWrapper>
      );

      // 警告メッセージが表示されないことを確認
      expect(screen.queryByText(/最大瞬間風速が10m\/sを超えています/)).not.toBeInTheDocument();
      expect(screen.queryByText('注意')).not.toBeInTheDocument();
    });

    test('カスタム閾値が正しく適用される', () => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockStatsData, // 最大風速8.5m/s
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" windSpeedHighlightThreshold={8} />
        </TestWrapper>
      );

      // 8m/s閾値で8.5m/sなのでハイライト表示される
      expect(screen.getByText(/最大瞬間風速が8m\/sを超えています/)).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    test('ローディング中は適切なメッセージが表示される', () => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: null,
        statisticsLoading: true,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText('統計データを読み込み中...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    test('エラー時は適切なメッセージと再試行ボタンが表示される', () => {
      const mockRefetch = jest.fn();
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: null,
        statisticsLoading: false,
        statisticsError: new Error('API Error'),
        refetchStatistics: mockRefetch
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText('統計データの取得に失敗しました')).toBeInTheDocument();
      
      const retryButton = screen.getByText('再試行');
      expect(retryButton).toBeInTheDocument();
      
      fireEvent.click(retryButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('データなし状態', () => {
    test('データがない場合は適切なメッセージが表示される', () => {
      const mockRefetch = jest.fn();
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: null,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: mockRefetch
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      expect(screen.getByText('過去1時間の統計データがありません')).toBeInTheDocument();
      
      const reloadButton = screen.getByText('再読み込み');
      expect(reloadButton).toBeInTheDocument();
      
      fireEvent.click(reloadButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('更新機能', () => {
    test('更新ボタンクリックで再取得が実行される', () => {
      const mockRefetch = jest.fn();
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: mockRefetch
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      const updateButton = screen.getByText('更新');
      fireEvent.click(updateButton);
      
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('プロパティの動作確認', () => {
    test('deviceIdとperiodが正しくフックに渡される', () => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="TEST-001" period={StatsPeriod.DAY} />
        </TestWrapper>
      );

      expect(mockUseWeatherStatistics).toHaveBeenCalledWith('TEST-001', StatsPeriod.DAY);
    });

    test('heightプロパティが正しく適用される', () => {
      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: mockStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      const { container } = render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" height={400} />
        </TestWrapper>
      );

      const card = container.querySelector('.MuiCard-root');
      expect(card).toHaveStyle({ height: '400px' });
    });
  });

  describe('データ欠損の処理', () => {
    test('一部の統計データが欠損している場合、適切に処理される', () => {
      const partialStatsData: SensorStats = {
        ...mockStatsData,
        temperature: undefined,
        humidity: undefined
      };

      mockUseWeatherStatistics.mockReturnValue({
        statisticsData: partialStatsData,
        statisticsLoading: false,
        statisticsError: null,
        refetchStatistics: jest.fn()
      });

      render(
        <TestWrapper>
          <WeatherStatsPanel deviceId="M-X-001" />
        </TestWrapper>
      );

      // 欠損データの項目には「データなし」が表示される
      expect(screen.getAllByText('データなし')).toHaveLength(2);
      
      // 存在するデータは正常に表示される
      expect(screen.getByText('風速')).toBeInTheDocument();
      expect(screen.getByText('8.5m/s')).toBeInTheDocument();
    });
  });
});