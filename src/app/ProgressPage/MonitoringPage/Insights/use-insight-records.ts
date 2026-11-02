import { useEffect, useMemo } from 'react';
import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import { fetchExperimentTraceDetails, selectSessionsMap } from '../../../../store/slices/observabilitySlice';
import { toRunRecords } from '../../../../shared/utils/run-statistics';
import type { RunRecord } from '../../../../shared/utils/run-statistics';
import { runUnit } from '../../../../shared/utils/experiment-conventions';
import { caseRecords } from '../../../../shared/utils/trace-explorer';

export interface InsightRecords {
  records: RunRecord[];
  /** Completed records before the runs table's filters. */
  completedTotal: number;
  /** True when the runs table's filters narrowed the selection. */
  filtered: boolean;
  /** Start time of each record, by record id. */
  startTimeById: Record<string, number | undefined>;
  /** What a record is: a run, or one case's trace when each run holds a whole dataset. */
  unit: 'run' | 'trace';
  /** True while a dataset experiment's traces, its records, are still loading. */
  loading: boolean;
}

/**
 * Completed runs to analyse, narrowed by whatever filters the user set on the runs table.
 * When each run evaluates a whole dataset (run_unit "dataset"), the records are its cases'
 * traces instead, so comparisons between configurations rest on the cases, not on one mean per run.
 */
export function useInsightRecords(): InsightRecords {
  const dispatch = useAppDispatch();
  const workflows = useAppSelector((s: RootState) => s.progressPage.workflows.data);
  const experimentId = useAppSelector((s: RootState) => s.progressPage.experiment.data?.id);
  const { initialized, rows, filteredRows } = useAppSelector((s: RootState) => s.monitorPage.workflowsTable);
  const sessions = useAppSelector(selectSessionsMap);
  const datasetRuns = runUnit() === 'dataset';

  const idKey = workflows.filter(w => w.status !== 'SCHEDULED').map(w => w.id).join(',');
  const workflowIds = useMemo(() => (idKey ? idKey.split(',') : []), [idKey]);

  // Shared with the trace views and cached, so this is at most one request per experiment.
  useEffect(() => {
    if (!datasetRuns || !experimentId || !workflowIds.length) return;

    dispatch(fetchExperimentTraceDetails({ experimentId, workflowIds }));
  }, [dispatch, datasetRuns, experimentId, workflowIds]);

  const tracesLoading = datasetRuns && workflowIds.some(id => !sessions[id] || sessions[id].loading);

  return useMemo<InsightRecords>(() => {
    const visible = initialized && filteredRows.length < rows.length ? new Set(filteredRows.map(row => row.workflowId)) : null;
    const details = datasetRuns ? workflowIds.flatMap(id => sessions[id]?.details ?? []) : [];
    const cases = datasetRuns ? caseRecords(details, workflows) : [];

    // Traces without case metrics (e.g. logged by an older SDK) fall back to the runs' own means.
    if (cases.length || tracesLoading) {
      const startTimeById = Object.fromEntries(details.map(d => [d.id, Date.parse(d.timestamp)]));
      const records = visible ? cases.filter(r => visible.has(r.runId as string)) : cases;

      return { records, completedTotal: cases.length, filtered: Boolean(visible), startTimeById, unit: 'trace', loading: tracesLoading };
    }

    const all = toRunRecords(workflows);
    const records = visible ? all.filter(r => visible.has(r.id)) : all;

    return { records, completedTotal: all.length, filtered: Boolean(visible), startTimeById: Object.fromEntries(workflows.map(w => [w.id, w.startTime])), unit: 'run', loading: false };
  }, [workflows, initialized, rows, filteredRows, datasetRuns, workflowIds, sessions, tracesLoading]);
}
