import * as React from 'react';
import { useContext } from 'react';
import type { GridToolbarProps } from '@mui/x-data-grid';
import {
  Badge,
  Box,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

export type ExperimentsToolbarCtxValue = {
  tableName: string;
  filtersCount: number;
  loading: boolean;

  onOpenFilters: (anchor: HTMLElement) => void;
  onRefresh: () => void;
};

const ExperimentsToolbarContext = React.createContext<ExperimentsToolbarCtxValue | null>(null);

export const useExperimentsToolbar = () => {
  const ctx = useContext(ExperimentsToolbarContext);
  if (!ctx) throw new Error('ExperimentsToolbarContext missing Provider');
  return ctx;
};

export const ExperimentsToolbarProvider = ExperimentsToolbarContext.Provider;

// DataGrid expects toolbar component to accept GridToolbarProps.
// We ignore those props and read everything from context.
const ExperimentsTableToolbar: React.FC<GridToolbarProps> = () => {
  const { tableName, filtersCount, loading, onOpenFilters, onRefresh } =
    useExperimentsToolbar();

  return (
    <Toolbar
      sx={{
        minHeight: 48,
        height: 48,
        '@media (min-width:600px)': { minHeight: 48, height: 48 },
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(filtersCount > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.dark, theme.palette.action.activatedOpacity),
        }),
      }}
    >
      <Typography sx={{ flex: '1 1 auto', fontWeight: 600 }} variant="subtitle1">
        {tableName}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, ml: 'auto' }}>
        <Tooltip title="Filters">
          <IconButton onClick={(e) => onOpenFilters(e.currentTarget)}>
            <Badge color="primary" badgeContent={filtersCount} invisible={filtersCount === 0}>
              <FilterListIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="Refresh">
          <span>
            <IconButton onClick={onRefresh} disabled={loading}>
              <RefreshRoundedIcon
                sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Toolbar>
  );
};

export default ExperimentsTableToolbar;
