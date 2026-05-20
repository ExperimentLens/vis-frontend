import { useMemo, useState } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ListSubheader,
  TextField,
  Box,
  OutlinedInput,
  Checkbox,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

interface SearchableMultiSelectProps {
  labelId: string;
  inputLabel: React.ReactNode;
  label: string;
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
  menuMaxHeight?: number;
  menuWidth?: number;
  isOptionDisabled?: (option: string, selected: string[]) => boolean;
  disabled?: boolean;
  getOptionLabel?: (option: string) => string;
  renderValue?: (selected: string[]) => React.ReactNode;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  labelId,
  inputLabel,
  label,
  value,
  options,
  onChange,
  menuMaxHeight = 224,
  menuWidth = 250,
  isOptionDisabled,
  disabled = false,
  getOptionLabel,
  renderValue,
}) => {
  const [search, setSearch] = useState('');

  const optionToLabel = (option: string) => (getOptionLabel ? getOptionLabel(option) : option);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return options;

    return options.filter(option => optionToLabel(option).toLowerCase()
      .includes(q));
  }, [options, search, getOptionLabel]);

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const newValue = event.target.value as string[];

    onChange(newValue);
  };

  const defaultRenderValue = (selected: string[]) =>
    selected.map(optionToLabel).join(', ');

  return (
    <FormControl fullWidth size="small">
      <InputLabel id={labelId} sx={{ fontSize: '0.8rem' }}>{inputLabel}</InputLabel>
      <Select
        labelId={labelId}
        multiple
        value={value}
        disabled={disabled}
        onChange={handleChange}
        size="small"
        sx={{
          fontSize: '0.8rem',
          '& .MuiSelect-select': { py: 0.75 },
        }}
        input={<OutlinedInput label={label} sx={{ fontSize: '0.8rem' }} />}
        renderValue={renderValue ?? ((selected) => defaultRenderValue(selected as string[]))}
        MenuProps={{
          PaperProps: {
            style: { maxHeight: menuMaxHeight, width: menuWidth },
            sx: {
              borderRadius: 2,
              border: theme => `1px solid ${theme.palette.customGrey.main}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
              '& .MuiMenuItem-root': {
                fontSize: '0.8rem',
                py: 0.25,
                minHeight: 0,
              },
              '& .MuiMenuItem-root:hover': {
                backgroundColor: 'action.selected',
              },
            },
          },
          MenuListProps: {
            autoFocusItem: false,
            dense: true,
          },
        }}
        onClose={() => setSearch('')}
      >
        <ListSubheader sx={{ p: 0.75 }}>
          <TextField
            size="small"
            autoFocus
            placeholder="Search…"
            fullWidth
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation();
            }}
            sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
                  <SearchIcon sx={{ opacity: 0.6, fontSize: 16 }} />
                </Box>
              ),
              endAdornment: search ? (
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearch('');
                  }}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.6,
                    '&:hover': { opacity: 1 },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </Box>
              ) : null,
            }}
          />
        </ListSubheader>

        {filteredOptions.map(option => {
          const checked = value.includes(option);
          const disabled = isOptionDisabled
            ? isOptionDisabled(option, value)
            : false;

          return (
            <MenuItem key={option} value={option} disabled={disabled} dense>
              <Checkbox checked={checked} size="small" sx={{ p: 0.5 }} />
              {optionToLabel(option)}
            </MenuItem>
          );
        })}
        {filteredOptions.length === 0 && (
          <MenuItem disabled dense sx={{ opacity: 0.6, fontStyle: 'italic' }}>
            No results found
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
};

export default SearchableMultiSelect;
