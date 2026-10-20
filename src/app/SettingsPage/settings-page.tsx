import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CableRoundedIcon from '@mui/icons-material/CableRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import FunctionsRoundedIcon from '@mui/icons-material/FunctionsRounded';
import NetworkCheckRoundedIcon from '@mui/icons-material/NetworkCheckRounded';
import { api } from '../api/api';
import ResponsiveCardTable from '../../shared/components/responsive-card-table';
import StatTile from '../../shared/components/stat-tile';
import { StyledDataGrid, TruncMono } from '../ProgressPage/MonitoringPage/LLMOverview/llm-monitoring-shared';
import { EmptyNote } from '../ProgressPage/MonitoringPage/LLMOverview/chart-kit';
import { CopyButton, PassFailChip } from '../Tasks/Observability/trace-ui';
import { MONO } from '../../shared/models/observability/agentic-conventions';
import { DEFAULT_SETTINGS, appSettings, saveAppSettings } from '../../shared/utils/app-settings';
import type { AppSettings } from '../../shared/utils/app-settings';

interface Connection {
  url?: string;
  configured?: boolean;
  env: string;
}

interface ServerSettings {
  connections: Record<string, Connection>;
  defaultJudgeModel: string;
  defaultJudgeModelEnv: string;
}

type TestResult = { ok: boolean; latencyMs?: number; error?: string } | 'running';

const SERVICE_LABEL: Record<string, string> = {
  mlflow: 'MLflow',
  langfuse: 'Langfuse',
  ollama: 'Ollama',
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI-compatible',
};

/** The app's standard card, without the chart-only gear / fullscreen / download buttons. */
const Section = ({ title, details, headerActions, noPadding = false, children }: {
  title: string;
  details?: string | null;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
  children: React.ReactNode;
}) => (
  <ResponsiveCardTable
    title={title}
    details={details}
    headerActions={headerActions}
    showSettings={false}
    showFullScreenButton={false}
    showDownloadButton={false}
    noPadding={noPadding}
  >
    {children}
  </ResponsiveCardTable>
);

const gridProps = {
  autoHeight: true,
  hideFooter: true,
  disableRowSelectionOnClick: true,
  disableColumnMenu: true,
  columnHeaderHeight: 44,
  sx: { width: '100%' },
} as const;

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

type ConnectionRow = Connection & { id: string };

const ConnectionsTable = ({ rows, results, onTest }: {
  rows: ConnectionRow[];
  results: Record<string, TestResult>;
  onTest: (name: string) => void;
}) => {
  const columns = useMemo<GridColDef<ConnectionRow>[]>(() => [
    {
      field: 'id',
      headerName: 'Service',
      flex: 0.6,
      minWidth: 150,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{SERVICE_LABEL[row.id] ?? row.id}</Typography>
      ),
    },
    {
      field: 'url',
      headerName: 'Endpoint',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (row.url
        ? <Stack justifyContent="center" sx={{ height: '100%', minWidth: 0 }}><TruncMono max="100%">{row.url}</TruncMono></Stack>
        : (
          <Typography variant="body2" color={row.configured ? 'text.primary' : 'text.secondary'}>
            {row.configured ? 'API key set' : 'API key not set'}
          </Typography>
        )),
    },
    {
      field: 'env',
      headerName: 'Set with',
      flex: 0.7,
      minWidth: 180,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ height: '100%', minWidth: 0 }}>
          <TruncMono max="100%">{row.env}</TruncMono>
          <CopyButton text={row.env} />
        </Stack>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      sortable: false,
      renderCell: ({ row }) => {
        const result = results[row.id];

        return (
          <Stack direction="row" alignItems="center" sx={{ height: '100%', minWidth: 0 }}>
            {!result && <Typography variant="caption" color="text.disabled">Not tested</Typography>}
            {result === 'running' && <CircularProgress size={14} />}
            {result && result !== 'running' && (
              <PassFailChip
                passed={result.ok}
                label={result.ok ? `${result.latencyMs} ms` : 'Failed'}
                tooltip={result.ok ? 'Connected' : result.error}
              />
            )}
          </Stack>
        );
      },
    },
    {
      field: 'test',
      headerName: '',
      width: 84,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <Button size="small" variant="outlined" onClick={() => onTest(row.id)} disabled={results[row.id] === 'running'}>
          Test
        </Button>
      ),
    },
  ], [results, onTest]);

  return <StyledDataGrid {...gridProps} rows={rows} columns={columns as GridColDef[]} rowHeight={48} />;
};

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

type StatKey = 'significanceLevel' | 'attentionFailShare' | 'goodCutoff' | 'warnCutoff';

interface StatSpec {
  id: StatKey;
  label: string;
  meaning: string;
  min: number;
  max: number;
}

const STAT_SPECS: StatSpec[] = [
  { id: 'significanceLevel', label: 'Significance level (p)', meaning: 'Below this, a difference counts as real. 0.05 = 95% confidence.', min: 0.001, max: 0.2 },
  { id: 'attentionFailShare', label: 'Needs attention: fail share', meaning: 'A case fails in at least this share of runs.', min: 0, max: 1 },
  { id: 'goodCutoff', label: 'Green from', meaning: 'Pass rate at or above this is green.', min: 0, max: 1 },
  { id: 'warnCutoff', label: 'Amber from', meaning: 'Pass rate at or above this is amber; below is red.', min: 0, max: 1 },
];

/** Keeps the typed text locally so partial input like "0." isn't clamped away mid-typing. */
const NumberInput = ({ value, min, max, error, onChange }: {
  value: number;
  min: number;
  max: number;
  error?: boolean;
  onChange: (v: number) => void;
}) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text);
    const next = Number.isFinite(parsed) && text.trim() !== '' ? Math.max(min, Math.min(max, parsed)) : value;

    setText(String(next));
    onChange(next);
  };

  return (
    <TextField
      size="small"
      type="number"
      value={text}
      error={error}
      slotProps={{ htmlInput: { step: 0.01, min, max, style: { fontFamily: MONO, fontSize: '0.8rem' } } }}
      // DataGrid captures arrow/space keys for cell navigation; keep them in the input.
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') commit();
      }}
      onChange={e => {
        setText(e.target.value);
        const parsed = Number(e.target.value);

        if (e.target.value.trim() !== '' && Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
      }}
      onBlur={commit}
      sx={{ width: 120 }}
    />
  );
};

const StatisticsTable = ({ draft, invalidCutoffs, onChange }: {
  draft: AppSettings;
  invalidCutoffs: boolean;
  onChange: (key: StatKey, value: number) => void;
}) => {
  const columns = useMemo<GridColDef<StatSpec>[]>(() => [
    {
      field: 'label',
      headerName: 'Setting',
      flex: 1,
      minWidth: 240,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack justifyContent="center" sx={{ height: '100%', minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.label}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
            {row.meaning}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'value',
      headerName: 'Value',
      width: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack justifyContent="center" sx={{ height: '100%' }}>
          <NumberInput
            value={draft[row.id]}
            min={row.min}
            max={row.max}
            error={invalidCutoffs && (row.id === 'goodCutoff' || row.id === 'warnCutoff')}
            onChange={v => onChange(row.id, v)}
          />
        </Stack>
      ),
    },
    {
      field: 'range',
      headerName: 'Range',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.75rem', color: 'text.secondary' }}>
          {row.min} – {row.max}
        </Box>
      ),
    },
    {
      field: 'default',
      headerName: 'Default',
      width: 100,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => {
        const changed = draft[row.id] !== DEFAULT_SETTINGS[row.id];

        return (
          <Tooltip title={changed ? 'Changed from the default' : 'Using the default'}>
            <Box
              component="span"
              sx={{ fontFamily: MONO, fontSize: '0.8rem', fontWeight: changed ? 700 : 400, color: changed ? 'info.main' : 'text.secondary' }}
            >
              {DEFAULT_SETTINGS[row.id]}
            </Box>
          </Tooltip>
        );
      },
    },
  ], [draft, invalidCutoffs, onChange]);

  return <StyledDataGrid {...gridProps} rows={STAT_SPECS} columns={columns as GridColDef[]} rowHeight={64} />;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [server, setServer] = useState<ServerSettings | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AppSettings>({ ...appSettings });
  const [results, setResults] = useState<Record<string, TestResult>>({});

  useEffect(() => {
    api.get('/settings')
      .then(r => setServer(r.data))
      .catch(() => setServerError('Could not load settings from vis-api. Is it running?'));
  }, []);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft(d => ({ ...d, [key]: value }));

  const testConnection = useCallback(async (name: string) => {
    setResults(r => ({ ...r, [name]: 'running' }));
    try {
      const response = await api.get(`/settings/test/${name}`);

      setResults(r => ({ ...r, [name]: response.data }));
    } catch {
      setResults(r => ({ ...r, [name]: { ok: false, error: 'vis-api did not answer' } }));
    }
  }, []);

  const connections = useMemo<ConnectionRow[]>(
    () => Object.entries(server?.connections ?? {}).map(([id, conn]) => ({ id, ...conn })),
    [server],
  );
  const configuredCount = connections.filter(c => c.url || c.configured).length;
  const tested = Object.values(results).filter((r): r is Exclude<TestResult, 'running'> => r !== 'running');
  const failedCount = tested.filter(r => !r.ok).length;
  const anyRunning = Object.values(results).includes('running');

  const invalidCutoffs = draft.warnCutoff > draft.goodCutoff;
  const differsFrom = (other: AppSettings) =>
    (Object.keys(draft) as (keyof AppSettings)[]).some(key => draft[key] !== other[key]);
  const dirty = differsFrom(appSettings);
  const atDefaults = !differsFrom(DEFAULT_SETTINGS);

  const save = () => {
    saveAppSettings(draft);
    window.location.reload();
  };

  const statusText = invalidCutoffs
    ? 'Amber must not be above green'
    : dirty ? 'Unsaved changes — saving reloads the app' : 'All changes saved';

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
            Settings
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
            Connections are configured on vis-api with environment variables. Analysis settings are saved in this browser.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0, mr: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: invalidCutoffs ? 'warning.main' : dirty ? 'info.main' : 'success.main',
            }}
          />
          <Typography variant="caption" color="text.secondary" noWrap>{statusText}</Typography>
        </Stack>
        <Button
          size="small"
          color="inherit"
          startIcon={<RestartAltRoundedIcon />}
          onClick={() => setDraft({ ...DEFAULT_SETTINGS })}
          disabled={atDefaults}
          sx={{ color: 'text.secondary', flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Reset to defaults
        </Button>
        <Button size="small" variant="outlined" onClick={() => setDraft({ ...appSettings })} disabled={!dirty} sx={{ flexShrink: 0 }}>
          Discard
        </Button>
        <Button
          size="small"
          variant="contained"
          disableElevation
          startIcon={<SaveRoundedIcon />}
          onClick={save}
          disabled={!dirty || invalidCutoffs}
          sx={{ flexShrink: 0 }}
        >
          Save
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
        <Stack spacing={2} sx={{ maxWidth: 1280, mx: 'auto', minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <StatTile
              icon={<CableRoundedIcon sx={{ fontSize: 15 }} />}
              label="Connections configured"
              value={server ? `${configuredCount} / ${connections.length}` : '—'}
              tone={!server ? 'default' : configuredCount === connections.length ? 'success' : 'warning'}
            />
            <StatTile
              icon={<NetworkCheckRoundedIcon sx={{ fontSize: 15 }} />}
              label="Connection tests"
              value={tested.length ? `${tested.length - failedCount} / ${tested.length} ok` : 'Not run'}
              tone={!tested.length ? 'default' : failedCount ? 'error' : 'success'}
            />
            <StatTile
              icon={<GavelRoundedIcon sx={{ fontSize: 15 }} />}
              label="Judge model"
              value={draft.judgeModel || server?.defaultJudgeModel || '—'}
              sub={draft.judgeModel ? 'custom' : 'server default'}
            />
            <StatTile
              icon={<FunctionsRoundedIcon sx={{ fontSize: 15 }} />}
              label="Significance"
              value={`p < ${draft.significanceLevel}`}
              sub={`${Math.round((1 - draft.significanceLevel) * 1000) / 10}% confidence`}
            />
          </Stack>

          <Section
            title="Connections"
            details="Where vis-api reads experiments, traces and LLM judges from."
            noPadding
            headerActions={server && connections.length > 0 && (
              <Button
                size="small"
                onClick={() => connections.forEach(c => testConnection(c.id))}
                disabled={anyRunning}
                sx={{ mr: 0.5 }}
              >
                Test all
              </Button>
            )}
          >
            {serverError && <Alert severity="error" sx={{ m: 1.5 }}>{serverError}</Alert>}
            {!server && !serverError && <Box sx={{ p: 2, display: 'grid', placeItems: 'center' }}><CircularProgress size={20} /></Box>}
            {server && connections.length === 0 && <EmptyNote>vis-api reported no connections.</EmptyNote>}
            {server && connections.length > 0 && (
              <ConnectionsTable rows={connections} results={results} onTest={testConnection} />
            )}
          </Section>

          <Section
            title="Judge model"
            details="Used by Detect Issues and conversation evals. Use provider/model names, like the SDK: ollama/llama3.2, anthropic/claude-sonnet-5-5, openai/gpt-4o-mini."
          >
            <TextField
              size="small"
              fullWidth
              label="Judge model"
              value={draft.judgeModel}
              placeholder={server ? `Server default: ${server.defaultJudgeModel}` : 'Server default'}
              helperText={server ? `Leave empty to use the server default (${server.defaultJudgeModelEnv}).` : undefined}
              onChange={e => set('judgeModel', e.target.value.trim())}
              slotProps={{ htmlInput: { style: { fontFamily: MONO, fontSize: '0.85rem' } } }}
            />
          </Section>

          <Section title="Statistics" details="How comparisons, verdicts and colours are decided across the app." noPadding>
            {invalidCutoffs && <Alert severity="warning" sx={{ m: 1.5 }}>Amber must not be above green.</Alert>}
            <StatisticsTable draft={draft} invalidCutoffs={invalidCutoffs} onChange={set} />
          </Section>
        </Stack>
      </Box>
    </Box>
  );
}
