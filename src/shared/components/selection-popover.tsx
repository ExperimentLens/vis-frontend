import type React from 'react';
import {
  alpha,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  type PopoverOrigin,
  Typography,
} from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ClearAllIcon from '@mui/icons-material/ClearAll';

export interface SelectionPopoverProps {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  title: string
  icon: React.ReactNode
  options: string[]
  selectedOptions: string[]
  onToggle: (option: string) => void
  onClear?: () => void
  clearLabel?: string
  /**
   * When true (default), clicking an option toggles it in/out of the selection (checkboxes).
   * When false, only one option can be active at a time (radio buttons).
   */
  multiSelect?: boolean
  anchorOrigin?: PopoverOrigin
  transformOrigin?: PopoverOrigin
  width?: number
  maxListHeight?: number
  /** Map an option value to a display label. Defaults to the option value itself. */
  getOptionLabel?: (option: string) => string
  id?: string
  isOptionDisabled?: (option: string) => boolean
}

/**
 * Shared popover component for selecting one or more options from a list.
 * Replaces the repeated Popover + SectionHeader + List + clear-footer pattern
 * found across toolbar-workflow-table, comparative-analysis-controls,
 * and parallel-coordinate-plot.
 */
const SelectionPopover = ({
  open,
  anchorEl,
  onClose,
  title,
  icon,
  options,
  selectedOptions,
  onToggle,
  onClear,
  clearLabel = 'Clear Selection',
  multiSelect = true,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  transformOrigin,
  width = 280,
  maxListHeight = 220,
  getOptionLabel,
  id,
  isOptionDisabled,
}: SelectionPopoverProps) => {
  const selectedCount = selectedOptions.length;

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      PaperProps={{
        elevation: 0,
        sx: {
          width,
          overflow: 'hidden',
          padding: 0,
          borderRadius: 2,
          boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
          border: theme => `1px solid ${theme.palette.customGrey.main}`,
          mt: 0.5,
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          px: 1.5,
          py: 0.75,
          background: theme => theme.palette.customSurface.sectionHeader,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ color: 'text.secondary', mr: 1, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: 'text.primary' }}
          >
            {title}
          </Typography>
        </Box>

        {selectedCount > 0 && (
          <Chip
            label={selectedCount}
            size="small"
            color="primary"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              fontWeight: 700,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}
      </Box>

      {/* ── Items list ── */}
      <List
        sx={{
          width: '100%',
          py: 0.5,
          maxHeight: maxListHeight,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: theme => alpha(theme.palette.primary.main, 0.25),
            borderRadius: 2,
          },
        }}
      >
        {options.map(option => {
          const isSelected = selectedOptions.includes(option);
          const label = getOptionLabel ? getOptionLabel(option) : option;
          const disabled = isOptionDisabled?.(option) ?? false;

          return (
            <ListItem key={option} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                dense
                onClick={() => !disabled && onToggle(option)}
                disabled={disabled}
                sx={{
                  px: 1,
                  py: 0.5,
                  mx: 0.5,
                  borderRadius: 1.5,
                  transition: 'background-color 0.15s ease',
                  bgcolor: isSelected
                    ? theme => alpha(theme.palette.primary.main, 0.08)
                    : 'transparent',
                  '&:hover': {
                    bgcolor: isSelected
                      ? theme => alpha(theme.palette.primary.main, 0.13)
                      : theme => alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {multiSelect ? (
                    isSelected ? (
                      <CheckBoxIcon color="primary" sx={{ fontSize: 16 }} />
                    ) : (
                      <CheckBoxOutlineBlankIcon color="action" sx={{ fontSize: 16 }} />
                    )
                  ) : (
                    isSelected ? (
                      <RadioButtonCheckedIcon color="primary" sx={{ fontSize: 16 }} />
                    ) : (
                      <RadioButtonUncheckedIcon color="action" sx={{ fontSize: 16 }} />
                    )
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'text.primary' : 'text.secondary',
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* ── Footer: only shown when onClear is provided AND items are selected ── */}
      {onClear && selectedCount > 0 && (
        <Box
          sx={{
            px: 1,
            py: 0.5,
            display: 'flex',
            justifyContent: 'center',
            borderTop: theme => `1px solid ${theme.palette.divider}`,
            background: theme => theme.palette.customSurface.footer,
          }}
        >
          <Button
            onClick={onClear}
            variant="text"
            color="primary"
            size="small"
            startIcon={<ClearAllIcon sx={{ fontSize: 14 }} />}
            sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'none', borderRadius: 1.5 }}
          >
            {clearLabel}
          </Button>
        </Box>
      )}
    </Popover>
  );
};

export default SelectionPopover;
