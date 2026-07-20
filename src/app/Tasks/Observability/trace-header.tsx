import type { ReactNode } from 'react';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import SegmentedToggle from '../../../shared/components/segmented-toggle';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';

import { CopyButton, MetaChip } from './trace-ui';
import { formatMs, MONO } from '../../../shared/models/observability/agentic-conventions';

export type TraceSectionOption = {
  value: string;
  label?: string;
  icon?: ReactNode;
  tooltip?: string;
};
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

  tab: string;
  tabs: TraceSectionOption[];
  onTabChange: (tab: string) => void;
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
  tab,
  tabs,
  onTabChange,
}: TraceHeaderProps) => {
  const theme = useTheme();

  const hasMetadata =
    Boolean(headerModel) ||
    configEntries.length > 0 ||
    Boolean(tags?.length);

  const judgesTone: SummaryChipTone =
    judgesCount === 0
      ? 'default'
      : judgesPassed === judgesCount
        ? 'success'
        : 'warning';

  const checksTone: SummaryChipTone =
    checksCount === 0
      ? 'default'
      : checksPassed === checksCount
        ? 'success'
        : 'warning';

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 2,
        background: theme.palette.customSurface.cardHeader,
        borderColor: theme.palette.customGrey.main,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
      >
        <SmartToyRoundedIcon sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />

        <Tooltip title={question} arrow>
          <Typography
            sx={{
              flex: 1,
              minWidth: 120,
              fontSize: '0.92rem',
              fontWeight: 700,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {question}
          </Typography>
        </Tooltip>

        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
          <Typography
            variant="bodySm"
            sx={{
              color: 'text.secondary',
              fontFamily: MONO,
              fontSize: '0.66rem',
            }}
          >
            {id}
          </Typography>
          <CopyButton text={id} />
        </Stack>

        <Box sx={{ flexShrink: 0 }}>
          <SegmentedToggle
            size="small"
            value={tab}
            onChange={onTabChange}
            options={tabs}
            aria-label="Trace section"
          />
        </Box>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        divider={<Dot />}
        sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}
      >
        <SummaryChip
          icon={<TimerOutlinedIcon />}
          label={formatMs(durationMs)}
        />

        <SummaryChip
          icon={<TokenRoundedIcon />}
          label={
            totalTokens
              ? `${totalTokens.toLocaleString()} tokens`
              : '— tokens'
          }
        />

        <SummaryChip
          icon={<PaymentsRoundedIcon />}
          label={`$${(totalCost ?? 0).toFixed(4)}`}
        />

        <SummaryChip
          icon={<GavelRoundedIcon />}
          label={
            judgesCount
              ? `${judgesPassed}/${judgesCount} judges`
              : '— judges'
          }
          tone={judgesTone}
        />

        <SummaryChip
          icon={<RuleRoundedIcon />}
          label={
            checksCount
              ? `${checksPassed}/${checksCount} checks`
              : '— checks'
          }
          tone={checksTone}
        />
      </Stack>

      {hasMetadata && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            mt: 0.75,
            pt: 0.75,
            borderTop: `1px solid ${theme.palette.divider}`,
            flexWrap: 'wrap',
            rowGap: 0.5,
          }}
        >
          {headerModel && (
            <MetaChip
              label="model"
              value={headerModel}
            />
          )}

          {configEntries.map(([key, value]) => (
            <MetaChip
              key={key}
              label={key}
              value={String(value)}
            />
          ))}

          {tags?.map(tag => (
            <Chip
              key={tag}
              size="small"
              label={tag}
              variant="outlined"
              sx={{
                height: 20,
                fontSize: '0.62rem',
              }}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default TraceHeader;
