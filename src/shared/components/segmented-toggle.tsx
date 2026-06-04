import type { ReactNode } from 'react';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';

export interface SegmentedOption {
  value: string;
  /** Text label. Optional when an icon is supplied. */
  label?: ReactNode;
  /** Leading icon (or icon-only when no label). */
  icon?: ReactNode;
  tooltip?: string;
  disabled?: boolean;
}

interface SegmentedToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: SegmentedOption[];
  /** Visual density. */
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  /** Render labels in uppercase with letter-spacing (for top-level mode/tab selectors). */
  uppercase?: boolean;
  'aria-label'?: string;
}

const StyledGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'dark'
      ? alpha('#ffffff', 0.05)
      : theme.palette.customSurface.tray,
  borderRadius: 999,
  padding: 3,
  gap: 2,
  border: `1px solid ${theme.palette.customSurface.cardBorder}`,
  '& .MuiToggleButton-root': {
    border: 0,
    margin: 0,
    borderRadius: '999px !important',
    textTransform: 'none',
    fontWeight: 600,
    lineHeight: 1.2,
    color: theme.palette.text.secondary,
    transition: theme.transitions.create(
      ['background-color', 'color', 'box-shadow'],
      { duration: 160 },
    ),
    gap: theme.spacing(0.5),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.primary.main,
      boxShadow: theme.customShadows.card,
      '&:hover': { backgroundColor: theme.palette.background.paper },
    },
    '&.Mui-disabled': {
      border: 0,
      color: theme.palette.text.disabled,
    },
  },
}));

/**
 * Modern segmented control (iOS-style): a rounded track where the active
 * segment lifts onto a raised "pill". Replaces the ad-hoc icon `ButtonGroup`s
 * and bare `Switch`es scattered across the control views, so every binary /
 * small multi-choice control reads the same.
 */
const SegmentedToggle = ({
  value,
  onChange,
  options,
  size = 'small',
  fullWidth = false,
  uppercase = false,
  'aria-label': ariaLabel,
}: SegmentedToggleProps) => {
  const pad = size === 'small' ? '3px 10px' : '5px 14px';
  const fontSize = size === 'small' ? '0.78rem' : '0.85rem';

  return (
    <StyledGroup
      exclusive
      value={value}
      size={size}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
      onChange={(_, next: string | null) => {
        if (next !== null) onChange(next);
      }}
    >
      {options.map((opt) => {
        const button = (
          <ToggleButton
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            sx={{
              padding: pad,
              fontSize,
              gap: 0.5,
              ...(uppercase && { textTransform: 'uppercase' }),
            }}
          >
            {opt.icon}
            {opt.label}
          </ToggleButton>
        );

        // Wrap in a span so the tooltip still fires when the button is
        // disabled (a disabled element swallows pointer events otherwise).
        return opt.tooltip ? (
          <Tooltip key={opt.value} title={opt.tooltip} arrow>
            <span style={{ display: 'inline-flex' }}>{button}</span>
          </Tooltip>
        ) : (
          button
        );
      })}
    </StyledGroup>
  );
};

export default SegmentedToggle;
