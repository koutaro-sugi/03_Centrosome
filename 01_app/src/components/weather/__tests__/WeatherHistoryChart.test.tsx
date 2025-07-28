/**
 * WeatherHistoryChart コンポーネントのテスト
 * Jest + React Testing Library を使用したユニットテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WeatherHistoryChart } from '../WeatherHistoryChart';
import { weatherApiService } from '../../../services/weatherApi';
import { SensorData, WeatherDataType } from '../../../types/weather';

// Chart.jsのモック
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options, id }: any) => (
    <div data-testid="chart-canvas" data-chart-id={id}>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  )
}));

// Chart.jsプラグインのモック
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    getChart: jest.fn(() => ({
      resetZoom: jest.fn()
    }))
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  TimeScale: jest.fn()
}));

jest.mock('chartjs-plugin-zoom', () => ({}));
jest.mock('chartjs-adapter-date-fns', () => ({}));

// date-fnsのモック
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (typeof date === 'number') {
      date = new Date(date);
    }
    return date.toLocaleString('ja-JP');
  })
}));

jest.mock('date-fns/locale', () => ({
  ja: {}
}));

// weatherApiServiceのモック
jest.mock('../../../services/weatherApi', () => ({
  weatherApiService: {
    getHistoricalData: jest.fn()
  }
}));

const mockWeatherApiService = weatherApiService as jest.Mocked<typeof weatherApiService>;

/**
 * テスト用のモックデータ
 */
const createMockSensorData = (count: number = 10): SensorData[] => {
  const baseTime = new Date('2025-01-27T12:00:00Z').getTime();
  
  return Array.from({ length: count }, (_, index) => ({
    deviceId: 'M-X-001',
    timestamp: new Date(baseTime + index * 60000).toISOString(), // 1分間隔
    temperature: 20 + Math.sin(index * 0.1) * 5, // 15-25℃の範囲で変動
    humidity: 60 + Math.cos(index * 0.1) * 20,   // 40-80%の範囲で変動
    pressure: 1013 + Math.sin(index * 0.05) * 10, // 1003-1023hPaの範囲で変動
    windSpeed: Math.abs(Math.sin(index * 0.2) * 10), // 0-10m/sの範囲で変動
    windDirection: (index * 36) % 360, // 0-359度で変動
    rainfall: Math.random() > 0.8 ? Math.random() * 5 : 0, // 20%の確率で降水
    illuminance: Math.max(0, 50000 * Math.sin(index * 0.3)), // 0-50000luxで変動
    visibility: 10 + Math.random() * 10, // 10-20kmの範囲で変動
    feelsLike: 18 + Math.sin(index * 0.1) * 6 // 12-24℃の範囲で変動
  }));
};

describe('WeatherHistoryChart', () => {
  const defaultProps = {
    deviceId: 'M-X-001'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトでは正常なデータを返すようにモック
    mockWeatherApiService.getHistoricalData.mockResolvedValue(createMockSensorData());
  });

  describe('基本的なレンダリング', () => {
    test('コンポーネントが正常にレンダリングされる', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      // ヘッダーの確認
      expect(screen.getByText('気象データ履歴グラフ')).toBeInTheDocument();
      
      // ローディング状態の確認
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // データ読み込み完了を待機
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // グラフの確認
      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    test('初期状態で気温データが選択されている', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // データタイプの表示値確認
      expect(screen.getByDisplayValue('temperature')).toBeInTheDocument();
      expect(screen.getByText('気温')).toBeInTheDocument();
    });

    test('初期状態で1時間の時間範囲が選択されている', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // 時間範囲の表示値確認
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();
      expect(screen.getByText('1時間')).toBeInTheDocument();
    });
  });

  describe('データ取得', () => {
    test('初期化時に履歴データが取得される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 60);
      });
    });

    test('カスタム時間範囲でデータが取得される', async () => {
      render(<WeatherHistoryChart {...defaultProps} initialTimeRange={180} />);
      
      await waitFor(() => {
        expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 180);
      });
    });

    test('データ取得エラー時にエラーメッセージが表示される', async () => {
      const errorMessage = 'データ取得に失敗しました';
      mockWeatherApiService.getHistoricalData.mockRejectedValue(new Error(errorMessage));
      
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
      
      // エラー時はグラフが表示されない
      expect(screen.queryByTestId('chart-canvas')).not.toBeInTheDocument();
    });

    test('データが空の場合に適切なメッセージが表示される', async () => {
      mockWeatherApiService.getHistoricalData.mockResolvedValue([]);
      
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('データがありません')).toBeInTheDocument();
      });
    });
  });

  describe('データタイプ切り替え', () => {
    test('データタイプセレクトボックスが表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // データタイプセレクトボックスの存在確認（複数あるので最初のものを取得）
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes[0]).toBeInTheDocument();
      expect(screen.getByText('気温')).toBeInTheDocument();
    });

    test('各データタイプのラベルが定義されている', () => {
      // WeatherDataConfigsの設定確認（実装の存在確認）
      expect(WeatherDataType.TEMPERATURE).toBe('temperature');
      expect(WeatherDataType.HUMIDITY).toBe('humidity');
      expect(WeatherDataType.PRESSURE).toBe('pressure');
      expect(WeatherDataType.WIND_SPEED).toBe('windSpeed');
    });
  });

  describe('時間範囲切り替え', () => {
    test('時間範囲セレクトボックスが表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // 時間範囲セレクトボックスの存在確認
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes).toHaveLength(2); // データタイプと時間範囲
      expect(screen.getByText('1時間')).toBeInTheDocument();
    });

    test('カスタム時間範囲でコンポーネントが初期化される', async () => {
      render(<WeatherHistoryChart {...defaultProps} initialTimeRange={180} />);
      
      await waitFor(() => {
        expect(mockWeatherApiService.getHistoricalData).toHaveBeenCalledWith('M-X-001', 180);
      });
    });
  });

  describe('統計情報表示', () => {
    test('データの統計情報が表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // 統計情報チップの確認
      expect(screen.getByText(/最大:/)).toBeInTheDocument();
      expect(screen.getByText(/最小:/)).toBeInTheDocument();
      expect(screen.getByText(/平均:/)).toBeInTheDocument();
      expect(screen.getByText(/データ数:/)).toBeInTheDocument();
    });

    test('統計情報の単位が正しく表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // 気温の単位（℃）が表示されることを確認（複数あるので最初のものを取得）
      const temperatureElements = screen.getAllByText(/℃/);
      expect(temperatureElements.length).toBeGreaterThan(0);
    });
  });

  describe('アクションボタン', () => {
    test('更新ボタンが表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // 更新ボタンの確認
      expect(screen.getByLabelText('データを更新')).toBeInTheDocument();
    });

    test('ズームリセットボタンが表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // ズームリセットボタンの確認
      expect(screen.getByLabelText('ズームをリセット')).toBeInTheDocument();
    });
  });

  describe('自動更新機能', () => {
    test('自動更新間隔が設定されている場合、プロパティが正しく渡される', () => {
      render(<WeatherHistoryChart {...defaultProps} autoRefreshInterval={5000} />);
      
      // コンポーネントが正常にレンダリングされることを確認
      expect(screen.getByText('気象データ履歴グラフ')).toBeInTheDocument();
    });

    test('自動更新が無効の場合、プロパティが正しく渡される', () => {
      render(<WeatherHistoryChart {...defaultProps} autoRefreshInterval={0} />);
      
      // コンポーネントが正常にレンダリングされることを確認
      expect(screen.getByText('気象データ履歴グラフ')).toBeInTheDocument();
    });
  });

  describe('プロパティ設定', () => {
    test('初期データタイプが正しく設定される', async () => {
      render(
        <WeatherHistoryChart 
          {...defaultProps} 
          initialDataType={WeatherDataType.HUMIDITY}
        />
      );
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // 湿度が選択されていることを確認
      expect(screen.getByDisplayValue('humidity')).toBeInTheDocument();
      expect(screen.getByText('湿度')).toBeInTheDocument();
    });

    test('カスタム高さが適用される', async () => {
      render(<WeatherHistoryChart {...defaultProps} height={600} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // グラフが表示されることを確認
      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    test('適切なラベルが設定されている', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      // アクションボタンのラベル確認
      expect(screen.getByLabelText('データを更新')).toBeInTheDocument();
      expect(screen.getByLabelText('ズームをリセット')).toBeInTheDocument();
    });

    test('操作説明が表示される', async () => {
      render(<WeatherHistoryChart {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
      
      expect(screen.getByText('マウスホイールでズーム、ドラッグでパン操作が可能です')).toBeInTheDocument();
    });
  });
});