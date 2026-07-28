import { useMemo } from 'react';
import type { TraceDetail } from '../../../../../shared/models/observability/trace-detail';
import ResponsiveCardVegaLite from '../../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { alignTasks } from './trajectory-alignment';

type Props = {
  byRun: Record<string, TraceDetail>;
  runIds: string[];
  runNameById: Record<string, string>;
  colorById: Record<string, string>;
  baselineId: string;
};

const SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';

/** Running total of task duration per run, in execution order — shows exactly
 * which task is the moment two runs' timelines start to pull apart. */
export default function CumulativeRaceChart({ byRun, runIds, runNameById, colorById }: Props) {
  const tasks = useMemo(() => alignTasks(byRun), [byRun]);

  const taskLabels = useMemo(() => ['start', ...tasks.map(t => t.name)], [tasks]);

  const data = useMemo(
    () =>
      runIds.flatMap(id => {
        const runName = runNameById[id] ?? id;
        let cumulativeMs = 0;
        const rows = [{ id, runName, taskLabel: 'start', taskIndex: 0, cumulativeSec: 0 }];

        tasks.forEach((t, i) => {
          const cell = t.byRun[id];
          if (cell) cumulativeMs += cell.durationMs;
          rows.push({
            id,
            runName,
            taskLabel: t.name,
            taskIndex: i + 1,
            cumulativeSec: Number((cumulativeMs / 1000).toFixed(2)),
          });
        });

        return rows;
      }),
    [tasks, runIds, runNameById],
  );

  const colorScale = { domain: runIds, range: runIds.map(id => colorById[id]) };
  const legendLabelExpr = `{${runIds
    .map(id => `'${id}': '${(runNameById[id] ?? id).replace(/'/g, "\\'")}'`)
    .join(', ')}}[datum.label]`;

  const spec = {
    $schema: SCHEMA,
    data: { values: data },
    encoding: {
      x: {
        field: 'taskLabel',
        type: 'ordinal',
        sort: taskLabels,
        axis: { title: null, labelAngle: 0, labelLimit: 90 },
      },
      y: {
        field: 'cumulativeSec',
        type: 'quantitative',
        axis: { title: 'cumulative seconds' },
      },
      color: {
        field: 'id',
        type: 'nominal',
        scale: colorScale,
        legend: { title: null, orient: 'bottom', labelExpr: legendLabelExpr },
      },
      detail: { field: 'id', type: 'nominal' },
      order: { field: 'taskIndex', type: 'quantitative' },
      tooltip: [
        { field: 'runName', type: 'nominal', title: 'run' },
        { field: 'taskLabel', type: 'nominal', title: 'task' },
        { field: 'cumulativeSec', type: 'quantitative', title: 'cumulative (s)', format: '.2f' },
      ],
    },
    layer: [
      { mark: { type: 'line', strokeWidth: 2 } },
      { mark: { type: 'point', filled: true, size: 40, opacity: 0.9 } },
    ],
  } as Record<string, unknown>;

  return (
    <ResponsiveCardVegaLite
      title="Cumulative race"
      details="running total time as tasks complete, in order — where do the lines start to diverge?"
      spec={spec}
      actions={false}
      isStatic={false}
      sx={{ width: '100%', maxWidth: '100%' }}
      minHeight={260}
      showSettings={true}
      showInfoMessage={data.length === 0}
      infoMessage={
        <InfoMessage
          message="No tasks to plot."
          type="info"
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          fullHeight
        />
      }
    />
  );
}
