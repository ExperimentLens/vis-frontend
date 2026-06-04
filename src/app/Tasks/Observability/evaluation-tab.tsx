import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import type { Score } from '../../../shared/models/observability/score';
import type { GenOutput } from '../../../shared/models/observability/agentic-conventions';
import { MONO, prettyName, tokensOf } from '../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import { PassFailChip } from './trace-ui';

type EvaluationTabProps = {
  judges: Observation[];
  checks: Score[];
  metrics: Score[];
  scoresCount: number;
};

const EvaluationTab = ({ judges, checks, metrics, scoresCount }: EvaluationTabProps) => (
  <Stack spacing={1.5}>
    {judges.length > 0 && (
      <ResponsiveCardTable title="Judges" showSettings={false} showFullScreenButton={false}>
        <Stack spacing={0.75}>
          {judges.map(judge => <JudgeCard key={judge.id} judge={judge} />)}
        </Stack>
      </ResponsiveCardTable>
    )}

    {checks.length > 0 && (
      <ResponsiveCardTable title="Checks" showSettings={false} showFullScreenButton={false}>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          {checks.map(score => <PassFailChip key={score.id} passed={score.value === 1} label={prettyName(score.name)} tooltip={score.comment} />)}
        </Stack>
      </ResponsiveCardTable>
    )}

    {metrics.length > 0 && (
      <ResponsiveCardTable title="Metrics" showSettings={false} showFullScreenButton={false}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 0.75 }}>
          {metrics.map(score => <MetricCard key={score.id} score={score} />)}
        </Box>
      </ResponsiveCardTable>
    )}

    {judges.length === 0 && scoresCount === 0 && (
      <Typography variant="caption" color="text.secondary">No evaluation data for this trace.</Typography>
    )}
  </Stack>
);

const JudgeCard = ({ judge }: { judge: Observation }) => {
  const output = judge.output as GenOutput;
  const passed = output?.passed === true;
  const tokenCount = tokensOf(judge);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: output?.rationale ? 0.5 : 0 }}>
        <PassFailChip passed={passed} label={prettyName(judge.name)} />
        <Box sx={{ flexGrow: 1 }} />
        {typeof tokenCount === 'number' && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: MONO, fontSize: '0.6rem' }}>
            {tokenCount} tok
          </Typography>
        )}
      </Stack>
      {output?.rationale && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{output.rationale}</Typography>}
    </Paper>
  );
};

const MetricCard = ({ score }: { score: Score }) => (
  <Tooltip title={score.comment || ''} arrow>
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          display: 'block',
          fontSize: '0.6rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {prettyName(score.name)}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontFamily: MONO, fontSize: '0.95rem' }}>
        {Number.isInteger(score.value) ? score.value : score.value.toFixed(2)}
      </Typography>
    </Paper>
  </Tooltip>
);

export default EvaluationTab;
