import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import { useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { perAgentProfile } from '../../../../shared/utils/observability-aggregates';
import { TYPE_COLORS } from '../../../Tasks/Observability/trace-observation-waterfall';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';
import InfoMessage from '../../../../shared/components/InfoMessage';
import AssessmentIcon from '@mui/icons-material/Assessment';

export default function PerAgentProfileChart({
  details,
}: {
  details: TraceDetail[];
}) {
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const rows = perAgentProfile(details);
  const hasData = rows.length > 0;

  const types = Array.from(new Set(rows.map(r => r.type)));

  const spec: Record<string, unknown> = hasData ?{
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    config,
    data: { values: rows },
    mark: { type: 'bar', cornerRadiusEnd: 3 },
    encoding: {
      y: {
        field: 'displayName',
        type: 'nominal',
        sort: '-x',
        title: null,
      },
      x: {
        field: 'avgMs',
        type: 'quantitative',
        title: 'avg ms',
      },
      color: {
        field: 'type',
        type: 'nominal',
        scale: {
          domain: types,
          range: types.map(
            t => TYPE_COLORS[t.toUpperCase()] ?? '#64748b',
          ),
        },
        legend: {
          orient: 'bottom',
          title: null,
        },
      },
      tooltip: [
        {
          field: 'displayName',
          title: 'agent',
        },
        {
          field: 'type',
          title: 'type',
        },
        {
          field: 'count',
          title: 'calls',
        },
        {
          field: 'avgMs',
          title: 'avg ms',
          format: '.0f',
        },
        {
          field: 'totalTokens',
          title: 'tokens',
        },
      ],
    },
  } : {};

  return (
    <ResponsiveCardVegaLite
      title="Per-agent latency"
      details="mean ms per agent"
      spec={spec}
      tooltip={tooltip}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No agent activity yet."
          icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={260}
      aspectRatio={1.7}
      actions={false}
      isStatic={false}
    />
  );
}