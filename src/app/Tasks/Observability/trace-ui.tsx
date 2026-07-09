import { useState, type ReactNode } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { MONO } from '../../../shared/models/observability/agentic-conventions';

export const SectionLabel = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <Stack direction="row" alignItems="center" sx={{ mb: 0.75, minHeight: 24 }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {children}
    </Typography>
    {action && <Box sx={{ ml: 'auto' }}>{action}</Box>}
  </Stack>
);

export const CodeBlock = ({ children, maxHeight = 220 }: { children: string; maxHeight?: number }) => {
  const theme = useTheme();

  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.25,
        fontFamily: MONO,
        fontSize: '0.72rem',
        lineHeight: 1.5,
        bgcolor: theme.palette.customSurface.tray,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight,
        overflow: 'auto',
      }}
    >
      {children}
    </Box>
  );
};

export const CopyButton = ({ text }: { text: string }) => (
  <Tooltip title="Copy" arrow>
    <IconButton size="small" onClick={() => navigator.clipboard?.writeText(text)}>
      <ContentCopyRoundedIcon sx={{ fontSize: 15 }} />
    </IconButton>
  </Tooltip>
);

export const PassFailChip = ({ passed, label, tooltip }: { passed: boolean; label: string; tooltip?: string }) => {
  const theme = useTheme();
  const color = passed ? theme.palette.success.main : theme.palette.error.main;

  const chip = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.85,
        py: 0.3,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color,
        border: `1px solid ${alpha(color, 0.3)}`,
        fontSize: '0.7rem',
        fontWeight: 600,
        maxWidth: '100%',
      }}
    >
      {passed ? <CheckCircleRoundedIcon sx={{ fontSize: 13 }} /> : <CancelRoundedIcon sx={{ fontSize: 13 }} />}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </Box>
    </Box>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {chip}
    </Tooltip>
  ) : chip;
};

export const MetaChip = ({ label, value }: { label: string; value: ReactNode }) => {
  const theme = useTheme();
  return (
    <Tooltip title={label} arrow>
      <Chip
        size="small"
        label={
          <Box component="span" sx={{ fontFamily: theme.typography.fontFamily, fontSize: '0.62rem' }}>
            <Box component="span" sx={{ opacity: 0.6, mr: 0.5 }}>
              {label}
            </Box>
            {value}
          </Box>
        }
        variant="outlined"
        sx={{ height: 20 }}
      />
    </Tooltip>
  );
};

export const Collapsible = ({
  title,
  meta,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
  children: ReactNode;
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setOpen(o => !o)}
        sx={{ px: 1.25, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: theme.palette.action.hover } }}
      >
        <ExpandMoreRoundedIcon
          sx={{
            fontSize: 18,
            color: 'text.secondary',
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography variant="bodyCompact" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {meta}
        {action && (
          <Box sx={{ ml: 'auto' }} onClick={e => e.stopPropagation()}>
            {action}
          </Box>
        )}
      </Stack>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 1.25, pb: 1.25 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
};
