import { Chip, Tooltip } from '@mui/material';
import type { ParamImpact, Verdict } from '../../../../shared/utils/run-statistics';
import { SIGNIFICANCE_LEVEL } from '../../../../shared/utils/run-statistics';

type ChipColor = 'success' | 'info' | 'error' | 'default' | 'warning';

const VERDICTS: Record<Verdict, { label: string; color: ChipColor; help: string }> = {
  best: { label: 'Best', color: 'success', help: 'Highest mean for this metric.' },
  tie: {
    label: 'No significant difference',
    color: 'info',
    help: 'Within run-to-run noise of the best value; more runs might separate them.',
  },
  worse: { label: 'Significantly worse', color: 'error', help: `Worse than the best value (p < ${SIGNIFICANCE_LEVEL}).` },
  insufficient: {
    label: 'Needs more runs',
    color: 'default',
    help: 'At least two runs per value are needed to tell a real difference from noise.',
  },
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const { label, color, help } = VERDICTS[verdict];

  return (
    <Tooltip title={help}>
      <Chip size="small" variant="outlined" color={color} label={label} />
    </Tooltip>
  );
}

export function ImpactChip({ impact }: { impact: ParamImpact }) {
  let chip: { label: string; color: ChipColor; help: string };

  if (impact.etaSquared === 0) {
    chip = { label: 'No effect', color: 'default', help: 'Every value of this param gave the same result.' };
  } else if (impact.p === null) {
    chip = {
      label: 'Needs repeats',
      color: 'warning',
      help: 'Each value ran once, so its effect cannot be separated from noise. Repeat runs to test it.',
    };
  } else if (impact.p < SIGNIFICANCE_LEVEL) {
    chip = { label: 'Significant', color: 'success', help: `Changing this param changes the metric (p < ${SIGNIFICANCE_LEVEL}).` };
  } else {
    chip = { label: 'Not significant', color: 'info', help: 'Differences between values are within run-to-run noise.' };
  }

  return (
    <Tooltip title={chip.help}>
      <Chip size="small" variant="outlined" color={chip.color} label={chip.label} />
    </Tooltip>
  );
}
