import { useTheme } from '@mui/material';
import type { VisualizationSpec } from 'vega-embed';
import ResponsiveVegaLite from '../../../../shared/components/responsive-vegalite';
import { ChartCard, EmptyNote, useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { routingDistribution } from '../../../../shared/utils/observability-aggregates';
import { prettyName } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

export default function RoutingSummary({ details }: { details: TraceDetail[] }) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();

  const dist = routingDistribution(details);
  const flat = dist.flatMap(d => d.items.map(it => ({ field: prettyName(d.field), value: it.value, count: it.count })));

  if (flat.length === 0) {
    return <ChartCard title="Routing & config"><EmptyNote>No routing/config data.</EmptyNote></ChartCard>;
  }

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: flat },
    facet: { row: { field: 'field', type: 'nominal', title: null, header: { labelAngle: 0, labelAlign: 'left', labelFontWeight: 700 } } },
    spec: {
      mark: { type: 'bar', cornerRadiusEnd: 3, color: theme.palette.secondary.main },
      encoding: {
        y: { field: 'value', type: 'nominal', sort: '-x', title: null },
        x: { field: 'count', type: 'quantitative', title: 'traces' },
        tooltip: [
          { field: 'field', title: 'field' },
          { field: 'value', title: 'value' },
          { field: 'count', title: 'traces' },
        ],
      },
    },
    resolve: { scale: { y: 'independent', x: 'independent' } },
  } as VisualizationSpec;

  return (
    <ChartCard title="Routing & config" subtitle="decision distribution across traces">
      <ResponsiveVegaLite spec={spec} actions={false} tooltip={tooltip} maxHeight={280} aspectRatio={1.4} />
    </ChartCard>
  );
}
