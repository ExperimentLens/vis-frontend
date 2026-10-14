import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import ScatterPlotRoundedIcon from '@mui/icons-material/ScatterPlotRounded';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import type { VariantPoint } from '../../../../shared/utils/experiment-overview';
import { inferDirection } from '../../../../shared/utils/run-statistics';
import { useVegaThemeConfig, useVegaTooltip } from '../LLMOverview/chart-kit';

interface Props {
  points: VariantPoint[];
  costMetric: string;
  param: string;
}

const COST_LABEL: Record<string, string> = { cost_usd: 'Cost per run ($)', latency_ms: 'Latency per run (ms)', total_tokens: 'Tokens per run' };

/** One point per configuration: quality against cost, with the best trade-offs labeled. */
export default function VariantMapCard({ points, costMetric, param }: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const lowerIsBetter = inferDirection(costMetric) === 'minimize';

  const spec = useMemo(() => {
    if (!points.length) return {};

    const data = points.map(p => ({ ...p, status: p.frontier ? 'Best trade-off' : 'Beaten on both' }));

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: data },
      encoding: {
        x: { field: 'cost', type: 'quantitative', title: COST_LABEL[costMetric] ?? costMetric, scale: { zero: false, nice: true } },
        y: { field: 'quality', type: 'quantitative', title: 'Quality score', scale: { domain: [0, 1] } },
      },
      layer: [
        {
          mark: { type: 'point', filled: true, size: 140, stroke: theme.palette.background.paper, strokeWidth: 1.5 },
          encoding: {
            color: {
              field: 'status',
              type: 'nominal',
              scale: { domain: ['Best trade-off', 'Beaten on both'], range: [theme.palette.success.main, theme.palette.text.disabled] },
              legend: { orient: 'top', title: null },
            },
            tooltip: [
              { field: 'group', title: param || 'Group' },
              { field: 'quality', title: 'Quality score', format: '.2f' },
              { field: 'cost', title: COST_LABEL[costMetric] ?? costMetric, format: ',.2f' },
              { field: 'runs', title: 'Runs' },
            ],
          },
        },
        {
          mark: { type: 'text', align: 'left', dx: 9, dy: -7, fontSize: 10, fontWeight: 600 },
          encoding: {
            text: { field: 'group' },
            color: { value: theme.palette.text.primary },
          },
        },
      ],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [points, costMetric, param, theme, themeConfig]);

  return (
    <ResponsiveCardVegaLite
      title="Variant map"
      details={`Quality against ${lowerIsBetter ? 'cost' : costMetric} per ${param || 'group'} · top-${lowerIsBetter ? 'left' : 'right'} is best`}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
      showSettings={false}
      showInfoMessage={!points.length}
      infoMessage={
        <InfoMessage
          message="Needs a quality metric and a cost, latency or token metric on the runs."
          icon={<ScatterPlotRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={300}
      aspectRatio={1.8}
    />
  );
}
