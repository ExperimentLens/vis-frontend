import { Box, Paper, Stack, Typography, alpha, useTheme } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import type { Observation } from '../../../shared/models/observability/observation';
import type { GenOutput } from '../../../shared/models/observability/agentic-conventions';
import { prettyName } from '../../../shared/models/observability/agentic-conventions';
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
      <ResponsiveCardTable title="Question & Answer" showSettings={false} showFullScreenButton={false}>
        <Stack spacing={1.25}>
          
          {passRate !== null && <VerdictBanner passRate={passRate} judges={judges} />}
        
          <Box>
            <SectionLabel>Question</SectionLabel>
            <Typography variant="body2">{question}</Typography>
          </Box>

          <Box>
            <SectionLabel action={<CopyButton text={answer} />}>Answer</SectionLabel>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderLeft: `3px solid ${theme.palette.primary.main}`,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
                p: 1.25,
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: theme.palette.primary.main, fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {answer}
              </Typography>
            </Paper>
          </Box>
        </Stack>
      </ResponsiveCardTable>
  );
};

const VerdictBanner = ({ passRate, judges }: { passRate: number; judges: Observation[] }) => {
  const theme = useTheme();
  const allPass = passRate === 1;
  const nonePass = passRate === 0;
  const color = allPass ? theme.palette.success.main : nonePass ? theme.palette.error.main : theme.palette.warning.main;
  const Icon = allPass ? CheckCircleRoundedIcon : nonePass ? CancelRoundedIcon : WarningAmberRoundedIcon;
  const passed = judges.filter(judge => (judge.output as GenOutput)?.passed === true).length;
  const label = allPass ? 'All judges passed' : nonePass ? 'All judges failed' : 'Partially passed';

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 1.25, borderColor: alpha(color, 0.4), bgcolor: alpha(color, 0.05) }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Icon sx={{ color, fontSize: 22 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color }}>
            {label}
          </Typography>
          {judges.length > 0 && (
            <Typography variant="bodySm" sx={{ color: 'text.secondary' }}>
              {passed}/{judges.length} judges
            </Typography>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="statValue" sx={{ fontSize: '1.25rem', color }}>
          {Math.round(passRate * 100)}%
        </Typography>
      </Stack>

      {judges.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: 1 }}>
          {judges.map(judge => {
            const output = judge.output as GenOutput;
            return (
              <PassFailChip
                key={judge.id}
                passed={output?.passed === true}
                label={prettyName(judge.name)}
                tooltip={output?.rationale}
              />
            );
          })}
        </Stack>
      )}
    </Paper>
  );
};

export default OverviewTab;
