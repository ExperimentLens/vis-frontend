import { Stack } from '@mui/material';
import HubRoundedIcon from '@mui/icons-material/HubRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import StatTile from '../../../../shared/components/stat-tile';
import { formatMs } from '../../../../shared/models/observability/agentic-conventions';
import { rollup } from '../../../../shared/utils/observability-aggregates';
import type { TraceDetail } from '../../../../shared/models/observability/trace-detail';

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function LlmKpiStrip({ details, sessionCount }: { details: TraceDetail[]; sessionCount: number }) {
  const r = rollup(details);

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
      <StatTile icon={<HubRoundedIcon sx={{ fontSize: 15 }} />} label="Sessions" value={String(sessionCount)} />
      <StatTile icon={<AccountTreeRoundedIcon sx={{ fontSize: 15 }} />} label="Traces" value={String(r.traceCount)} />
      <StatTile icon={<TimerOutlinedIcon sx={{ fontSize: 15 }} />} label="Avg latency" value={formatMs(r.avgLatencyMs)} />
      <StatTile icon={<SpeedRoundedIcon sx={{ fontSize: 15 }} />} label="p95" value={formatMs(r.p95LatencyMs)} />
      <StatTile icon={<TokenRoundedIcon sx={{ fontSize: 15 }} />} label="Tokens" value={r.totalTokens ? r.totalTokens.toLocaleString() : '—'} />
      <StatTile icon={<PaymentsRoundedIcon sx={{ fontSize: 15 }} />} label="Cost" value={`$${r.totalCost.toFixed(4)}`} />
      <StatTile
        icon={<GavelRoundedIcon sx={{ fontSize: 15 }} />}
        label="Judge pass"
        value={r.judgePassRate === null ? '—' : pct(r.judgePassRate)}
        tone={r.judgePassRate === null ? 'default' : r.judgePassRate >= 0.75 ? 'success' : 'warning'}
      />
      <StatTile
        icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 15 }} />}
        label="Errors"
        value={pct(r.errorRate)}
        tone={r.errorRate > 0 ? 'error' : 'default'}
      />
    </Stack>
  );
}
