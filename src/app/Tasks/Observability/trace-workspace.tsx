import { useState } from 'react';
import { Box, Stack, Typography, useTheme } from '@mui/material';
import { Resizable } from 're-resizable';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import SchemaRoundedIcon from '@mui/icons-material/SchemaRounded';
import type { Observation } from '../../../shared/models/observability/observation';
import type { Score } from '../../../shared/models/observability/score';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import InfoMessage from '../../../shared/components/InfoMessage';
import SegmentedToggle from '../../../shared/components/segmented-toggle';
import { colorForType } from './trace-observation-waterfall';
import SpanTree from './span-tree';
import TraceGraph from './trace-graph';
import SpanDetail from './span-detail';
import EvaluationContent from './evaluation-content';
import PromptsContent from './prompts-content';
import type { AnnotationSavePayload } from './annotate-form';

type PaneMode = 'span' | 'eval' | 'prompts';

type TraceWorkspaceProps = {
  observations: Observation[];
  selectedSpanId: string | null;
  defaultSpanId: string | null;
  selectedObs?: Observation;
  onSelectSpan: (id: string | null) => void;

  spanScores: Score[];
  onAnnotateSpan: (payload: AnnotationSavePayload) => void;
  savingAnnotation: boolean;

  judges: Observation[];
  checks: Score[];
  metrics: Score[];
  humanScores: Score[];
  onAnnotateTrace: (payload: AnnotationSavePayload) => void;

  promptObs: Observation[];
};

const TREE_VIEW_OPTIONS = [
  { value: 'list', icon: <ViewListRoundedIcon fontSize="small" />, tooltip: 'List' },
  { value: 'graph', icon: <SchemaRoundedIcon fontSize="small" />, tooltip: 'Graph' },
];

const TREE_WIDTH_KEY = 'traceWorkspace.treeWidth';
const DEFAULT_TREE_WIDTH = 360;

const readTreeWidth = () => {
  try {
    const saved = Number(localStorage.getItem(TREE_WIDTH_KEY));

    return saved > 0 ? saved : DEFAULT_TREE_WIDTH;
  } catch {
    return DEFAULT_TREE_WIDTH;
  }
};

const saveTreeWidth = (width: number) => {
  try {
    localStorage.setItem(TREE_WIDTH_KEY, String(Math.round(width)));
  } catch {
    // Storage blocked: the width just resets next time.
  }
};

const TraceWorkspace = ({
  observations,
  selectedSpanId,
  defaultSpanId,
  selectedObs,
  onSelectSpan,
  spanScores,
  onAnnotateSpan,
  savingAnnotation,
  judges,
  checks,
  metrics,
  humanScores,
  onAnnotateTrace,
  promptObs,
}: TraceWorkspaceProps) => {
  const [view, setView] = useState<'list' | 'graph'>('list');
  const [treeWidth] = useState(readTreeWidth);
  const [mode, setMode] = useState<PaneMode>('span');
  const activeId = selectedSpanId ?? defaultSpanId;

  const jumpToSpan = (id: string) => {
    onSelectSpan(id);
    setMode('span');
  };

  // Picking a span in the tree while on Evaluation shows that span; Prompts already follows the selection.
  const selectFromTree = (id: string) => {
    onSelectSpan(id);
    if (mode === 'eval') setMode('span');
  };

  // Labeled tabs, like Langfuse/LangSmith's detail pane, instead of unlabeled icons.
  const paneOptions = [
    { value: 'span', label: 'Span' },
    { value: 'eval', label: `Evaluation · ${judges.length + checks.length + metrics.length}` },
    { value: 'prompts', label: `Prompts · ${promptObs.length}`, disabled: promptObs.length === 0 },
  ];

  const paneTitle = mode === 'span' ? selectedObs?.name ?? 'Span' : mode === 'eval' ? 'Evaluation' : 'Prompts';

  return (
    <Stack
      direction="row"
      spacing={2}
      height="99%"
      width="100%"
      overflow="hidden"
    >
      {/* Drag the right edge to widen the tree; same handle as the Compare tab's split. */}
      <Resizable
        defaultSize={{ width: treeWidth, height: '100%' }}
        minWidth={240}
        maxWidth="65%"
        enable={{ right: true }}
        onResizeStop={(_e, _dir, ref) => saveTreeWidth(ref.offsetWidth)}
        style={{ flexShrink: 0, position: 'relative' }}
        handleStyles={{ right: { width: 16, right: -16, zIndex: 10 } }}
        handleComponent={{
          right: (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ew-resize' }}>
              <MoreVertRoundedIcon sx={{ color: 'action.active' }} />
            </Box>
          ),
        }}
      >
        <ResponsiveCardTable
          title="Trace"
          showSettings={false}
          showFullScreenButton={false}
          noPadding
          headerActions={
            <SegmentedToggle
              size="small"
              value={view}
              onChange={value => setView(value as 'list' | 'graph')}
              options={TREE_VIEW_OPTIONS}
              aria-label="Trace view"
            />
          }
        >
          <Stack spacing={0} sx={{ height: '100%' }}>
            {observations.length > 0 && (
              <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <TimelineSummary observations={observations} />
              </Box>
            )}
            <Box sx={{ flex: 1, overflow: 'auto', px: view === 'list' ? 0.75 : 0, py: 0.75 }}>
              {view === 'list' ? (
                <SpanTree observations={observations} selectedId={activeId} onSelect={selectFromTree} />
              ) : (
                <TraceGraph observations={observations} selectedId={activeId} onSelect={selectFromTree} />
              )}
            </Box>
          </Stack>
        </ResponsiveCardTable>
      </Resizable>

      <Box sx={{ flex: 1, minWidth: 0, height: '100%' }}>
        <ResponsiveCardTable
          title={paneTitle}
          showSettings={false}
          showFullScreenButton={false}
          headerActions={
            <SegmentedToggle
              size="small"
              value={mode}
              onChange={value => setMode(value as PaneMode)}
              options={paneOptions}
              aria-label="Pane content"
            />
          }
        >
          {mode === 'span' && (
            selectedObs ? (
              <SpanDetail
                obs={selectedObs}
                scores={spanScores}
                onAnnotate={onAnnotateSpan}
                savingAnnotation={savingAnnotation}
              />
            ) : (
              <InfoMessage
                message="Select a span from the trace to inspect its input, output and metadata."
                type="info"
                icon={<TouchAppRoundedIcon sx={{ fontSize: 32, color: 'info.main' }} />}
                fullHeight
              />
            )
          )}

          {mode === 'eval' && (
            <EvaluationContent
              judges={judges}
              checks={checks}
              metrics={metrics}
              humanScores={humanScores}
              onAnnotateTrace={onAnnotateTrace}
              savingAnnotation={savingAnnotation}
              onJumpToSpan={jumpToSpan}
            />
          )}

          {mode === 'prompts' && (
            <PromptsContent promptObs={promptObs} activeObservationId={activeId} />
          )}
        </ResponsiveCardTable>
      </Box>
    </Stack>
  );
};

/** One quiet line instead of a wrap of pills: "9 spans · 7 generation · 1 retriever · 1 error". */
const TimelineSummary = ({ observations }: { observations: Observation[] }) => {
  const theme = useTheme();

  const byType = observations.reduce<Record<string, number>>((acc, observation) => {
    const type = (observation.type ?? '').toLowerCase() || 'unknown';
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {});

  const errors = observations.filter(
    observation => (observation.level ?? '').toUpperCase() === 'ERROR' || Boolean(observation.statusMessage),
  ).length;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {observations.length} spans
      </Typography>
      {Object.entries(byType).map(([type, count]) => (
        <Stack key={type} direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colorForType(type.toUpperCase()) }} />
          <Typography variant="caption" color="text.secondary">{count} {type}</Typography>
        </Stack>
      ))}
      {errors > 0 && (
        <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
          {errors} error{errors === 1 ? '' : 's'}
        </Typography>
      )}
    </Stack>
  );
};

export default TraceWorkspace;
