import { useState } from 'react';
import { useTheme } from '@mui/material';
import type { VisualizationSpec } from 'vega-embed';
import ResponsiveVegaLite from '../../../../shared/components/responsive-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { ChartCard, EmptyNote, useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { verdictPassRates } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

const band = (r: number) => (r >= 0.75 ? 'good' : r >= 0.5 ? 'mid' : 'bad');

export default function VerdictPassRateChart({ details }: { details: TraceDetail[] }) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [kind, setKind] = useState<'judges' | 'checks'>('judges');

  const rows = verdictPassRates(details, kind).map(r => ({ ...r, band: band(r.passRate) }));

  const toggle = (
    <SegmentedToggle
      size="small"
      value={kind}
      onChange={v => setKind(v as 'judges' | 'checks')}
      options={[{ value: 'judges', label: 'Judges' }, { value: 'checks', label: 'Checks' }]}
    />
  );

  if (rows.length === 0) {
    return <ChartCard title="Verdict pass-rates" action={toggle}><EmptyNote>No {kind} recorded.</EmptyNote></ChartCard>;
  }

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: rows },
    mark: { type: 'bar', cornerRadiusEnd: 3 },
    encoding: {
      y: { field: 'name', type: 'nominal', sort: '-x', title: null },
      x: { field: 'passRate', type: 'quantitative', title: 'pass rate', axis: { format: '.0%' }, scale: { domain: [0, 1] } },
      color: {
        field: 'band',
        type: 'nominal',
        scale: { domain: ['good', 'mid', 'bad'], range: [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main] },
        legend: null,
      },
      tooltip: [
        { field: 'name', title: kind === 'judges' ? 'judge' : 'check' },
        { field: 'passRate', title: 'pass rate', format: '.0%' },
        { field: 'total', title: 'samples' },
      ],
    },
  } as VisualizationSpec;

  return (
    <ChartCard title="Verdict pass-rates" subtitle={`${kind} across traces`} action={toggle}>
      <ResponsiveVegaLite spec={spec} actions={false} tooltip={tooltip} maxHeight={260} aspectRatio={1.7} />
    </ChartCard>
  );
}
