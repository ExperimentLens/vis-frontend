import { useMemo, useState } from 'react';
import { Box, Stack, Typography, Tooltip, alpha, useTheme } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import BlurOnRoundedIcon from '@mui/icons-material/BlurOnRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import type { Observation } from '../../../shared/models/observability/observation';
import { formatMs, isJudge } from '../../../shared/models/observability/agentic-conventions';
import { colorForType } from './trace-observation-waterfall';
import InfoMessage from '../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

const ICON_FOR_TYPE: Record<string, typeof AutoAwesomeRoundedIcon> = {
  GENERATION: AutoAwesomeRoundedIcon,
  RETRIEVAL: ManageSearchRoundedIcon,
  RETRIEVER: ManageSearchRoundedIcon,
  EMBEDDING: BlurOnRoundedIcon,
  TOOL: BuildRoundedIcon,
  AGENT: SmartToyRoundedIcon,
  EVENT: BoltRoundedIcon,
};

const iconForObservation = (o: Observation) => {
  if (isJudge(o)) return GavelRoundedIcon;
  return ICON_FOR_TYPE[(o.type ?? '').toUpperCase()] ?? AccountTreeRoundedIcon;
};

type SpanNode = {
  obs: Observation;
  depth: number;
  children: SpanNode[];
  durationMs: number;
};

const byStartTime = (a: Observation, b: Observation) =>
  Date.parse(a.startTime) - Date.parse(b.startTime);

const durationOf = (o: Observation) => {
  const start = Date.parse(o.startTime);
  const end = Date.parse(o.endTime);
  return Number.isNaN(start) || Number.isNaN(end) ? 0 : Math.max(0, end - start);
};

const buildTree = (observations: Observation[]): SpanNode[] => {
  const byId = new Map(observations.map(o => [o.id, o]));
  const childrenOf = new Map<string, Observation[]>();
  const roots: Observation[] = [];

  observations.forEach(o => {
    if (o.parentObservationId && byId.has(o.parentObservationId)) {
      const siblings = childrenOf.get(o.parentObservationId) ?? [];
      siblings.push(o);
      childrenOf.set(o.parentObservationId, siblings);
    } else {
      roots.push(o);
    }
  });

  const build = (o: Observation, depth: number): SpanNode => ({
    obs: o,
    depth,
    durationMs: durationOf(o),
    children: (childrenOf.get(o.id) ?? []).sort(byStartTime).map(c => build(c, depth + 1)),
  });

  return roots.sort(byStartTime).map(o => build(o, 0));
};

const flatten = (nodes: SpanNode[], collapsed: Set<string>): SpanNode[] =>
  nodes.flatMap(node => [
    node,
    ...(collapsed.has(node.obs.id) ? [] : flatten(node.children, collapsed)),
  ]);

interface Props {
  observations: Observation[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const SpanTree = ({ observations, selectedId, onSelect }: Props) => {
  const theme = useTheme();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildTree(observations), [observations]);
  const rows = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);

  if (observations.length === 0) {
    return (
      <InfoMessage
        message="No observations recorded for this trace."
        type="info"
        icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
        fullHeight
      />
    );
  }

  const toggleCollapsed = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Stack spacing={0} sx={{ width: '100%' }}>
      {rows.map(({ obs, depth, durationMs, children }) => {
        const color = colorForType(obs.type);
        const isError = (obs.level ?? '').toUpperCase() === 'ERROR' || Boolean(obs.statusMessage);
        const isSelected = selectedId === obs.id;
        const hasChildren = children.length > 0;
        const isCollapsed = collapsed.has(obs.id);
        const clickable = Boolean(onSelect);
        const Icon = iconForObservation(obs);

        return (
          <Box
            key={obs.id}
            onClick={clickable ? () => onSelect?.(obs.id) : undefined}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              pl: `${depth * 18}px`,
              pr: 1,
              py: 0.55,
              borderRadius: 1,
              cursor: clickable ? 'pointer' : 'default',
              bgcolor: isSelected ? alpha(color, 0.12) : 'transparent',
              boxShadow: isSelected ? `inset 2px 0 0 ${color}` : 'none',
              '&:hover': { bgcolor: isSelected ? alpha(color, 0.16) : theme.palette.action.hover },
            }}
          >
            <Box
              onClick={hasChildren ? e => { e.stopPropagation(); toggleCollapsed(obs.id); } : undefined}
              sx={{
                width: 14,
                height: 14,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                cursor: hasChildren ? 'pointer' : 'default',
              }}
            >
              {hasChildren && (isCollapsed
                ? <ChevronRightRoundedIcon sx={{ fontSize: 14 }} />
                : <ExpandMoreRoundedIcon sx={{ fontSize: 14 }} />)}
            </Box>

            <Box
              sx={{
                width: 20,
                height: 20,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '7px',
                bgcolor: alpha(color, 0.14),
                color,
              }}
            >
              <Icon sx={{ fontSize: 13 }} />
            </Box>

            <Typography
              variant="statLabel"
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: isSelected ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={obs.name}
            >
              {obs.name}
            </Typography>

            {isError && (
              <Tooltip title={obs.statusMessage ?? 'Error'} arrow>
                <ErrorRoundedIcon sx={{ fontSize: 13, color: theme.palette.error.main, flexShrink: 0 }} />
              </Tooltip>
            )}

            <Typography
              variant="statLabel"
              sx={{
                flexShrink: 0,
                textAlign: 'right',
                color: 'text.secondary',
                fontWeight: isSelected ? 600 : 400,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatMs(durationMs)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};

export default SpanTree;
