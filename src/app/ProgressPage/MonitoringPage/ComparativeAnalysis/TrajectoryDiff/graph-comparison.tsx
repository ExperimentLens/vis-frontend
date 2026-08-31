import { useState } from 'react';
import { Box, Chip, MenuItem, Select, Typography } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import ObservationWaterfall from '../../../../Tasks/Observability/trace-observation-waterfall';
import { EmptyNote } from '../../LLMOverview/chart-kit';

// Unlike the rest of TrajectoryDiff (which pivots on `alignByQuestion` — an
// exact string match on trace.input.question), this view intentionally does
// NOT require the compared runs to share the same question text. Each run's
// session is picked independently, so you can still drill into "how did this
// run's graph look" even when the prompts across runs never lined up.

interface Props {
  detailsByRun: Record<string, TraceDetail[]>
  runIds: string[]
  colorById: Record<string, string>
  isMosaic: boolean
}

const questionOf = (t: TraceDetail) => {
  const q = (t.input as { question?: string } | null | undefined)?.question;

  return typeof q === 'string' && q.length > 0 ? q : t.name;
};

const GraphComparison = ({ detailsByRun, runIds, colorById, isMosaic }: Props) => {
  // Per-run selected trace id — deliberately local/independent per run rather
  // than a single shared "aligned question" index.
  const [selectedByRun, setSelectedByRun] = useState<Record<string, string>>({});

  // Always 2 per row in mosaic mode, regardless of how many runs are selected.
  const size = isMosaic ? 6 : 12;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${12}, 1fr)`, gap: 1.5 }}>
      {runIds.map((runId, i) => {
        const traces = detailsByRun[runId] ?? [];
        const selectedId = selectedByRun[runId] ?? traces[0]?.id;
        const trace = traces.find(t => t.id === selectedId);

        const handleChange = (e: SelectChangeEvent) => {
          setSelectedByRun(prev => ({ ...prev, [runId]: e.target.value }));
        };

        return (
          <Box key={runId} sx={{ gridColumn: `span ${size}`, minWidth: 0 }}>
            <ResponsiveCardTable
              title={runId}
              details={i === 0 ? 'baseline' : 'execution'}
              headerActions={
                traces.length > 0 ? (
                  <Select
                    size="small"
                    value={selectedId ?? ''}
                    onChange={handleChange}
                    sx={{ maxWidth: 260, fontSize: '0.72rem' }}
                    renderValue={(value) => {
                      const t = traces.find(tr => tr.id === value);

                      return (
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {t ? questionOf(t) : 'Select session…'}
                        </Box>
                      );
                    }}
                  >
                    {traces.map(t => (
                      <MenuItem key={t.id} value={t.id} sx={{ fontSize: '0.78rem' }}>
                        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                          {questionOf(t)}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                ) : undefined
              }
            >
              <Box sx={{ borderTop: `2px solid ${colorById[runId]}`, pt: 1 }}>
                {traces.length === 0 && <EmptyNote>No sessions recorded for this run.</EmptyNote>}
                {traces.length > 0 && !trace && <EmptyNote>Select a session to view its execution graph.</EmptyNote>}
                {trace && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="statLabel" sx={{ color: 'text.secondary' }}>
                        {questionOf(trace)}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${trace.observations.length} steps`}
                        sx={{ height: 16, fontSize: '0.55rem' }}
                      />
                    </Box>
                    <ObservationWaterfall observations={trace.observations} />
                  </>
                )}
              </Box>
            </ResponsiveCardTable>
          </Box>
        );
      })}
    </Box>
  );
};

export default GraphComparison;
