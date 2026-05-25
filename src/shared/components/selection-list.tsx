import { useMemo, useState } from 'react';
import {
  alpha,
  Box,
  Button,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

export interface SelectionListProps {
  /** Optional header band shown above the list. Omit to render just the list. */
  title?: string
  options: string[]
  selectedOptions: string[]
  onToggle: (option: string) => void
  onClear?: () => void
  clearLabel?: string
  /** Map an option value to a display label. Defaults to the option value itself. */
  getOptionLabel?: (option: string) => string
  isOptionDisabled?: (option: string) => boolean
  /** When true, renders a search field above the list that filters options by substring. */
  searchable?: boolean
  searchPlaceholder?: string
  maxListHeight?: number
}

/**
 * The selectable option list shared by SelectionPopover and by inline control
 * panels (e.g. a card's settings menu). Renders an optional header, an optional
 * search field, a toggleable list and an optional clear footer — WITHOUT any
 * popover/menu wrapper, so it can be embedded wherever a surface already exists.
 */
const SelectionList = ({
  title,
  options,
  selectedOptions,
  onToggle,
  onClear,
  clearLabel = 'Clear Selection',
  getOptionLabel,
  isOptionDisabled,
  searchable = false,
  searchPlaceholder = 'Search…',
  maxListHeight = 240,
}: SelectionListProps) => {
  const selectedCount = selectedOptions.length;
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase();

    return options.filter(opt => {
      const label = getOptionLabel ? getOptionLabel(opt) : opt;

      return label.toLowerCase().includes(q);
    });
  }, [options, search, searchable, getOptionLabel]);

  return (
    <>
      {/* ── Header ── */}
      {title && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            borderBottom: theme => `1px solid ${theme.palette.divider}`,
            px: 1.5,
            py: 1,
            background: theme => theme.palette.customSurface.sectionHeader,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>

          {selectedCount > 0 && (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, flexShrink: 0 }}
            >
              {selectedCount} selected
            </Typography>
          )}
        </Box>
      )}

      {/* ── Optional search ── */}
      {searchable && (
        <Box sx={{ px: 1, pt: 0.75, pb: 0.5 }}>
          <TextField
            autoFocus
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            onKeyDown={(e) => e.stopPropagation()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ ml: 0.25, mr: 0 }}>
                  <SearchIcon sx={{ fontSize: 16, opacity: 0.6 }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <Box
                    onClick={() => setSearch('')}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      opacity: 0.6,
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </Box>
                </InputAdornment>
              ) : null,
              sx: { py: 0 },
            }}
            sx={{ '& .MuiInputBase-input': { py: 0.5 } }}
          />
        </Box>
      )}

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
        {searchable && filteredOptions.length === 0 && (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              No results
            </Typography>
          </Box>
        )}
        {filteredOptions.map(option => {
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 0.6,
                  mx: 0.5,
                  borderRadius: 1.5,
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  bgcolor: isSelected
                    ? theme => alpha(theme.palette.primary.main, 0.1)
                    : 'transparent',
                  '&:hover': {
                    bgcolor: isSelected
                      ? theme => alpha(theme.palette.primary.main, 0.16)
                      : theme => theme.palette.action.hover,
                  },
                }}
              >
                <Tooltip title={label} placement="right" enterDelay={500}>
                  <ListItemText
                    primary={label}
                    sx={{ my: 0 }}
                    slotProps={{
                      primary: {
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? 'primary.main' : 'text.secondary',
                        noWrap: true,
                      },
                    }}
                  />
                </Tooltip>
                {isSelected && (
                  <CheckRoundedIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
                )}
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
    </>
  );
};

export default SelectionList;
