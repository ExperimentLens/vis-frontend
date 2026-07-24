import type { ReactNode } from 'react';
import {
  alpha,
  Box,
  TableCell,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid } from '@mui/x-data-grid';

import { MONO } from '../../../../shared/models/observability/agentic-conventions';

// Mirrors the Overview workflow table's look (borderless, softened row
// dividers, underline-accented column-group bands) so the LLM tables read as
// the same design system instead of a boxed spreadsheet.
export const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  borderRadius: '0 0 12px 12px',
  '--DataGrid-rowBorderColor': theme.palette.divider,
  '--DataGrid-containerBackground': theme.palette.customGrey.main,

  '& .MuiDataGrid-scrollbarFiller': {
    backgroundColor: theme.palette.customGrey.main,
  },

  '& .MuiDataGrid-columnHeaders': {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },

  '& .MuiDataGrid-columnHeader': {
    backgroundColor: theme.palette.customGrey.main,
  },

  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'visible',
  },

  '& .MuiDataGrid-columnSeparator': {
    color: 'transparent',
  },

  '& .MuiDataGrid-cell': {
    fontSize: '0.8rem',
  },

  '& .MuiDataGrid-row:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '& .MuiDataGrid-row.Mui-selected': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),

    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  },

  '& .MuiDataGrid-footerContainer': {
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },

  '& .MuiDataGrid-selectedRowCount': {
    visibility: 'hidden',
  },

  '& .theme-parameters-group': {
    textAlign: 'center',
    justifyContent: 'center',
    position: 'relative',
    display: 'grid',
    width: '100%',
    '&::after': {
      content: '""',
      display: 'block',
      width: '100%',
      height: '2px',
      backgroundColor: theme.palette.customPrimary.main,
      position: 'absolute',
      bottom: 0,
      left: 0,
    },
  },

  '& .theme-parameters-group-2': {
    textAlign: 'center',
    justifyContent: 'center',
    position: 'relative',
    display: 'grid',
    width: '100%',
    '&::after': {
      content: '""',
      display: 'block',
      width: '100%',
      height: '2px',
      backgroundColor: theme.palette.secondary.dark,
      position: 'absolute',
      bottom: 0,
      left: 0,
    },
  },

  '& .datagrid-header-fixed': {
    position: 'sticky',
    right: 0,
    zIndex: 9999,
    backgroundColor: theme.palette.customGrey.main,
    borderLeft: `1px solid ${theme.palette.divider}`,
  },

  '& .MuiDataGrid-cell[data-field="rowAction"]': {
    position: 'sticky',
    right: 0,
    backgroundColor: theme.palette.customGrey.light,
    zIndex: 9999,
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
}));

export const Th = ({
  children,
  align,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) => (
  <TableCell
    align={align}
    sx={{
      fontSize: '0.6rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
      color: 'text.secondary',
      whiteSpace: 'nowrap',
      py: 0.75,
    }}
  >
    {children}
  </TableCell>
);

export const Td = ({
  children,
  align,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) => (
  <TableCell
    align={align}
    sx={{
      fontSize: '0.74rem',
      whiteSpace: 'nowrap',
      py: 0.5,
    }}
  >
    {children}
  </TableCell>
);

export const TruncMono = ({
  children,
  max = 160,
}: {
  children: string;
  max?: number;
}) => (
  <Box
    component="span"
    sx={{
      fontFamily: MONO,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      maxWidth: max,
      display: 'inline-block',
      verticalAlign: 'bottom',
    }}
    title={children}
  >
    {children}
  </Box>
);

export const BigNum = ({
  value,
  sub,
}: {
  value: string;
  sub: string;
}) => (
  <Box sx={{ mb: 1 }}>
    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>
      {value}
    </Typography>

    <Typography variant="caption" color="text.secondary">
      {sub}
    </Typography>
  </Box>
);