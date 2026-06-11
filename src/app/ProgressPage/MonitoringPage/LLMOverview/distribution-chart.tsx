import { useState } from 'react';
import { Stack, useTheme } from '@mui/material';
import type { VisualizationSpec } from 'vega-embed';
import ResponsiveVegaLite from '../../../../shared/components/responsive-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import PillToggle from '../../../../shared/components/pill-toggle';
import { ChartCard, EmptyNote, useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { perTraceMetrics } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

type Metric = 'latency' | 'cost' | 'tokens';

const FIELD: Record<Metric, { key: 'latencyMs' | 'cost' | 'tokens'; title: string; format?: string }> = {
  latency: { key: 'latencyMs', title: 'latency (ms)' },
  tokens: { key: 'tokens', title: 'tokens' },
  cost: { key: 'cost', title: 'cost ($)', format: '.4f' },
};

export default function DistributionChart({ details }: { details: TraceDetail[] }) {
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [metric, setMetric] = useState<Metric>('latency');
  const [bySession, setBySession] = useState(false);

  const rows = perTraceMetrics(details);
  const field = FIELD[metric];

  const controls = (
    <Stack direction="row" spacing={1} alignItems="center">
      <PillToggle checked={bySession} onChange={setBySession} label="By session" tone="info" />
      <SegmentedToggle
        size="small"
        value={metric}
        onChange={v => setMetric(v as Metric)}
        options={[{ value: 'latency', label: 'Latency' }, { value: 'tokens', label: 'Tokens' }, { value: 'cost', label: 'Cost' }]}
      />
    </Stack>
  );

  if (rows.length === 0) {
    return <ChartCard title="Distribution" action={controls}><EmptyNote>No traces to plot.</EmptyNote></ChartCard>;
  }

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: rows },
    mark: { type: 'bar', cornerRadiusEnd: 2 },
    encoding: {
      x: { field: field.key, type: 'quantitative', bin: { maxbins: 20 }, title: field.title, axis: field.format ? { format: field.format } : undefined },
      y: { aggregate: 'count', type: 'quantitative', title: 'traces' },
      ...(bySession
        ? { color: { field: 'sessionId', type: 'nominal', legend: null, scale: { scheme: 'tableau20' } } }
        : { color: "default" }),
      tooltip: [
        { aggregate: 'count', title: 'traces' },
        { field: field.key, title: field.title, bin: { maxbins: 20 } },
      ],
    },
  } as VisualizationSpec;

  return (
    <ChartCard title="Distribution" subtitle="per-trace spread" action={controls}>
      <ResponsiveVegaLite spec={spec} actions={false} tooltip={tooltip} maxHeight={240} aspectRatio={2.6} />
    </ChartCard>
  );
}
