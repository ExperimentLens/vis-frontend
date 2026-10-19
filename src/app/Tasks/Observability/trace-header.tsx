import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Chip,
  Popover,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';

import { CopyButton, MetaChip } from './trace-ui';
import { formatMs, MONO } from '../../../shared/models/observability/agentic-conventions';
import { menuPaperSx } from '../../../shared/styles/card-surface';

type SummaryChipTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'info'
  | 'warning';

type SummaryChipProps = {
  icon?: ReactNode;
  label: ReactNode;
  tone?: SummaryChipTone;
};

const SummaryChip = ({
  icon,
  label,
  tone = 'default',
}: SummaryChipProps) => {
  const theme = useTheme();

  const toneColor =
    tone === 'primary'
      ? theme.palette.primary.main
      : tone === 'success'
        ? theme.palette.success.main
        : tone === 'info'
          ? theme.palette.info.main
          : tone === 'warning'
            ? theme.palette.warning.main
            : theme.palette.text.secondary;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        color: toneColor,
        fontSize: '0.74rem',
        fontWeight: tone === 'default' ? 500 : 700,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',

        '& .MuiSvgIcon-root': {
          fontSize: 14,
          opacity: tone === 'default' ? 0.7 : 1,
        },
      }}
    >
      {icon}
      <Box component="span">{label}</Box>
    </Box>
  );
};

const Dot = () => (
  <Box
    component="span"
    sx={{
      width: 3,
      height: 3,
      borderRadius: '50%',
      bgcolor: 'text.disabled',
      flexShrink: 0,
    }}
  />
);

type TraceHeaderProps = {
  id: string;
  question: string;
  headerModel?: string;
  configEntries: [string, unknown][];
  tags?: string[];

  durationMs: number;
  totalTokens: number;
  totalCost?: number;
  judgesCount: number;
  judgesPassed: number;
  checksCount: number;
  checksPassed: number;
  /** Extra controls shown before the trace id, e.g. "Add to dataset". */
  actions?: ReactNode;
};

const TraceHeader = ({
  id,
  question,
  headerModel,
  configEntries,
  tags,
  durationMs,
  totalTokens,
  totalCost,
  judgesCount,
  judgesPassed,
  checksCount,
  checksPassed,
  actions,
}: TraceHeaderProps) => {
  const theme = useTheme();
  const [detailsAnchor, setDetailsAnchor] = useState<HTMLElement | null>(null);

  // Config values and tags go behind one "+N details" chip, so the header stays one line.
  const details = [
    ...configEntries.map(([key, value]) => ({ key, label: key, value: String(value) as string | undefined })),
    ...(tags ?? []).map(t => ({ key: `tag:${t}`, label: t, value: undefined as string | undefined })),
  ];

  const tone = (passed: number, total: number): SummaryChipTone =>
    total === 0 ? 'default' : passed === total ? 'success' : 'warning';

  const shortId = id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;

  // Only the stats this trace actually has; "— tokens" and "$0.0000" were noise.
  const stats: ReactNode[] = [
    <SummaryChip key="duration" icon={<TimerOutlinedIcon />} label={formatMs(durationMs)} />,
    totalTokens > 0 && <SummaryChip key="tokens" icon={<TokenRoundedIcon />} label={`${totalTokens.toLocaleString()} tokens`} />,
    (totalCost ?? 0) > 0 && <SummaryChip key="cost" icon={<PaymentsRoundedIcon />} label={`$${(totalCost ?? 0).toFixed(4)}`} />,
    judgesCount > 0 && <SummaryChip key="judges" icon={<GavelRoundedIcon />} label={`${judgesPassed}/${judgesCount} judges`} tone={tone(judgesPassed, judgesCount)} />,
    checksCount > 0 && <SummaryChip key="checks" icon={<RuleRoundedIcon />} label={`${checksPassed}/${checksCount} checks`} tone={tone(checksPassed, checksCount)} />,
    headerModel && <SummaryChip key="model" icon={<SmartToyRoundedIcon />} label={<Box component="span" sx={{ fontFamily: MONO, fontSize: '0.7rem' }}>{headerModel}</Box>} />,
  ].filter(Boolean);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{ px: 0.5, minHeight: 40, flexShrink: 0, borderBottom: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
    >
      <Tooltip title={question} arrow>
        <Typography
          sx={{
            flex: '0 1 auto',
            minWidth: 120,
            fontSize: '0.92rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {question}
        </Typography>
      </Tooltip>

      <Stack direction="row" alignItems="center" spacing={1} divider={<Dot />} sx={{ flexShrink: 0 }}>
        {stats}
      </Stack>

      {details.length > 0 && (
        <>
          <Chip
            size="small"
            variant="outlined"
            label={`+${details.length} details`}
            onClick={e => setDetailsAnchor(e.currentTarget)}
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 600, flexShrink: 0 }}
          />
          <Popover
            open={Boolean(detailsAnchor)}
            anchorEl={detailsAnchor}
            onClose={() => setDetailsAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{ paper: { elevation: 0, sx: [menuPaperSx({ width: 360 }), { p: 1.25, overflowY: 'auto' }] } }}
          >
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }} useFlexGap>
              {details.map(item => (
                item.value !== undefined
                  ? <MetaChip key={item.key} label={item.label} value={item.value} />
                  : <Chip key={item.key} size="small" label={item.label} variant="outlined" sx={{ height: 20, fontSize: '0.62rem' }} />
              ))}
            </Stack>
          </Popover>
        </>
      )}

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
        {actions}
        <Tooltip title={id} arrow>
          <Typography variant="bodySm" sx={{ color: 'text.secondary', fontFamily: MONO, fontSize: '0.66rem' }}>
            {shortId}
          </Typography>
        </Tooltip>
        <CopyButton text={id} />
      </Stack>
    </Stack>
  );
};

export default TraceHeader;
