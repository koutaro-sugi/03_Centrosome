/**
 * RealtimeWeatherCard デモコンポーネント
 * 開発・テスト用のデモページ
 */

import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { RealtimeWeatherCard } from './RealtimeWeatherCard';

/**
 * RealtimeWeatherCard のデモページ
 * 複数のカードを表示してレイアウトとレスポンシブ対応を確認
 */
export const RealtimeWeatherCardDemo: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        リアルタイム気象データカード デモ
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        このページはRealtimeWeatherCardコンポーネントの動作確認用デモです。
        実際のMadoセンサーデータを使用してリアルタイム表示をテストできます。
      </Typography>

      {/* 基本カード */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          基本表示
        </Typography>
        <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <RealtimeWeatherCard 
            deviceId="M-X-001"
            title="Madoセンサー M-X-001"
            height={500}
          />
        </Paper>
      </Box>

      {/* 複数カードのグリッド表示 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          複数デバイス表示
        </Typography>
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { 
              xs: '1fr', 
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)'
            },
            gap: 3
          }}
        >
          <RealtimeWeatherCard 
            deviceId="M-X-001"
            title="屋外センサー #1"
            height={400}
            enableAnimation={true}
          />
          <RealtimeWeatherCard 
            deviceId="M-X-002"
            title="屋外センサー #2"
            height={400}
            enableAnimation={true}
          />
          <RealtimeWeatherCard 
            deviceId="M-X-003"
            title="屋内センサー #1"
            height={400}
            enableAnimation={false}
          />
        </Box>
      </Box>

      {/* コンパクト表示 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          コンパクト表示
        </Typography>
        <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 2
          }}
        >
          <RealtimeWeatherCard 
            deviceId="M-X-004"
            title="センサー A"
            height={300}
          />
          <RealtimeWeatherCard 
            deviceId="M-X-005"
            title="センサー B"
            height={300}
          />
          <RealtimeWeatherCard 
            deviceId="M-X-006"
            title="センサー C"
            height={300}
          />
          <RealtimeWeatherCard 
            deviceId="M-X-007"
            title="センサー D"
            height={300}
          />
        </Box>
      </Box>

      {/* 設定情報 */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          実装機能
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ リアルタイムデータ表示（WebSocket接続）
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ WebSocket接続状態の表示（接続中/切断/再接続中）
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ データ更新時のアニメーション効果
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ 接続エラー時の自動再接続機能
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ 手動データ再取得機能
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ レスポンシブデザイン対応
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ エラーハンドリングとユーザーフィードバック
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            ✅ Material-UI v7対応
          </Typography>
        </Box>
      </Box>

      {/* 技術仕様 */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          技術仕様
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>データソース:</strong> AWS IoT Core + AppSync GraphQL
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>リアルタイム通信:</strong> AppSync Subscription (WebSocket)
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>データ保存:</strong> DynamoDB (TTL: 1時間)
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>更新頻度:</strong> 1秒以内（要件1.1）
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>自動再接続:</strong> 指数バックオフ（最大5回）
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>対応データ:</strong> 温度、湿度、気圧、風速、風向、降水量、照度、視程、体感温度
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default RealtimeWeatherCardDemo;