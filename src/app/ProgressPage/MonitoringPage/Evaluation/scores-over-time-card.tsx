import { useMemo, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import InfoMessage from '../../../../shared/components/InfoMessage';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableMultiSelect from '../../../../shared/components/searchable-select-multiple';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { daysSpanned, evalLabel, evalPassMark, scoresByPeriod } from '../../../../shared/utils/eval-quality';
import type { ScorePeriod, ScorePoint } from '../../../../shared/utils/eval-quality';
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

type View = ScorePeriod | 'run';

const VIEW_LABEL: Record<View, string> = { day: 'Per day', hour: 'Per hour', run: 'Each run' };

/**
 * Mean score per configuration and day (or hour) as grouped bars, with the pass mark as a
 * dashed rule; runs logged into the same experiment over days show drift here. "Each run"
 * draws every run's score in start order instead. Starts with a single configuration (the
 * one with the most runs); more can be added from the settings menu.
 */
export default function ScoresOverTimeCard({ points, metrics, metric, onMetricChange, param }: Props) {
  const theme = useTheme();
  const themeConfig = useVegaThemeConfig();
  const tooltip = useVegaTooltip();
  const [chosenGroups, setChosenGroups] = useState<string[] | null>(null);
  const [chosenView, setChosenView] = useState<View | null>(null);
  // Runs of one day would make one bar per configuration, so those start per hour.
  const view: View = chosenView ?? (daysSpanned(points) > 1 ? 'day' : 'hour');

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
  const periods = useMemo(() => (view === 'run' ? [] : scoresByPeriod(visiblePoints, view)), [visiblePoints, view]);

  const spec = useMemo(() => {
    if (!hasData) return {};

    if (view !== 'run') {
      const labels = [...new Set(periods.map(p => p.label))];

      return {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: { values: periods },
        layer: [
          {
            mark: { type: 'bar', cornerRadiusEnd: 3 },
            encoding: {
              x: { field: 'label', type: 'ordinal', sort: labels, title: null, axis: { labelAngle: 0, labelOverlap: 'greedy', grid: false } },
              xOffset: { field: 'group', type: 'nominal' },
              y: { field: 'mean', type: 'quantitative', title: evalLabel(metric), scale: { domain: [0, 1] }, axis: { grid: true } },
              color: { field: 'group', type: 'nominal', legend: { orient: 'right', title: param || null, labelLimit: 160 } },
              tooltip: [
                { field: 'label', title: view === 'day' ? 'Day' : 'Hour' },
                { field: 'group', title: param || 'Group' },
                { field: 'mean', title: `Mean ${evalLabel(metric)}`, format: '.2f' },
                { field: 'min', title: 'Lowest', format: '.2f' },
                { field: 'max', title: 'Highest', format: '.2f' },
                { field: 'count', title: 'Scores averaged' },
              ],
            },
          },
          {
            // Drawn after the bars so the pass mark stays visible across them.
            mark: { type: 'rule', strokeDash: [4, 4], opacity: 0.7 },
            encoding: { y: { datum: evalPassMark(metric) } },
          },
        ],
        config: themeConfig,
      } as Record<string, unknown>;
    }

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
  }, [visiblePoints, hasData, view, periods, metric, param, themeConfig, theme]);

  const groupLabel = param || 'Group';

  const controls = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <SegmentedToggle
        size="small"
        value={view}
        onChange={v => setChosenView(v as View)}
        options={(['day', 'hour', 'run'] as View[]).map(v => ({ value: v, label: VIEW_LABEL[v] }))}
      />
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
      details={hasData
        ? `${evalLabel(metric)} · ${view === 'run' ? 'each run' : `mean ${VIEW_LABEL[view].toLowerCase()}`} · ${visiblePoints.length} scores · dashed line is the pass mark`
        : null}
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
