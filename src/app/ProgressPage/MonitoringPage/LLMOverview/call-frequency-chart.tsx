import { useState } from 'react';
import { useTheme } from '@mui/material';
import type { VisualizationSpec } from 'vega-embed';
import ResponsiveVegaLite from '../../../../shared/components/responsive-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { ChartCard, EmptyNote, useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { callFrequency } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

export default function CallFrequencyChart({ details }: { details: TraceDetail[] }) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [by, setBy] = useState<'name' | 'type'>('name');

  const rows = callFrequency(details, by);

  const toggle = (
    <SegmentedToggle
      size="small"
      value={by}
      onChange={v => setBy(v as 'name' | 'type')}
      options={[{ value: 'name', label: 'By agent' }, { value: 'type', label: 'By type' }]}
    />
  );

  if (rows.length === 0) {
    return <ChartCard title="Call frequency" action={toggle}><EmptyNote>No calls recorded.</EmptyNote></ChartCard>;
  }

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: rows },
    mark: { type: 'bar', cornerRadiusEnd: 3 },
    encoding: {
      y: { field: 'key', type: 'nominal', sort: '-x', title: null },
      x: { field: 'count', type: 'quantitative', title: 'calls' },
      tooltip: [
        { field: 'key', title: by === 'name' ? 'agent' : 'type' },
        { field: 'count', title: 'calls' },
        { field: 'perTrace', title: 'per trace', format: '.2f' },
      ],
    },
  } as VisualizationSpec;

  return (
    <ChartCard title="Call frequency" subtitle="calls across traces" action={toggle}>
      <ResponsiveVegaLite spec={spec} actions={false} tooltip={tooltip} maxHeight={260} aspectRatio={1.7} />
    </ChartCard>
  );
}
