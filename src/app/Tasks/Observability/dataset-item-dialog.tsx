import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import { useNavigate } from 'react-router-dom';

import { apiErrorMessage } from '../../api/api';
import {
  addDatasetItem,
  createDataset,
  datasetsContainingTrace,
  listDatasets,
  updateDatasetItem,
} from '../../api/datasets';
import type { DatasetItem } from '../../../shared/models/observability/dataset';
import type { TraceDetail } from '../../../shared/models/observability/trace-detail';
import { MONO } from '../../../shared/models/observability/agentic-conventions';

/** Strings are edited as plain text, everything else as pretty JSON. */
export const toEditable = (value: unknown): string =>
  value === null || value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2);

/** Text that looks like a JSON object or array must parse; any other text is kept as a string. */
const fromEditable = (text: string): { value: unknown; error?: string } => {
  const trimmed = text.trim();

  if (!trimmed) return { value: null };
  if (!/^[[{]/.test(trimmed)) return { value: text };
  try {
    return { value: JSON.parse(trimmed) };
  } catch {
    return { value: null, error: 'Not valid JSON. Fix it, or remove the leading { or [ to save it as text.' };
  }
};

/**
 * What a trace suggests as a test case: its input, the expected answer the SDK put on it (else its
 * actual answer) and the SDK's case id, plus where it came from.
 */
export const caseFromTrace = (trace: TraceDetail) => {
  const output = trace.output as Record<string, unknown> | string | null;
  const answer = output && typeof output === 'object' && 'answer' in output ? output.answer : output;
  const meta = trace.metadata ?? {};
  const caseId = meta.case_id;

  return {
    input: trace.input,
    expected: meta.expected ?? answer ?? null,
    caseId: typeof caseId === 'string' || typeof caseId === 'number' ? String(caseId) : '',
    source: {
      added_from: 'experimentlens-ui',
      mlflow_experiment_id: meta.mlflow_experiment_id ?? trace.userId,
      mlflow_run_id: meta.mlflow_run_id ?? trace.sessionId,
    },
  };
};

type Mode =
  | { kind: 'fromTrace'; trace: TraceDetail }
  | { kind: 'new'; datasetName: string }
  | { kind: 'edit'; datasetName: string; item: DatasetItem };

type Props = {
  open: boolean;
  mode: Mode;
  onClose: () => void;
  onSaved?: (item: DatasetItem, datasetName: string) => void;
};

export default function DatasetItemDialog({ open, mode, onClose, onSaved }: Props) {
  const fixedDataset = mode.kind === 'fromTrace' ? null : mode.datasetName;
  const [datasetNames, setDatasetNames] = useState<string[]>([]);
  const [alreadyIn, setAlreadyIn] = useState<string[]>([]);
  const [datasetName, setDatasetName] = useState(fixedDataset ?? '');
  const [caseId, setCaseId] = useState('');
  const [inputText, setInputText] = useState('');
  const [expectedText, setExpectedText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDatasetName(fixedDataset ?? '');
    setCaseId('');
    if (mode.kind === 'fromTrace') {
      const suggested = caseFromTrace(mode.trace);

      setCaseId(suggested.caseId);
      setInputText(toEditable(suggested.input));
      setExpectedText(toEditable(suggested.expected));
      listDatasets().then(ds => setDatasetNames(ds.map(d => d.name))).catch(() => setDatasetNames([]));
      datasetsContainingTrace(mode.trace.id).then(setAlreadyIn).catch(() => setAlreadyIn([]));
    } else if (mode.kind === 'edit') {
      setInputText(toEditable(mode.item.input));
      setExpectedText(toEditable(mode.item.expectedOutput));
    } else {
      setInputText('{\n  "question": ""\n}');
      setExpectedText('');
    }
  }, [open]);

  const input = useMemo(() => fromEditable(inputText), [inputText]);
  const expected = useMemo(() => fromEditable(expectedText), [expectedText]);
  const name = datasetName.trim();
  const isNewDataset = mode.kind === 'fromTrace' && name !== '' && !datasetNames.includes(name);
  const canSave = name !== '' && input.value !== null && !input.error && !expected.error && !saving;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isNewDataset) await createDataset(name);
      const request = {
        input: input.value,
        expectedOutput: expected.value,
        ...(mode.kind === 'fromTrace' && {
          sourceTraceId: mode.trace.id,
          metadata: caseFromTrace(mode.trace).source,
        }),
        ...(mode.kind === 'edit' && {
          sourceTraceId: mode.item.sourceTraceId ?? undefined,
          sourceObservationId: mode.item.sourceObservationId ?? undefined,
          metadata: mode.item.metadata,
          status: mode.item.status,
        }),
        ...(mode.kind !== 'edit' && caseId.trim() && { caseId: caseId.trim() }),
      };
      const item = mode.kind === 'edit'
        ? await updateDatasetItem(name, mode.item.id, request)
        : await addDatasetItem(name, request);

      onSaved?.(item, name);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e, `Could not save the case to “${name}”.`));
    } finally {
      setSaving(false);
    }
  };

  const title = mode.kind === 'edit' ? 'Edit case' : mode.kind === 'new' ? 'Add case' : 'Add trace to a dataset';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {mode.kind === 'fromTrace' && (
            <Typography variant="body2" color="text.secondary">
              The trace’s input becomes the case, and its expected answer (or its actual answer) becomes the expected
              output. Edit both before saving.
            </Typography>
          )}

          {mode.kind === 'fromTrace' ? (
            <Autocomplete
              freeSolo
              options={datasetNames}
              value={datasetName}
              onInputChange={(_, v) => setDatasetName(v)}
              renderInput={params => (
                <TextField
                  {...params}
                  autoFocus
                  size="small"
                  label="Dataset"
                  placeholder="Pick one or type a new name"
                  helperText={isNewDataset ? `“${name}” doesn’t exist yet. Saving creates it.` : ' '}
                />
              )}
            />
          ) : (
            <TextField size="small" label="Dataset" value={datasetName} disabled />
          )}

          {alreadyIn.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">Already in:</Typography>
              {alreadyIn.map(d => <Chip key={d} size="small" label={d} sx={{ height: 20, fontSize: '0.68rem' }} />)}
            </Stack>
          )}

          {mode.kind !== 'edit' && (
            <TextField
              size="small"
              label="Case ID (optional)"
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
              helperText="A short name like “fr-capital”. A case with the same ID in this dataset is replaced, not copied, from here or from the SDK."
            />
          )}

          <TextField
            label="Input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            multiline
            minRows={4}
            maxRows={14}
            error={Boolean(input.error)}
            helperText={input.error ?? 'JSON object, like the SDK’s case dict. The keys become your run_case arguments.'}
            slotProps={{ htmlInput: { style: { fontFamily: MONO, fontSize: '0.8rem' } } }}
          />

          <TextField
            label="Expected output"
            value={expectedText}
            onChange={e => setExpectedText(e.target.value)}
            multiline
            minRows={2}
            maxRows={10}
            error={Boolean(expected.error)}
            helperText={expected.error ?? 'Plain text or JSON. Leave empty if the case has no single right answer.'}
            slotProps={{ htmlInput: { style: { fontFamily: MONO, fontSize: '0.8rem' } } }}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!canSave}>
          {saving ? <CircularProgress size={16} /> : mode.kind === 'edit' ? 'Save case' : 'Add case'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Icon button that opens the dialog for one trace and confirms with a link to the dataset. */
export function AddToDatasetButton({ trace, size = 'small' }: { trace: TraceDetail; size?: 'small' | 'medium' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  return (
    <>
      <Tooltip title="Add to dataset">
        <IconButton
          size={size}
          onClick={e => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <PlaylistAddRoundedIcon sx={{ color: 'primary.main', fontSize: size === 'small' ? 18 : undefined }} />
        </IconButton>
      </Tooltip>
      <DatasetItemDialog
        open={open}
        mode={{ kind: 'fromTrace', trace }}
        onClose={() => setOpen(false)}
        onSaved={(_, name) => setSavedTo(name)}
      />
      <Snackbar
        open={Boolean(savedTo)}
        autoHideDuration={6000}
        onClose={() => setSavedTo(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSavedTo(null)}
          action={
            <Button color="inherit" size="small" onClick={() => navigate(`/datasets/${encodeURIComponent(savedTo ?? '')}`)}>
              Open
            </Button>
          }
        >
          <Box component="span">Added to {savedTo}</Box>
        </Alert>
      </Snackbar>
    </>
  );
}
