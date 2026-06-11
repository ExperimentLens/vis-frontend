import { useState } from 'react';
import { Stack, useTheme } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import PillToggle from '../../../../shared/components/pill-toggle';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { perTraceMetrics } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

type Metric = 'latency' | 'cost' | 'tokens';

const FIELD: Record<
  Metric,
  {
    key: 'latencyMs' | 'cost' | 'tokens';
    title: string;
    format?: string;
  }
> = {
  latency: { key: 'latencyMs', title: 'latency (ms)' },
  tokens: { key: 'tokens', title: 'tokens' },
  cost: { key: 'cost', title: 'cost ($)', format: '.4f' },
};

export default function DistributionChart({
  details,
}: {
  details: TraceDetail[];
}) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();

  const [metric, setMetric] = useState<Metric>('latency');
  const [bySession, setBySession] = useState(false);

  const rows = perTraceMetrics(details);
  const hasData = rows.length > 0;
  const field = FIELD[metric];

  const controls = (
    <Stack direction="column" spacing={1} alignItems="right">
      <PillToggle
        checked={bySession}
        onChange={setBySession}
        label="By session"
        tone="info"
      />

      <SegmentedToggle
        size="small"
        value={metric}
        onChange={v => setMetric(v as Metric)}
        options={[
          { value: 'latency', label: 'Latency' },
          { value: 'tokens', label: 'Tokens' },
          { value: 'cost', label: 'Cost' },
        ]}
      />
    </Stack>
  );

  const spec: Record<string, unknown> = hasData
    ? {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        config,
        data: { values: rows },
        mark: {
          type: 'bar',
          cornerRadiusEnd: 2,
        },
        encoding: {
          x: {
            field: field.key,
            type: 'quantitative',
            bin: { maxbins: 20 },
            title: field.title,
            axis: field.format ? { format: field.format } : undefined,
          },
          y: {
            aggregate: 'count',
            type: 'quantitative',
            title: 'traces',
          },
          color: bySession
            ? {
                field: 'sessionId',
                type: 'nominal',
                legend: null,
                scale: { scheme: 'tableau20' },
              }
            : {
                value: theme.palette.primary.main,
              },
          tooltip: [
            {
              aggregate: 'count',
              title: 'traces',
            },
            {
              field: field.key,
              title: field.title,
              bin: { maxbins: 20 },
            },
          ],
        },
      }
    : {};

  return (
    <ResponsiveCardVegaLite
      title="Distribution"
      details="per-trace spread"
      spec={spec}
      tooltip={tooltip}
      controlPanel={controls}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No traces to plot."
          icon={<TimelineIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={240}
      aspectRatio={2.6}
      actions={false}
      isStatic={false}
    />
  );
}