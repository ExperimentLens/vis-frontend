import {
  Box,
  Grid,
  Table,
  TableBody,
  TableHead,
  TableRow,
} from '@mui/material';

import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import { MONO } from '../../../../shared/models/observability/agentic-conventions';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

import { EmptyNote } from './chart-kit';
import VerdictPassRateChart from './verdict-passrate-chart';
import { Td, Th, TruncMono } from './llm-monitoring-shared';

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

export default function LlmMonitoringQualityTab({
  details,
  scores,
  totalScores,
  onDownloadScoresCsv,
}: QualityTabProps) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left' }}>
        <VerdictPassRateChart details={details} />
      </Grid>

      <Grid size={{ xs: 12 }} sx={{ textAlign: 'left', mb: 1.5 }}>
        <ResponsiveCardTable
          title="All scores"
          details={`${totalScores.toLocaleString()} total scores tracked`}
          showSettings={true}
          onDownload={onDownloadScoresCsv}
          downloadLabel="Download as CSV"
          downloadSecondaryText="Save scores as CSV"
        >
          {scores.length === 0 ? (
            <EmptyNote>No scores.</EmptyNote>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <Th>Name</Th>
                  <Th align="right">#</Th>
                  <Th align="right">Avg</Th>
                  <Th align="right">0</Th>
                  <Th align="right">1</Th>
                </TableRow>
              </TableHead>

              <TableBody>
                {scores.map(s => (
                  <TableRow key={s.name}>
                    <Td>
                      <TruncMono max={220}>{s.name}</TruncMono>
                    </Td>

                    <Td align="right">{s.count}</Td>

                    <Td align="right">
                      <Box component="span" sx={{ fontFamily: MONO }}>
                        {s.avg.toFixed(2)}
                      </Box>
                    </Td>

                    <Td align="right">{s.zeros || '—'}</Td>
                    <Td align="right">{s.ones || '—'}</Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ResponsiveCardTable>
      </Grid>
    </Grid>
  );
}