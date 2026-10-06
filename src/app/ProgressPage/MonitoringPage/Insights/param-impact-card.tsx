import {
  Box,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import { formatPValue } from '../../../../shared/utils/run-statistics';
import type { ParamImpact } from '../../../../shared/utils/run-statistics';
import { ImpactChip } from './insight-chips';

interface ParamImpactCardProps {
  metric: string;
  impacts: ParamImpact[];
  /** Params that always changed together with the listed one. */
  aliases: Record<string, string[]>;
  selectedParam: string;
  onSelectParam: (param: string) => void;
}

/** Ranks params by the share of the metric's variance each one explains (one-way ANOVA). */
export default function ParamImpactCard({
  metric,
  impacts,
  aliases,
  selectedParam,
  onSelectParam,
}: ParamImpactCardProps) {
  return (
    <ResponsiveCardTable
      title={`What drives ${metric}?`}
      details="Share of the metric's variation explained by each param (η², one-way ANOVA). Click a param to compare its values."
      showSettings={false}
      showFullScreenButton={false}
    >
      <Table size="small" aria-label={`Params ranked by their effect on ${metric}`}>
        <TableHead>
          <TableRow>
            <TableCell>Param</TableCell>
            <TableCell align="right">Values</TableCell>
            <TableCell sx={{ minWidth: 160 }}>Variance explained</TableCell>
            <TableCell align="right">p-value</TableCell>
            <TableCell>Effect</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {impacts.map(impact => (
            <TableRow
              key={impact.param}
              hover
              selected={impact.param === selectedParam}
              onClick={() => onSelectParam(impact.param)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{impact.param}</Typography>
                {aliases[impact.param] && (
                  <Typography variant="caption" color="text.secondary">
                    changes together with {aliases[impact.param].join(', ')}
                  </Typography>
                )}
              </TableCell>
              <TableCell align="right">{impact.levels}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={impact.etaSquared * 100}
                    sx={{ flex: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'right' }}>
                    {Math.round(impact.etaSquared * 100)}%
                  </Typography>
                </Box>
              </TableCell>
              <TableCell align="right">{formatPValue(impact.p)}</TableCell>
              <TableCell>
                <ImpactChip impact={impact} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ResponsiveCardTable>
  );
}
