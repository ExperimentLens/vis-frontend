import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';

import { evaluateConversation } from '../../../api/conversations';
import { apiErrorMessage } from '../../../api/api';
import type { Conversation, ConversationMetricResult } from '../../../../shared/models/observability/conversation';
import { metricLabel } from '../../../../shared/models/observability/conversation';
import { appSettings } from '../../../../shared/utils/app-settings';

const ScoreCard = ({ name, description, result }: { name: string; description: string; result?: ConversationMetricResult }) => {
  const theme = useTheme();
  const scored = result?.score !== null && result?.score !== undefined;
  const color = !result || result.passed === null
    ? theme.palette.text.secondary
    : result.passed ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, minWidth: 0, borderColor: result ? alpha(color, 0.5) : undefined }}>
      <Tooltip title={description}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{metricLabel(name)}</Typography>
      </Tooltip>
      <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
        {scored ? (result!.score as number).toFixed(2) : result ? (result.passed ? 'Pass' : 'Fail') : '—'}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        title={result?.reason ?? undefined}
        sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {result?.reason ?? 'Not evaluated yet.'}
      </Typography>
    </Paper>
  );
};

const Bubble = ({ who, text, onClick }: { who: 'user' | 'assistant'; text: string | null; onClick?: () => void }) => {
  const theme = useTheme();
  const isUser = who === 'user';

  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <Box
        onClick={onClick}
        sx={{
          maxWidth: '82%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          borderTopRightRadius: isUser ? 4 : undefined,
          borderTopLeftRadius: isUser ? undefined : 4,
          bgcolor: isUser ? alpha(theme.palette.primary.main, 0.1) : 'action.hover',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? { outline: `1px solid ${alpha(theme.palette.primary.main, 0.4)}` } : undefined,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text || <Box component="span" sx={{ color: 'text.disabled' }}>(no reply)</Box>}
        </Typography>
      </Box>
    </Box>
  );
};

type Props = {
  conversation: Conversation;
  onOpenTrace: (traceId: string) => void;
  /** Called after an evaluation, so the caller can reload the conversation's scores. */
  onEvaluated: () => void;
};

export default function ConversationPanel({ conversation, onOpenTrace, onEvaluated }: Props) {
  const [showEvaluate, setShowEvaluate] = useState(false);
  const [selected, setSelected] = useState<string[]>(() => conversation.metrics.map(m => m.name));
  const [model, setModel] = useState(appSettings.judgeModel);
  const [role, setRole] = useState(conversation.suggestedRole ?? '');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const resultsByMetric = Object.fromEntries(conversation.results.map(r => [r.metric, r]));
  const needsRole = conversation.metrics.some(m => m.needsRole && selected.includes(m.name));
  const canRun = selected.length > 0 && (!needsRole || role.trim() !== '') && !running;

  const toggle = (name: string) =>
    setSelected(prev => (prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]));

  const run = async () => {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      const response = await evaluateConversation(conversation.sessionId, {
        metrics: selected,
        model: model.trim() || undefined,
        role: needsRole ? role.trim() : undefined,
      });
      const parts = [`Judged by ${response.model}.`];

      if (response.failed.length) parts.push(`No result for ${response.failed.map(metricLabel).join(', ')}: the judge's reply couldn't be read.`);
      if (!response.savedToRun) parts.push('The scores could not be saved to the MLflow run, so the Quality tab won’t show them.');
      setNotice(parts.join(' '));
      onEvaluated();
    } catch (e) {
      setError(apiErrorMessage(e, 'The evaluation failed. Check the judge model in Settings.'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <ForumRoundedIcon fontSize="small" color="primary" />
        <Typography sx={{ fontWeight: 700, flex: 1 }}>
          Conversation · {conversation.turns.length} turn{conversation.turns.length === 1 ? '' : 's'}
        </Typography>
        <Button
          size="small"
          variant={showEvaluate ? 'contained' : 'outlined'}
          startIcon={<GavelRoundedIcon />}
          onClick={() => setShowEvaluate(v => !v)}
        >
          Evaluate
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1, mb: 1.5 }}>
        {conversation.metrics.map(m => (
          <ScoreCard key={m.name} name={m.name} description={m.description} result={resultsByMetric[m.name]} />
        ))}
      </Box>

      <Collapse in={showEvaluate} unmountOnExit>
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            An LLM judge reads the whole transcript and scores each metric from 0 to 1. Results replace the run’s
            scores, so comparisons and the Quality tab use them. Small local models often miss invented details;
            a stronger judge gives more reliable scores.
          </Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" columnGap={1}>
            {conversation.metrics.map(m => (
              <FormControlLabel
                key={m.name}
                control={<Checkbox id={`conv-metric-${m.name}`} size="small" checked={selected.includes(m.name)} onChange={() => toggle(m.name)} />}
                label={<Typography variant="body2">{metricLabel(m.name)}</Typography>}
              />
            ))}
          </Stack>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              id="conv-judge-model"
              size="small"
              label="Judge model"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="Server default"
              helperText="e.g. anthropic/claude-sonnet-5-5 or ollama/llama3.2. Leave empty for the default from Settings."
            />
            {needsRole && (
              <TextField
                id="conv-role"
                size="small"
                label="Assistant’s role"
                value={role}
                onChange={e => setRole(e.target.value)}
                multiline
                minRows={2}
                maxRows={6}
                helperText={conversation.suggestedRole
                  ? 'From the run. Role adherence checks every reply against it.'
                  : 'Usually the system prompt. Role adherence checks every reply against it.'}
              />
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="contained" onClick={run} disabled={!canRun} startIcon={running ? <CircularProgress size={14} color="inherit" /> : undefined}>
                {running ? 'Judging…' : `Evaluate ${selected.length} metric${selected.length === 1 ? '' : 's'}`}
              </Button>
              {needsRole && !role.trim() && (
                <Typography variant="caption" color="text.secondary">Add the role, or untick role adherence.</Typography>
              )}
            </Stack>
          </Stack>
        </Paper>
      </Collapse>

      {notice && <Alert severity="info" onClose={() => setNotice(null)} sx={{ mb: 1.5 }}>{notice}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1.5 }}>{error}</Alert>}

      <Stack spacing={1.25}>
        {conversation.turns.map(turn => (
          <Box key={`${turn.traceId}-${turn.index}`}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              Turn {turn.index}
            </Typography>
            <Stack spacing={0.75}>
              <Bubble who="user" text={turn.user} />
              <Tooltip title="Open this turn’s trace" placement="right">
                <Box>
                  <Bubble who="assistant" text={turn.assistant} onClick={() => onOpenTrace(turn.traceId)} />
                </Box>
              </Tooltip>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
