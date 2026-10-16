import { useMemo } from 'react';
import { Box, Stack, Tooltip, useTheme } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import SearchableSelect from '../../../../shared/components/searchable-select';
import { EmptyNote } from '../LLMOverview/chart-kit';
import { StyledDataGrid, TruncMono } from '../LLMOverview/llm-monitoring-shared';
import { MONO } from '../../../../shared/models/observability/agentic-conventions';
import { evalLabel, isEvalMetric } from '../../../../shared/utils/eval-quality';
import type { ChangeVerdict, MetricChange } from '../../../../shared/utils/eval-quality';
import { formatPValue, formatStat } from '../../../../shared/utils/run-statistics';

export interface CandidateChanges {
  group: string;
  changes: MetricChange[];
}

interface Props {
  param: string;
  groups: string[];
  baseline: string;
  onBaselineChange: (group: string) => void;
  candidates: CandidateChanges[];
  metrics: string[];
}

type Row = { id: string; group: string; regressions: number } & Record<string, MetricChange | string | number>;

const VERDICT_TEXT: Record<ChangeVerdict, string> = {
  regressed: 'Regressed',
  improved: 'Improved',
  noise: 'Within noise',
  unchanged: 'Unchanged',
  'no-data': 'No data',
};

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${formatStat(Math.abs(value))}`;

/** Every other configuration against a chosen baseline: what got better, worse, or only moved within noise. */
export default function BaselineComparisonCard({ param, groups, baseline, onBaselineChange, candidates, metrics }: Props) {
  const theme = useTheme();

  const columns = useMemo<GridColDef[]>(() => {
    const verdictColor: Record<ChangeVerdict, string> = {
      regressed: theme.palette.error.main,
      improved: theme.palette.success.main,
      noise: theme.palette.text.secondary,
      unchanged: theme.palette.text.secondary,
      'no-data': theme.palette.text.disabled,
    };

    return [
      {
        field: 'group',
        headerName: param || 'Group',
        flex: 1,
        minWidth: 180,
        renderCell: params => (
          <Stack justifyContent="center" sx={{ height: '100%', minWidth: 0 }}>
            <TruncMono max="100%">{(params.row as Row).group}</TruncMono>
          </Stack>
        ),
      },
      {
        field: 'regressions',
        headerName: 'Regressions',
        width: 112,
        type: 'number',
        headerAlign: 'right',
        align: 'right',
        renderCell: params => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8rem', fontWeight: 700, color: (params.row as Row).regressions ? 'error.main' : 'success.main' }}>
            {(params.row as Row).regressions}
          </Box>
        ),
      },
      ...metrics.map<GridColDef>(metric => ({
        field: metric,
        headerName: isEvalMetric(metric) ? evalLabel(metric) : metric,
        width: 128,
        headerAlign: 'right',
        align: 'right',
        sortComparator: (a, b) => ((a as MetricChange).delta ?? 0) - ((b as MetricChange).delta ?? 0),
        renderCell: params => {
          const c = params.value as MetricChange;
          const strong = c.verdict === 'regressed' || c.verdict === 'improved';

          return (
            <Tooltip
              title={c.baseline && c.candidate
                ? `${VERDICT_TEXT[c.verdict]} · ${formatStat(c.baseline.mean)} → ${formatStat(c.candidate.mean)} · `
                  + `p = ${formatPValue(c.p)} · n = ${c.baseline.n} vs ${c.candidate.n} · `
                  + `${c.direction === 'maximize' ? 'higher' : 'lower'} is better`
                : VERDICT_TEXT[c.verdict]}
            >
              <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8rem', fontWeight: strong ? 700 : 400, color: verdictColor[c.verdict] }}>
                {c.delta === null ? '—' : `${c.verdict === 'noise' ? '≈ ' : ''}${signed(c.delta)}`}
              </Box>
            </Tooltip>
          );
        },
      })),
    ];
  }, [metrics, param, theme]);

  const rows = useMemo<Row[]>(
    () => candidates.map(({ group, changes }) => ({
      id: group,
      group,
      regressions: changes.filter(c => c.verdict === 'regressed').length,
      ...Object.fromEntries(changes.map(c => [c.metric, c])),
    })),
    [candidates],
  );

  return (
    <ResponsiveCardTable
      title="Compared with baseline"
      details={groups.length > 1
        ? `Against ${baseline} · red regressed, green improved, ≈ within noise (needs repeats)`
        : null}
      showSettings={groups.length > 1}
      showDownloadButton={false}
      noPadding
      controlPanel={groups.length > 1 && (
        <Box >
          <SearchableSelect
            labelId="eval-baseline"
            inputLabel="Baseline"
            label="Baseline"
            value={baseline}
            options={groups}
            onChange={onBaselineChange}
            menuMaxHeight={300}
          />
        </Box>
      )}
    >
      {groups.length < 2 ? (
        <EmptyNote>
          {param ? `Only one ${param} value, so there is nothing to compare against.` : 'All runs share one configuration, so there is nothing to compare against.'}
        </EmptyNote>
      ) : (
        <StyledDataGrid
          autoHeight
          hideFooter
          disableRowSelectionOnClick
          disableColumnMenu
          rows={rows}
          columns={columns}
          rowHeight={44}
          columnHeaderHeight={44}
          initialState={{ sorting: { sortModel: [{ field: 'regressions', sort: 'desc' }] } }}
          sx={{ width: '100%' }}
        />
      )}
    </ResponsiveCardTable>
  );
}
