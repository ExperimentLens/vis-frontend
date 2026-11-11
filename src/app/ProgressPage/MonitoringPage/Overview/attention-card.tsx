import { useMemo, useState } from 'react';
import { Box, Button, InputAdornment, Stack, TextField, Typography, alpha, useTheme } from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import type { AttentionItem, AttentionSeverity } from '../../../../shared/utils/experiment-overview';

interface Props {
  items: AttentionItem[];
  /** Shows an item's traces in the side panel; omitted when there are no traces. */
  onShowTraces?: (item: AttentionItem) => void;
  /** Title of the item whose traces are open, highlighted in the list. */
  selectedTitle?: string | null;
}

/** Height of the scrolling list, so the card stays level with the variant map beside it. */
const LIST_HEIGHT = 300;
/** Below this many items the filters are noise. */
const FILTER_FROM = 5;

/** The few things worth looking at first, most severe on top; scrolls and filters when there are many. */
export default function AttentionCard({ items, onShowTraces, selectedTitle }: Props) {
  const theme = useTheme();
  const [severity, setSeverity] = useState<'all' | AttentionSeverity>('all');
  const [query, setQuery] = useState('');

  const high = items.filter(i => i.severity === 'high').length;
  const medium = items.length - high;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter(i =>
      (severity === 'all' || i.severity === severity)
      && (!q || `${i.title} ${i.detail}`.toLowerCase().includes(q)));
  }, [items, severity, query]);

  return (
    <ResponsiveCardTable
      title="Needs attention"
      details={items.length ? `${high} high · ${medium} medium` : 'nothing flagged'}
      showSettings={false}
      showDownloadButton={false}
      showFullScreenButton={false}
    >
      {items.length === 0 ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3, justifyContent: 'center', color: 'success.main' }}>
          <CheckCircleOutlineRoundedIcon fontSize="small" />
          <Typography variant="body2">No failed runs, regressions or failing cases.</Typography>
        </Stack>
      ) : (
        <Stack spacing={1}>
          {items.length >= FILTER_FROM && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <SegmentedToggle
                size="small"
                value={severity}
                onChange={v => setSeverity(v as 'all' | AttentionSeverity)}
                options={[
                  { value: 'all', label: `All ${items.length}` },
                  { value: 'high', label: `High ${high}`, disabled: !high },
                  { value: 'medium', label: `Medium ${medium}`, disabled: !medium },
                ]}
              />
              <TextField
                size="small"
                placeholder="Filter by name or metric"
                value={query}
                onChange={e => setQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 160 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Stack>
          )}

          <Stack spacing={0.75} sx={{ maxHeight: LIST_HEIGHT, overflowY: 'auto', pr: 0.5 }}>
            {shown.map(item => {
              const color = item.severity === 'high' ? theme.palette.error.main : theme.palette.warning.main;
              const Icon = item.severity === 'high' ? ErrorOutlineRoundedIcon : WarningAmberRoundedIcon;

              return (
                <Stack
                  key={item.title}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                  sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(color, item.title === selectedTitle ? 0.16 : 0.06), borderLeft: `3px solid ${color}`, flexShrink: 0 }}
                >
                  <Icon sx={{ fontSize: 18, color, mt: 0.1 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                  </Box>
                  {item.traces && onShowTraces && (
                    <Button
                      size="small"
                      endIcon={<ArrowForwardRoundedIcon />}
                      onClick={() => onShowTraces(item)}
                      sx={{ flexShrink: 0, alignSelf: 'center' }}
                    >
                      Traces
                    </Button>
                  )}
                </Stack>
              );
            })}
            {shown.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                Nothing matches this filter.
              </Typography>
            )}
          </Stack>
        </Stack>
      )}
    </ResponsiveCardTable>
  );
}
