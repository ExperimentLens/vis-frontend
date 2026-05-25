import type { ReactNode } from 'react';
import { Box, Tooltip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

type PillTone = 'primary' | 'error' | 'success' | 'warning' | 'info';

interface PillToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  icon?: ReactNode;
  /** Accent color used when active. */
  tone?: PillTone;
  disabled?: boolean;
  tooltip?: string;
}

/**
 * Compact pill toggle for inline boolean filters/options — neutral when off,
 * accent-tinted (filled) when on. The house style for one-off switches that
 * would otherwise be a bare `<Checkbox>` or a gear menu hiding a single option.
 */
const PillToggle = ({
  checked,
  onChange,
  label,
  icon,
  tone = 'primary',
  disabled = false,
  tooltip,
}: PillToggleProps) => {
  const theme = useTheme();
  const color = theme.palette[tone].main;

  const control = (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        height: 30,
        px: 1.1,
        borderRadius: '999px',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.45 : 1,
        color: checked ? color : theme.palette.text.secondary,
        bgcolor: checked ? alpha(color, 0.12) : 'transparent',
        border: `1px solid ${checked ? alpha(color, 0.5) : theme.palette.divider}`,
        transition: theme.transitions.create(
          ['background-color', 'border-color', 'color', 'box-shadow'],
          { duration: 160 },
        ),
        '&:hover': disabled
          ? {}
          : {
              bgcolor: checked ? alpha(color, 0.18) : theme.palette.action.hover,
              borderColor: checked ? color : alpha(theme.palette.text.primary, 0.28),
            },
      }}
    >
      {icon && (
        <Box component="span" sx={{ display: 'inline-flex', color: checked ? color : 'inherit' }}>
          {icon}
        </Box>
      )}
      {label}
    </Box>
  );

  if (!tooltip) return control;

  return (
    <Tooltip title={tooltip} arrow>
      <span style={{ display: 'inline-flex' }}>{control}</span>
    </Tooltip>
  );
};

export default PillToggle;
