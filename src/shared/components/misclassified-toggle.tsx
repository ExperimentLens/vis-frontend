import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import PillToggle from './pill-toggle';

interface MisclassifiedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  tooltip?: string;
}

/**
 * The recurring "show misclassified instances" filter, as an error-tinted
 * {@link PillToggle}. Reads as "errors only" at a glance and sits cleanly beside
 * the chart-type SegmentedToggles it lives next to.
 */
const MisclassifiedToggle = ({
  checked,
  onChange,
  disabled = false,
  label = 'Misclassified only',
  tooltip = 'Show only misclassified instances',
}: MisclassifiedToggleProps) => (
  <PillToggle
    checked={checked}
    onChange={onChange}
    disabled={disabled}
    label={label}
    tooltip={tooltip}
    tone="error"
    icon={<ReportProblemRoundedIcon sx={{ fontSize: 16 }} />}
  />
);

export default MisclassifiedToggle;
