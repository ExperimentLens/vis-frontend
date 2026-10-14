import { Box } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import { EmptyNote } from '../LLMOverview/chart-kit';
import { StyledDataGrid } from '../LLMOverview/llm-monitoring-shared';

export interface TraceScoreSummary {
  name: string;
  count: number;
  avg: number;
  zeros?: number;
  ones?: number;
}

interface Props {
  scores: TraceScoreSummary[];
  totalScores: number;
  onDownload: () => void;
}

const dash = (value: unknown) => (value === undefined || value === null ? '—' : String(value));

const columns: GridColDef[] = [
  { field: 'name', headerName: 'Score', flex: 1, minWidth: 220 },
  { field: 'count', headerName: '#', width: 90, type: 'number', headerAlign: 'right', align: 'right' },
  {
    field: 'avg',
    headerName: 'Avg',
    width: 110,
    type: 'number',
    headerAlign: 'right',
    align: 'right',
    renderCell: params => <Box component="span">{Number(params.value).toFixed(2)}</Box>,
  },
  { field: 'zeros', headerName: '0', width: 90, type: 'number', headerAlign: 'right', align: 'right', renderCell: params => dash(params.value) },
  { field: 'ones', headerName: '1', width: 90, type: 'number', headerAlign: 'right', align: 'right', renderCell: params => dash(params.value) },
];

/** Every Langfuse score on the experiment's traces, as a raw, downloadable table. */
export default function TraceScoresCard({ scores, totalScores, onDownload }: Props) {
  const rows = scores.map((score, index) => ({ id: `${score.name}-${index}`, ...score }));

  return (
    <ResponsiveCardTable
      title="All trace scores"
      details={`${totalScores.toLocaleString()} scores on the traces`}
      showSettings
      onDownload={onDownload}
      downloadLabel="Download as CSV"
      downloadSecondaryText="Save scores as CSV"
      noPadding
    >
      {rows.length === 0 ? (
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
          rows={rows}
          columns={columns}
          rowHeight={44}
          columnHeaderHeight={44}
          sx={{ width: '100%' }}
        />
      )}
    </ResponsiveCardTable>
  );
}
