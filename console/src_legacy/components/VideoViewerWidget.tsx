import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrowOutlined,
  StopOutlined,
  SignalCellular4BarOutlined,
  AccessTimeOutlined,
} from '@mui/icons-material';
import { fetchAuthSession } from 'aws-amplify/auth';
import './VideoViewerWidget.css';

interface VideoViewerWidgetProps {
  id: string;
  title: string;
  channelName: string;
  config: {
    region: string;
    channels: {
      fpv: string;
      payload: string;
    };
  };
  isEditMode: boolean;
}

interface StreamStats {
  bitrate: number;
  latency: number;
  packetsLost: number;
}

type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error'
  | 'timeout';

interface VideoStreamState {
  hasVideo: boolean;
  width: number;
  height: number;
  readyState: number;
}

const VideoViewerWidget: React.FC<VideoViewerWidgetProps> = ({
  id,
  title,
  channelName,
  config,
  isEditMode,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [streamStats, setStreamStats] = useState<StreamStats>({
    bitrate: 0,
    latency: 0,
    packetsLost: 0,
  });
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [lastError, setLastError] = useState<string>('');
  const [videoState, setVideoState] = useState<VideoStreamState>({
    hasVideo: false,
    width: 0,
    height: 0,
    readyState: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerRef = useRef<any>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string>('');
  const isConnectingRef = useRef<boolean>(false);

  // ビットレート表示用フォーマット
  const formatBitrate = (bitrate: number): string => {
    if (bitrate === 0) return '0 bps';
    if (bitrate < 1000) return `${Math.round(bitrate)} bps`;
    if (bitrate < 1000000) return `${(bitrate / 1000).toFixed(1)} kbps`;
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  };

  // レイテンシ表示用フォーマット
  const formatLatency = (latency: number): string => {
    if (latency === 0) return '0ms';
    return `${Math.round(latency)}ms`;
  };

  // ビデオ状態監視の設定
  const setupVideoStateMonitoring = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    const updateVideoState = () => {
      const hasValidVideo =
        video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2;
      const newState = {
        hasVideo: hasValidVideo,
        width: video.videoWidth,
        height: video.videoHeight,
        readyState: video.readyState,
      };

      setVideoState(newState);
      console.log(`[${id}] Video state updated:`, newState);
    };

    // 重要なビデオイベントを監視
    video.addEventListener('loadedmetadata', updateVideoState);
    video.addEventListener('loadeddata', updateVideoState);
    video.addEventListener('canplay', updateVideoState);
    video.addEventListener('resize', updateVideoState);
    video.addEventListener('playing', updateVideoState);

    // 初期状態を設定
    updateVideoState();

    return () => {
      video.removeEventListener('loadedmetadata', updateVideoState);
      video.removeEventListener('loadeddata', updateVideoState);
      video.removeEventListener('canplay', updateVideoState);
      video.removeEventListener('resize', updateVideoState);
      video.removeEventListener('playing', updateVideoState);
    };
  };

  const connect = async (attempt: number = 1) => {
    if (
      (status !== 'disconnected' && status !== 'error') ||
      !videoRef.current ||
      isConnectingRef.current
    )
      return;

    isConnectingRef.current = true;
    setRetryAttempt(attempt);
    console.log(
      `[${id}] Connection started (attempt ${attempt}/3): ${channelName}`
    );
    setStatus('connecting');
    setConnectionProgress(10);

    try {
      // セキュアなAmplify認証を使用してAWS認証情報を取得
      setConnectionProgress(20);
      const session = await fetchAuthSession();
      const credentials = session.credentials;

      if (!credentials) {
        throw new Error(
          'Failed to obtain AWS credentials. Amplify authentication is required.'
        );
      }

      console.log(
        `[${id}] Starting KVS connection using Amplify authentication`
      );

      setConnectionProgress(40);
      clientIdRef.current = Math.random()
        .toString(36)
        .substring(2)
        .toUpperCase();

      const formValues = {
        region: config.region,
        channelName: channelName,
        clientId: clientIdRef.current,
        sendVideo: false,
        sendAudio: false,
        openDataChannel: false,
        widescreen: true,
        useTrickleICE: true,
        natTraversalDisabled: false,
        forceSTUN: false,
        forceTURN: false,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken || '',
        enableDQPmetrics: false,
        enableProfileTimeline: false,
        sendHostCandidates: true,
        acceptHostCandidates: true,
        sendRelayCandidates: true,
        acceptRelayCandidates: true,
        sendSrflxCandidates: true,
        acceptSrflxCandidates: true,
        sendPrflxCandidates: false,
        acceptPrflxCandidates: false,
        sendTcpCandidates: false,
        acceptTcpCandidates: false,
        sendUdpCandidates: true,
        acceptUdpCandidates: true,
      };

      setConnectionProgress(60);

      // ライブラリが読み込まれているか確認
      if (typeof (window as any).startViewer !== 'function') {
        throw new Error('Viewer library not loaded - please reload the page');
      }

      if (typeof (window as any).stopViewer !== 'function') {
        throw new Error('StopViewer function not available');
      }

      // 現在のグローバルviewerを保存
      const originalViewer = (window as any).viewer;

      setConnectionProgress(80);

      // ビデオ状態監視を設定
      setupVideoStateMonitoring();

      // startViewerを実行（改良されたエラーハンドリング付き）
      await new Promise<void>((resolve, reject) => {
        // Set connection timeout to 20 seconds (shortened considering retries)
        const timeout = setTimeout(() => {
          console.warn(`[${id}] Connection timeout (${attempt}/3)`);
          reject(new Error('Connection timeout occurred'));
        }, 20000);

        let isResolved = false;
        const safeResolve = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            resolve();
          }
        };

        const safeReject = (error: Error) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            reject(error);
          }
        };

        try {
          // Execute startViewer only once and improve error handling
          (window as any)
            .startViewer(
              null,
              videoRef.current,
              formValues,
              (stats: any) => {
                // Statistics callback
                if (stats && stats.video) {
                  setStreamStats({
                    bitrate: (stats.video.bytesReceived || 0) * 8,
                    latency: stats.video.jitter || 0,
                    packetsLost: stats.video.packetsLost || 0,
                  });
                }
              },
              null // remoteMessage
            )
            .then(() => {
              console.log(`[${id}] startViewer success`);
            })
            .catch((error: any) => {
              console.error(`[${id}] startViewer error:`, error);
              safeReject(
                new Error(`startViewer failed: ${error.message || error}`)
              );
            });

          // Detect successful connection (most reliable method)
          let checkCount = 0;
          const maxChecks = 80; // 20 seconds of checking

          const checkInterval = setInterval(() => {
            checkCount++;

            if (videoRef.current) {
              const video = videoRef.current;
              const hasValidVideo =
                video.readyState >= 2 &&
                video.videoWidth > 0 &&
                video.videoHeight > 0;

              if (hasValidVideo) {
                console.log(
                  `[${id}] Video stream detected: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`
                );
                clearInterval(checkInterval);

                // Update video state
                setVideoState({
                  hasVideo: true,
                  width: video.videoWidth,
                  height: video.videoHeight,
                  readyState: video.readyState,
                });

                safeResolve();
                return;
              }

              // Check WebRTC connection state
              if (
                (window as any).viewer &&
                (window as any).viewer.peerConnection
              ) {
                const pc = (window as any).viewer.peerConnection;
                if (pc.connectionState === 'connected' && checkCount > 20) {
                  // Connection successful but video not yet available, wait a bit
                  console.log(
                    `[${id}] WebRTC connection successful, waiting for video stream...`
                  );
                }
              }
            }

            // Timeout check
            if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              console.warn(`[${id}] Video stream detection timed out`);
              safeReject(new Error('Video stream detection timeout'));
            }
          }, 250);

          // Video error handling
          if (videoRef.current) {
            videoRef.current.addEventListener(
              'error',
              (e) => {
                console.error(`[${id}] Video error:`, e);
                clearInterval(checkInterval);
                safeReject(new Error('Video playback error'));
              },
              { once: true }
            );

            videoRef.current.addEventListener(
              'loadeddata',
              () => {
                console.log(`[${id}] Video data loading completed`);
              },
              { once: true }
            );
          }
        } catch (error) {
          console.error(`[${id}] startViewer execution error:`, error);
          safeReject(error as Error);
        }
      });

      // Save this widget's viewer instance
      viewerRef.current = (window as any).viewer;

      // Restore global viewer
      (window as any).viewer = originalViewer;

      setConnectionProgress(100);
      setStatus('connected');
      setRetryAttempt(0);
      console.log(`[${id}] Connection successful`);

      // Verify video stream and update state
      if (videoRef.current) {
        const video = videoRef.current;
        console.log(`[${id}] Video element state:`, {
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          currentSrc: video.currentSrc,
          srcObject: !!video.srcObject,
        });

        // Update video state immediately
        setVideoState({
          hasVideo:
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            video.readyState >= 2,
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
        });
      }

      // Start monitoring statistics
      startStatsMonitoring();
    } catch (error: any) {
      console.error(`[${id}] Connection error (attempt ${attempt}/3):`, error);

      // Immediately reset UI state (prevents state inconsistency during timeout)
      isConnectingRef.current = false;

      // Store error message
      const errorMessage = error.message || 'Unknown error';
      setLastError(errorMessage);

      // Retry logic
      if (attempt < 3) {
        const retryDelay = Math.min(2000 * attempt, 5000); // Exponential backoff (max 5 seconds)
        console.log(
          `[${id}] Retrying in ${retryDelay / 1000} seconds... (attempt ${attempt + 1}/3)`
        );

        // Completely clean up previous connection
        if ((window as any).viewer) {
          try {
            (window as any).stopViewer();
          } catch (cleanupError) {
            console.warn(`[${id}] Cleanup error:`, cleanupError);
          }
        }

        // Clean up video element as well
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.load();
        }

        // Set specific status for timeout cases
        if (errorMessage.includes('timeout')) {
          setStatus('timeout');
        } else {
          setStatus('disconnected');
        }
        setConnectionProgress(0);

        setTimeout(() => {
          connect(attempt + 1);
        }, retryDelay);
        return;
      }

      // Handle all attempts failed
      if (errorMessage.includes('timeout')) {
        setStatus('timeout');
      } else {
        setStatus('error');
      }
      setConnectionProgress(0);
      setRetryAttempt(0);

      // Output detailed error to console
      console.error(
        `[${id}] Connection failed after ${attempt} attempts: ${errorMessage}`
      );
    }
  };

  const disconnect = async () => {
    if (status === 'disconnected') return;

    console.log(`[${id}] Starting disconnection process`);

    try {
      // 接続中フラグを設定して重複実行を防ぐ
      isConnectingRef.current = true;
      setStatus('disconnecting');

      // 統計監視を停止
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      // WebRTC接続を切断
      if (viewerRef.current) {
        // シグナリングクライアント切断
        if (viewerRef.current.signalingClient) {
          try {
            viewerRef.current.signalingClient.close();
          } catch (e) {
            console.warn(`[${id}] Signaling client disconnect error:`, e);
          }
          viewerRef.current.signalingClient = null;
        }

        // ピア接続切断
        if (viewerRef.current.peerConnection) {
          try {
            viewerRef.current.peerConnection.close();
          } catch (e) {
            console.warn(`[${id}] Peer connection disconnect error:`, e);
          }
          viewerRef.current.peerConnection = null;
        }

        // ローカルストリーム停止
        if (viewerRef.current.localStream) {
          try {
            viewerRef.current.localStream
              .getTracks()
              .forEach((track) => track.stop());
          } catch (e) {
            console.warn(`[${id}] Local stream stop error:`, e);
          }
          viewerRef.current.localStream = null;
        }

        // リモートストリーム停止
        if (viewerRef.current.remoteStream) {
          try {
            viewerRef.current.remoteStream
              .getTracks()
              .forEach((track) => track.stop());
          } catch (e) {
            console.warn(`[${id}] Remote stream stop error:`, e);
          }
          viewerRef.current.remoteStream = null;
        }

        // 統計監視インターバル停止（viewer内部）
        if (viewerRef.current.peerConnectionStatsInterval) {
          clearInterval(viewerRef.current.peerConnectionStatsInterval);
          viewerRef.current.peerConnectionStatsInterval = null;
        }
      }

      // ビデオ要素をクリア
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load(); // ビデオ要素をリセット
      }

      // 状態をリセット
      viewerRef.current = null;
      setStreamStats({ bitrate: 0, latency: 0, packetsLost: 0 });
      setConnectionProgress(0);
      setRetryAttempt(0);
      setVideoState({ hasVideo: false, width: 0, height: 0, readyState: 0 });

      console.log(`[${id}] Disconnection process completed successfully`);
    } catch (error) {
      console.error(`[${id}] Disconnection process error:`, error);
    } finally {
      // 最終的に状態をリセット
      isConnectingRef.current = false;
      setStatus('disconnected');
    }
  };

  const startStatsMonitoring = () => {
    if (!viewerRef.current?.peerConnection) return;

    statsIntervalRef.current = setInterval(async () => {
      if (!viewerRef.current?.peerConnection) return;

      try {
        const stats = await viewerRef.current.peerConnection.getStats();
        let videoStats: any = null;

        stats.forEach((report: any) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            videoStats = report;
          }
        });

        if (videoStats) {
          setStreamStats({
            bitrate: videoStats.bytesReceived
              ? videoStats.bytesReceived * 8
              : 0,
            latency: videoStats.jitterBufferDelay || 0,
            packetsLost: videoStats.packetsLost || 0,
          });
        }
      } catch (error) {
        console.debug(`[${id}] Statistics retrieval error:`, error);
      }
    }, 1000);
  };

  useEffect(() => {
    // コンポーネントアンマウント時のクリーンアップ
    return () => {
      if (status !== 'disconnected' && status !== 'disconnecting') {
        // クリーンアップ関数では非同期関数を直接使えないので、
        // disconnectの中身を同期的に実行
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }

        if (viewerRef.current) {
          try {
            if (viewerRef.current.signalingClient) {
              viewerRef.current.signalingClient.close();
            }
            if (viewerRef.current.peerConnection) {
              viewerRef.current.peerConnection.close();
            }
            if (viewerRef.current.localStream) {
              viewerRef.current.localStream
                .getTracks()
                .forEach((track: any) => track.stop());
            }
            if (viewerRef.current.remoteStream) {
              viewerRef.current.remoteStream
                .getTracks()
                .forEach((track: any) => track.stop());
            }
          } catch (error) {
            console.warn(`[${id}] Cleanup error:`, error);
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, []);

  // Support for connect/disconnect all buttons (FPV priority implementation)
  useEffect(() => {
    const handleConnectAll = () => {
      if (
        status === 'disconnected' ||
        status === 'error' ||
        status === 'timeout'
      ) {
        // FPV camera starts connection immediately
        if (id === 'fpv-viewer') {
          connect();
        } else {
          // Payload camera has 500ms delay
          setTimeout(() => {
            if (
              status === 'disconnected' ||
              status === 'error' ||
              status === 'timeout'
            ) {
              connect();
            }
          }, 500);
        }
      }
    };

    const handleDisconnectAll = async () => {
      if (status !== 'disconnected' && status !== 'disconnecting') {
        await disconnect();
      }
    };

    window.addEventListener(`connect-all-viewers`, handleConnectAll);
    window.addEventListener(`disconnect-all-viewers`, handleDisconnectAll);

    return () => {
      window.removeEventListener(`connect-all-viewers`, handleConnectAll);
      window.removeEventListener(`disconnect-all-viewers`, handleDisconnectAll);
    };
  }, [status, id]);

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e7e7e6',
        borderRadius: 2,
        position: 'relative',
        /* Fill completely within grid item */
        height: '100%',
        width: '100%',
        /* Remove edit mode highlight (controlled by DraggableDashboard) */
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #e7e7e6',
          backgroundColor: '#fafafa',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
        >
          {/* Drag handle removed as it's controlled by DraggableDashboard */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}
        >
          <Chip
            label={
              status === 'disconnected'
                ? 'Disconnected'
                : status === 'connecting'
                  ? 'Connecting'
                  : status === 'connected'
                    ? 'Connected'
                    : status === 'disconnecting'
                      ? 'Disconnecting'
                      : status === 'timeout'
                        ? 'Timeout'
                        : 'Error'
            }
            size="small"
            color={
              status === 'connected'
                ? 'success'
                : status === 'connecting'
                  ? 'warning'
                  : status === 'disconnecting'
                    ? 'warning'
                    : status === 'timeout'
                      ? 'warning'
                      : status === 'error'
                        ? 'error'
                        : 'default'
            }
            variant={status === 'connected' ? 'filled' : 'outlined'}
          />
          {(status === 'disconnected' ||
            status === 'error' ||
            status === 'timeout') && (
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setLastError(''); // エラーメッセージをクリア
                connect();
              }}
              startIcon={<PlayArrowOutlined />}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              disabled={isConnectingRef.current}
            >
              {status === 'error' || status === 'timeout' ? 'Retry' : 'Connect'}
            </Button>
          )}
          {(status === 'connecting' ||
            status === 'connected' ||
            status === 'disconnecting') && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => disconnect()}
              startIcon={<StopOutlined />}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
              disabled={status === 'disconnecting'}
            >
              {status === 'disconnecting' ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Progress bar */}
      {status === 'connecting' && (
        <Box sx={{ position: 'relative' }}>
          <LinearProgress
            variant="determinate"
            value={connectionProgress}
            color="primary"
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(0,0,0,0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                backgroundColor: '#1976d2',
              },
            }}
          />
          {retryAttempt > 1 && (
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'text.secondary',
                fontSize: '0.7rem',
              }}
            >
              Attempt {retryAttempt}/3
            </Typography>
          )}
        </Box>
      )}

      {/* Video display area */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          margin: 0,
          padding: 0,
        }}
        className="video-display-area"
      >
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls={status === 'connected' && videoState.hasVideo}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
          }}
        />

        {/* Connection status overlay */}
        {(!videoState.hasVideo || status !== 'connected') && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              margin: 0,
              padding: 0,
              border: 'none',
            }}
            className="video-blank-placeholder"
          >
            {status === 'connecting' ? (
              <>
                <CircularProgress sx={{ color: '#6c757d' }} />
                <Typography variant="body1" sx={{ color: '#6c757d' }}>
                  Connecting...
                </Typography>
                {retryAttempt > 1 && (
                  <Typography variant="caption" sx={{ color: '#6c757d' }}>
                    Attempt {retryAttempt}/3
                  </Typography>
                )}
              </>
            ) : status === 'error' || status === 'timeout' ? (
              <>
                <Typography variant="body1" sx={{ color: '#dc3545', mb: 1 }}>
                  {status === 'timeout'
                    ? 'Connection Timeout'
                    : 'Connection Error'}
                </Typography>
                {lastError && (
                  <Typography
                    variant="caption"
                    sx={{ color: '#dc3545', mb: 1, textAlign: 'center' }}
                  >
                    {lastError}
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setLastError('');
                    connect();
                  }}
                  sx={{ color: '#6c757d', borderColor: '#6c757d' }}
                >
                  Retry
                </Button>
              </>
            ) : status === 'connected' && !videoState.hasVideo ? (
              <Typography variant="body1" sx={{ color: '#6c757d' }}>
                Waiting for video stream...
              </Typography>
            ) : (
              <Typography
                variant="body1"
                sx={{ color: '#fff', textAlign: 'center' }}
              >
                No video stream
              </Typography>
            )}
          </Box>
        )}

        {/* Stream statistics overlay - shown only when connected */}
        {status === 'connected' &&
          videoState.hasVideo &&
          streamStats.bitrate > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 4,
                display: 'flex',
                gap: 1,
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}
            >
              <Box
                sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                <SignalCellular4BarOutlined sx={{ fontSize: '1rem' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'white', fontWeight: 500 }}
                >
                  {formatBitrate(streamStats.bitrate)}
                </Typography>
              </Box>

              <Box
                sx={{
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                <AccessTimeOutlined sx={{ fontSize: '1rem' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'white', fontWeight: 500 }}
                >
                  {formatLatency(streamStats.latency)}
                </Typography>
              </Box>
            </Box>
          )}
      </Box>

      <Box
        sx={{
          p: 1,
          borderTop: '1px solid #e7e7e6',
          backgroundColor: '#fafafa',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
        >
          Channel: {channelName}{' '}
          {videoState.hasVideo && `(${videoState.width}x${videoState.height})`}
        </Typography>
      </Box>
    </Paper>
  );
};

export default VideoViewerWidget;
