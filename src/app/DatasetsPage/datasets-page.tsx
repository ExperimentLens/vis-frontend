import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import { useNavigate, useParams } from 'react-router-dom';

import { api, apiErrorMessage } from '../api/api';
import { createDataset, getDataset, listDatasets, updateDatasetItem } from '../api/datasets';
import type { Dataset, DatasetDetail, DatasetItem } from '../../shared/models/observability/dataset';
import { caseIdOf } from '../../shared/models/observability/dataset';
import { MONO } from '../../shared/models/observability/agentic-conventions';
import { CopyButton } from '../Tasks/Observability/trace-ui';
import DatasetItemDialog from '../Tasks/Observability/dataset-item-dialog';
import StatTile from '../../shared/components/stat-tile';
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined';
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded';
import UpdateRoundedIcon from '@mui/icons-material/UpdateRounded';
import ResponsiveCardTable from '../../shared/components/responsive-card-table';
import type { GridColDef } from '@mui/x-data-grid';
import { StyledDataGrid, TruncMono } from '../ProgressPage/MonitoringPage/LLMOverview/llm-monitoring-shared';
import { EmptyNote } from '../ProgressPage/MonitoringPage/LLMOverview/chart-kit';

const preview = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  const obj = value as Record<string, unknown>;
  // The SDK's case dicts usually carry one "question"-like field worth showing on its own.
  const text = obj.question ?? obj.input ?? obj.prompt;

  return typeof text === 'string' ? text : JSON.stringify(value);
};

/** The app's standard card, without the chart-only gear / fullscreen / download buttons. */
const Section = ({ title, details, headerActions, onHeaderClick, headerSelected, children }: {
  title: string;
  details?: string | null;
  headerActions?: React.ReactNode;
  onHeaderClick?: () => void;
  headerSelected?: boolean;
  children: React.ReactNode;
}) => (
  <ResponsiveCardTable
    title={title}
    details={details}
    headerActions={headerActions}
    onHeaderClick={onHeaderClick}
    headerSelected={headerSelected}
    showSettings={false}
    showFullScreenButton={false}
    showDownloadButton={false}
    noPadding
  >
    {children}
  </ResponsiveCardTable>
);

const formatDate =(iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const Clamp = ({ children, mono = false }: { children: string; mono?: boolean }) => (
  <Tooltip title={<Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontSize: '0.72rem' }}>{children}</Box>}>
    <Typography
      variant="body2"
      sx={{
        fontFamily: mono ? MONO : undefined,
        fontSize: mono ? '0.75rem' : undefined,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}
    >
      {children}
    </Typography>
  </Tooltip>
);

const numericCell = { fontVariantNumeric: 'tabular-nums' } as const;

const DATASET_COLUMNS: GridColDef<Dataset>[] = [
  {
    field: 'name',
    headerName: 'Name',
    flex: 0.8,
    minWidth: 160,
    renderCell: ({ value }) => <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{value}</Typography>,
  },
  {
    field: 'description',
    headerName: 'Description',
    flex: 1,
    minWidth: 200,
    sortable: false,
    renderCell: ({ value }) => (value
      ? <Clamp>{value}</Clamp>
      : <Typography variant="caption" color="text.secondary">—</Typography>),
  },
  {
    field: 'itemCount',
    headerName: 'Cases',
    type: 'number',
    width: 90,
    valueGetter: (value: number | null | undefined) => value ?? 0,
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 180,
    renderCell: ({ value }) => <Typography variant="body2" color="text.secondary" sx={numericCell}>{formatDate(value)}</Typography>,
  },
  {
    field: 'updatedAt',
    headerName: 'Updated',
    width: 180,
    renderCell: ({ value }) => <Typography variant="body2" color="text.secondary" sx={numericCell}>{formatDate(value)}</Typography>,
  },
];

const RUN_COLUMNS: GridColDef<DatasetDetail['runs'][number]>[] = [
  { field: 'name', headerName: 'Run', flex: 1, minWidth: 200 },
  {
    field: 'createdAt',
    headerName: 'Started',
    width: 200,
    renderCell: ({ value }) => <Typography variant="body2" sx={numericCell}>{formatDate(value)}</Typography>,
  },
];

function NewDatasetDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (d: Dataset) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError(null);
    }
  }, [open]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onCreated(await createDataset(name.trim(), description.trim() || undefined));
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not create the dataset.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>New dataset</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            id="new-dataset-name"
            autoFocus
            size="small"
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            helperText="Used from code too: run_experiment(..., dataset=&quot;name&quot;)"
          />
          <TextField
            id="new-dataset-description"
            size="small"
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!name.trim() || saving}>
          {saving ? <CircularProgress size={16} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DatasetView({ name, onChanged }: { name: string; onChanged: () => void }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DatasetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<{ kind: 'new' } | { kind: 'edit'; item: DatasetItem } | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [openingTrace, setOpeningTrace] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getDataset(name)
      .then(setDetail)
      .catch(e => setError(apiErrorMessage(e, `Could not load “${name}”.`)));
  }, [name]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  const active = useMemo(() => detail?.items.filter(i => i.status !== 'ARCHIVED') ?? [], [detail]);
  const archivedCount = (detail?.items.length ?? 0) - active.length;
  const shown = useMemo(
    () => (showArchived ? detail?.items ?? [] : active).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [detail, active, showArchived],
  );

  const setStatus = async (item: DatasetItem, status: 'ACTIVE' | 'ARCHIVED') => {
    setBusyItem(item.id);
    try {
      await updateDatasetItem(name, item.id, {
        input: item.input,
        expectedOutput: item.expectedOutput,
        metadata: item.metadata,
        sourceTraceId: item.sourceTraceId ?? undefined,
        sourceObservationId: item.sourceObservationId ?? undefined,
        status,
      });
      load();
      onChanged();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not change the case.'));
    } finally {
      setBusyItem(null);
    }
  };

  // Traces carry their MLflow experiment and run, which is where the trace view lives.
  const openTrace = async (traceId: string) => {
    setOpeningTrace(traceId);
    try {
      const { data } = await api.get(`/observability/traces/${encodeURIComponent(traceId)}`);
      const experimentId = data.metadata?.mlflow_experiment_id ?? data.userId;
      const runId = data.metadata?.mlflow_run_id ?? data.sessionId;

      navigate(`/${experimentId}/workflow?workflowId=${runId}&traceId=${traceId}`);
    } catch {
      setError('Could not open the source trace. It may have been deleted.');
    } finally {
      setOpeningTrace(null);
    }
  };

  const caseColumns: GridColDef<DatasetItem>[] = [
    {
      field: 'case',
      headerName: 'Case',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <TruncMono max="100%">{caseIdOf(row) ?? row.id.slice(0, 8)}</TruncMono>
          {row.status === 'ARCHIVED' && <Chip size="small" label="Archived" sx={{ height: 18, fontSize: '0.6rem', alignSelf: 'flex-start' }} />}
        </Stack>
      ),
    },
    {
      field: 'input',
      headerName: 'Input',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => <Clamp>{preview(row.input)}</Clamp>,
    },
    {
      field: 'expectedOutput',
      headerName: 'Expected',
      flex: 0.7,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => <Clamp mono={typeof row.expectedOutput !== 'string'}>{preview(row.expectedOutput)}</Clamp>,
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (row.sourceTraceId ? (
        <Button
          size="small"
          endIcon={openingTrace === row.sourceTraceId ? <CircularProgress size={12} /> : <LaunchRoundedIcon sx={{ fontSize: 14 }} />}
          onClick={() => openTrace(row.sourceTraceId as string)}
          sx={{ textTransform: 'none', fontSize: '0.72rem', px: 0.5, minWidth: 0 }}
        >
          Trace
        </Button>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {row.metadata?.added_from === 'experimentlens-ui' ? 'Added here' : 'Uploaded'}
        </Typography>
      )),
    },
    {
      field: 'actions',
      headerName: '',
      width: 96,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => {
        const archived = row.status === 'ARCHIVED';

        return (
          <Box sx={{ whiteSpace: 'nowrap' }}>
            <Tooltip title="Edit">
              <span>
                <IconButton size="small" disabled={archived} onClick={() => setDialog({ kind: 'edit', item: row })}>
                  <EditRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={archived ? 'Restore' : 'Archive. New runs skip it.'}>
              <span>
                <IconButton size="small" disabled={busyItem === row.id} onClick={() => setStatus(row, archived ? 'ACTIVE' : 'ARCHIVED')}>
                  {archived ? <UnarchiveOutlinedIcon sx={{ fontSize: 17 }} /> : <ArchiveOutlinedIcon sx={{ fontSize: 17 }} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  if (error && !detail) return <Alert severity="error">{error}</Alert>;
  if (!detail) return <Box sx={{ p: 3, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>;

  const snippet = `run_experiment(tracker, VARIANTS, "${name}", run_case)`;

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Section title={name}>
        <Stack spacing={1} sx={{ p: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {active.length} case{active.length === 1 ? '' : 's'}
            {archivedCount > 0 && ` · ${archivedCount} archived`}
            {` · ${detail.runs.length} run${detail.runs.length === 1 ? '' : 's'}`}
            {detail.dataset.description && ` · ${detail.dataset.description}`}
          </Typography>
          <Box
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: 1,
              border: theme => `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Use in code</Typography>
            <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {snippet}
            </Typography>
            <CopyButton text={snippet} />
          </Box>
        </Stack>
      </Section>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Section
        title="Cases"
        headerActions={
          <>
            {archivedCount > 0 && (
              <FormControlLabel
                sx={{ mr: 0.5 }}
                control={<Switch id="show-archived" size="small" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />}
                label={<Typography variant="caption">Show archived</Typography>}
              />
            )}
            <Button size="small" variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setDialog({ kind: 'new' })}>
              Add case
            </Button>
          </>
        }
      >
        {shown.length === 0 ? (
          <EmptyNote>
            No cases yet. Add one here, use “Add to dataset” on any trace, or upload from code with
            {' '}<Box component="code" sx={{ fontFamily: MONO }}>upload_dataset(&quot;{name}&quot;, cases)</Box>.
          </EmptyNote>
        ) : (
          <StyledDataGrid
            autoHeight
            hideFooter={shown.length <= 25}
            disableRowSelectionOnClick
            disableColumnMenu
            rows={shown}
            columns={caseColumns as GridColDef[]}
            rowHeight={56}
            columnHeaderHeight={44}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            pageSizeOptions={[25, 50, 100]}
            getRowClassName={params => ((params.row as DatasetItem).status === 'ARCHIVED' ? 'case-archived' : '')}
            sx={{ width: '100%', '& .case-archived': { opacity: 0.55 } }}
          />
        )}
      </Section>

      <Section title="Runs on this dataset">
        {detail.runs.length === 0 ? (
          <EmptyNote>No experiment has run on it yet.</EmptyNote>
        ) : (
          <StyledDataGrid
            autoHeight
            hideFooter={detail.runs.length <= 25}
            disableRowSelectionOnClick
            disableColumnMenu
            rows={detail.runs}
            columns={RUN_COLUMNS as GridColDef[]}
            rowHeight={44}
            columnHeaderHeight={44}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            pageSizeOptions={[25, 50, 100]}
            sx={{ width: '100%' }}
          />
        )}
      </Section>

      {dialog && (
        <DatasetItemDialog
          open
          mode={dialog.kind === 'edit' ? { kind: 'edit', datasetName: name, item: dialog.item } : { kind: 'new', datasetName: name }}
          onClose={() => setDialog(null)}
          onSaved={() => {
            load();
            onChanged();
          }}
        />
      )}
    </Stack>
  );
}

function DatasetsOverview({ datasets, onSelect, onCreate }: {
  datasets: Dataset[] | null;
  onSelect: (name: string) => void;
  onCreate: () => void;
}) {
  if (!datasets) return <Box sx={{ p: 3, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>;

  const totalCases = datasets.reduce((sum, d) => sum + (d.itemCount ?? 0), 0);
  const lastUpdated = datasets[0]; // the list is sorted newest first

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <StatTile icon={<FolderCopyOutlinedIcon sx={{ fontSize: 15 }} />} label="Datasets" value={String(datasets.length)} />
        <StatTile
          icon={<ListAltRoundedIcon sx={{ fontSize: 15 }} />}
          label="Cases"
          value={totalCases.toLocaleString()}
        />
        <StatTile
          icon={<UpdateRoundedIcon sx={{ fontSize: 15 }} />}
          label="Last updated"
          value={lastUpdated ? formatDate(lastUpdated.updatedAt) : '—'}
          sub={lastUpdated?.name}
        />
      </Stack>

      <Section title="All datasets">
        {datasets.length === 0 ? (
          <EmptyNote>
            <Stack spacing={1.5} alignItems="center" component="span">
              <span>No datasets yet. Create one, or add a trace from an experiment’s Traces table.</span>
              <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={onCreate}>New dataset</Button>
            </Stack>
          </EmptyNote>
        ) : (
          <StyledDataGrid
            autoHeight
            hideFooter={datasets.length <= 25}
            disableRowSelectionOnClick
            disableColumnMenu
            rows={datasets}
            columns={DATASET_COLUMNS as GridColDef[]}
            getRowId={row => (row as Dataset).name}
            onRowClick={params => onSelect((params.row as Dataset).name)}
            rowHeight={56}
            columnHeaderHeight={44}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            pageSizeOptions={[25, 50, 100]}
            sx={{ width: '100%', '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          />
        )}
      </Section>
    </Stack>
  );
}

export default function DatasetsPage() {
  const navigate = useNavigate();
  const { datasetName } = useParams();
  const [datasets, setDatasets] = useState<Dataset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    listDatasets()
      .then(ds => setDatasets(ds.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))))
      .catch(e => setError(apiErrorMessage(e, 'Could not load datasets. Check the Langfuse connection in Settings.')));
  }, []);

  useEffect(refresh, [refresh]);

  const select = (name: string) => navigate(`/datasets/${encodeURIComponent(name)}`);

  return (
    <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: theme => theme.palette.background.default,
          borderBottom: theme => theme.palette.customGrey.main,
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }} color="text.primaryHeader" noWrap>
            Datasets
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
            Test cases your experiments run on. Runs record which version they used, so results stay comparable.
          </Typography>
        </Box>
        <Button size="small" variant="contained" disableElevation startIcon={<AddRoundedIcon />} onClick={() => setCreating(true)} sx={{ flexShrink: 0 }}>
          New dataset
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
          maxWidth: 1280,
          mx: 'auto',
        }}
      >
        <Box sx={{ position: { md: 'sticky' }, top: 0 }}>
        <Section
          title="All datasets"
          onHeaderClick={() => navigate('/datasets')}
          headerSelected={!datasetName}
          headerActions={datasets && <Chip size="small" label={datasets.length} sx={{ height: 20, fontSize: '0.68rem', mr: 0.5 }} />}
        >
          {!datasets && !error && <Box sx={{ p: 2, display: 'grid', placeItems: 'center' }}><CircularProgress size={20} /></Box>}
          {datasets?.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No datasets yet. Create one, or add a trace from an experiment’s Traces table.
            </Typography>
          )}
          {datasets && datasets.length > 0 && (
            <List dense disablePadding sx={{ maxHeight: { md: 'calc(100vh - 160px)' }, overflowY: 'auto' }}>
              {datasets.map(d => (
                <ListItemButton key={d.name} selected={d.name === datasetName} onClick={() => select(d.name)}>
                  <ListItemText
                    primary={d.name}
                    secondary={d.description ?? `Updated ${formatDate(d.updatedAt)}`}
                    slotProps={{
                      primary: { sx: { fontWeight: 600, wordBreak: 'break-word' } },
                      secondary: { noWrap: true },
                    }}
                  />
                  <Chip size="small" label={d.itemCount ?? 0} sx={{ ml: 1, height: 20, fontSize: '0.68rem', fontVariantNumeric: 'tabular-nums' }} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Section>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {datasetName ? (
            <DatasetView key={datasetName} name={datasetName} onChanged={refresh} />
          ) : (
            <DatasetsOverview datasets={datasets} onSelect={select} onCreate={() => setCreating(true)} />
          )}
        </Box>
      </Box>
      </Box>

      <NewDatasetDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={d => {
          refresh();
          select(d.name);
        }}
      />
    </Box>
  );
}
