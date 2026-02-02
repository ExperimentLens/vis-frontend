import { Grid, Tooltip } from '@mui/material';
import type { RootState } from '../../../../../store/store';
import { useAppDispatch, useAppSelector } from '../../../../../store/store';
import Loader from '../../../../../shared/components/loader';
import ResponsiveCardTable from '../../../../../shared/components/responsive-card-table';
import InfoMessage from '../../../../../shared/components/InfoMessage';
import ResponsiveCardVegaLite from '../../../../../shared/components/responsive-card-vegalite';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import { useEffect, useMemo } from 'react';
import { fetchComparativeConfusionMatrix } from '../../../../../store/slices/monitorPageSlice';
import { Link } from 'react-router-dom';
import TitleTooltip from '../title-tooltip';

const ComparisonModelConfusion = ({ isMosaic }: {isMosaic: boolean}) => {
  const { workflowsTable, comparativeModelConfusionMatrix } = useAppSelector(
    (state: RootState) => state.monitorPage,
  );
  const sortConfusionByF1 = useAppSelector((state: RootState) => state.monitorPage.sortConfusionByF1);
  const experimentId = useAppSelector(
    (state: RootState) => state.progressPage.experiment.data?.id || '',
  );
  const dispatch = useAppDispatch();
  const selectedWorkflowIds = workflowsTable.selectedWorkflows;

  const orderedWorkflowIds = useMemo(() => {
    if (!sortConfusionByF1) return selectedWorkflowIds;

    const computeMacroF1 = (matrix: number[][]): number | null => {
      const n = matrix.length;

      if (n === 0) return null;

      const safe = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
      let f1Sum = 0;
      let classes = 0;

      for (let i = 0; i < n; i++) {
        const tp = safe(matrix[i]?.[i]);

        let fp = 0;
        let fn = 0;

        for (let r = 0; r < n; r++) {
          if (r !== i) fp += safe(matrix[r]?.[i]);
        }

        for (let c = 0; c < n; c++) {
          if (c !== i) fn += safe(matrix[i]?.[c]);
        }

        const precDen = tp + fp;
        const recDen = tp + fn;
        const precision = precDen > 0 ? tp / precDen : 0;
        const recall = recDen > 0 ? tp / recDen : 0;
        const den = precision + recall;
        const f1 = den > 0 ? (2 * precision * recall) / den : 0;

        f1Sum += f1;
        classes += 1;
      }

      return classes > 0 ? f1Sum / classes : null;
    };

    const ids = [...selectedWorkflowIds];

    ids.sort((a, b) => {
      const ma = comparativeModelConfusionMatrix[a]?.data?.matrix;
      const mb = comparativeModelConfusionMatrix[b]?.data?.matrix;

      const f1a = Array.isArray(ma) ? computeMacroF1(ma as number[][]) : null;
      const f1b = Array.isArray(mb) ? computeMacroF1(mb as number[][]) : null;
      const hasA = typeof f1a === 'number' && Number.isFinite(f1a);
      const hasB = typeof f1b === 'number' && Number.isFinite(f1b);

      if (hasA && hasB) return (f1b as number) - (f1a as number);
      if (hasA) return -1;
      if (hasB) return 1;

      return String(a).localeCompare(String(b));
    });

    return ids;
  }, [selectedWorkflowIds, sortConfusionByF1, comparativeModelConfusionMatrix]);

  // Dispatch fetchComparativeConfusionMatrix for each selected workflow (runId)
  useEffect(() => {
    if (!experimentId) return;
    selectedWorkflowIds.forEach((runId) => {
      const confusionMatrix = comparativeModelConfusionMatrix[runId];

      if(!confusionMatrix?.data || confusionMatrix?.error)
        dispatch(fetchComparativeConfusionMatrix({ experimentId, runId }));
    });
  }, [selectedWorkflowIds, experimentId]);

  // Transform matrix data to Vega-Lite format
  const transformConfusionMatrix = (labels: string[], matrix: number[][]) => {
    const data: { actual: string; predicted: string; value: number }[] = [];

    for (let actualIdx = 0; actualIdx < matrix.length; actualIdx++) {
      for (let predictedIdx = 0; predictedIdx < matrix[actualIdx].length; predictedIdx++) {
        data.push({
          actual: labels[actualIdx],
          predicted: labels[predictedIdx],
          value: matrix[actualIdx][predictedIdx],
        });
      }
    }

    return data;
  };

  const renderCharts = orderedWorkflowIds.map((runId) => {
    const matrixState = comparativeModelConfusionMatrix[runId];

    const titleTooltip = <TitleTooltip workflowId={runId} />;

    const titleNode = (
      <Tooltip
        title={titleTooltip}
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: '#ffff',
              maxWidth: '2000px'
            },
          },
        }}
      >
        <Link to={`/${experimentId}/workflow?workflowId=${runId}`}>{runId}</Link>
      </Tooltip>
    );

    // Handle loading and error states
    if (!matrixState || matrixState.loading) {
      return (
        <Grid item xs={isMosaic ? 6 : 12} key={runId}>
          <ResponsiveCardTable title={titleNode} minHeight={400} showSettings={false}>
            <Loader />
          </ResponsiveCardTable>
        </Grid>
      );
    }

    if (matrixState.error) {
      return (
        <Grid item xs={isMosaic ? 6 : 12} key={runId}>
          <ResponsiveCardTable title={titleNode} minHeight={400} showSettings={false}>
            <InfoMessage
              message={matrixState.error}
              type="info"
              icon={
                <ReportProblemRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />
              }
              fullHeight
            />
          </ResponsiveCardTable>
        </Grid>
      );
    }

    const dataRaw = matrixState.data;

    if (!dataRaw || !dataRaw.labels || !dataRaw.matrix) {
      return (
        <Grid item xs={isMosaic ? 6 : 12} key={runId}>
          <ResponsiveCardTable title={titleNode} minHeight={400} showSettings={false}>
            <InfoMessage
              message={'No confusion matrix data available'}
              type="info"
              fullHeight
            />
          </ResponsiveCardTable>
        </Grid>
      );
    }

    const confusionMatrixData = transformConfusionMatrix(dataRaw.labels, dataRaw.matrix);
    const maxValue = Math.max(...confusionMatrixData.map(d => d.value));
    const dataWithMax = confusionMatrixData.map(d => ({ ...d, __max__: maxValue }));

    const confusionMatrixSpec = {
      data: { values: dataWithMax },
      encoding: {
        x: { field: 'predicted', type: 'ordinal', axis: { title: 'Predicted Label', labelAngle: 0 } },
        y: { field: 'actual', type: 'ordinal', axis: { title: 'Actual Label' } },
        color: {
          field: 'value',
          type: 'quantitative',
          scale: { range: ['#ffffe0', '#08306b'] },
          legend: { title: 'Count' },
        },
      },
      layer: [
        { mark: { type: 'rect', tooltip: true } },
        {
          mark: {
            type: 'text',
            align: 'center',
            baseline: 'middle',
            fontSize: 12,
            fontWeight: 'bold',
          },
          encoding: {
            text: { field: 'value', type: 'quantitative' },
            color: {
              condition: { test: 'datum.value > 0.4 * datum.__max__', value: 'white' },
              value: 'black',
            },
          },
        },
      ],
    };

    return (
      <Grid
        item
        xs={isMosaic ? 6 : 12}
        key={runId}
        sx={{ textAlign: 'left', width: '100%' }}
      >
        <ResponsiveCardVegaLite
          spec={confusionMatrixSpec}
          actions={false}
          isStatic={false}
          title={titleNode}
          sx={{ width: '100%', maxWidth: '100%' }}
        />
      </Grid>
    );
  });

  return renderCharts;
};

export default ComparisonModelConfusion;
