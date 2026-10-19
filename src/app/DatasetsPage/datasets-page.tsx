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
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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

const preview = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  const obj = value as Record<string, unknown>;
  // The SDK's case dicts usually carry one "question"-like field worth showing on its own.
  const text = obj.question ?? obj.input ?? obj.prompt;

  return typeof text === 'string' ? text : JSON.stringify(value);
};

const formatDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

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

  if (error && !detail) return <Alert severity="error">{error}</Alert>;
  if (!detail) return <Box sx={{ p: 3, display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>;

  const snippet = `run_experiment(tracker, VARIANTS, "${name}", run_case)`;

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{name}</Typography>
          {detail.dataset.description && (
            <Typography variant="body2" color="text.secondary">{detail.dataset.description}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {active.length} case{active.length === 1 ? '' : 's'}
            {archivedCount > 0 && ` · ${archivedCount} archived`}
            {` · ${detail.runs.length} run${detail.runs.length === 1 ? '' : 's'}`}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialog({ kind: 'new' })}>
          Add case
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ px: 1.5, py: 1, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>Use in code</Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', flex: 1, minWidth: 0, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {snippet}
        </Typography>
        <CopyButton text={snippet} />
      </Paper>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 0.75 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>Cases</Typography>
          {archivedCount > 0 && (
            <FormControlLabel
              control={<Switch id="show-archived" size="small" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />}
              label={<Typography variant="caption">Show archived</Typography>}
            />
          )}
        </Stack>
        {shown.length === 0 ? (
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No cases yet. Add one here, use “Add to dataset” on any trace, or upload from code with
              {' '}<Box component="code" sx={{ fontFamily: MONO }}>upload_dataset(&quot;{name}&quot;, cases)</Box>.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 120 }}>Case</TableCell>
                  <TableCell>Input</TableCell>
                  <TableCell sx={{ width: '28%' }}>Expected</TableCell>
                  <TableCell sx={{ width: 120 }}>Source</TableCell>
                  <TableCell sx={{ width: 96 }} align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map(item => {
                  const archived = item.status === 'ARCHIVED';

                  return (
                    <TableRow key={item.id} sx={{ opacity: archived ? 0.55 : 1, verticalAlign: 'top' }}>
                      <TableCell>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.72rem', wordBreak: 'break-all' }}>
                          {caseIdOf(item) ?? item.id.slice(0, 8)}
                        </Typography>
                        {archived && <Chip size="small" label="Archived" sx={{ mt: 0.5, height: 18, fontSize: '0.6rem' }} />}
                      </TableCell>
                      <TableCell><Clamp>{preview(item.input)}</Clamp></TableCell>
                      <TableCell><Clamp mono={typeof item.expectedOutput !== 'string'}>{preview(item.expectedOutput)}</Clamp></TableCell>
                      <TableCell>
                        {item.sourceTraceId ? (
                          <Button
                            size="small"
                            endIcon={openingTrace === item.sourceTraceId ? <CircularProgress size={12} /> : <LaunchRoundedIcon sx={{ fontSize: 14 }} />}
                            onClick={() => openTrace(item.sourceTraceId as string)}
                            sx={{ textTransform: 'none', fontSize: '0.72rem', px: 0.5, minWidth: 0 }}
                          >
                            Trace
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {item.metadata?.added_from === 'experimentlens-ui' ? 'Added here' : 'Uploaded'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit">
                          <span>
                            <IconButton size="small" disabled={archived} onClick={() => setDialog({ kind: 'edit', item })}>
                              <EditRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={archived ? 'Restore' : 'Archive. New runs skip it.'}>
                          <span>
                            <IconButton size="small" disabled={busyItem === item.id} onClick={() => setStatus(item, archived ? 'ACTIVE' : 'ARCHIVED')}>
                              {archived ? <UnarchiveOutlinedIcon sx={{ fontSize: 17 }} /> : <ArchiveOutlinedIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 1.5, py: 1 }}>Runs on this dataset</Typography>
        {detail.runs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, pb: 1.5 }}>
            No experiment has run on it yet.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Run</TableCell>
                  <TableCell sx={{ width: 190 }}>Started</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.runs.map(run => (
                  <TableRow key={run.id}>
                    <TableCell sx={{ wordBreak: 'break-word' }}>{run.name}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatDate(run.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Datasets</Typography>
          <Typography variant="body2" color="text.secondary">
            Test cases your experiments run on. Runs record which version they used, so results stay comparable.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setCreating(true)}>New dataset</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
          {!datasets && !error && <Box sx={{ p: 2, display: 'grid', placeItems: 'center' }}><CircularProgress size={20} /></Box>}
          {datasets?.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No datasets yet. Create one, or add a trace from an experiment’s Traces table.
            </Typography>
          )}
          {datasets && datasets.length > 0 && (
            <List dense disablePadding sx={{ maxHeight: { md: 'calc(100vh - 220px)' }, overflowY: 'auto' }}>
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
        </Paper>

        <Box sx={{ minWidth: 0 }}>
          {datasetName ? (
            <DatasetView key={datasetName} name={datasetName} onChanged={refresh} />
          ) : (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                Pick a dataset to see its cases and the runs that used it.
              </Typography>
            </Paper>
          )}
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
