import type { ReactNode } from 'react';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';

import SegmentedToggle from '../../../shared/components/segmented-toggle';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';

import { MetaChip } from './trace-ui';
import { formatMs } from '../../../shared/models/observability/agentic-conventions';

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
        px: 0.85,
        py: 0.25,
        borderRadius: '999px',
        bgcolor:
          tone === 'default'
            ? 'transparent'
            : alpha(toneColor, 0.1),
        color: toneColor,
        border:
          tone === 'default'
            ? 'none'
            : `1px solid ${alpha(toneColor, 0.2)}`,
        fontSize: '0.72rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',

        '& .MuiSvgIcon-root': {
          fontSize: 14,
        },
      }}
    >
      {icon}
      <Box component="span">{label}</Box>
    </Box>
  );
};

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
        py: 0.75,
        borderRadius: 2,
        background: theme.palette.customSurface.cardHeader,
        borderColor: theme.palette.customGrey.main,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          rowGap: 0.75,
        }}
      >
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ my: 0.5 }}
            />
          }
          sx={{
            flex: 1,
            minWidth: 0,
            flexWrap: 'wrap',
            rowGap: 0.5,
          }}
        >
          <Tooltip title={question} arrow>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                minWidth: 0,
                maxWidth: 420,
              }}
            >
              <SmartToyRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="statValue"
                  sx={{
                    display: 'block',
                    fontSize: '0.85rem',
                    lineHeight: 1.35,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {question}
                </Typography>

                <Typography
                  variant="bodySm"
                  sx={{
                    display: 'block',
                    color: 'text.secondary',
                    fontSize: '0.68rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {id}
                </Typography>
              </Box>
            </Stack>
          </Tooltip>

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

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            my: 0.5,
            display: {
              xs: 'none',
              lg: 'block',
            },
          }}
        />

        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <SegmentedToggle
            size="small"
            value={tab}
            onChange={onTabChange}
            options={tabs}
            aria-label="Trace section"
          />
        </Box>      
      </Box>

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