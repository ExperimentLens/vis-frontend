import { useEffect, useMemo, useState } from 'react';
import { Box, Paper } from '@mui/material';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import TextSnippetRoundedIcon from '@mui/icons-material/TextSnippetRounded';

import { useAppSelector } from '../../../../store/store';
import type { RootState } from '../../../../store/store';
import InfoMessage from '../../../../shared/components/InfoMessage';
import {
  asText,
  isJudge,
  modelOf,
  tokensOf,
} from '../../../../shared/models/observability/agentic-conventions';
import type {
  GenInput,
  GenOutput,
  TraceInput,
  TraceOutput,
} from '../../../../shared/models/observability/agentic-conventions';
import Loader from '../../../../shared/components/loader';

import TraceHeader from '../../../Tasks/Observability/trace-header';
import type { TraceSectionOption } from '../../../Tasks/Observability/trace-header';
import OverviewTab from '../../../Tasks/Observability/overview-tab';
import TimelineTab from '../../../Tasks/Observability/timeline-tab';
import EvaluationTab from '../../../Tasks/Observability/evaluation-tab';
import PromptsTab from '../../../Tasks/Observability/prompts-tab';

export default function WorkflowTraceView() {
  const { data, loading, error } = useAppSelector(
    (state: RootState) => state.observability.trace,
  );

  const [tab, setTab] = useState('overview');
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const observations = useMemo(
    () => data?.observations ?? [],
    [data],
  );

  const generations = useMemo(
    () =>
      observations.filter(
        observation =>
          (observation.type ?? '').toUpperCase() === 'GENERATION',
      ),
    [observations],
  );

  const judges = useMemo(
    () => generations.filter(isJudge),
    [generations],
  );

  const calls = useMemo(
    () => generations.filter(observation => !isJudge(observation)),
    [generations],
  );

  const promptObs = useMemo(
    () =>
      generations.filter(
        observation => Boolean((observation.input as GenInput)?.prompt),
      ),
    [generations],
  );

  const defaultSpanId = calls[0]?.id ?? observations[0]?.id ?? null;

  useEffect(() => {
    setSelectedSpanId(
      calls[0]?.id ?? observations[0]?.id ?? null,
    );
  }, [data?.id, calls, observations]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <InfoMessage
        message="Failed to load this trace."
        type="error"
        fullHeight
      />
    );
  }

  if (!data) {
    return (
      <InfoMessage
        message="Select a trace to inspect its spans, evaluation and prompts."
        type="info"
        icon={
          <TouchAppRoundedIcon
            sx={{ fontSize: 40, color: 'info.main' }}
          />
        }
        fullHeight
      />
    );
  }

  const input = data.input as TraceInput;
  const output = data.output as TraceOutput;

  const question =
    typeof input?.question === 'string'
      ? input.question
      : data.name;

  const answer =
    typeof output?.answer === 'string'
      ? output.answer
      : asText(data.output);

  const configEntries = Object.entries(input ?? {}).filter(
    ([key]) => key !== 'question',
  );

  const headerModel = calls
    .map(modelOf)
    .find(Boolean);

  const observationTimes = observations
    .flatMap(observation => [
      Date.parse(observation.startTime),
      Date.parse(observation.endTime),
    ])
    .filter(timestamp => !Number.isNaN(timestamp));

  const durationMs = observationTimes.length
    ? Math.max(...observationTimes) -
      Math.min(...observationTimes)
    : (data.latency ?? 0) * 1000;

  const totalTokens = generations.reduce(
    (sum, observation) =>
      sum + (tokensOf(observation) ?? 0),
    0,
  );

  const judgesPassed = judges.filter(
    observation =>
      (observation.output as GenOutput)?.passed === true,
  ).length;

  const scores = data.scores ?? [];

  const checks = scores.filter(
    score => score.value === 0 || score.value === 1,
  );

  const metrics = scores.filter(
    score => score.value !== 0 && score.value !== 1,
  );

  const checksPassed = checks.filter(
    score => score.value === 1,
  ).length;

  const passRate =
    typeof output?.judge_pass_rate === 'number'
      ? output.judge_pass_rate
      : judges.length
        ? judgesPassed / judges.length
        : null;

  const selectedObs = observations.find(
    observation =>
      observation.id === (selectedSpanId ?? defaultSpanId),
  );

const tabs: TraceSectionOption[] = [
  {
    value: 'overview',
    icon: <DashboardRoundedIcon fontSize="small" />,
    tooltip: 'Overview',
  },
  {
    value: 'timeline',
    icon: <AccountTreeRoundedIcon fontSize="small" />,
    tooltip: `Timeline (${observations.length})`,
  },
  {
    value: 'eval',
    icon: <FactCheckRoundedIcon fontSize="small" />,
    tooltip: `Evaluation (${judges.length + scores.length})`,
  },
  {
    value: 'prompts',
    icon: <TextSnippetRoundedIcon fontSize="small" />,
    tooltip: `Prompts (${promptObs.length})`,
  },
];
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        rowGap: 1,
        height: '100%',
        overflow: 'auto',
      }}
    >

      <TraceHeader
        id={data.id}
        question={question}
        headerModel={headerModel}
        configEntries={configEntries}
        tags={data.tags}
        durationMs={durationMs}
        totalTokens={totalTokens}
        totalCost={data.totalCost}
        judgesCount={judges.length}
        judgesPassed={judgesPassed}
        checksCount={checks.length}
        checksPassed={checksPassed}
        tab={tab}
        tabs={tabs}
        onTabChange={setTab}
      />
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          overflow: 'auto',
          height: '100%',
          width: '100%',
          position: 'relative',
        }}
      >

        {tab === 'overview' && (
          <OverviewTab
            question={question}
            answer={answer}
            passRate={passRate}
            judges={judges}
          />
        )}

        {tab === 'timeline' && (
          <TimelineTab
            observations={observations}
            selectedSpanId={selectedSpanId}
            defaultSpanId={defaultSpanId}
            selectedObs={selectedObs}
            onSelectSpan={setSelectedSpanId}
          />
        )}

        {tab === 'eval' && (
          <EvaluationTab
            judges={judges}
            checks={checks}
            metrics={metrics}
          />
        )}

        {tab === 'prompts' && (
          <PromptsTab promptObs={promptObs} />
        )}
      </Paper>
    </Box>
  );
}