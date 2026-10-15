import { Box, Button, InputAdornment, Stack, TextField } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableSelectMultiple from '../../../../shared/components/searchable-select-multiple';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { EMPTY_FILTERS } from '../../../../shared/utils/trace-explorer';
import type { StatusFilter, TraceFilters } from '../../../../shared/utils/trace-explorer';

interface Props {
  filters: TraceFilters;
  onChange: (filters: TraceFilters) => void;
  options: { variants: string[]; cases: string[]; checks: string[] };
}

const ANY_CHECK = 'Any check';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'failing', label: 'Failing' },
  { value: 'error', label: 'Errors' },
  { value: 'pass', label: 'Passing' },
];

/** Search plus the dimensions an experiment varies: variant, case, outcome and which check failed. */
export default function TraceFilterBar({ filters, onChange, options }: Props) {
  const set = (patch: Partial<TraceFilters>) => onChange({ ...filters, ...patch });
  const active = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      <TextField
        id="trace-search"
        size="small"
        placeholder="Search questions and answers"
        value={filters.search}
        onChange={e => set({ search: e.target.value })}
        sx={{ width: 260 }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }}
      />
      {options.variants.length > 1 && (
        <Box sx={{ width: 200 }}>
          <SearchableSelectMultiple
            labelId="trace-filter-variant"
            inputLabel="Variant"
            label="Variant"
            value={filters.variants}
            options={options.variants}
            onChange={variants => set({ variants })}
            menuMaxHeight={300}
          />
        </Box>
      )}
      {options.cases.length > 1 && (
        <Box sx={{ width: 170 }}>
          <SearchableSelectMultiple
            labelId="trace-filter-case"
            inputLabel="Case"
            label="Case"
            value={filters.cases}
            options={options.cases}
            onChange={cases => set({ cases })}
            menuMaxHeight={300}
          />
        </Box>
      )}
      <SegmentedToggle
        size="small"
        aria-label="Filter by outcome"
        value={filters.status}
        onChange={value => set({ status: value as StatusFilter })}
        options={STATUS_OPTIONS}
      />
      {options.checks.length > 0 && (
        <Box sx={{ width: 190 }}>
          <SearchableSelect
            labelId="trace-filter-check"
            inputLabel="Failed check"
            label="Failed check"
            value={filters.check || ANY_CHECK}
            options={[ANY_CHECK, ...options.checks]}
            onChange={check => set({ check: check === ANY_CHECK ? '' : check })}
            menuMaxHeight={300}
          />
        </Box>
      )}
      {active && <Button size="small" onClick={() => onChange(EMPTY_FILTERS)}>Clear filters</Button>}
    </Stack>
  );
}
