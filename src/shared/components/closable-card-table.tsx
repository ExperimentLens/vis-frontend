import type React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Typography,
  Tooltip,
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface ClosableCardTableProps {
  title: string
  controlPanel?: React.ReactNode
  children: React.ReactNode
  onDownload?: () => void
  onClose: () => void
  maxWidth?: number
  maxHeight?: number
  additionalOptions?: React.ReactNode
  downloadLabel?: string
  showDownloadButton?: boolean
  noPadding?: boolean
  details?: string | null
}

/**
 * A card component with a closable header and inline options
 */
const ClosableCardTable: React.FC<ClosableCardTableProps> = ({
  title,
  controlPanel,
  children,
  onDownload,
  onClose,
  maxWidth = 2000,
  maxHeight: _maxHeight = 300,
  additionalOptions,
  downloadLabel = 'Download',
  showDownloadButton = true,
  noPadding = false,
  details = null,
}) => {

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        maxWidth: maxWidth,
        mx: 'auto',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {controlPanel && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mr: 0.5,
                }}
              >
                {controlPanel}
              </Box>
            )}

            {additionalOptions}

            {showDownloadButton && onDownload && (
              <Button
                onClick={handleDownload}
                startIcon={<DownloadIcon fontSize="small" />}
                variant="outlined"
                color="primary"
              >
                {downloadLabel}
              </Button>
            )}

            <IconButton
              edge="end"
              color="inherit"
              onClick={onClose}
              aria-label="close"
              size="small"
              sx={{ mr: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
            {details && (
              <Tooltip title={details}>
                <InfoOutlinedIcon
                  sx={{ fontSize: 14, color: 'text.secondary', cursor: 'default' }}
                />
              </Tooltip>
            )}
          </Box>
        }
        sx={{
          background: theme => theme.palette.customSurface.cardHeader,
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          padding: '6px 12px',
          minHeight: '44px',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
      <CardContent
        sx={{
          bgcolor: 'customSurface.cardContent',
          p: noPadding ? 0 : 2,
          '&:last-child': {
            paddingBottom: noPadding ? 0 : 3,
          },
          borderRadius: '0 0 8px 8px',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: noPadding ? 'hidden' : 'auto',
          height: '100%',
        }}
      >
        {children}
      </CardContent>
    </Card>
  );
};

export default ClosableCardTable;
