import { useMemo, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableMultiSelect from '../../../../shared/components/searchable-select-multiple';
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

/** Vega axis-label test for a tick that falls on midnight (local time). */
const MIDNIGHT_TICK = '(hours(datum.value) === 0 && minutes(datum.value) === 0)';

/**
 * Each run's score in start order, one line per configuration, with the pass mark as a
 * dashed rule. Runs logged into the same experiment over days show drift here.
 * Starts with a single configuration (the one with the most runs); more can be added
 * from the settings menu.
 */
export default function ScoresOverTimeCard({ points, metrics, metric, onMetricChange, param }: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [chosenGroups, setChosenGroups] = useState<string[] | null>(null);

  // Groups ordered by run count, so the default and the top of the picker are the best-sampled.
  const groups = useMemo(() => {
    const counts = new Map<string, number>();

    points.forEach(p => counts.set(p.group, (counts.get(p.group) ?? 0) + 1));

    return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b));
  }, [points]);

  // Keep the user's picks that still exist for this metric; fall back to the top group.
  const selectedGroups = useMemo(() => {
    const kept = (chosenGroups ?? []).filter(g => groups.includes(g));

    return kept.length > 0 ? kept : groups.slice(0, 1);
  }, [chosenGroups, groups]);

  const visiblePoints = useMemo(
    () => points.filter(p => selectedGroups.includes(p.group)),
    [points, selectedGroups],
  );
  const hasData = visiblePoints.length > 0;

  const spec = useMemo(() => {
    if (!hasData) return {};

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      data: { values: visiblePoints },
      layer: [
        {
          mark: { type: 'rule', strokeDash: [4, 4], opacity: 0.6 },
          encoding: { y: { datum: evalPassMark(metric) } },
        },
        {
          encoding: {
            x: {
              field: 'time',
              type: 'temporal',
              title: null,
              axis: {
                grid: false,
                labelAngle: 0,
                // Times as 24h, with the date (bold) on the first tick and at each midnight.
                labelExpr: `${MIDNIGHT_TICK} ? timeFormat(datum.value, '%b %d') : datum.index === 0 ? timeFormat(datum.value, '%b %d %H:%M') : timeFormat(datum.value, '%H:%M')`,
                labelFontWeight: { condition: { test: `${MIDNIGHT_TICK} || datum.index === 0`, value: 600 }, value: 400 },
                tickCount: { expr: 'ceil(width / 90)' },
                labelOverlap: 'greedy',
                labelSeparation: 8,
                labelFlush: true,
                tickSize: 4,
                labelPadding: 4,
              },
            },
            y: { field: 'value', type: 'quantitative', title: evalLabel(metric), scale: { domain: [0, 1] }, axis: { grid: true } },
            color: { field: 'group', type: 'nominal', legend: { orient: 'right', title: param || null, labelLimit: 160 } },
          },
          layer: [
            {
              mark: { type: 'line', interpolate: 'monotone', strokeWidth: 2, strokeCap: 'round', strokeJoin: 'round' },
            },
            {
              // Only the points carry the tooltip; the line itself isn't hoverable.
              // A ring in the card colour keeps points readable where lines cross.
              mark: { type: 'point', filled: true, opacity: 1, size: 36, stroke: theme.palette.background.paper, strokeWidth: 1.5 },
              encoding: {
                tooltip: [
                  { field: 'runName', title: 'Run' },
                  { field: 'group', title: param || 'Group' },
                  { field: 'value', title: evalLabel(metric), format: '.2f' },
                  { field: 'time', title: 'Started', type: 'temporal', format: '%b %d %H:%M:%S' },
                ],
              },
            },
          ],
        },
      ],
      config: themeConfig,
    } as Record<string, unknown>;
  }, [visiblePoints, hasData, metric, param, themeConfig, theme]);

  const groupLabel = param || 'Group';

  const controls = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {groups.length > 1 && (
        <SearchableMultiSelect
          labelId="eval-over-time-groups"
          inputLabel={groupLabel}
          label={groupLabel}
          value={selectedGroups}
          options={groups}
          // An empty selection would blank the chart, so the last pick can't be cleared.
          onChange={next => next.length > 0 && setChosenGroups(next)}
          renderValue={selected => (selected.length === 1 ? selected[0] : `${selected.length} of ${groups.length} selected`)}
          menuMaxHeight={300}
        />
      )}
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
      details={hasData ? `${evalLabel(metric)} · ${visiblePoints.length} runs · dashed line is the pass mark` : null}
      controlPanel={controls}
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
