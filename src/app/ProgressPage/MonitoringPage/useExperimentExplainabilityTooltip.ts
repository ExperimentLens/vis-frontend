import { useMemo } from 'react';
import { useAppSelector } from '../../../store/store';
import type { RootState } from '../../../store/store';
import { createExperimentExplainabilityTooltipHandler } from './experimentExplainabilityTooltip';
import type { WorkflowTooltipPalette } from './ComparativeAnalysis/workflow-info-tooltip';

export const useExperimentExplainabilityTooltip = (
  xAxisName?: string,
  yAxisName?: string,
  axisType?: string,
  selectedFeature?: string,
  selectedFeature2?: string,
  palette?: WorkflowTooltipPalette,
) => {
  const runs = useAppSelector((state: RootState) => state.progressPage.workflows.data);
  const workflowIds = runs.map(wf => wf.id);
  const workflowColors = useAppSelector((state: RootState) => state.monitorPage.workflowsTable.workflowColors);
  const experimentId = useAppSelector((state: RootState) => state.progressPage.experiment.data?.id);

  return useMemo(() => {
    if (!palette) return () => '';
    return createExperimentExplainabilityTooltipHandler({
      workflowIds,
      runs,
      workflowColors,
      xAxisName,
      yAxisName,
      axisType,
      selectedFeature,
      selectedFeature2,
      experimentId,
      palette
    });
  }, [workflowIds, runs, workflowColors, xAxisName, yAxisName, axisType, selectedFeature, selectedFeature2, palette]);
};
