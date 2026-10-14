import { useMemo } from 'react';
import { Box } from '@mui/material';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import SearchableSelect from '../../../../shared/components/searchable-select';
import { evalLabel, evalPassMark } from '../../../../shared/utils/eval-quality';
import type { ScorePoint } from '../../../../shared/utils/eval-quality';
import { useVegaThemeConfig, useVegaTooltip } from '../LLMOverview/chart-kit';

interface Props {
  points: ScorePoint[];
  metrics: string[];
  metric: string;
  onMetricChange: (metric: string) => void;
  param: string;
}

/**
 * Each run's score in start order, one line per configuration, with the pass mark as a
 * dashed rule. Runs logged into the same experiment over days show drift here.
 */
export default function ScoresOverTimeCard({ points, metrics, metric, onMetricChange, param }: Props) {
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const hasData = points.length > 0;

  const spec = useMemo(() => {
    if (!hasData) return {};

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: points },
      layer: [
        {
          mark: { type: 'rule', strokeDash: [4, 4], opacity: 0.6 },
          encoding: { y: { datum: evalPassMark(metric) } },
        },
        {
          mark: { type: 'line', point: { size: 30, filled: true }, strokeWidth: 1.5, opacity: 0.85 },
          encoding: {
            x: { field: 'time', type: 'temporal', title: null, axis: { grid: false, labelAngle: 0 } },
            y: { field: 'value', type: 'quantitative', title: evalLabel(metric), scale: { domain: [0, 1] }, axis: { grid: true } },
            color: { field: 'group', type: 'nominal', legend: { orient: 'right', title: param || null, labelLimit: 160 } },
            tooltip: [
              { field: 'runName', title: 'Run' },
              { field: 'group', title: param || 'Group' },
              { field: 'value', title: evalLabel(metric), format: '.2f' },
              { field: 'time', title: 'Started', type: 'temporal', format: '%b %d %H:%M:%S' },
            ],
          },
        },
      ],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [points, hasData, metric, param, themeConfig]);

  const metricPicker = (
    <Box >
      <SearchableSelect
        labelId="eval-over-time-metric"
        inputLabel="Metric"
        label="Metric"
        value={metric}
        options={metrics}
        getOptionLabel={evalLabel}
        onChange={onMetricChange}
        menuMaxHeight={300}
      />
    </Box>
  );

  return (
    <ResponsiveCardVegaLite
      title="Scores over time"
      details={hasData ? `${evalLabel(metric)} · ${points.length} runs · dashed line is the pass mark` : null}
      controlPanel={metricPicker}
      spec={spec}
      actions={false}
      isStatic={false}
      tooltip={tooltip}
      showSettings
      showInfoMessage={!hasData}
      infoMessage={
        <InfoMessage
          message="No runs with a start time logged this metric."
          icon={<TimelineRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          type="info"
          fullHeight
        />
      }
      maxHeight={260}
      aspectRatio={3}
    />
  );
}
