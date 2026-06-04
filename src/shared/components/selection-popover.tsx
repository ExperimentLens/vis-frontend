import type React from 'react';
import { Popover, type PopoverOrigin } from '@mui/material';
import SelectionList from './selection-list';

export interface SelectionPopoverProps {
  open: boolean
  anchorEl: HTMLElement | null
  onClose: () => void
  title: string
  /** @deprecated No longer rendered — the header is icon-free for a cleaner look. */
  icon?: React.ReactNode
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
  /** When true, renders a search field above the list that filters options by substring. */
  searchable?: boolean
  searchPlaceholder?: string
}

/**
 * Shared popover for selecting one or more options from a list. The list body
 * lives in SelectionList, which can also be embedded inline (e.g. inside a
 * card's settings menu) where a popover surface already exists — so use that
 * directly rather than nesting this popover inside another one.
 */
const SelectionPopover = ({
  open,
  anchorEl,
  onClose,
  title,
  options,
  selectedOptions,
  onToggle,
  onClear,
  clearLabel = 'Clear Selection',
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  transformOrigin,
  width = 220,
  maxListHeight = 240,
  getOptionLabel,
  id,
  isOptionDisabled,
  searchable = false,
  searchPlaceholder = 'Search…',
}: SelectionPopoverProps) => {
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
          boxShadow: theme => theme.customShadows.popover,
          border: theme => `1px solid ${theme.palette.customSurface.cardBorder}`,
          mt: 0.5,
        },
      }}
    >
      <SelectionList
        title={title}
        options={options}
        selectedOptions={selectedOptions}
        onToggle={onToggle}
        onClear={onClear}
        clearLabel={clearLabel}
        getOptionLabel={getOptionLabel}
        isOptionDisabled={isOptionDisabled}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        maxListHeight={maxListHeight}
      />
    </Popover>
  );
};

export default SelectionPopover;
