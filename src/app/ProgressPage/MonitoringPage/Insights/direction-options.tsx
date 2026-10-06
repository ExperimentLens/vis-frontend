import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import type { SegmentedOption } from '../../../../shared/components/segmented-toggle';

export const DIRECTION_OPTIONS: SegmentedOption[] = [
  {
    value: 'maximize',
    label: 'Higher is better',
    icon: <ArrowUpwardRoundedIcon fontSize="small" />,
  },
  {
    value: 'minimize',
    label: 'Lower is better',
    icon: <ArrowDownwardRoundedIcon fontSize="small" />,
  },
];
