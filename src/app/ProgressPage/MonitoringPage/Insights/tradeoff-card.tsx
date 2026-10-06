import { useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { formatStat, paretoFrontier } from '../../../../shared/utils/run-statistics';
import type { Direction, RunRecord } from '../../../../shared/utils/run-statistics';
import { DIRECTION_OPTIONS } from './direction-options';
import { tradeoffSpec } from './insight-specs';

interface TradeoffCardProps {
  records: RunRecord[];
  metrics: string[];
  yMetric: string;
  yDirection: Direction;
  xMetric: string;
  xDirection: Direction;
  onXMetricChange: (metric: string) => void;
  onXDirectionChange: (direction: Direction) => void;
}

/** Scatter of two metrics with the Pareto frontier: the runs no other run beats on both. */
export default function TradeoffCard({
  records,
  metrics,
  yMetric,
  yDirection,
  xMetric,
  xDirection,
  onXMetricChange,
  onXDirectionChange,
}: TradeoffCardProps) {
  const theme = useTheme();
  const { experimentId } = useParams();

  const points = useMemo(
    () => paretoFrontier(records, xMetric, xDirection, yMetric, yDirection),
    [records, xMetric, xDirection, yMetric, yDirection],
  );
  const frontier = useMemo(() => points.filter(p => p.optimal).sort((a, b) => a.x - b.x), [points]);

  const spec = useMemo(
    () => tradeoffSpec(points, xMetric, yMetric, {
      optimal: theme.palette.success.main,
      dominated: theme.palette.text.disabled,
    }),
    [points, theme, xMetric, yMetric],
  );

  const controls = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      <Box sx={{ minWidth: 200 }}>
        <SearchableSelect
          labelId="tradeoff-x-metric"
          inputLabel="Trade off against"
          label="Trade off against"
          value={xMetric}
          options={metrics.filter(m => m !== yMetric)}
          onChange={onXMetricChange}
          menuMaxHeight={260}
        />
      </Box>
      <SegmentedToggle
        size="small"
        value={xDirection}
        onChange={value => onXDirectionChange(value as Direction)}
        options={DIRECTION_OPTIONS}
        aria-label={`Whether higher or lower ${xMetric} is better`}
      />
    </Stack>
  );

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Stack spacing={1}>
          {controls}
          <ResponsiveCardVegaLite
            title={`Trade-off: ${yMetric} vs ${xMetric}`}
            details="Green runs are Pareto-optimal: no other run is better on both metrics. Every grey run has a green run that beats it on both."
            spec={spec}
            actions={false}
            isStatic={false}
            showSettings={false}
            maxHeight={320}
            aspectRatio={2.5}
          />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <ResponsiveCardTable
          title={`Pareto-optimal runs (${frontier.length} of ${points.length})`}
          details="The only runs worth choosing between for these two metrics."
          showSettings={false}
          showFullScreenButton={false}
        >
          {frontier.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              No run logged both metrics.
            </Typography>
          ) : (
            <List dense disablePadding>
              {frontier.map(p => (
                <ListItem key={p.id} disableGutters divider>
                  <ListItemText
                    primary={
                      <Link component={RouterLink} to={`/${experimentId}/workflow?workflowId=${p.id}`} underline="hover">
                        {p.name}
                      </Link>
                    }
                    secondary={`${yMetric} ${formatStat(p.y)} · ${xMetric} ${formatStat(p.x)}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </ResponsiveCardTable>
      </Grid>
    </Grid>
  );
}
