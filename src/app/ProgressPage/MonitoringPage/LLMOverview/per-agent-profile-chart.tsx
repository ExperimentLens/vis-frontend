import type { VisualizationSpec } from 'vega-embed';
import ResponsiveVegaLite from '../../../../shared/components/responsive-vegalite';
import { ChartCard, EmptyNote, useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { perAgentProfile } from '../../../../shared/utils/observability-aggregates';
import { TYPE_COLORS } from '../../WorkflowTab/SelectedItemView/trace-observation-waterfall';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

export default function PerAgentProfileChart({ details }: { details: TraceDetail[] }) {
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const rows = perAgentProfile(details);

  if (rows.length === 0) {
    return <ChartCard title="Per-agent latency"><EmptyNote>No agent activity yet.</EmptyNote></ChartCard>;
  }

  const types = Array.from(new Set(rows.map(r => r.type)));
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: rows },
    mark: { type: 'bar', cornerRadiusEnd: 3 },
    encoding: {
      y: { field: 'displayName', type: 'nominal', sort: '-x', title: null },
      x: { field: 'avgMs', type: 'quantitative', title: 'avg ms' },
      color: {
        field: 'type',
        type: 'nominal',
        scale: { domain: types, range: types.map(t => TYPE_COLORS[t.toUpperCase()] ?? '#64748b') },
        legend: { orient: 'bottom', title: null },
      },
      tooltip: [
        { field: 'displayName', title: 'agent' },
        { field: 'type', title: 'type' },
        { field: 'count', title: 'calls' },
        { field: 'avgMs', title: 'avg ms', format: '.0f' },
        { field: 'totalTokens', title: 'tokens' },
      ],
    },
  } as VisualizationSpec;

  return (
    <ChartCard title="Per-agent latency" subtitle="mean ms per agent">
      <ResponsiveVegaLite spec={spec} actions={false} tooltip={tooltip} maxHeight={260} aspectRatio={1.7} />
    </ChartCard>
  );
}
