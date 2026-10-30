import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import ModelTrainingRoundedIcon from '@mui/icons-material/ModelTrainingRounded';
import InfoMessage from '../../../../shared/components/InfoMessage';
import ResponsiveCardTable from '../../../../shared/components/responsive-card-table';
import ResponsiveCardVegaLite from '../../../../shared/components/responsive-card-vegalite';
import SearchableSelect from '../../../../shared/components/searchable-select';
import SegmentedToggle from '../../../../shared/components/segmented-toggle';
import StatTile from '../../../../shared/components/stat-tile';
import type { RootState } from '../../../../store/store';
import { useAppSelector } from '../../../../store/store';
import {
  EVAL_AVERAGE,
  MIN_CONFIGS_FOR_PREDICTION,
  MIN_MODEL_R2,
  adviseMeasured,
  configKey,
  configKnobs,
  describeValues,
  isRealDrop,
  measureConfigs,
  predictUntested,
  withEvalAverage,
} from '../../../../shared/utils/config-advisor';
import type { ConfigStats, Objectives, ParamChange, Recommendation, Suggestion } from '../../../../shared/utils/config-advisor';
import { comparableMetrics, formatPValue, formatStat, inferDirection } from '../../../../shared/utils/run-statistics';
import { caseParam, costMetrics, declaredBaseline, groupParam } from '../../../../shared/utils/experiment-conventions';
import { useInsightRecords } from '../Insights/use-insight-records';
import { advisorSpec } from './advisor-specs';

const TOLERANCE_OPTIONS = [
  { value: '0.01', label: '1%' },
  { value: '0.02', label: '2%' },
  { value: '0.05', label: '5%' },
  { value: '0.1', label: '10%' },
];

const percent = (x: number) => `${x >= 0 ? '' : '−'}${Math.abs(Math.round(x * 100))}%`;

// Below zero the model predicts worse than always guessing the average.
const formatR2 = (r2: number) => (r2 < 0 ? '< 0' : formatStat(r2));

const signed = (x: number) => `${x >= 0 ? '+' : '−'}${formatStat(Math.abs(x))}`;

function Changes({ changes }: { changes: ParamChange[] }) {
  if (changes.length === 0) return <Typography variant="caption" color="text.secondary">same params</Typography>;

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
      {changes.map(c => (
        <Chip
          key={c.param}
          size="small"
          variant="outlined"
          label={`${c.param}: ${c.from.length > 24 ? `${c.from.slice(0, 24)}…` : c.from} → ${c.to.length > 24 ? `${c.to.slice(0, 24)}…` : c.to}`}
          title={`${c.param}: ${c.from} → ${c.to}`}
        />
      ))}
    </Stack>
  );
}

interface RecommendationCardProps {
  title: string;
  help: string;
  rec: Recommendation | null;
  empty: string;
  quality: string;
  cost: string;
  toleranceAbs: number;
  experimentId?: string;
}

function RecommendationCard({ title, help, rec, empty, quality, cost, toleranceAbs, experimentId }: RecommendationCardProps) {
  const drop = rec ? isRealDrop(rec, toleranceAbs) : false;

  return (
    <Paper variant="outlined" sx={{ p: 1.5, height: '100%', borderRadius: 1.5 }}>
      <Tooltip title={help}>
        <Typography variant="captionLabel" color="text.secondary">{title}</Typography>
      </Tooltip>
      {!rec ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{empty}</Typography>
      ) : (
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          <Link
            component={RouterLink}
            to={`/${experimentId}/workflow?workflowId=${rec.config.runIds[0]}`}
            underline="hover"
            variant="subtitle2"
            sx={{ wordBreak: 'break-word' }}
          >
            {rec.config.name}
          </Link>
          <Typography variant="body2">
            {quality} <strong>{formatStat(rec.config.quality.mean)}</strong>
            {' · '}
            {cost} <strong>{formatStat(rec.config.cost.mean)}</strong>
          </Typography>
          {rec.reference && (
            <>
              <Typography variant="caption" color="text.secondary">vs {rec.reference.name}</Typography>
              <Changes changes={rec.changes} />
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                <Chip
                  size="small"
                  color={rec.costSaving > 0 ? 'success' : rec.costSaving < 0 ? 'warning' : 'default'}
                  label={rec.costSaving >= 0 ? `${percent(rec.costSaving)} ${cost}` : `+${percent(-rec.costSaving)} ${cost}`}
                />
                <Tooltip title={`Welch p = ${formatPValue(rec.qualityP)}`}>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={drop ? 'error' : rec.qualityDelta > toleranceAbs ? 'success' : 'info'}
                    label={`${quality} ${signed(rec.qualityDelta)}${drop ? '' : Math.abs(rec.qualityDelta) <= toleranceAbs ? ' (within tolerance)' : ''}`}
                  />
                </Tooltip>
              </Stack>
            </>
          )}
          <Typography variant="caption" color="text.secondary">
            {rec.config.runIds.length} runs on {rec.config.cases} case{rec.config.cases === 1 ? '' : 's'}
            {rec.config.failed > 0 && ` · ${rec.config.failed} failed`}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}

/** Untested suggestions as a `VARIANTS` dict for `run_experiment`, numbers unquoted. */
const variantsSnippet = (suggestions: Suggestion[]) => {
  const literal = (v: string) => (v.trim() !== '' && Number.isFinite(Number(v)) ? v : JSON.stringify(v));
  const entries = suggestions.map(s => {
    const name = Object.values(s.values).join('_').replace(/[^\w.-]+/g, '-').slice(0, 60);
    const body = Object.entries(s.values).map(([k, v]) => `"${k}": ${literal(v)}`).join(', ');

    return `    "${name}": {${body}},`;
  });

  return `VARIANTS = {\n${entries.join('\n')}\n}`;
};

export default function ConfigAdvisor() {
  const theme = useTheme();
  const { experimentId } = useParams();
  const { records: rawRecords, completedTotal, filtered } = useInsightRecords();
  const workflows = useAppSelector((s: RootState) => s.progressPage.workflows.data);
  const records = useMemo(() => withEvalAverage(rawRecords), [rawRecords]);
  const metrics = useMemo(() => comparableMetrics(records), [records]);
  const qualityOptions = useMemo(() => metrics.filter(m => inferDirection(m) === 'maximize'), [metrics]);
  const costOptions = useMemo(() => {
    const declared = costMetrics(m => metrics.includes(m));

    return declared.length ? declared : metrics.filter(m => inferDirection(m) === 'minimize');
  }, [metrics]);

  const [quality, setQuality] = useState('');
  const [cost, setCost] = useState('');
  const [tolerance, setTolerance] = useState('0.02');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!qualityOptions.includes(quality)) {
      setQuality(qualityOptions.includes(EVAL_AVERAGE) ? EVAL_AVERAGE : qualityOptions[0] ?? '');
    }
  }, [qualityOptions]);

  useEffect(() => {
    if (!costOptions.includes(cost)) setCost(costOptions.find(m => m === 'total_tokens') ?? costOptions[0] ?? '');
  }, [costOptions]);

  const objectives: Objectives = useMemo(
    () => ({ quality, qualityDirection: inferDirection(quality), cost, costDirection: inferDirection(cost) }),
    [quality, cost],
  );

  const group = groupParam();
  const caseKey = caseParam();
  const knobs = useMemo(() => configKnobs(records, group, caseKey), [records, group, caseKey]);

  const configs = useMemo(() => {
    if (!quality || !cost || knobs.length === 0) return [];
    const failedRuns = workflows
      .filter(run => run.status === 'FAILED')
      .map(run => Object.fromEntries((run.params ?? []).map(p => [p.name, String(p.value)])));

    return measureConfigs(records, knobs, objectives, { caseParam: caseKey, groupParam: group, failedRuns });
  }, [records, knobs, objectives, workflows, caseKey, group]);

  const baselineKey = useMemo(() => {
    const names = [...new Set(records.map(r => r.params[group]).filter(Boolean))];
    // Only a baseline someone chose: comparing against an arbitrary first variant would mislead.
    const baseline = declaredBaseline(names);
    const run = baseline ? records.find(r => r.params[group] === baseline) : undefined;

    return run ? configKey(run.params, knobs) : undefined;
  }, [records, group, knobs]);

  const advice = useMemo(
    () => adviseMeasured(configs, objectives, Number(tolerance), baselineKey),
    [configs, objectives, tolerance, baselineKey],
  );
  const prediction = useMemo(
    () => (advice ? predictUntested(configs, knobs, objectives, advice) : null),
    [configs, knobs, objectives, advice],
  );

  const shownSuggestions = prediction?.reliable ? prediction.suggestions : [];
  const highlighted = useMemo(
    () => new Set([advice?.best.config.key, advice?.cheaper?.config.key, advice?.fromBaseline?.config.key].filter(Boolean) as string[]),
    [advice],
  );
  const spec = useMemo(
    () => advisorSpec(configs, shownSuggestions, highlighted, quality, cost, {
      optimal: theme.palette.success.main,
      dominated: theme.palette.text.disabled,
      predicted: theme.palette.secondary.main,
      highlight: theme.palette.primary.main,
    }),
    [configs, shownSuggestions, highlighted, quality, cost, theme],
  );

  const sortedConfigs = useMemo(() => {
    const sign = objectives.qualityDirection === 'maximize' ? -1 : 1;

    return [...configs].sort((a, b) => Number(b.optimal) - Number(a.optimal) || sign * (a.quality.mean - b.quality.mean));
  }, [configs, objectives]);

  if (records.length < 2 || qualityOptions.length === 0 || costOptions.length === 0) {
    return (
      <Box sx={{ height: 360 }}>
        <InfoMessage
          type="info"
          fullHeight
          icon={<AutoFixHighRoundedIcon sx={{ fontSize: 40, color: 'info.main' }} />}
          message={
            filtered
              ? 'Fewer than two completed runs match the runs table filters. Clear some filters to get recommendations.'
              : 'The advisor needs completed runs that logged a quality score (e.g. an eval_ metric) and a cost metric (tokens, latency or cost).'
          }
        />
      </Box>
    );
  }

  if (knobs.length === 0 || configs.length < 2) {
    return (
      <Alert severity="info" sx={{ my: 1.5 }}>
        Every run used the same configuration, so there is nothing to choose between. Vary at least one param (for
        example <code>top_k</code> or <code>temperature</code>) across variants to get recommendations.
      </Alert>
    );
  }

  const copySuggestions = () => {
    navigator.clipboard?.writeText(variantsSnippet(shownSuggestions)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => undefined);
  };

  const toleranceAbs = advice?.toleranceAbs ?? 0;
  const frontierCount = configs.filter(c => c.optimal).length;

  return (
    <Stack spacing={1.5} sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Box sx={{ minWidth: 220 }}>
          <SearchableSelect
            labelId="advisor-quality"
            inputLabel="Quality"
            label="Quality"
            value={quality}
            options={qualityOptions}
            onChange={setQuality}
            menuMaxHeight={300}
            getOptionLabel={m => (m === EVAL_AVERAGE ? 'eval_average (all eval scores)' : m)}
          />
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <SearchableSelect
            labelId="advisor-cost"
            inputLabel="Cost"
            label="Cost"
            value={cost}
            options={costOptions}
            onChange={setCost}
            menuMaxHeight={300}
          />
        </Box>
        <Tooltip title="How much quality you would give up for a cheaper configuration, as a share of the best score.">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary">Quality tolerance</Typography>
            <SegmentedToggle size="small" value={tolerance} onChange={setTolerance} options={TOLERANCE_OPTIONS} aria-label="Quality tolerance" />
          </Stack>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Chip
          size="small"
          variant="outlined"
          label={
            filtered
              ? `${records.length} of ${completedTotal} completed runs (runs table filters applied)`
              : `${records.length} completed runs`
          }
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
        <StatTile
          icon={<ScienceRoundedIcon fontSize="small" />}
          label="Configurations tested"
          value={String(configs.length)}
          sub={`${frontierCount} on the frontier · knobs: ${knobs.join(', ')}`}
        />
        <StatTile
          icon={<EmojiEventsRoundedIcon fontSize="small" />}
          label={`Best ${quality}`}
          value={advice ? formatStat(advice.best.config.quality.mean) : '—'}
          sub={advice?.best.config.name}
          tone="success"
        />
        <StatTile
          icon={<SavingsRoundedIcon fontSize="small" />}
          label={`${cost} saved at near-best quality`}
          value={advice?.cheaper ? percent(advice.cheaper.costSaving) : '0%'}
          sub={advice?.cheaper ? advice.cheaper.config.name : 'the best is already the cheapest'}
          tone={advice?.cheaper && advice.cheaper.costSaving > 0 ? 'success' : 'default'}
        />
        <StatTile
          icon={<ModelTrainingRoundedIcon fontSize="small" />}
          label="Model fit (leave-one-out R²)"
          value={prediction && configs.length >= MIN_CONFIGS_FOR_PREDICTION ? `${formatR2(prediction.quality.r2)} / ${formatR2(prediction.cost.r2)}` : '—'}
          sub={prediction && configs.length >= MIN_CONFIGS_FOR_PREDICTION ? `${quality} / ${cost}` : `needs ${MIN_CONFIGS_FOR_PREDICTION}+ configurations`}
          tone={prediction?.reliable ? 'success' : 'warning'}
        />
      </Stack>

      {configs.every(c => c.runIds.length < 2) && (
        <Alert severity="warning">
          Each configuration has a single run, so the advisor can&apos;t tell real differences from noise. Run every
          configuration on several dataset cases or with <code>repeats</code>.
        </Alert>
      )}

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <RecommendationCard
            title="SAME QUALITY, LOWER COST"
            help={`The cheapest configuration whose ${quality} is within ${percent(Number(tolerance))} of the best.`}
            rec={advice?.cheaper ?? null}
            empty="The best configuration is already the cheapest one within tolerance."
            quality={quality}
            cost={cost}
            toleranceAbs={toleranceAbs}
            experimentId={experimentId}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RecommendationCard
            title="HIGHEST QUALITY"
            help={`The configuration with the best ${quality}; ties go to the cheaper one. Compared with the baseline when there is one.`}
            rec={advice?.best ?? null}
            empty="—"
            quality={quality}
            cost={cost}
            toleranceAbs={toleranceAbs}
            experimentId={experimentId}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <RecommendationCard
            title="BEST MOVE FROM YOUR BASELINE"
            help="The biggest saving that keeps the baseline's quality (within tolerance), or a clear quality gain at no extra cost."
            rec={advice?.fromBaseline ?? null}
            empty={baselineKey ? 'No measured configuration beats the baseline on cost without losing quality.' : 'No baseline declared. Pick one on the Quality tab or set it with tracker.set_baseline() in the SDK.'}
            quality={quality}
            cost={cost}
            toleranceAbs={toleranceAbs}
            experimentId={experimentId}
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ResponsiveCardVegaLite
            title={`${quality} vs ${cost} per configuration`}
            details="Each dot is a configuration (mean over its runs, after removing case difficulty), with its 95% CI. Green ones are Pareto-optimal; ringed ones are recommended above. Diamonds are untested configurations the model predicts are worth running."
            spec={spec}
            actions={false}
            isStatic={false}
            showSettings={false}
            maxHeight={360}
            aspectRatio={2.2}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <ResponsiveCardTable
            title="Try next (untested)"
            details={`A ridge-regression model per metric, trained on the ${configs.length} measured configurations and checked by leaving each one out. It only combines param values you already tried.`}
            showSettings={false}
            showFullScreenButton={false}
            headerActions={
              shownSuggestions.length > 0 ? (
                <Button size="small" startIcon={<ContentCopyRoundedIcon fontSize="small" />} onClick={copySuggestions}>
                  {copied ? 'Copied' : 'Copy as VARIANTS'}
                </Button>
              ) : undefined
            }
          >
            {!prediction ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                Needs at least four configurations that differ in their params.
              </Typography>
            ) : configs.length < MIN_CONFIGS_FOR_PREDICTION ? (
              <Alert severity="info" sx={{ m: 1 }}>
                Predicting untested configurations needs at least {MIN_CONFIGS_FOR_PREDICTION} measured ones (you have{' '}
                {configs.length}); with fewer, a good fit is mostly luck. Sweep more param combinations to unlock this.
              </Alert>
            ) : !prediction.reliable ? (
              <Alert severity="info" sx={{ m: 1 }}>
                The model can&apos;t predict {prediction.quality.r2 < MIN_MODEL_R2 ? quality : cost} from these params yet
                (leave-one-out R² {formatR2(Math.min(prediction.quality.r2, prediction.cost.r2))}, needs {MIN_MODEL_R2}), so
                only measured configurations are recommended. More configurations, cases or repeats will help.
              </Alert>
            ) : prediction.untested === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                Every combination of the values you tried has been run.
              </Typography>
            ) : shownSuggestions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                None of the {prediction.untested} untested combinations is predicted to beat what you measured.
              </Typography>
            ) : (
              <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}>
                {shownSuggestions.map(s => (
                  <Stack key={describeValues(s.values)} spacing={0.5} sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {s.reason === 'cheaper' ? `Cheaper than ${s.reference.name}` : `Better than ${s.reference.name}`}
                    </Typography>
                    <Changes changes={s.changes} />
                    <Typography variant="body2">
                      {quality} ≈ <strong>{formatStat(s.quality.mean)}</strong> ± {formatStat(s.quality.half)}
                      {' · '}
                      {cost} ≈ <strong>{formatStat(s.cost.mean)}</strong> ± {formatStat(s.cost.half)}
                    </Typography>
                    <Typography variant="caption" color={s.costSaving > 0 ? 'success.main' : 'text.secondary'}>
                      predicted {s.costSaving >= 0 ? `${percent(s.costSaving)} cheaper` : `${percent(-s.costSaving)} more expensive`},
                      {' '}{quality} {signed(s.qualityDelta)}
                    </Typography>
                  </Stack>
                ))}
                <Typography variant="caption" color="text.secondary" sx={{ pt: 1 }}>
                  Predictions, not measurements: run them to confirm. Learned most from{' '}
                  {prediction.cost.topTerms.slice(0, 2).map(t => t.term).join(', ')} ({cost}) and{' '}
                  {prediction.quality.topTerms.slice(0, 2).map(t => t.term).join(', ')} ({quality}).
                </Typography>
              </Stack>
            )}
          </ResponsiveCardTable>
        </Grid>
      </Grid>

      <ResponsiveCardTable
        title={`All configurations (${configs.length})`}
        details="Pareto-optimal configurations first. Values are case-adjusted means over each configuration's runs."
        showSettings={false}
        showFullScreenButton={false}
      >
        <Table size="small" aria-label="Measured configurations">
          <TableHead>
            <TableRow>
              <TableCell>Configuration</TableCell>
              {knobs.map(k => <TableCell key={k}>{k}</TableCell>)}
              <TableCell align="right">{quality} (95% CI)</TableCell>
              <TableCell align="right">{cost}</TableCell>
              <TableCell align="right">Runs</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedConfigs.map((c: ConfigStats) => (
              <TableRow key={c.key} hover selected={highlighted.has(c.key)}>
                <TableCell>
                  <Link component={RouterLink} to={`/${experimentId}/workflow?workflowId=${c.runIds[0]}`} underline="hover">
                    {c.name}
                  </Link>
                </TableCell>
                {knobs.map(k => (
                  <TableCell key={k} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.values[k]}>
                    {c.values[k]}
                  </TableCell>
                ))}
                <TableCell align="right">
                  {formatStat(c.quality.mean)}
                  {c.quality.n > 1 && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}[{formatStat(c.quality.ciLow)}, {formatStat(c.quality.ciHigh)}]
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">{formatStat(c.cost.mean)}</TableCell>
                <TableCell align="right">{c.runIds.length}{c.failed > 0 && ` (+${c.failed} failed)`}</TableCell>
                <TableCell>
                  {c.optimal
                    ? <Chip size="small" color="success" variant="outlined" label="Pareto-optimal" />
                    : <Chip size="small" variant="outlined" label="Dominated" />}
                  {c.key === baselineKey && <Chip size="small" variant="outlined" label="Baseline" sx={{ ml: 0.5 }} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ResponsiveCardTable>

      <Typography variant="caption" color="text.secondary">
        Recommendations hold for this experiment&apos;s dataset and judge. Quality is compared after removing each
        case&apos;s difficulty, and a drop only counts as real when it is beyond the tolerance and significant
        (p &lt; 0.05). Configurations with failed runs are never recommended over ones without.
      </Typography>
    </Stack>
  );
}
