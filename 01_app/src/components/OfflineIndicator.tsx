/**
 * オフラインインジケーターコンポーネント
 * ネットワーク接続状態を監視し、オフライン時に通知を表示
 */

import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import { WifiOff } from '@mui/icons-material';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      // オンライン復帰通知は3秒後に自動的に閉じる
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初期表示時にオフラインの場合は通知を表示
    if (!navigator.onLine) {
      setShowNotification(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Snackbar
      open={showNotification && !isOnline}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        severity="warning" 
        icon={<WifiOff />}
        sx={{ width: '100%' }}
      >
        オフラインです。一部の機能が制限されています。
        キャッシュされたデータのみ表示されます。
      </Alert>
    </Snackbar>
  );
};

/**
 * ネットワーク状態を監視するカスタムフック
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};