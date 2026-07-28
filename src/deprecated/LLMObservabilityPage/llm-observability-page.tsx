import { useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  Tooltip,
  alpha,
  useTheme,
  Chip,
} from '@mui/material';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import TracesTab from './traces-tab';
import EvaluationTab from './evaluation-tab';
import PromptsTab from './prompts-tab';
import CompareTab from './compare-tab';
import { MOCK_KPIS } from './mock-data';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'success' | 'error' | 'warning';
}

const KpiCard = ({ icon, label, value, sub, tone = 'default' }: KpiCardProps) => {
  const theme = useTheme();
  const tones: Record<string, string> = {
    default: theme.palette.primary.main,
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
  };
  const color = tones[tone];
  return (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 150,
        p: 1.25,
        borderRadius: 2,
        background: alpha(color, 0.06),
        border: `1px solid ${alpha(color, 0.18)}`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Box sx={{ color, display: 'inline-flex' }}>{icon}</Box>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'text.secondary' }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', color }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {sub}
        </Typography>
      )}
    </Paper>
  );
};

const LLMObservabilityPage = () => {
  const theme = useTheme();
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, overflow: 'hidden' }}>
      {/* Hero header */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          background: theme.palette.customSurface.cardHeader,
          borderColor: theme.palette.customGrey.main,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.secondary.main, 0.18)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HubRoundedIcon sx={{ color: 'primary.main' }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                LLM Observability
              </Typography>
              <Chip size="small" label="MOCK DATA" color="warning" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
              <Tooltip title="Live polling will resume when the MLflow trace endpoint is wired" arrow>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: theme.palette.success.main,
                    animation: 'llm-pulse 1.6s ease-out infinite',
                    '@keyframes llm-pulse': {
                      '0%':   { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.55)}` },
                      '70%':  { boxShadow: `0 0 0 6px ${alpha(theme.palette.success.main, 0)}` },
                      '100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}` },
                    },
                  }}
                />
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Traces, judges, scorers, prompts, and run-level cost &amp; latency for the
              <Box component="span" sx={{ fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace', mx: 0.5, fontWeight: 700 }}>
                small_test_llm_ollama
              </Box>
              experiment.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* KPI strip */}
      <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', rowGap: 1.25 }}>
        <KpiCard
          icon={<AccountTreeRoundedIcon fontSize="small" />}
          label="Traces"
          value={String(MOCK_KPIS.totalTraces)}
          sub={`${MOCK_KPIS.totalRuns} runs`}
        />
        <KpiCard
          icon={<TimerOutlinedIcon fontSize="small" />}
          label="Avg latency"
          value={`${MOCK_KPIS.avgLatencyMs}ms`}
          sub={`p95 ${MOCK_KPIS.p95LatencyMs}ms`}
        />
        <KpiCard
          icon={<TokenRoundedIcon fontSize="small" />}
          label="Total tokens"
          value={MOCK_KPIS.totalTokens.toLocaleString()}
          sub="prompt + completion"
        />
        <KpiCard
          icon={<GavelRoundedIcon fontSize="small" />}
          label="Judge pass rate"
          value={`${(MOCK_KPIS.judgePassRate * 100).toFixed(0)}%`}
          sub="3 judges · groundedness, relevance, conciseness"
          tone="success"
        />
        <KpiCard
          icon={<ErrorOutlineRoundedIcon fontSize="small" />}
          label="Error rate"
          value={`${(MOCK_KPIS.errorRate * 100).toFixed(0)}%`}
          sub="trace status"
          tone={MOCK_KPIS.errorRate > 0 ? 'error' : 'default'}
        />
        <KpiCard
          icon={<PaymentsRoundedIcon fontSize="small" />}
          label="Est. cost"
          value={`$${MOCK_KPIS.estCostUsd.toFixed(2)}`}
          sub="local model"
        />
      </Stack>

      {/* Sub-tab strip */}
      <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              gap: 0.5,
            },
          }}
        >
          <Tab icon={<AccountTreeRoundedIcon fontSize="small" />} iconPosition="start" label="Traces" />
          <Tab icon={<RuleRoundedIcon fontSize="small" />} iconPosition="start" label="Evaluations" />
          <Tab icon={<AutoAwesomeRoundedIcon fontSize="small" />} iconPosition="start" label="Prompts" />
          <Tab icon={<CompareArrowsRoundedIcon fontSize="small" />} iconPosition="start" label="Runs" />
        </Tabs>

        <Box sx={{ flex: 1, p: 1.5, overflow: 'hidden', minHeight: 0 }}>
          {tab === 0 && <TracesTab />}
          {tab === 1 && <EvaluationTab />}
          {tab === 2 && <PromptsTab />}
          {tab === 3 && <CompareTab />}
        </Box>
      </Paper>
    </Box>
  );
};

export default LLMObservabilityPage;
