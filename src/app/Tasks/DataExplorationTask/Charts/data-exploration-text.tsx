import { useEffect, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import WrapTextIcon from '@mui/icons-material/WrapText';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import InfoMessage from '../../../../shared/components/InfoMessage';
import Loader from '../../../../shared/components/loader';
import { useAppSelector } from '../../../../store/store';
import { logger } from '../../../../shared/utils/logger';

// Mirrors ImageCard: the backend flags .txt/.log/.md datasets with
// datasetType === 'TEXT' and returns an opaque, id-based URL in `fileUrl`.
// Here we fetch that file's raw content via /api/data/file/{id} and render it
// in a clean, scrollable monospace viewer.
const TextCard = () => {
  const { tab } = useAppSelector(state => state.workflowPage);

  const selectedText = useAppSelector(
    state => state.workflowPage?.tab?.dataTaskTable?.selectedItem?.data?.dataset,
  );

  const textSrc = tab?.workflowTasks.dataExploration?.metaData.data?.fileUrl ?? '';

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(true);

  useEffect(() => {
    if (!textSrc) return;

    let cancelled = false;

    setLoading(true);
    setHasError(false);
    setContent('');

    fetch(textSrc, { mode: 'cors' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => {
        if (!cancelled) {
          setContent(text);
          setLoading(false);
        }
      })
      .catch(error => {
        if (!cancelled) {
          logger.error('Text file load failed:', error);
          setHasError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [textSrc]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      logger.error('Copy to clipboard failed:', error);
    }
  };

  const handleDownload = () => {
    if (!content) return;
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = blobUrl;
      link.download = selectedText?.name || 'file.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      logger.error('Text download failed:', error);
    }
  };

  if (!textSrc || hasError) {
    return (
      <InfoMessage
        message="Failed to load text file. Please check the source or format."
        type="error"
        icon={<ReportProblemRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  const lineCount = content ? content.split('\n').length : 0;
  const charCount = content.length;

  const headerActions = (
    <>
      <Tooltip title={wrap ? 'Disable line wrapping' : 'Enable line wrapping'}>
        <IconButton
          aria-label="toggle-wrap"
          size="small"
          onClick={() => setWrap(prev => !prev)}
          color={wrap ? 'primary' : 'default'}
        >
          <WrapTextIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
        <IconButton aria-label="copy" size="small" onClick={handleCopy} disabled={!content}>
          {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Box sx={{ height: '99%' }}>
      <ResponsiveCardTable
        title={selectedText?.name || 'Text file'}
        headerActions={headerActions}
        showDownloadButton={true}
        showFullScreenButton={true}
        showSettings={false}
        onDownload={handleDownload}
        downloadLabel="Download File"
        downloadSecondaryText="Save text file to your device"
        noPadding={true}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          }}
        >
          {loading && <Loader />}

          {!loading && (
            <>
              <Box
                component="pre"
                sx={{
                  flexGrow: 1,
                  minHeight: 0,
                  m: 0,
                  p: 2,
                  overflow: 'auto',
                  fontFamily: theme => theme.typography.mono.fontFamily,
                  fontSize: '0.82rem',
                  lineHeight: 1.6,
                  color: 'text.primary',
                  whiteSpace: wrap ? 'pre-wrap' : 'pre',
                  wordBreak: wrap ? 'break-word' : 'normal',
                  tabSize: 4,
                }}
              >
                {content}
              </Box>
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  gap: 2,
                  px: 2,
                  py: 0.5,
                  borderTop: theme => `1px solid ${theme.palette.divider}`,
                  bgcolor: 'customSurface.cardHeader',
                }}
              >
                <Typography variant="bodySm" sx={{ color: 'text.secondary' }}>
                  {lineCount.toLocaleString()} lines
                </Typography>
                <Typography variant="bodySm" sx={{ color: 'text.secondary' }}>
                  {charCount.toLocaleString()} chars
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </ResponsiveCardTable>
    </Box>
  );
};

export default TextCard;
