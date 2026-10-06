import { useMemo } from 'react';
import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import { formatPValue, formatStat } from '../../../../shared/utils/run-statistics';
import type { Direction, GroupComparison } from '../../../../shared/utils/run-statistics';
import { comparisonSpec } from './insight-specs';
import { VerdictChip } from './insight-chips';

interface ParamComparisonCardProps {
  param: string;
  metric: string;
  direction: Direction;
  groups: GroupComparison[];
}

/** Mean ± 95% CI of the metric for every value of one param, tested against the best value. */
export default function ParamComparisonCard({ param, metric, direction, groups }: ParamComparisonCardProps) {
  const theme = useTheme();

  const spec = useMemo(
    () =>
      comparisonSpec(groups, param, metric, {
        interval: theme.palette.text.secondary,
        verdicts: {
          best: theme.palette.success.main,
          tie: theme.palette.info.main,
          worse: theme.palette.error.main,
          insufficient: theme.palette.text.disabled,
        },
      }),
    [groups, metric, param, theme],
  );

  const better = direction === 'maximize' ? 'higher' : 'lower';

  return (
    <Stack spacing={1.5}>
      <ResponsiveCardVegaLite
        title={`${metric} by ${param}`}
        details={`Dots are means and bars are 95% confidence intervals; ${better} is better. Overlapping bars usually mean the difference is noise.`}
        spec={spec}
        actions={false}
        isStatic={false}
        showSettings={false}
        // The card sizes the plot itself (it ignores its parent's height), so grow it per row.
        maxHeight={Math.min(420, 90 + groups.length * 44)}
        aspectRatio={4}
      />
      <ResponsiveCardTable
        title={`${param}: values compared with the best`}
        details="p-values come from Welch's t-test against the best value, Holm-adjusted for the number of comparisons. d is Cohen's effect size."
        showSettings={false}
        showFullScreenButton={false}
      >
        <Table size="small" aria-label={`${metric} by ${param}`}>
          <TableHead>
            <TableRow>
              <TableCell>{param}</TableCell>
              <TableCell align="right">Runs</TableCell>
              <TableCell align="right">Mean</TableCell>
              <TableCell align="right">95% CI</TableCell>
              <TableCell align="right">Δ vs best</TableCell>
              <TableCell align="right">p-value</TableCell>
              <TableCell align="right">
                <Tooltip title="Cohen's d: about 0.2 is small, 0.5 medium and 0.8 or more large.">
                  <span>d</span>
                </Tooltip>
              </TableCell>
              <TableCell>Verdict</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(g => (
              <TableRow key={g.value}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{g.value}</Typography>
                </TableCell>
                <TableCell align="right">{g.n}</TableCell>
                <TableCell align="right">{formatStat(g.mean)}</TableCell>
                <TableCell align="right">
                  {g.n > 1 ? `${formatStat(g.ciLow)} – ${formatStat(g.ciHigh)}` : '—'}
                </TableCell>
                <TableCell align="right">{g.verdict === 'best' ? '—' : formatStat(g.deltaVsBest)}</TableCell>
                <TableCell align="right">{formatPValue(g.p)}</TableCell>
                <TableCell align="right">{formatStat(g.d)}</TableCell>
                <TableCell>
                  <VerdictChip verdict={g.verdict} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveCardTable>
    </Stack>
  );
}
