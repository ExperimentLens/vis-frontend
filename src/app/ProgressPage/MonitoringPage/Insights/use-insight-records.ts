import { useMemo } from 'react';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import { toRunRecords } from '../../../../shared/utils/run-statistics';
import type { RunRecord } from '../../../../shared/utils/run-statistics';

export interface InsightRecords {
  records: RunRecord[];
  /** Completed runs before the runs table's filters. */
  completedTotal: number;
  /** True when the runs table's filters narrowed the selection. */
  filtered: boolean;
}

/** Completed runs to analyse, narrowed by whatever filters the user set on the runs table. */
export function useInsightRecords(): InsightRecords {
  const workflows = useAppSelector((s: RootState) => s.progressPage.workflows.data);
  const { initialized, rows, filteredRows } = useAppSelector((s: RootState) => s.monitorPage.workflowsTable);

  return useMemo(() => {
    const all = toRunRecords(workflows);
    const filtered = initialized && filteredRows.length < rows.length;

    if (!filtered) return { records: all, completedTotal: all.length, filtered: false };

    const visible = new Set(filteredRows.map(row => row.workflowId));

    return { records: all.filter(r => visible.has(r.id)), completedTotal: all.length, filtered: true };
  }, [workflows, initialized, rows, filteredRows]);
}
