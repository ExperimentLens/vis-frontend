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
        elevation: 3,
        sx: {
          width,
          overflow: 'hidden',
          padding: 0,
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.05)',
          mt: 0.75,
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          px: 2,
          py: 1.25,
          background: theme => theme.palette.customSurface.sectionHeader,
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ color: 'primary.main', mr: 1.5, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, color: 'text.primary', letterSpacing: '0.3px' }}
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
              height: 20,
              fontSize: '0.7rem',
              fontWeight: 700,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}
      </Box>

      {/* ── Items list ── */}
      <List
        sx={{
          width: '100%',
          py: 0.75,
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

          return (
            <ListItem key={option} disablePadding sx={{ mb: 0.375 }}>
              <ListItemButton
                dense
                onClick={() => onToggle(option)}
                sx={{
                  px: 1.5,
                  py: 0.625,
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
                <ListItemIcon sx={{ minWidth: 34 }}>
                  {multiSelect ? (
                    isSelected ? (
                      <CheckBoxIcon color="primary" fontSize="small" />
                    ) : (
                      <CheckBoxOutlineBlankIcon fontSize="small" color="action" />
                    )
                  ) : (
                    isSelected ? (
                      <RadioButtonCheckedIcon color="primary" fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon fontSize="small" color="action" />
                    )
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 500 : 400,
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
            px: 1.5,
            py: 0.75,
            display: 'flex',
            justifyContent: 'center',
            borderTop: '1px solid rgba(0, 0, 0, 0.07)',
            background: theme => theme.palette.customSurface.footer,
          }}
        >
          <Button
            onClick={onClear}
            variant="text"
            color="primary"
            size="small"
            startIcon={<ClearAllIcon fontSize="small" />}
            sx={{ fontSize: '0.75rem', fontWeight: 500, borderRadius: 1.5 }}
          >
            {clearLabel}
          </Button>
        </Box>
      )}
    </Popover>
  );
};

export default SelectionPopover;
