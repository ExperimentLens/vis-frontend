import { api } from './api';

export type SettingEffectMethod = 'pdp' | 'ale';

/** One curve from the explainability service: the values of a setting and the metric effect at each. */
export interface SettingEffect {
  plotName: string;
  plotDescr: string;
  xAxis: { axisName: string; axisValues: string[]; axisType: 'categorical' | 'numerical' };
  yAxis: { axisName: string; axisValues: string[] };
}

const enc = encodeURIComponent;

/**
 * PDP or ALE of one run setting (prompt, model, top_k, ...) on one metric. The service fits a
 * surrogate model on the params and metrics of the run and of every run with the same param keys.
 */
export const getSettingEffect = (
  experimentId: string,
  runId: string,
  method: SettingEffectMethod,
  setting: string,
  metric: string,
) =>
  api
    .post<SettingEffect>(`/llm-explainability/${enc(experimentId)}/${enc(runId)}`, {
      explanation_type: 'llmHyperparameterExplanation',
      explanation_method: method,
      feature1: setting,
      target_metric: metric,
    })
    .then(r => r.data);
