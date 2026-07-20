import { useState } from 'react';
import { Box, useTheme } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { MONO } from '../../../shared/models/observability/agentic-conventions';

const isExpandable = (value: unknown): value is Record<string, unknown> | unknown[] =>
  typeof value === 'object' && value !== null;

const PrimitiveValue = ({ value }: { value: unknown }) => {
  const theme = useTheme();

  if (value === null || value === undefined) {
    return <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>null</Box>;
  }
  if (typeof value === 'string') {
    return <Box component="span" sx={{ color: theme.palette.success.main }}>&quot;{value}&quot;</Box>;
  }
  if (typeof value === 'number') {
    return <Box component="span" sx={{ color: theme.palette.info.main }}>{value}</Box>;
  }
  if (typeof value === 'boolean') {
    return <Box component="span" sx={{ color: theme.palette.warning.main }}>{String(value)}</Box>;
  }

  return <Box component="span">{String(value)}</Box>;
};

const JsonNode = ({ label, value, depth }: { label?: string; value: unknown; depth: number }) => {
  const theme = useTheme();
  const expandable = isExpandable(value);
  const isArray = Array.isArray(value);
  const entries = expandable
    ? isArray
      ? (value as unknown[]).map((v, i) => [`[${i}]`, v] as const)
      : Object.entries(value as Record<string, unknown>)
    : [];
  const [open, setOpen] = useState(depth < 2);

  if (!expandable) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, py: 0.15, pl: 2 }}>
        {label !== undefined && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}:</Box>}
        <PrimitiveValue value={value} />
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box sx={{ display: 'flex', gap: 0.5, py: 0.15, pl: 2 }}>
        {label !== undefined && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}:</Box>}
        <Box component="span" sx={{ color: 'text.disabled' }}>{isArray ? '[ ]' : '{ }'}</Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          py: 0.15,
          cursor: 'pointer',
          borderRadius: 0.5,
          '&:hover': { bgcolor: theme.palette.action.hover },
        }}
      >
        {open
          ? <ExpandMoreRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
          : <ChevronRightRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />}
        {label !== undefined && <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}:</Box>}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          {isArray ? `Array(${entries.length})` : `{ ${entries.length} }`}
        </Box>
      </Box>
      {open && (
        <Box sx={{ pl: 1.5, ml: '6px', borderLeft: `1px dashed ${theme.palette.divider}` }}>
          {entries.map(([k, v]) => (
            <JsonNode key={k} label={k} value={v} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
};

const JsonTree = ({ data, maxHeight = 240 }: { data: unknown; maxHeight?: number }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.customSurface.tray,
        fontFamily: MONO,
        fontSize: '0.72rem',
        lineHeight: 1.7,
        maxHeight,
        overflow: 'auto',
      }}
    >
      <JsonNode value={data} depth={0} />
    </Box>
  );
};

export default JsonTree;
