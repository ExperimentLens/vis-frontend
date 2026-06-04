import { Box, Stack, Typography, useTheme } from '@mui/material';
import type { Observation } from '../../../shared/models/observability/observation';
import type { GenOutput } from '../../../shared/models/observability/agentic-conventions';
import { MONO, prettyName } from '../../../shared/models/observability/agentic-conventions';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import { CopyButton, PassFailChip, SectionLabel } from './trace-ui';

type OverviewTabProps = {
  question: string;
  answer: string;
  passRate: number | null;
  judges: Observation[];
};

const OverviewTab = ({ question, answer, passRate, judges }: OverviewTabProps) => {
  const theme = useTheme();

  return (
    <Stack spacing={1.5}>
      <ResponsiveCardTable title="Question & Answer" showSettings={false} showFullScreenButton={false}>
        <SectionLabel>Question</SectionLabel>
        <Typography variant="body2" sx={{ mb: 1.5 }}>{question}</Typography>
        <SectionLabel action={<CopyButton text={answer} />}>Answer</SectionLabel>
        <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>{answer}</Typography>
      </ResponsiveCardTable>

      {passRate !== null && (
        <ResponsiveCardTable title="Judge verdicts" showSettings={false} showFullScreenButton={false}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Box sx={{ flexGrow: 1 }} />
            <Typography
              variant="caption"
              sx={{ fontFamily: MONO, fontWeight: 700, color: passRate === 1 ? theme.palette.success.main : theme.palette.warning.main }}
            >
              {Math.round(passRate * 100)}% pass
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
            {judges.map(judge => {
              const output = judge.output as GenOutput;
              return <PassFailChip key={judge.id} passed={output?.passed === true} label={prettyName(judge.name)} tooltip={output?.rationale} />;
            })}
            {judges.length === 0 && <Typography variant="caption" color="text.secondary">No judges recorded.</Typography>}
          </Stack>
        </ResponsiveCardTable>
      )}
    </Stack>
  );
};

export default OverviewTab;
