import { useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import { MOCK_PROMPT_TEMPLATES, MOCK_RUN_SUMMARIES } from './mock-data';

const PromptsTab = () => {
  const theme = useTheme();
  const [a, setA] = useState<string>('prompt_01');
  const [b, setB] = useState<string>('prompt_03');

  const promptNames = Object.keys(MOCK_PROMPT_TEMPLATES);

  const usageByPrompt: Record<string, typeof MOCK_RUN_SUMMARIES> = {};
  MOCK_RUN_SUMMARIES.forEach(r => {
    if (!usageByPrompt[r.promptName]) usageByPrompt[r.promptName] = [];
    usageByPrompt[r.promptName].push(r);
  });

  return (
    <Stack direction="row" spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
      <Paper variant="outlined" sx={{ width: 220, flexShrink: 0, overflow: 'auto' }}>
        <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary' }}>
            Prompts
          </Typography>
        </Box>
        {promptNames.map(name => {
          const usage = usageByPrompt[name] ?? [];
          const isA = name === a;
          const isB = name === b;
          return (
            <Box
              key={name}
              sx={{
                px: 1.5,
                py: 1,
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor:
                  isA ? alpha(theme.palette.primary.main, 0.08) :
                    isB ? alpha(theme.palette.secondary.main, 0.08) :
                      'transparent',
                '&:hover': { bgcolor: theme.palette.action.hover },
              }}
              onClick={() => {
                if (isA) return;
                if (isB) setB(a);
                setB(a);
                setA(name);
              }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}>
                  {name}
                </Typography>
                {isA && <Chip size="small" label="A" sx={{ height: 18, fontSize: '0.6rem' }} color="primary" />}
                {isB && <Chip size="small" label="B" sx={{ height: 18, fontSize: '0.6rem' }} color="secondary" />}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                used in {usage.length} run{usage.length === 1 ? '' : 's'}
              </Typography>
            </Box>
          );
        })}
      </Paper>

      <Paper variant="outlined" sx={{ flex: 1, p: 2, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Prompt diff
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Side-by-side template comparison. Pick a different prompt on the left to swap A & B.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <PromptCard
            label="A"
            name={a}
            template={MOCK_PROMPT_TEMPLATES[a]}
            usage={usageByPrompt[a] ?? []}
            color={theme.palette.primary.main}
          />
          <PromptCard
            label="B"
            name={b}
            template={MOCK_PROMPT_TEMPLATES[b]}
            usage={usageByPrompt[b] ?? []}
            color={theme.palette.secondary.main}
          />
        </Stack>
      </Paper>
    </Stack>
  );
};

const PromptCard = ({
  label,
  name,
  template,
  usage,
  color,
}: {
  label: string;
  name: string;
  template: string;
  usage: typeof MOCK_RUN_SUMMARIES;
  color: string;
}) => {
  const theme = useTheme();
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        p: 1.5,
        borderTop: `3px solid ${color}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: alpha(color, 0.15),
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.7rem',
          }}
        >
          {label}
        </Box>
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontWeight: 700 }}>
          {name}
        </Typography>
      </Stack>

      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.25,
          fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
          fontSize: '0.72rem',
          bgcolor: theme.palette.customSurface.tray,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: 140,
        }}
      >
        {template}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
        {usage.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Not used in any run.
          </Typography>
        ) : (
          usage.map(r => (
            <Chip
              key={r.runId}
              size="small"
              label={`${r.ragName} · F1 ${(r.avgTokenF1 * 100).toFixed(0)}% · ${r.avgLatencyMs}ms`}
              sx={{ fontSize: '0.65rem' }}
            />
          ))
        )}
      </Stack>
    </Paper>
  );
};

export default PromptsTab;
