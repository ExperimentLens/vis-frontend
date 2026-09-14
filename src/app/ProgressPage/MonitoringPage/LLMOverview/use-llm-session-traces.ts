import { useEffect, useMemo } from 'react';
import { useTheme } from '@mui/material';
import { Handler } from 'vega-tooltip';

import type { RootState } from '../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../store/store';
import {
  fetchSessionTraceDetails,
  selectSessionsMap,
} from '../../../../store/slices/observabilitySlice';
import {
  OBSERVABILITY_PROJECT_ID,
} from '../../../../shared/models/observability/agentic-conventions';
import {
  latencyByTraceName,
  observationsByTime,
  scoresTable,
} from '../../../../shared/utils/observability-aggregates';
import { pickBucketMs } from '../../../../shared/utils/time-buckets';

export function useLlmSessionTraces() {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const tooltip = useMemo(
    () => new Handler({ sanitize: (v: unknown) => String(v) }).call,
    [],
  );

  const { experiment, workflows } = useAppSelector((s: RootState) => s.progressPage);
  const sessions = useAppSelector(selectSessionsMap);
  const experimentId = experiment.data?.id;

  const runNameById = useMemo(
    () => Object.fromEntries(workflows.data.map(w => [w.id, w.name ?? w.id])),
    [workflows.data],
  );

  const idKey = workflows.data
    .filter(w => w.status !== 'SCHEDULED')
    .map(w => w.id)
    .join(',');

  const workflowIds = useMemo(
    () => (idKey ? idKey.split(',') : []),
    [idKey],
  );

  useEffect(() => {
    if (!experimentId) return;

    workflowIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({
        projectId: OBSERVABILITY_PROJECT_ID,
        experimentId,
        workflowId: id,
      })),
    );
  }, [dispatch, experimentId, workflowIds]);

  const allDetails = useMemo(
    () => workflowIds.flatMap(id => sessions[id]?.details ?? []),
    [workflowIds, sessions],
  );

  const anyLoading = workflowIds.some(id => sessions[id]?.loading);
  const hasData = allDetails.length > 0;

  const scores = useMemo(
    () => (hasData ? scoresTable(allDetails) : []),
    [hasData, allDetails],
  );

  // Same hour-for-single-day/day-for-multi-day rule as the other "over time" charts in this tab.
  const bucketMs = useMemo(() => {
    const times = allDetails
      .map(d => Date.parse(d.timestamp))
      .filter(t => !Number.isNaN(t));

    return pickBucketMs(times);
  }, [allDetails]);

  const timeSeries = useMemo(
    () => (hasData ? observationsByTime(allDetails, bucketMs) : []),
    [hasData, allDetails, bucketMs],
  );

  const latencies = useMemo(
    () => (hasData ? latencyByTraceName(allDetails) : []),
    [hasData, allDetails],
  );

  const totalObservations = useMemo(
    () => allDetails.reduce((sum, trace) => sum + trace.observations.length, 0),
    [allDetails],
  );

  const totalScores = useMemo(
    () => allDetails.reduce((sum, trace) => sum + trace.scores.length, 0),
    [allDetails],
  );

  const obsSpec = useMemo(
    () => ({
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: timeSeries },
      mark: { type: 'line', point: true, interpolate: 'monotone', color: theme.palette.success.main },
      encoding: {
        x: {
          field: 'label',
          type: 'ordinal',
          title: null,
          sort: { field: 'time' },
          // domain:false avoids doubling up with the y-axis's zero gridline, which sits
          // on the exact same pixel row as this axis's own baseline.
          axis: { grid: false, labelAngle: 0, domain: false },
        },
        y: { field: 'count', type: 'quantitative', title: 'observations' },
        color: {
          field: 'level',
          type: 'nominal',
          scale: {
            domain: ['DEFAULT', 'ERROR', 'DEBUG', 'WARNING'],
            range: [
              theme.palette.success.main,
              theme.palette.error.main,
              theme.palette.text.secondary,
              theme.palette.warning.main,
            ],
          },
          legend: { orient: 'bottom', title: null },
        },
        tooltip: [
          { field: 'tooltipLabel', title: 'time', type: 'nominal' },
          { field: 'level', title: 'level' },
          { field: 'count', title: 'count' },
        ],
      },
    }) as Record<string, unknown>,
    [
      timeSeries,
      theme.palette.primary.main,
      theme.palette.error.main,
      theme.palette.text.secondary,
      theme.palette.warning.main,
    ],
  );

  const refresh = () => {
    if (!experimentId) return;

    workflowIds.forEach(id =>
      dispatch(fetchSessionTraceDetails({
        projectId: OBSERVABILITY_PROJECT_ID,
        experimentId,
        workflowId: id,
      })),
    );
  };

  return {
    experimentId,
    workflowIds,
    runNameById,
    allDetails,
    anyLoading,
    hasData,
    scores,
    timeSeries,
    latencies,
    totalObservations,
    totalScores,
    obsSpec,
    tooltip,
    refresh,
  };
}
