import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TokenRoundedIcon from '@mui/icons-material/TokenRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import { Stack } from '@mui/material';
import StatTile from '../../../shared/components/stat-tile';
import { formatMs } from '../../../shared/models/observability/agentic-conventions';

type TraceKpiTilesProps = {
  durationMs: number;
  totalTokens: number;
  totalCost?: number;
  judgesCount: number;
  judgesPassed: number;
  checksCount: number;
  checksPassed: number;
};

const TraceKpiTiles = ({
  durationMs,
  totalTokens,
  totalCost,
  judgesCount,
  judgesPassed,
  checksCount,
  checksPassed,
}: TraceKpiTilesProps) => (
  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
    <StatTile icon={<TimerOutlinedIcon sx={{ fontSize: 15 }} />} label="Duration" value={formatMs(durationMs)} />
    <StatTile icon={<TokenRoundedIcon sx={{ fontSize: 15 }} />} label="Tokens" value={totalTokens ? totalTokens.toLocaleString() : '—'} />
    <StatTile icon={<PaymentsRoundedIcon sx={{ fontSize: 15 }} />} label="Cost" value={`$${(totalCost ?? 0).toFixed(4)}`} />
    <StatTile
      icon={<GavelRoundedIcon sx={{ fontSize: 15 }} />}
      label="Judges"
      value={judgesCount ? `${judgesPassed}/${judgesCount}` : '—'}
      tone={judgesCount && judgesPassed === judgesCount ? 'success' : judgesCount ? 'warning' : 'default'}
    />
    <StatTile
      icon={<RuleRoundedIcon sx={{ fontSize: 15 }} />}
      label="Checks"
      value={checksCount ? `${checksPassed}/${checksCount}` : '—'}
      tone={checksCount && checksPassed === checksCount ? 'success' : checksCount ? 'warning' : 'default'}
    />
  </Stack>
);

export default TraceKpiTiles;
