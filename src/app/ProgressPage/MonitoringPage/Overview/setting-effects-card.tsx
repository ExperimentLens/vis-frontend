import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SearchableSelect from '../../../../shared/components/searchable-select';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { getSettingEffect } from '../../../api/llm-explainability';
import type { SettingEffect, SettingEffectMethod } from '../../../api/llm-explainability';
import { useVegaThemeConfig, useVegaTooltip } from '../LLMOverview/chart-kit';

interface Props {
  experimentId: string;
  /** Any run of the experiment; the service also uses every run with the same param keys. */
  runId: string;
  /** How many runs the surrogate model is fitted on, for the caption. */
  runCount: number;
  settings: string[];
  metrics: string[];
  setting: string;
  onSettingChange: (setting: string) => void;
}

const METHOD_LABEL: Record<SettingEffectMethod, string> = {
  pdp: 'Partial dependence (PDP)',
  ale: 'Accumulated local effects (ALE)',
};

const METHOD_DETAIL: Record<SettingEffectMethod, string> = {
  pdp: 'predicted metric at each value, other settings averaged',
  ale: 'change in the metric at each value against the average, robust when settings move together',
};

/** PDP / ALE of one setting on one metric, from a surrogate model fitted on the experiment's runs. */
export default function SettingEffectsCard({
  experimentId,
  runId,
  runCount,
  settings,
  metrics,
  setting,
  onSettingChange,
}: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();

  const [metric, setMetric] = useState(metrics[0] ?? '');
  const [method, setMethod] = useState<SettingEffectMethod>('pdp');
  const [effect, setEffect] = useState<SettingEffect | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Each curve fits a model on the service side, so keep the ones already fetched.
  const cache = useRef(new Map<string, SettingEffect>());

  useEffect(() => {
    if (!metrics.includes(metric)) setMetric(metrics[0] ?? '');
  }, [metrics, metric]);

  useEffect(() => {
    if (!experimentId || !runId || !setting || !metric) return;

    const key = [runId, method, setting, metric].join('|');
    const cached = cache.current.get(key);

    if (cached) {
      setEffect(cached);
      setError(false);

      return;
    }

    let cancelled = false;

    setLoading(true);
    setError(false);
    getSettingEffect(experimentId, runId, method, setting, metric)
      .then(result => {
        cache.current.set(key, result);
        if (!cancelled) setEffect(result);
      })
      .catch(() => {
        if (!cancelled) {
          setEffect(null);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [experimentId, runId, method, setting, metric]);

  const numeric = effect?.xAxis.axisType === 'numerical';
  const yTitle = method === 'pdp' ? `Predicted ${metric}` : `Effect on ${metric}`;

  const spec = useMemo(() => {
    if (!effect) return {};

    const values = effect.xAxis.axisValues.map((value, i) => ({
      value: numeric ? Number(value) : value,
      effect: Number(effect.yAxis.axisValues[i]),
    }));
    const zeroRule =
      method === 'ale'
        ? [{
          mark: { type: 'rule', strokeDash: [4, 4], color: theme.palette.text.secondary },
          encoding: numeric ? { y: { datum: 0 } } : { x: { datum: 0 } },
        }]
        : [];
    const tooltipFields = [
      { field: 'value', title: setting },
      { field: 'effect', title: yTitle, format: '.3f' },
    ];

    const layer = numeric
      ? {
        mark: { type: 'line', point: { size: 70, filled: true }, color: theme.palette.primary.main, strokeWidth: 2.5 },
        encoding: {
          x: { field: 'value', type: 'quantitative', title: setting, scale: { zero: false } },
          // Anchored at zero so a tiny effect looks tiny, not like a cliff.
          y: { field: 'effect', type: 'quantitative', title: yTitle, scale: { zero: true } },
          tooltip: tooltipFields,
        },
      }
      : {
        mark: { type: 'bar', cornerRadiusEnd: 3, color: theme.palette.primary.main },
        encoding: {
          y: { field: 'value', type: 'nominal', title: setting, sort: '-x' },
          x: { field: 'effect', type: 'quantitative', title: yTitle },
          tooltip: tooltipFields,
        },
      };

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values },
      layer: [layer, ...zeroRule],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [effect, numeric, method, setting, yTitle, theme, themeConfig]);

  const controls = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <SearchableSelect
        labelId="setting-effects-setting"
        inputLabel="Setting"
        label="Setting"
        value={setting}
        options={settings}
        onChange={onSettingChange}
        menuMaxHeight={300}
      />
      <SearchableSelect
        labelId="setting-effects-metric"
        inputLabel="Metric"
        label="Metric"
        value={metric}
        options={metrics}
        onChange={setMetric}
        menuMaxHeight={300}
      />
      <SearchableSelect
        labelId="setting-effects-method"
        inputLabel="Method"
        label="Method"
        value={method}
        options={['pdp', 'ale']}
        getOptionLabel={option => METHOD_LABEL[option as SettingEffectMethod]}
        onChange={value => setMethod(value as SettingEffectMethod)}
      />
    </Box>
  );

  return (
    <ResponsiveCardVegaLite
      title={`Effect of ${setting || 'a setting'} on ${metric || 'a metric'}`}
      details={`${METHOD_LABEL[method]}: ${METHOD_DETAIL[method]} · surrogate model fitted on ${runCount} runs`}
      controlPanel={controls}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
      showSettings
      loading={loading}
      showInfoMessage={!loading && (error || !effect)}
      infoMessage={
        <InfoMessage
          message={
            error
              ? 'Could not compute this curve. Check that the explainability service is running, then pick the setting again.'
              : 'Pick a setting and a metric.'
          }
          icon={<ShowChartRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={300}
      aspectRatio={1.8}
    />
  );
}
