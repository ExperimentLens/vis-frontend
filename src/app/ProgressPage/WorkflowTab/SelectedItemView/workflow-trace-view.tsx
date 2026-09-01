import { useEffect, useMemo, useState } from 'react';
import { Box, Paper } from '@mui/material';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import TextSnippetRoundedIcon from '@mui/icons-material/TextSnippetRounded';

import { useAppDispatch, useAppSelector } from '../../../../store/store';
import type { RootState } from '../../../../store/store';
import InfoMessage from '../../../../shared/components/InfoMessage';
import {
  isJudge,
  modelOf,
  tokensOf,
} from '../../../../shared/models/observability/agentic-conventions';
import type {
  GenInput,
  GenOutput,
  TraceInput,
} from '../../../../shared/models/observability/agentic-conventions';
import Loader from '../../../../shared/components/loader';
import { createAnnotation } from '../../../../store/slices/observabilitySlice';
import { isHumanScoreName } from '../../../Tasks/Observability/score-dimensions';
import type { AnnotationSavePayload } from '../../../Tasks/Observability/annotate-form';

import TraceHeader from '../../../Tasks/Observability/trace-header';
import type { TraceSectionOption } from '../../../Tasks/Observability/trace-header';
import TimelineTab from '../../../Tasks/Observability/timeline-tab';
import EvaluationTab from '../../../Tasks/Observability/evaluation-tab';
import PromptsTab from '../../../Tasks/Observability/prompts-tab';

export default function WorkflowTraceView() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(
    (state: RootState) => state.observability.trace,
  );

  const [tab, setTab] = useState('timeline');
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [savingAnnotation, setSavingAnnotation] = useState(false);

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

  const question =
    typeof input?.question === 'string'
      ? input.question
      : data.name;

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

  // Human-authored annotations get their own section (EvaluationTab) and
  // their own docked form (SpanDetail) — kept out of the judge/check/metric
  // heat cells below, which are for automated evaluation only.
  const automatedScores = scores.filter(score => !isHumanScoreName(score.name));
  const humanScores = scores.filter(score => isHumanScoreName(score.name) && !score.observationId);

  const checks = automatedScores.filter(
    score => score.value === 0 || score.value === 1,
  );

  const metrics = automatedScores.filter(
    score => score.value !== 0 && score.value !== 1,
  );

  const handleAnnotate = (observationId: string | null, payload: AnnotationSavePayload) => {
    setSavingAnnotation(true);
    dispatch(createAnnotation({
      workflowId: data.sessionId,
      request: {
        traceId: data.id,
        observationId: observationId ?? undefined,
        ...payload,
      },
    })).finally(() => setSavingAnnotation(false));
  };

  const checksPassed = checks.filter(
    score => score.value === 1,
  ).length;

  const selectedObs = observations.find(
    observation =>
      observation.id === (selectedSpanId ?? defaultSpanId),
  );

const tabs: TraceSectionOption[] = [
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

        {tab === 'timeline' && (
          <TimelineTab
            observations={observations}
            selectedSpanId={selectedSpanId}
            defaultSpanId={defaultSpanId}
            selectedObs={selectedObs}
            onSelectSpan={setSelectedSpanId}
            spanScores={scores.filter(score => isHumanScoreName(score.name) && score.observationId === selectedObs?.id)}
            onAnnotateSpan={payload => handleAnnotate(selectedObs?.id ?? null, payload)}
            savingAnnotation={savingAnnotation}
          />
        )}

        {tab === 'eval' && (
          <EvaluationTab
            judges={judges}
            checks={checks}
            metrics={metrics}
            humanScores={humanScores}
            onAnnotateTrace={payload => handleAnnotate(null, payload)}
            savingAnnotation={savingAnnotation}
          />
        )}

        {tab === 'prompts' && (
          <PromptsTab promptObs={promptObs} />
        )}
      </Paper>
    </Box>
  );
}