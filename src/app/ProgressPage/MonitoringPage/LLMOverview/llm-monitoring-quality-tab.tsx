import { Box, Grid, styled } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

import { EmptyNote } from './chart-kit';
import VerdictPassRateChart from './verdict-passrate-chart';

type QualityTabProps = {
  details: TraceDetail[];
  scores: Array<{
    name: string;
    count: number;
    avg: number;
    zeros?: number;
    ones?: number;
  }>;
  totalScores: number;
  onDownloadScoresCsv: () => void;
};

type ScoreRow = {
  id: string;
  name: string;
  count: number;
  avg: number;
  zeros?: number;
  ones?: number;
};

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  '&.MuiDataGrid-root': {
    border: 'none',
    borderRadius: '0 0 12px 12px',
  },

  '& .MuiDataGrid-columnHeaders': {
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },

  '& .MuiDataGrid-columnHeader': {
    backgroundColor: theme.palette.customGrey.main,
    borderRight: `1px solid ${theme.palette.divider}`,
  },

  '& .MuiDataGrid-scrollbarFiller': {
    backgroundColor: theme.palette.customGrey.main,
  },

  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'visible',
  },

  '& .MuiDataGrid-cell': {
    borderRight: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },

  '& .MuiDataGrid-row:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
    outline: 'none',
  },

  '& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within':
    {
      outline: 'none',
    },

  '& .MuiDataGrid-selectedRowCount': {
    visibility: 'hidden',
  },
}));

const scoreColumns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 1,
    minWidth: 220,
    headerAlign: 'left',
    align: 'left',
    sortable: true,
    resizable: false,
    renderCell: params => (
      String(params.value ?? '')
    ),
  },
  {
    field: 'count',
    headerName: '#',
    width: 100,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    resizable: false,
  },
  {
    field: 'avg',
    headerName: 'Avg',
    width: 120,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    resizable: false,
    renderCell: params => (
      <Box component="span">
        {Number(params.value).toFixed(2)}
      </Box>
    ),
  },
  {
    field: 'zeros',
    headerName: '0',
    width: 100,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    resizable: false,
    renderCell: params =>
      params.value === undefined || params.value === null
        ? '—'
        : params.value,
  },
  {
    field: 'ones',
    headerName: '1',
    width: 100,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    resizable: false,
    renderCell: params =>
      params.value === undefined || params.value === null
        ? '—'
        : params.value,
  },
];

export default function LlmMonitoringQualityTab({
  details,
  scores,
  totalScores,
  onDownloadScoresCsv,
}: QualityTabProps) {
  const scoreRows: ScoreRow[] = scores.map((score, index) => ({
    id: `${score.name}-${index}`,
    name: score.name,
    count: score.count,
    avg: score.avg,
    zeros: score.zeros,
    ones: score.ones,
  }));

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
        <VerdictPassRateChart details={details} />
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', mb: 1.5 }}>
        <ResponsiveCardTable
          title="All scores"
          details={`${totalScores.toLocaleString()} total scores tracked`}
          showSettings
          onDownload={onDownloadScoresCsv}
          downloadLabel="Download as CSV"
          downloadSecondaryText="Save scores as CSV"
          noPadding
        >
          {scoreRows.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyNote>No scores.</EmptyNote>
            </Box>
          ) : (
            <StyledDataGrid
              autoHeight
              hideFooter
              disableColumnMenu
              disableColumnResize
              disableRowSelectionOnClick
              rows={scoreRows}
              columns={scoreColumns}
              rowHeight={44}
              columnHeaderHeight={44}
              sx={{ width: '100%' }}
            />
          )}
        </ResponsiveCardTable>
      </Grid>
    </Grid>
  );
}