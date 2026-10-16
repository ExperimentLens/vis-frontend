import { useState } from 'react';
import { Badge, Box, Button, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SearchableSelectMultiple from '../../../../shared/components/searchable-select-multiple';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import { SectionHeader } from '../../../../shared/components/responsive-card-table';
import { menuPaperSx } from '../../../../shared/styles/card-surface';
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

const FieldLabel = ({ children }: { children: string }) => (
  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>{children}</Typography>
);

/** How many filter dimensions are narrowing the list (search is shown in the toolbar, so it isn't counted). */
export const activeFilterCount = (f: TraceFilters) =>
  [f.variants.length > 0, f.cases.length > 0, f.status !== 'all', Boolean(f.check), Boolean(f.minLatencyMs)].filter(Boolean).length;

/**
 * Toolbar filter icon, like the Sessions table's: the dimensions an experiment varies
 * (outcome, variant, case, which check failed) live in a popover, with a badge counting
 * the ones in use.
 */
export default function TraceFiltersButton({ filters, onChange, options }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const set = (patch: Partial<TraceFilters>) => onChange({ ...filters, ...patch });
  const count = activeFilterCount(filters);

  return (
    <>
      <Tooltip title="Filter traces">
        <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
          <Badge color="primary" badgeContent={count} invisible={count === 0}>
            <FilterListIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 0, sx: [menuPaperSx({ width: 320 }), { maxHeight: 'none' }] } }}
      >
        <SectionHeader icon={<FilterListIcon fontSize="small" />} title="Filters" />
        <Stack spacing={1.5} sx={{ p: 1.5 }}>
          <Box>
            <FieldLabel>Outcome</FieldLabel>
            <SegmentedToggle
              size="small"
              fullWidth
              aria-label="Filter by outcome"
              value={filters.status}
              onChange={value => set({ status: value as StatusFilter })}
              options={STATUS_OPTIONS}
            />
          </Box>
          {options.variants.length > 1 && (
            <SearchableSelectMultiple
              labelId="trace-filter-variant"
              inputLabel="Variant"
              label="Variant"
              value={filters.variants}
              options={options.variants}
              onChange={variants => set({ variants })}
              menuMaxHeight={300}
            />
          )}
          {options.cases.length > 1 && (
            <SearchableSelectMultiple
              labelId="trace-filter-case"
              inputLabel="Case"
              label="Case"
              value={filters.cases}
              options={options.cases}
              onChange={cases => set({ cases })}
              menuMaxHeight={300}
            />
          )}
          {options.checks.length > 0 && (
            <SearchableSelect
              labelId="trace-filter-check"
              inputLabel="Failed check"
              label="Failed check"
              value={filters.check || ANY_CHECK}
              options={[ANY_CHECK, ...options.checks]}
              onChange={check => set({ check: check === ANY_CHECK ? '' : check })}
              menuMaxHeight={300}
            />
          )}
          <Stack direction="row" justifyContent="flex-end">
            <Button size="small" disabled={count === 0} onClick={() => onChange({ ...EMPTY_FILTERS, search: filters.search })}>
              Clear filters
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </>
  );
}
