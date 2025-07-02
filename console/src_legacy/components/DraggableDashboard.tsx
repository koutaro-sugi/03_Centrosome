import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, IconButton, Tooltip } from '@mui/material';
import {
  PlayArrowOutlined,
  StopOutlined,
  LayersOutlined,
  SettingsOutlined,
  RefreshOutlined,
  SaveOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  MonitorOutlined,
  SplitscreenOutlined,
  GridViewOutlined,
} from '@mui/icons-material';
import GridLayout from 'react-grid-layout';
import VideoViewerWidget from './VideoViewerWidget';
import LogsWidget from './LogsWidget';
import GimbalControlWidget from './GimbalControlWidget';
import GimbalAnimationWidget from './GimbalAnimationWidget';

// Import required CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './DraggableDashboard.css';

// Define widget types
export type WidgetType =
  | 'fpv-viewer'
  | 'payload-viewer'
  | 'logs'
  | 'gimbal-control'
  | 'gimbal-animation';

// Widget definition interface
interface WidgetDefinition {
  id: string;
  type: WidgetType;
  title: string;
  component: React.ReactNode;
  visible: boolean;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
}

// Config from environment variables
const config = {
  region: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  channels: {
    fpv: import.meta.env.VITE_KVS_CHANNEL_NAME_FPV || 'usb-camera-channel',
    payload:
      import.meta.env.VITE_KVS_CHANNEL_NAME_PAYLOAD || 'siyi-zr30-channel',
  },
};

const DraggableDashboard: React.FC<{
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
}> = ({ isEditMode, setIsEditMode }) => {
  // State for tracking window size
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [gridHeight, setGridHeight] = useState(0);

  // Update window width when resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [widgets, setWidgets] = useState<WidgetDefinition[]>([
    {
      id: 'fpv-viewer',
      type: 'fpv-viewer',
      title: 'FPV Camera',
      component: (
        <VideoViewerWidget
          id="fpv-viewer"
          title="FPV Camera"
          channelName={config.channels.fpv}
          config={config}
          isEditMode={isEditMode}
        />
      ),
      visible: true,
      layout: { x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'payload-viewer',
      type: 'payload-viewer',
      title: 'Payload Camera',
      component: (
        <VideoViewerWidget
          id="payload-viewer"
          title="Payload Camera 1"
          channelName={config.channels.payload}
          config={config}
          isEditMode={isEditMode}
        />
      ),
      visible: true,
      layout: { x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    },
    {
      id: 'logs',
      type: 'logs',
      title: 'Logs',
      component: (
        <LogsWidget
          isEditMode={isEditMode}
          viewerIds={['fpv-viewer', 'payload-viewer']}
          viewerTitles={{
            'fpv-viewer': 'FPV Camera',
            'payload-viewer': 'Payload Camera 1',
          }}
        />
      ),
      visible: true,
      layout: { x: 0, y: 4, w: 8, h: 6, minW: 4, minH: 3 },
    },
    {
      id: 'gimbal-control',
      type: 'gimbal-control',
      title: 'SIYI ZR30 Gimbal Control',
      component: (
        <GimbalControlWidget
          id="gimbal-control"
          title="SIYI ZR30 Gimbal Control"
          isEditMode={isEditMode}
        />
      ),
      visible: true,
      layout: { x: 8, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
    },
    {
      id: 'gimbal-animation',
      type: 'gimbal-animation',
      title: 'Gimbal 3D Animation',
      component: (
        <GimbalAnimationWidget
          id="gimbal-animation"
          title="Gimbal 3D Animation"
          isEditMode={isEditMode}
        />
      ),
      visible: true,
      layout: { x: 0, y: 10, w: 6, h: 5, minW: 4, minH: 4 },
    },
  ]);

  // State for storing layout (unused but kept for compatibility)
  // const [layouts, setLayouts] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeLayout, setActiveLayout] = useState<
    'fullscreen' | 'splitscreen' | 'custom'
  >('custom');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [outOfBoundsWidgets, setOutOfBoundsWidgets] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Predefined layout presets
  const layoutPresets = {
    fullscreen: [
      { id: 'fpv-viewer', visible: true, x: 0, y: 0, w: 12, h: 6 },
      { id: 'payload-viewer', visible: false, x: 0, y: 0, w: 0, h: 0 },
      { id: 'logs', visible: true, x: 0, y: 6, w: 8, h: 6 },
      { id: 'gimbal-control', visible: true, x: 8, y: 6, w: 4, h: 6 },
      { id: 'gimbal-animation', visible: true, x: 0, y: 12, w: 6, h: 5 },
    ],
    splitscreen: [
      { id: 'fpv-viewer', visible: true, x: 0, y: 0, w: 6, h: 4 },
      { id: 'payload-viewer', visible: true, x: 6, y: 0, w: 6, h: 4 },
      { id: 'logs', visible: true, x: 0, y: 4, w: 8, h: 6 },
      { id: 'gimbal-control', visible: true, x: 8, y: 4, w: 4, h: 6 },
      { id: 'gimbal-animation', visible: true, x: 6, y: 10, w: 6, h: 5 },
    ],
  };

  // Apply preset layout
  const applyLayoutPreset = (presetName: 'fullscreen' | 'splitscreen') => {
    const savedLayout = localStorage.getItem(`dashboardLayout.${presetName}`);
    const preset = savedLayout
      ? JSON.parse(savedLayout)
      : layoutPresets[presetName];

    setWidgets((prev) =>
      prev.map((widget) => {
        const presetWidget = preset.find((item: any) => item.id === widget.id);
        if (presetWidget) {
          return {
            ...widget,
            visible: presetWidget.visible,
            layout: {
              ...widget.layout,
              x: presetWidget.x,
              y: presetWidget.y,
              w: presetWidget.w,
              h: presetWidget.h,
            },
          };
        }
        return widget;
      })
    );

    setActiveLayout(presetName);
    localStorage.setItem('dashboardLayout.active', presetName);
  };

  // Load saved layout from localStorage on mount
  useEffect(() => {
    try {
      const lastActiveLayout = localStorage.getItem('dashboardLayout.active');
      if (
        lastActiveLayout &&
        ['fullscreen', 'splitscreen', 'custom'].includes(lastActiveLayout)
      ) {
        setActiveLayout(
          lastActiveLayout as 'fullscreen' | 'splitscreen' | 'custom'
        );
      }

      let layoutKey = 'dashboardLayout';
      if (
        lastActiveLayout &&
        ['fullscreen', 'splitscreen'].includes(lastActiveLayout)
      ) {
        layoutKey = `dashboardLayout.${lastActiveLayout}`;
      }

      const savedLayout = localStorage.getItem(layoutKey);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);

        setWidgets((prev) =>
          prev.map((widget) => {
            const savedWidget = parsedLayout.find(
              (item: any) => item.id === widget.id
            );
            if (savedWidget) {
              return {
                ...widget,
                visible: savedWidget.visible,
                layout: {
                  ...widget.layout,
                  x: savedWidget.x,
                  y: savedWidget.y,
                  w: savedWidget.w,
                  h: savedWidget.h,
                },
              };
            }
            return widget;
          })
        );
      }
    } catch (error) {
      console.error('Layout loading error:', error);
    }
  }, []);

  // Derive the react-grid-layout format from widgets
  const getGridItems = () => {
    return widgets
      .filter((widget) => widget.visible)
      .map((widget) => ({
        i: widget.id,
        x: widget.layout.x,
        y: widget.layout.y,
        w: widget.layout.w,
        h: widget.layout.h,
        minW: widget.layout.minW,
        minH: widget.layout.minH,
        maxW: widget.layout.maxW,
        maxH: widget.layout.maxH,
      }));
  };

  // Handle layout change
  const handleLayoutChange = (newLayout: any) => {
    // setLayouts(newLayout); // Removed unused state

    setWidgets((prev) =>
      prev.map((widget) => {
        const layoutItem = newLayout.find((item: any) => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            layout: {
              ...widget.layout,
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
          };
        }
        return widget;
      })
    );

    // Check for out-of-bounds widgets
    checkOutOfBoundsWidgets(newLayout);
  };

  // Out-of-bounds widget detection function
  const checkOutOfBoundsWidgets = (layout: any[]) => {
    if (!scrollContainerRef.current) return;

    const containerHeight = scrollContainerRef.current.clientHeight;
    const rowHeight = 90;
    const visibleRows = Math.floor(containerHeight / rowHeight);

    const outOfBounds = layout
      .filter((item) => {
        const itemBottom = (item.y + item.h) * rowHeight;
        const currentScroll = scrollContainerRef.current?.scrollTop || 0;
        const visibleBottom = currentScroll + containerHeight;

        // If widget bottom greatly exceeds current visible range
        return itemBottom > visibleBottom + containerHeight;
      })
      .map((item) => item.i);

    setOutOfBoundsWidgets(outOfBounds);
  };

  // Widget rescue function (bring out-of-bounds widgets back to visible range)
  const rescueOutOfBoundsWidgets = () => {
    setWidgets((prev) => {
      let currentY = 0;
      const rescued = prev.map((widget) => {
        if (outOfBoundsWidgets.includes(widget.id)) {
          const newWidget = {
            ...widget,
            layout: {
              ...widget.layout,
              y: currentY,
            },
          };
          currentY += widget.layout.h;
          return newWidget;
        }
        return widget;
      });

      setOutOfBoundsWidgets([]);
      return rescued;
    });
  };

  // Scroll to specified widget
  const scrollToWidget = (widgetId: string) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (widget && scrollContainerRef.current) {
      const targetY = widget.layout.y * 90;
      scrollContainerRef.current.scrollTo({
        top: targetY - 100,
        behavior: 'smooth',
      });
    }
  };

  // Calculate GridLayout height
  const calculateGridHeight = useCallback(() => {
    const visibleWidgets = widgets.filter((w) => w.visible);
    if (visibleWidgets.length === 0) return 500; // minimum height

    // Find the position of the bottommost widget
    const maxY = Math.max(
      ...visibleWidgets.map((w) => w.layout.y + w.layout.h)
    );

    // Height calculation: (max Y coordinate * row height) + padding
    const rowHeight = 90;
    const containerPadding = 32; // same value as bottom padding
    const bottomPadding = 200; // provide more space

    return maxY * rowHeight + containerPadding + bottomPadding;
  }, [widgets]);

  // Recalculate height when widgets change
  useEffect(() => {
    setGridHeight(calculateGridHeight());
  }, [widgets, calculateGridHeight]);

  // Save layout to localStorage
  const saveLayout = () => {
    const layoutToSave = widgets.map((widget) => ({
      id: widget.id,
      visible: widget.visible,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h,
    }));

    if (activeLayout === 'custom') {
      localStorage.setItem('dashboardLayout', JSON.stringify(layoutToSave));
    } else {
      localStorage.setItem(
        `dashboardLayout.${activeLayout}`,
        JSON.stringify(layoutToSave)
      );
    }

    localStorage.setItem('dashboardLayout.active', activeLayout);

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId
          ? { ...widget, visible: !widget.visible }
          : widget
      )
    );
  };

  // Reset layout
  const resetLayout = () => {
    if (activeLayout === 'custom') {
      setWidgets([
        {
          id: 'fpv-viewer',
          type: 'fpv-viewer',
          title: 'FPV Camera',
          component: (
            <VideoViewerWidget
              id="fpv-viewer"
              title="FPV Camera"
              channelName={config.channels.fpv}
              config={config}
              isEditMode={isEditMode}
            />
          ),
          visible: true,
          layout: { x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
        },
        {
          id: 'payload-viewer',
          type: 'payload-viewer',
          title: 'Payload Camera',
          component: (
            <VideoViewerWidget
              id="payload-viewer"
              title="Payload Camera 1"
              channelName={config.channels.payload}
              config={config}
              isEditMode={isEditMode}
            />
          ),
          visible: true,
          layout: { x: 6, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
        },
        {
          id: 'logs',
          type: 'logs',
          title: 'Logs',
          component: (
            <LogsWidget
              isEditMode={isEditMode}
              viewerIds={['fpv-viewer', 'payload-viewer']}
              viewerTitles={{
                'fpv-viewer': 'FPV Camera',
                'payload-viewer': 'Payload Camera 1',
              }}
            />
          ),
          visible: true,
          layout: { x: 0, y: 4, w: 8, h: 6, minW: 4, minH: 4 },
        },
        {
          id: 'gimbal-control',
          type: 'gimbal-control',
          title: 'SIYI ZR30 Gimbal Control',
          component: (
            <GimbalControlWidget
              id="gimbal-control"
              title="SIYI ZR30 Gimbal Control"
              isEditMode={isEditMode}
            />
          ),
          visible: true,
          layout: { x: 8, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
        },
      ]);
      localStorage.removeItem('dashboardLayout');
    } else {
      applyLayoutPreset(activeLayout as 'fullscreen' | 'splitscreen');
    }
  };

  // Handle connect/disconnect all
  const handleConnectAll = () => {
    window.dispatchEvent(new Event('connect-all-viewers'));
  };

  const handleDisconnectAll = () => {
    window.dispatchEvent(new Event('disconnect-all-viewers'));
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        overflow: 'hidden', // control overflow in outer container
      }}
    >
      {/* Dashboard Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid #eee',
          backgroundColor: 'white',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LayersOutlined sx={{ mr: 1, color: 'black' }} />
          <Typography variant="h4" component="h1">
            A1 FPV Console
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Batch Operations */}
          <Button
            size="small"
            variant="contained"
            onClick={handleConnectAll}
            startIcon={<PlayArrowOutlined />}
          >
            Connect All
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={handleDisconnectAll}
            startIcon={<StopOutlined />}
          >
            Disconnect All
          </Button>

          {/* Layout Controls */}
          <Tooltip title={isEditMode ? 'Exit Edit Mode' : 'Edit Layout'}>
            <IconButton
              size="small"
              color={isEditMode ? 'primary' : 'default'}
              onClick={() => setIsEditMode(!isEditMode)}
              sx={{ border: isEditMode ? '1px solid' : 'none' }}
            >
              <SettingsOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {isEditMode && (
            <>
              <Tooltip title="Save Layout">
                <IconButton
                  size="small"
                  color={isSaved ? 'success' : 'default'}
                  onClick={saveLayout}
                >
                  <SaveOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Reset">
                <IconButton size="small" onClick={resetLayout}>
                  <RefreshOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>

              {/* Debug mode toggle */}
              <Tooltip title="Debug Info">
                <IconButton
                  size="small"
                  color={showDebugInfo ? 'primary' : 'default'}
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                >
                  <SettingsOutlined sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Layout Presets */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 2,
          borderBottom: '1px solid #eee',
          backgroundColor: 'white',
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', mr: 1 }}>
          Layout:
        </Typography>

        <Button
          variant={activeLayout === 'fullscreen' ? 'contained' : 'outlined'}
          size="small"
          color={activeLayout === 'fullscreen' ? 'primary' : 'inherit'}
          onClick={() => applyLayoutPreset('fullscreen')}
          startIcon={<MonitorOutlined sx={{ fontSize: 16 }} />}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Fullscreen
        </Button>

        <Button
          variant={activeLayout === 'splitscreen' ? 'contained' : 'outlined'}
          size="small"
          color={activeLayout === 'splitscreen' ? 'primary' : 'inherit'}
          onClick={() => applyLayoutPreset('splitscreen')}
          startIcon={<SplitscreenOutlined sx={{ fontSize: 16 }} />}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Split Screen
        </Button>

        <Button
          variant={activeLayout === 'custom' ? 'contained' : 'outlined'}
          size="small"
          color={activeLayout === 'custom' ? 'primary' : 'inherit'}
          onClick={() => setActiveLayout('custom')}
          startIcon={<GridViewOutlined sx={{ fontSize: 16 }} />}
          disabled={!localStorage.getItem('dashboardLayout')}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Custom
        </Button>
      </Box>

      {/* Widget Visibility Controls */}
      {isEditMode && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            p: 2,
            borderBottom: '1px solid #eee',
            backgroundColor: 'rgba(0,0,0,0.02)',
          }}
        >
          {widgets.map((widget) => (
            <Tooltip
              key={widget.id}
              title={`${widget.visible ? 'Hide' : 'Show'} ${widget.title}`}
            >
              <Button
                size="small"
                variant={widget.visible ? 'contained' : 'outlined'}
                color={widget.visible ? 'primary' : 'inherit'}
                onClick={() => toggleWidgetVisibility(widget.id)}
                startIcon={
                  widget.visible ? (
                    <VisibilityOutlined sx={{ fontSize: 16 }} />
                  ) : (
                    <VisibilityOffOutlined sx={{ fontSize: 16 }} />
                  )
                }
                sx={{ textTransform: 'none' }}
              >
                {widget.title}
              </Button>
            </Tooltip>
          ))}
        </Box>
      )}

      {/* Grid Layout */}
      <Box
        ref={scrollContainerRef}
        className="dashboard-scroll-container"
        sx={{
          flexGrow: 1,
          backgroundColor: 'rgba(0,0,0,0.01)',
          width: '100%',
          overflow: 'auto', // changed from overflowY to overflow
          position: 'relative',
        }}
      >
        <div
          className="grid-layout-wrapper"
          style={{
            minHeight: `${gridHeight}px`,
            paddingBottom: '150px', // provide more space at the bottom
          }}
        >
          <GridLayout
            className={`layout ${isEditMode ? 'edit-mode' : ''}`}
            layout={getGridItems()}
            cols={12}
            rowHeight={90}
            width={windowWidth - 32}
            containerPadding={[16, 32]} // increase bottom padding
            margin={[8, 8]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            onLayoutChange={handleLayoutChange}
            compactType={null}
            preventCollision={true}
            useCSSTransforms={true}
            draggableHandle=".drag-handle"
            autoSize={false} // disable automatic height adjustment
          >
            {widgets
              .filter((widget) => widget.visible)
              .map((widget) => (
                <div key={widget.id}>
                  <Box
                    className={`drag-handle ${outOfBoundsWidgets.includes(widget.id) ? 'widget-out-of-bounds' : ''}`}
                    sx={{
                      position: 'relative',
                      height: '100%',
                      cursor: isEditMode ? 'move' : 'default',
                    }}
                  >
                    {widget.component}

                    {/* Debug info display */}
                    {showDebugInfo && isEditMode && (
                      <Box className="widget-debug-info">
                        {widget.id}
                        <br />
                        X:{widget.layout.x} Y:{widget.layout.y}
                        <br />
                        W:{widget.layout.w} H:{widget.layout.h}
                      </Box>
                    )}
                  </Box>
                </div>
              ))}
          </GridLayout>
        </div>

        {/* Out-of-bounds widget rescue button */}
        {isEditMode && outOfBoundsWidgets.length > 0 && (
          <Tooltip
            title={`${outOfBoundsWidgets.length} widgets are out of bounds`}
          >
            <IconButton
              className="rescue-widgets-button"
              onClick={rescueOutOfBoundsWidgets}
              sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                backgroundColor: '#ff5722',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#f44336',
                },
              }}
            >
              <RefreshOutlined />
            </IconButton>
          </Tooltip>
        )}

        {/* Widget position list (for debugging) */}
        {showDebugInfo && isEditMode && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 20,
              left: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: 2,
              borderRadius: 1,
              maxHeight: 300,
              overflowY: 'auto',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
              Widget Positions
            </Typography>
            {widgets
              .filter((w) => w.visible)
              .sort((a, b) => a.layout.y - b.layout.y)
              .map((widget) => (
                <Box
                  key={widget.id}
                  sx={{
                    mb: 0.5,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                  onClick={() => scrollToWidget(widget.id)}
                >
                  {widget.id}: Y={widget.layout.y} (Row {widget.layout.y + 1})
                  {outOfBoundsWidgets.includes(widget.id) && ' ⚠️'}
                </Box>
              ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DraggableDashboard;
