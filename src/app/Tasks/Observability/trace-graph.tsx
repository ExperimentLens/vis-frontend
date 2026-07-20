import { useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import { formatMs } from '../../../shared/models/observability/agentic-conventions';
import { colorForType } from './trace-observation-waterfall';
import InfoMessage from '../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

type GraphNode = {
  obs: Observation;
  children: GraphNode[];
  durationMs: number;
};

const NODE_W = 128;
const NODE_H = 46;
const V_GAP = 30;
const INDENT = 28;

const byStartTime = (a: Observation, b: Observation) => Date.parse(a.startTime) - Date.parse(b.startTime);

const durationOf = (o: Observation) => {
  const start = Date.parse(o.startTime);
  const end = Date.parse(o.endTime);
  return Number.isNaN(start) || Number.isNaN(end) ? 0 : Math.max(0, end - start);
};

const buildTree = (observations: Observation[]): GraphNode[] => {
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

  const build = (o: Observation): GraphNode => ({
    obs: o,
    durationMs: durationOf(o),
    children: (childrenOf.get(o.id) ?? []).sort(byStartTime).map(build),
  });

  return roots.sort(byStartTime).map(build);
};

type Layout = {
  positions: Map<string, { x: number; y: number }>;
  edges: { from: string; to: string }[];
  width: number;
  height: number;
};

const layoutTree = (roots: GraphNode[]): Layout => {
  const order: string[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  let row = 0;
  let maxDepth = 0;

  const visit = (nodes: GraphNode[], depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    nodes.forEach(node => {
      positions.set(node.obs.id, { x: depth * INDENT, y: row * (NODE_H + V_GAP) });
      order.push(node.obs.id);
      row += 1;
      visit(node.children, depth + 1);
    });
  };
  visit(roots, 0);

  // Connect each node to the next one in flow order rather than to its true
  // (possibly many rows above) parent — a node with several siblings would
  // otherwise fan out a separate long line to each one, all bunched through
  // the same column.
  const edges = order.slice(1).map((to, i) => ({ from: order[i], to }));

  const width = maxDepth * INDENT + NODE_W;
  const height = row > 0 ? row * (NODE_H + V_GAP) - V_GAP : 0;

  return { positions, edges, width, height };
};

interface Props {
  observations: Observation[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

const TraceGraph = ({ observations, selectedId, onSelect }: Props) => {
  const theme = useTheme();
  const byId = useMemo(() => new Map(observations.map(o => [o.id, o])), [observations]);
  const tree = useMemo(() => buildTree(observations), [observations]);
  const { positions, edges, width, height } = useMemo(() => layoutTree(tree), [tree]);

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

  const arrowColor = theme.palette.customGrey.dark;

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', p: 1.5 }}>
      <Box sx={{ position: 'relative', width, height, mx: 'auto' }}>
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        >
          <defs>
            <marker id="trace-graph-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 Z" fill={arrowColor} />
            </marker>
          </defs>
          {edges.map(({ from, to }) => {
            const p1 = positions.get(from);
            const p2 = positions.get(to);
            if (!p1 || !p2) return null;

            const x1 = p1.x + NODE_W / 2;
            const y1 = p1.y + NODE_H;
            const x2 = p2.x + NODE_W / 2;
            const y2 = p2.y;
            const midY = y1 + (y2 - y1) / 2;

            return (
              <path
                key={`${from}-${to}`}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={arrowColor}
                strokeWidth={1.5}
                markerEnd="url(#trace-graph-arrow)"
              />
            );
          })}
        </svg>

        {Array.from(positions.entries()).map(([id, pos]) => {
          const obs = byId.get(id);
          if (!obs) return null;

          const color = colorForType(obs.type);
          const isError = (obs.level ?? '').toUpperCase() === 'ERROR' || Boolean(obs.statusMessage);
          const isSelected = selectedId === id;
          const clickable = Boolean(onSelect);

          return (
            <Box
              key={id}
              onClick={clickable ? () => onSelect?.(id) : undefined}
              sx={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: NODE_W,
                height: NODE_H,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                px: 0.75,
                borderRadius: 1.5,
                cursor: clickable ? 'pointer' : 'default',
                bgcolor: isSelected ? alpha(color, 0.16) : theme.palette.customSurface.tray,
                border: `1.5px solid ${isError ? theme.palette.error.main : isSelected ? color : alpha(color, 0.45)}`,
                boxShadow: isSelected ? `0 0 0 3px ${alpha(color, 0.18)}` : 'none',
                transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
              }}
              title={obs.name}
            >
              <Typography
                variant="statLabel"
                sx={{
                  fontWeight: isSelected ? 700 : 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {obs.name}
              </Typography>
              <Typography
                variant="statLabel"
                sx={{ fontSize: '0.6rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatMs(durationOf(obs))}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TraceGraph;
