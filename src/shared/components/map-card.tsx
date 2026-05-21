import {
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Menu,
  Typography,
  Divider,
  Tooltip,
  Fade,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import CompactMenuItem from './compact-menu-item';
import CloseIcon from '@mui/icons-material/Close';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import DownloadIcon from '@mui/icons-material/Download';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CodeIcon from '@mui/icons-material/Code';

interface ResponsiveMapCardProps {
  mapRef?: React.RefObject<HTMLDivElement>
  fullscreenMapRef?: React.RefObject<HTMLDivElement>
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  aspectRatio?: number // Aspect ratio (width / height)
  [key: string]: unknown // Capture all other props
  controlPanel?: React.ReactNode
  infoMessage?: React.ReactElement
  showInfoMessage?: boolean
  title?: string
}
const SectionHeader = ({
  icon,
  title,
}: {
  icon: React.ReactNode
  title: string
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      borderBottom: theme => `1px solid ${theme.palette.divider}`,
      px: 1.5,
      py: 1,
      background: theme => theme.palette.customSurface.sectionHeader,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      margin: 0,
      width: '100%',
    }}
  >
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.secondary',
      mr: 1
    }}>
      {icon}
    </Box>
    <Typography
      variant="subtitle2"
      sx={{
        display: 'flex',
        alignItems: 'center',
        fontWeight: 600,
        color: 'text.primary',
      }}
    >
      {title}
    </Typography>
  </Box>
);

const ResponsiveMapCard: React.FC<ResponsiveMapCardProps> = ({
  mapRef,
  fullscreenMapRef: _fullscreenMapRef,
  title,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 2000,
  maxHeight = 300,
  aspectRatio = 1,
  controlPanel,
  infoMessage,
  showInfoMessage,
}) => {
  const [width, setWidth] = useState(minWidth);
  const [height, setHeight] = useState(minHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  // Add a new state for fullscreen menu
  const [fullscreenAnchorEl, setFullscreenAnchorEl] = useState<null | HTMLElement>(null);
  const fullscreenMenuOpen = Boolean(fullscreenAnchorEl);

  // Function to update the chart dimensions based on the container's size
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth || window.innerWidth * 0.9;

      // Adjust to fit exactly within the container with no overflow
      const newWidth = Math.max(minWidth, Math.min(containerWidth, maxWidth));
      const newHeight = Math.max(
        minHeight,
        Math.min(newWidth / aspectRatio, maxHeight),
      );

      setWidth(newWidth);
      setHeight(newHeight);
    }
  }, [minWidth, maxWidth, minHeight, maxHeight, aspectRatio]);

  useEffect(() => {
    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [updateSize]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);

  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // New function to handle chart download
  const handleDownloadChart = () => {
    if (containerRef.current) {
      // Find the canvas element inside the container
      const canvas = containerRef.current.querySelector('canvas');

      if (canvas) {
        // Create a temporary link element
        const link = document.createElement('a');

        link.download = `${title || 'chart'}_${new Date().toISOString()
          .split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    handleMenuClose();
  };

  // Enhanced function to handle full-screen mode
  const handleFullScreen = () => {
    setFullscreenOpen(true);
    handleMenuClose();
  };

  const handleCloseFullscreen = () => {
    setFullscreenOpen(false);
  };

  // When fullscreen dialog opens, resize the chart to fit
  useEffect(() => {
    if (fullscreenOpen) {
      // Short delay to ensure the dialog is rendered before measuring
      const timer = setTimeout(() => updateSize(), 100);

      return () => clearTimeout(timer);
    }
  }, [fullscreenOpen, updateSize]);

  // Replaced view data function with JSON download function
  const handleDownloadData = () => {
    // if (spec?.data) {
    //   // Extract data from spec
    //   let dataToExport;

    //   if (spec.data.values) {
    //     dataToExport = spec.data.values;
    //   } else if (spec.data.name && otherProps.data && otherProps.data[spec.data.name]) {
    //     dataToExport = otherProps.data[spec.data.name];
    //   } else {
    //     dataToExport = spec.data;
    //   }

    //   // Convert data to JSON string
    //   const jsonData = JSON.stringify(dataToExport, null, 2);

    //   // Create blob and download link
    //   const blob = new Blob([jsonData], { type: 'application/json' });
    //   const url = URL.createObjectURL(blob);
    //   const link = document.createElement('a');

    //   link.href = url;
    //   link.download = `${title || 'chart-data'}_${new Date().toISOString().split('T')[0]}.json`;
    //   document.body.appendChild(link);
    //   link.click();

    //   // Clean up
    //   document.body.removeChild(link);
    //   URL.revokeObjectURL(url);
    // }
    handleMenuClose();
  };

  const handleFullscreenMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setFullscreenAnchorEl(event.currentTarget);
  };

  const handleFullscreenMenuClose = () => {
    setFullscreenAnchorEl(null);
  };

  return (
    <>
      <Card
        elevation={0}
        sx={{
          maxWidth: maxWidth,
          mx: 'auto',
          mb: 1,
          boxShadow: 'none',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          border: theme => `1px solid ${theme.palette.customGrey.main}`,
        }}
      >
        <CardHeader
          action={
            <>
              <IconButton
                aria-label="settings"
                onClick={handleMenuClick}
                size="small"
                sx={{
                  position: 'relative',
                  '& svg': {
                    zIndex: 1,
                    position: 'relative',
                  },
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  elevation: 2,
                  sx: {
                    width: 240,
                    maxHeight: 380,
                    overflow: 'hidden',
                    borderRadius: 1.5,
                    mt: 0.5,
                    '& .MuiMenu-list': { padding: 0 },
                  },
                }}
                MenuListProps={{ sx: { padding: 0 } }}
              >
                <SectionHeader icon={<SettingsSuggestIcon fontSize="small" />} title="Chart Options" />
                {controlPanel && (
                  <>
                    <Box sx={{ p: 1.25 }}>
                      {controlPanel}
                    </Box>
                    <Divider sx={{ opacity: 0.6 }} />
                  </>
                )}
                {/* Quick Actions */}
                <Box sx={{ py: 0.5 }}>
                  <CompactMenuItem
                    onClick={handleDownloadChart}
                    icon={<DownloadIcon fontSize="small" />}
                    primary="Download as PNG"
                    secondary="Save chart as image"
                  />
                  <CompactMenuItem
                    onClick={handleDownloadData}
                    icon={<CodeIcon fontSize="small" />}
                    primary="Download Data as JSON"
                    secondary="Export chart's underlying data"
                  />
                </Box>
              </Menu>
              <Tooltip title="Fullscreen">
                <IconButton
                  aria-label="fullscreen"
                  onClick={handleFullScreen}
                  size="small"
                  sx={{
                    mr: 0.5,
                    '& svg': {
                      position: 'relative',
                      zIndex: 1,
                    },
                  }}
                >
                  <FullscreenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          }
          title={
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
          }
          sx={{
            background: theme => theme.palette.customSurface.cardHeader,
            borderBottom: theme => `1px solid ${theme.palette.divider}`,
            padding: '6px 12px',
            height: '40px',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            flexShrink: 0,
          }}
        />
        <CardContent sx={{
          bgcolor: 'customSurface.cardContent',
          py: 2,
          px: 3,
          '&:last-child': {
            paddingBottom: 3
          },
          borderRadius: '0 0 8px 8px',
          display: 'flex',
          flexGrow: 1, // Allow content to grow
          overflow: 'auto', // Only make the content scrollable
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Box
            ref={containerRef}
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {
              showInfoMessage ? (
                <Box sx={{ width: width, height: height }}>
                  {infoMessage}
                </Box>
              ) : (
                <Box ref={mapRef} style={{ height: '100%', width: '100%' }} />
              )
            }
          </Box>
        </CardContent>
      </Card>

      {/* Fullscreen Dialog */}
      <Dialog
        fullScreen={fullScreen}
        maxWidth="xl"
        open={fullscreenOpen}
        onClose={handleCloseFullscreen}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 2,
            width: fullScreen ? '100%' : '90vw',
            height: fullScreen ? '100%' : '90vh',
            maxWidth: 'unset',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          px: 2,
          py: 1,
        }}>
          <Typography variant="subtitle1" component="div" sx={{
            fontWeight: 700,
            color: 'text.primary',
          }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {controlPanel && (
              <>
                <IconButton
                  aria-label="settings"
                  onClick={handleFullscreenMenuClick}
                  size="small"
                  sx={{
                    mr: 1,
                    '& svg': {
                      position: 'relative',
                      zIndex: 1,
                    },
                  }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={fullscreenAnchorEl}
                  open={fullscreenMenuOpen}
                  onClose={handleFullscreenMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  PaperProps={{
                    elevation: 2,
                    sx: {
                      width: 240,
                      maxHeight: 380,
                      overflow: 'hidden',
                      borderRadius: 1.5,
                      mt: 0.5,
                      '& .MuiMenu-list': { padding: 0 },
                    },
                  }}
                  MenuListProps={{ sx: { padding: 0 } }}
                >
                  <SectionHeader icon={<SettingsSuggestIcon fontSize="small" />} title="Chart Options" />
                  <Box sx={{ p: 1.25 }}>
                    {controlPanel}
                  </Box>
                </Menu>
              </>
            )}
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleCloseFullscreen}
              aria-label="close"
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}>
          {!showInfoMessage ? (
            <Box ref={mapRef} style={{ width: fullScreen ? window.innerWidth * 0.94 : window.innerWidth * 0.87,
              height: fullScreen ? window.innerHeight * 0.7 : window.innerHeight * 0.7 }} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {infoMessage}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          px: 2,
          py: 1.5,
          borderTop: theme => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}>
          <Button
            onClick={handleDownloadChart}
            startIcon={<DownloadIcon fontSize="small" />}
            variant="outlined"
            color="primary"
          >
            Download as PNG
          </Button>
          <Button
            onClick={handleCloseFullscreen}
            color="primary"
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResponsiveMapCard;
