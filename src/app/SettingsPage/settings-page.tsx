import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { api } from '../api/api';
import ResponsiveCardTable from '../../shared/components/responsive-card-table';
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

const Section = ({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) => (
  <ResponsiveCardTable
    title={title}
    details={hint}
    showSettings={false}
    showFullScreenButton={false}
    showDownloadButton={false}
  >
    {children}
  </ResponsiveCardTable>
);

const ConnectionRow = ({ name, conn }: { name: string; conn: Connection }) => {
  const [result, setResult] = useState<TestResult | null>(null);

  const test = async () => {
    setResult('running');
    try {
      const response = await api.get(`/settings/test/${name}`);

      setResult(response.data);
    } catch {
      setResult({ ok: false, error: 'vis-api did not answer' });
    }
  };

  const detail = conn.url ?? (conn.configured ? 'API key set' : 'API key not set');

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ py: 0.75 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{SERVICE_LABEL[name] ?? name}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
          {detail} · set with <code>{conn.env}</code>
        </Typography>
      </Box>
      {result && result !== 'running' && (
        <Chip
          size="small"
          color={result.ok ? 'success' : 'error'}
          label={result.ok ? `Connected · ${result.latencyMs} ms` : result.error}
          sx={{ maxWidth: 360 }}
        />
      )}
      <Button size="small" variant="outlined" onClick={test} disabled={result === 'running'}>
        {result === 'running' ? <CircularProgress size={14} /> : 'Test'}
      </Button>
    </Stack>
  );
};

const numberField = (
  label: string,
  value: number,
  onChange: (v: number) => void,
  helper: string,
  min = 0,
  max = 1,
) => (
  <TextField
    size="small"
    type="number"
    label={label}
    value={value}
    helperText={helper}
    slotProps={{ htmlInput: { step: 0.01, min, max } }}
    onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
  />
);

export default function SettingsPage() {
  const [server, setServer] = useState<ServerSettings | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AppSettings>({ ...appSettings });

  useEffect(() => {
    api.get('/settings')
      .then(r => setServer(r.data))
      .catch(() => setServerError('Could not load settings from vis-api. Is it running?'));
  }, []);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => setDraft(d => ({ ...d, [key]: value }));

  const invalidCutoffs = draft.warnCutoff > draft.goodCutoff;
  const differsFrom = (other: AppSettings) =>
    (Object.keys(draft) as (keyof AppSettings)[]).some(key => draft[key] !== other[key]);
  const dirty = differsFrom(appSettings);
  const atDefaults = !differsFrom(DEFAULT_SETTINGS);

  const save = () => {
    saveAppSettings(draft);
    window.location.reload();
  };

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
          px: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.3 }} color="text.primaryHeader" noWrap>
            Settings
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
            Connections are configured on vis-api with environment variables. Analysis settings are saved in this browser.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
        <Stack spacing={2} sx={{ maxWidth: 900, mx: 'auto' }}>
          <Section title="Connections" hint="Where vis-api reads experiments, traces and LLM judges from.">
            {serverError && <Alert severity="error">{serverError}</Alert>}
            {!server && !serverError && <CircularProgress size={20} />}
            {server && Object.entries(server.connections).map(([name, conn]) => (
              <ConnectionRow key={name} name={name} conn={conn} />
            ))}
          </Section>
  
          <Section
            title="Judge model"
            hint="Used by Detect Issues and conversation evals. Use provider/model names, like the SDK: ollama/llama3.2, anthropic/claude-sonnet-5-5, openai/gpt-4o-mini."
          >
            <TextField
              size="small"
              fullWidth
              label="Judge model"
              value={draft.judgeModel}
              placeholder={server ? `Server default: ${server.defaultJudgeModel}` : 'Server default'}
              helperText={server ? `Leave empty to use the server default (${server.defaultJudgeModelEnv}).` : undefined}
              onChange={e => set('judgeModel', e.target.value.trim())}
            />
          </Section>
  
          <Section title="Statistics" hint="How comparisons, verdicts and colours are decided across the app.">
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
              {numberField('Significance level (p)', draft.significanceLevel, v => set('significanceLevel', v),
                'Below this, a difference counts as real. 0.05 = 95% confidence.', 0.001, 0.2)}
              {numberField('Needs attention: fail share', draft.attentionFailShare, v => set('attentionFailShare', v),
                'A case fails in at least this share of runs.')}
              {numberField('Green from', draft.goodCutoff, v => set('goodCutoff', v), 'Pass rate at or above is green.')}
              {numberField('Amber from', draft.warnCutoff, v => set('warnCutoff', v), 'Below this is red.')}
            </Stack>
            {invalidCutoffs && <Alert severity="warning" sx={{ mt: 1 }}>Amber must not be above green.</Alert>}
          </Section>
        </Stack>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          bgcolor: theme => theme.palette.background.default,
          borderTop: theme => theme.palette.customGrey.main,
          borderTopWidth: 2,
          borderTopStyle: 'solid',
          px: 2,
          py: 1.25,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ maxWidth: 900, mx: 'auto' }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: invalidCutoffs ? 'warning.main' : dirty ? 'info.main' : 'success.main',
              }}
            />
            <Typography variant="caption" color="text.secondary" noWrap>
              {invalidCutoffs
                ? 'Amber must not be above green — fix it to save'
                : dirty ? 'Unsaved changes — saving reloads the app' : 'All changes saved'}
            </Typography>
          </Box>
          <Button
            size="small"
            color="inherit"
            startIcon={<RestartAltRoundedIcon />}
            onClick={() => setDraft({ ...DEFAULT_SETTINGS })}
            disabled={atDefaults}
            sx={{ color: 'text.secondary' }}
          >
            Reset to defaults
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setDraft({ ...appSettings })}
            disabled={!dirty}
          >
            Discard
          </Button>
          <Button
            size="small"
            variant="contained"
            disableElevation
            startIcon={<SaveRoundedIcon />}
            onClick={save}
            disabled={!dirty || invalidCutoffs}
          >
            Save
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
