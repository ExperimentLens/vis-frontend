import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { api } from '../api/api';
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
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>{hint}</Typography>
    {children}
  </Paper>
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

  const save = () => {
    saveAppSettings(draft);
    window.location.reload();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connections are configured on vis-api with environment variables. Analysis settings are saved in this browser.
      </Typography>

      <Stack spacing={2}>
        <Section title="Connections" hint="Where vis-api reads experiments, traces and LLM judges from.">
          {serverError && <Alert severity="error">{serverError}</Alert>}
          {!server && !serverError && <CircularProgress size={20} />}
          {server && Object.entries(server.connections).map(([name, conn]) => (
            <ConnectionRow key={name} name={name} conn={conn} />
          ))}
        </Section>

        <Section
          title="Judge model"
          hint="Used by Detect Issues. Use provider/model names, like the SDK: ollama/llama3.2, anthropic/claude-sonnet-5-5, openai/gpt-4o-mini."
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

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={() => setDraft({ ...DEFAULT_SETTINGS })}>Reset to defaults</Button>
          <Button variant="contained" onClick={save} disabled={invalidCutoffs}>Save and reload</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
