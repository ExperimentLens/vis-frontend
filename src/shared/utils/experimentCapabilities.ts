import { useMemo } from 'react';
import { useAppSelector } from '../../store/store';
import type { RootState } from '../../store/store';
import type { IExperiment } from '../models/experiment/experiment.model';
import type { IRun } from '../models/experiment/run.model';
import type { ITask } from '../models/experiment/task.model';
import type { IDataAsset } from '../models/experiment/data-asset.model';

/**
 * Single source of truth for "what can this experiment's UI render?".
 *
 * Historically every monitoring surface (monitor-row tabs, compare subtabs,
 * workflow-tree accordions) branched on `experiment.tags.experiment_type === 'llm'`.
 * That is an XOR: an experiment that has BOTH ML artifacts (datasets + model +
 * explainability) AND LLM traces could only ever show one half. Capabilities are
 * additive instead — each surface renders every tab/section and grays out the ones
 * whose capability is absent.
 *
 * To add or change how a capability is detected (e.g. a real synchronous "traces"
 * signal, or a new view), edit ONLY this file — every consumer reads from here.
 */
export interface ExperimentCapabilities {
  /**
   * LLM execution traces (Langfuse-style observability).
   * Detected from the `experiment_type=llm` tag OR the presence of any `langfuse.*`
   * trace tag on a workflow. A plain MLflow logging experiment has neither, so the
   * Traces tab / Executions subtab are grayed out.
   */
  traces: boolean;

  /** Model insights / model comparison / explainability (tabular ML models). */
  explainability: boolean;

  /** Train/test dataset comparison. */
  datasets: boolean;
}

/**
 * Tab indices, named so the magic numbers in the monitoring components stay in sync.
 * Reordering a tab here updates every consumer.
 */
export const MONITOR_TAB = { OVERVIEW: 0, COMPARE: 1, TRACES: 2, EXPLAINABILITY: 3 } as const;
export const COMPARE_TAB = { METRICS: 0, EXECUTIONS: 1, MODELS: 2, DATA: 3 } as const;

/** Serialized trained-model artifact names the explainability views can load. */
const MODEL_ARTIFACTS = ['model.pkl', 'model.pt'];
/** MLflow runs drop explainability inputs (model + X/Y CSVs) into this artifact folder. */
const EXPLAINABILITY_FOLDER = 'explainability';

/**
 * Canonical "is there a model to explain?" predicate for a single workflow.
 *
 * The signal lives in different places depending on the backend, so we check all of them:
 *  - an explainability *task* (ExtremeXP workflows populate `tasks`), or
 *  - a serialized model *artifact* (`model.pkl` / `model.pt`), or
 *  - any dataAsset in the `explainability/` folder (MLflow runs have `tasks: null` and
 *    instead write the model + X/Y CSVs there).
 *
 * A run with none of these (e.g. a plain logging run that only outputs CSV/PNG data)
 * has no model, so Model Insights / the Explainability tab stay grayed out.
 */
export function hasModelExplainability(
  tasks: ITask[] | null | undefined,
  dataAssets: IDataAsset[] | null | undefined,
): boolean {
  /* eslint-disable no-console */
  console.log('[hasModelExplainability] tasks:', tasks);
  console.log('[hasModelExplainability] dataAssets:', dataAssets);

  const byTask = Boolean(tasks?.some(t => typeof t.name === 'string' && /explainability/i.test(t.name)));

  const byAsset = Boolean(
    dataAssets?.some(a => {
      const nameMatch = MODEL_ARTIFACTS.includes(a.name);
      const folderMatch = a.folder === EXPLAINABILITY_FOLDER;
      console.log(
        `[hasModelExplainability] asset — name: ${JSON.stringify(a.name)}, folder: ${JSON.stringify(a.folder)} | nameMatch: ${nameMatch}, folderMatch: ${folderMatch}`,
      );
      return nameMatch || folderMatch;
    }),
  );

  console.log(`[hasModelExplainability] result — byTask: ${byTask}, byAsset: ${byAsset}`);
  /* eslint-enable no-console */
  return byTask || byAsset;
}

/** True when a workflow carries Langfuse trace tags (`langfuse.trace_id`, `langfuse.session_id`, …). */
function hasTraceTags(run: IRun): boolean {
  return Object.keys(run.tags ?? {}).some(k => k.toLowerCase().startsWith('langfuse.'));
}

/**
 * Derive experiment-level capabilities by aggregating across all of its workflows.
 * Each capability needs a *positive* content signal, so experiments that lack a feature
 * (no model, no traces) correctly report it as unavailable instead of optimistically true.
 *
 * - `traces`        — `experiment_type=llm` tag, or any workflow has Langfuse trace tags.
 * - `explainability`— some workflow has a model/explainability artifact (or task).
 * - `datasets`      — some workflow exposes at least one data asset.
 */
export function deriveCapabilities(
  experiment: IExperiment | null | undefined,
  workflows: IRun[],
): ExperimentCapabilities {
  const isLlmTag = experiment?.tags?.experiment_type?.toLowerCase() === 'llm';

  return {
    traces: isLlmTag || workflows.some(hasTraceTags),
    explainability: workflows.some(w => hasModelExplainability(w.tasks, w.dataAssets)),
    datasets: workflows.some(w => (w.dataAssets?.length ?? 0) > 0),
  };
}

/** Hook: capabilities for the currently-loaded experiment, memoized. */
export function useExperimentCapabilities(): ExperimentCapabilities {
  const experiment = useAppSelector((s: RootState) => s.progressPage.experiment.data);
  const workflows = useAppSelector((s: RootState) => s.progressPage.workflows.data);

  return useMemo(() => deriveCapabilities(experiment, workflows), [experiment, workflows]);
}
