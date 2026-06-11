import { useState } from 'react';
import { useTheme } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';

import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { useVegaThemeConfig, useVegaTooltip } from './chart-kit';
import { callFrequency } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

export default function CallFrequencyChart({
  details,
}: {
  details: TraceDetail[];
}) {
  const theme = useTheme();
  const config = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [by, setBy] = useState<'name' | 'type'>('name');

  const rows = callFrequency(details, by);
  const hasData = rows.length > 0;

  const toggle = (
    <SegmentedToggle
      size="small"
      value={by}
      onChange={v => setBy(v as 'name' | 'type')}
      options={[
        { value: 'name', label: 'By agent' },
        { value: 'type', label: 'By type' },
      ]}
    />
  );

  const spec: Record<string, unknown> = hasData
    ? {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        config,
        data: { values: rows },
        mark: {
          type: 'bar',
          cornerRadiusEnd: 3,
          color: theme.palette.primary.main,
        },
        encoding: {
          y: {
            field: 'key',
            type: 'nominal',
            sort: '-x',
            title: null,
          },
          x: {
            field: 'count',
            type: 'quantitative',
            title: 'calls',
          },
          tooltip: [
            {
              field: 'key',
              title: by === 'name' ? 'agent' : 'type',
            },
            {
              field: 'count',
              title: 'calls',
            },
            {
              field: 'perTrace',
              title: 'per trace',
              format: '.2f',
            },
          ],
        },
      }
    : {};

  return (
    <ResponsiveCardVegaLite
      title="Call frequency"
      details="calls across traces"
      spec={spec}
      tooltip={tooltip}
      controlPanel={toggle}
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No calls recorded."
          icon={<BarChartIcon sx={{ fontSize: 40, color: 'info.main' }} />}
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