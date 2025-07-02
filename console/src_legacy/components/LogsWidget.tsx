import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  DragIndicatorOutlined,
  ExpandLessOutlined,
  ExpandMoreOutlined,
  ClearAllOutlined,
  ContentCopyOutlined,
} from '@mui/icons-material';
import './LogsWidget.css';

interface LogsWidgetProps {
  isEditMode: boolean;
  viewerIds: string[];
  viewerTitles: { [key: string]: string };
}

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  viewerId?: string;
}

const LogsWidget: React.FC<LogsWidgetProps> = ({
  isEditMode,
  viewerIds,
  viewerTitles,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedViewerId, setSelectedViewerId] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('INFO');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const logLevels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  const logLevelPriority = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    const addLog = (level: LogLevel, ...args: any[]) => {
      const message = args
        .map((arg) => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      // Determine if it's a viewer log from the message
      const viewerMatch = message.match(/^\[(fpv-viewer|payload-viewer)\]/);
      const viewerId = viewerMatch ? viewerMatch[1] : undefined;
      const cleanMessage = viewerMatch
        ? message.substring(viewerMatch[0].length).trim()
        : message;

      setLogs((prev) =>
        [
          ...prev,
          {
            level,
            timestamp: new Date().toISOString(),
            message: cleanMessage,
            viewerId,
          },
        ].slice(-1000)
      ); // keep a maximum of 1000 logs
    };

    console.log = (...args) => {
      addLog('INFO', ...args);
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      addLog('WARN', ...args);
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      addLog('ERROR', ...args);
      originalError.apply(console, args);
    };

    console.debug = (...args) => {
      addLog('DEBUG', ...args);
      originalDebug.apply(console, args);
    };

    // Cleanup
    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.debug = originalDebug;
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (logsContainerRef.current && isExpanded) {
      logsContainerRef.current.scrollTop =
        logsContainerRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  const clearLogs = () => {
    setLogs([]);
  };

  const copyLogs = async () => {
    const filteredLogs = getFilteredLogs();
    const logText = filteredLogs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level}] ${log.viewerId ? `[${viewerTitles[log.viewerId] || log.viewerId}] ` : ''}${log.message}`
      )
      .join('\n');

    await navigator.clipboard.writeText(logText);

    // Button feedback
    const btn = document.getElementById('copy-logs-btn');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  };

  const getFilteredLogs = () => {
    return logs.filter((log) => {
      // Level filter
      if (logLevelPriority[log.level] < logLevelPriority[selectedLevel]) {
        return false;
      }

      // Viewer filter
      if (selectedViewerId === 'all') {
        return true;
      } else if (selectedViewerId === 'system') {
        return !log.viewerId;
      } else {
        return log.viewerId === selectedViewerId;
      }
    });
  };

  const filteredLogs = getFilteredLogs();

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR':
        return '#dc3545';
      case 'WARN':
        return '#ffc107';
      case 'INFO':
        return '#0066cc';
      case 'DEBUG':
        return '#6c757d';
      default:
        return '#212529';
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e7e7e6',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid #e7e7e6',
          backgroundColor: '#fafafa',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isEditMode && (
            <IconButton
              size="small"
              className="widget-drag-handle"
              sx={{ mr: 1, cursor: 'move' }}
            >
              <DragIndicatorOutlined />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            Logs
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ ml: 'auto' }}
        >
          {isExpanded ? <ExpandLessOutlined /> : <ExpandMoreOutlined />}
        </IconButton>
      </Box>

      {isExpanded && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Tabs */}
          <Tabs
            value={selectedViewerId}
            onChange={(_, value) => setSelectedViewerId(value)}
            sx={{
              borderBottom: '1px solid #e7e7e6',
              minHeight: 'auto',
              '& .MuiTab-root': {
                minHeight: 36,
                py: 1,
                textTransform: 'none',
                fontSize: '0.875rem',
              },
            }}
          >
            <Tab label="All" value="all" />
            <Tab label="System" value="system" />
            {viewerIds.map((viewerId) => (
              <Tab
                key={viewerId}
                label={viewerTitles[viewerId] || viewerId}
                value={viewerId}
              />
            ))}
          </Tabs>

          {/* Controls */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              borderBottom: '1px solid #e7e7e6',
              backgroundColor: '#fafafa',
              flexShrink: 0,
            }}
          >
            <ButtonGroup size="small">
              {logLevels.map((level) => (
                <Button
                  key={level}
                  variant={selectedLevel === level ? 'contained' : 'outlined'}
                  onClick={() => setSelectedLevel(level)}
                  sx={{ textTransform: 'none' }}
                >
                  {level}
                </Button>
              ))}
            </ButtonGroup>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={clearLogs}
                startIcon={<ClearAllOutlined />}
                sx={{ textTransform: 'none' }}
              >
                Clear
              </Button>
              <Button
                id="copy-logs-btn"
                size="small"
                variant="outlined"
                onClick={copyLogs}
                startIcon={<ContentCopyOutlined />}
                sx={{ textTransform: 'none' }}
              >
                Copy
              </Button>
            </Box>
          </Box>

          {/* Log display */}
          <Box
            ref={logsContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              backgroundColor: '#f9f9f9',
              p: 2,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              minHeight: 0,
            }}
          >
            {filteredLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" align="center">
                No logs available
              </Typography>
            ) : (
              filteredLogs.map((log, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 0.5,
                    color: getLogLevelColor(log.level),
                    wordBreak: 'break-all',
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                    }}
                  >
                    <Box component="span" sx={{ color: '#666' }}>
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </Box>
                    <Box component="span" sx={{ fontWeight: 600, mx: 0.5 }}>
                      [{log.level}]
                    </Box>
                    {log.viewerId && (
                      <Box component="span" sx={{ color: '#888', mx: 0.5 }}>
                        [{viewerTitles[log.viewerId] || log.viewerId}]
                      </Box>
                    )}
                    {log.message}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default LogsWidget;
