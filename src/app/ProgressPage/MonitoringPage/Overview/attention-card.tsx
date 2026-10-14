import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import type { AttentionItem } from '../../../../shared/utils/experiment-overview';

interface Props {
  items: AttentionItem[];
}

const MAX_ITEMS = 8;

/** The few things worth looking at first, most severe on top. */
export default function AttentionCard({ items }: Props) {
  const theme = useTheme();
  const high = items.filter(i => i.severity === 'high').length;

  return (
    <ResponsiveCardTable
      title="Needs attention"
      details={items.length ? `${high} high · ${items.length - high} medium` : 'nothing flagged'}
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
        <Stack spacing={0.75}>
          {items.slice(0, MAX_ITEMS).map(item => {
            const color = item.severity === 'high' ? theme.palette.error.main : theme.palette.warning.main;
            const Icon = item.severity === 'high' ? ErrorOutlineRoundedIcon : WarningAmberRoundedIcon;

            return (
              <Stack
                key={item.title}
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(color, 0.06), borderLeft: `3px solid ${color}` }}
              >
                <Icon sx={{ fontSize: 18, color, mt: 0.1 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                </Box>
              </Stack>
            );
          })}
          {items.length > MAX_ITEMS && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              and {items.length - MAX_ITEMS} more — see the Evaluation tab
            </Typography>
          )}
        </Stack>
      )}
    </ResponsiveCardTable>
  );
}
