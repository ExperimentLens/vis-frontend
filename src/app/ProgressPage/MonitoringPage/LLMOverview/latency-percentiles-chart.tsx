import { useMemo } from 'react';
import { useTheme } from '@mui/material';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import { useVegaThemeConfig, useVegaTooltip } from './chart-kit';

export interface LatencyPercentiles {
  name: string;
  count: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

interface Props {
  latencies: LatencyPercentiles[];
  isLoading: boolean;
}

const MAX_ROWS = 8;
const ROW_HEIGHT = 30;

/** Per trace type: a bar from p50 to p95, with the median and the p99 tail marked. */
export default function LatencyPercentilesChart({ latencies, isLoading }: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const rows = latencies.slice(0, MAX_ROWS).map(l => ({ ...l, label: `${l.name} (${l.count})` }));
  const height = rows.length * ROW_HEIGHT + 80;

  const spec = useMemo(() => {
    if (!rows.length) return {};
    const tip = [
      { field: 'name', title: 'Trace' },
      { field: 'count', title: 'Traces' },
      { field: 'p50', title: 'p50 (ms)', format: ',.0f' },
      { field: 'p90', title: 'p90 (ms)', format: ',.0f' },
      { field: 'p95', title: 'p95 (ms)', format: ',.0f' },
      { field: 'p99', title: 'p99 (ms)', format: ',.0f' },
    ];

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: rows },
      encoding: {
        y: { field: 'label', type: 'nominal', sort: { field: 'p95', order: 'descending' }, title: null, axis: { labelLimit: 220, domain: false, ticks: false } },
      },
      layer: [
        {
          mark: { type: 'bar', height: 12, cornerRadius: 6, color: theme.palette.info.main, opacity: 0.35 },
          encoding: {
            x: { field: 'p50', type: 'quantitative', title: 'Latency (ms)', axis: { grid: true } },
            x2: { field: 'p95' },
            tooltip: tip,
          },
        },
        {
          mark: { type: 'tick', thickness: 3, size: 16, color: theme.palette.info.main },
          encoding: { x: { field: 'p50', type: 'quantitative' }, tooltip: tip },
        },
        {
          mark: { type: 'point', shape: 'diamond', filled: true, size: 60, color: theme.palette.warning.main },
          encoding: { x: { field: 'p99', type: 'quantitative' }, tooltip: tip },
        },
      ],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [rows, theme, themeConfig]);

  return (
    <ResponsiveCardVegaLite
      title="Latency percentiles"
      details={rows.length ? 'Bar spans p50–p95 per trace type · line is the median · diamond is p99' : null}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
      showSettings={rows.length > 0}
      showInfoMessage={!rows.length}
      infoMessage={
        <InfoMessage
          message="No latency data."
          icon={<TimerOutlinedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      minHeight={rows.length ? height : 200}
      maxHeight={rows.length ? height : 300}
      aspectRatio={2.2}
      loading={isLoading}
    />
  );
}
