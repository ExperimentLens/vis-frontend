import type React from 'react';
import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import BoltIcon from '@mui/icons-material/Bolt';
import AdjustIcon from '@mui/icons-material/Adjust';
import BarChartIcon from '@mui/icons-material/BarChart';
import type { RootState } from '../../../store/store';
import { useAppSelector } from '../../../store/store';
import type { ClusterInsight, FeatureStatistic, PcaSpacePoint } from '../../../shared/models/experiment.highlights.model';
import type { Theme } from '@mui/material/styles';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoMessage from '../../../shared/components/InfoMessage';
import ResponsiveCardVegaLite from '../../../shared/components/responsive-card-vegalite';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';
import { setCache } from '../../../shared/utils/localStorageCache';
import { useParams } from 'react-router-dom';


interface ClusterCardProps {
  clusterKey: string;
  cluster: ClusterInsight;
  theme: Theme;
  isSelected: boolean;
  onSelect: (clusterKey: string) => void;
}

interface ClusterChartProps {
  cluster?: ClusterInsight;
}

interface DecisionRule {
  rule: string;
  f1Score: number;
  precision: number;
  recall: number;
  nWorkflowsInCluster: number;
  combinedScore: number;
}

interface DecisionRulesSectionProps {
  rules?: DecisionRule[];
  clusterKey?: string | null;
}

type TableFilter = { column: string; operator: string; value: string };

const splitAnd = (rule: string): string[] => {
  // split on " and " outside braces/quotes (handles sets like {'a','b'})
  const out: string[] = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  let brace = 0;

  for (let i = 0; i < rule.length; i++) {
    const ch = rule[i];
    const token = rule.slice(i, i + 5).toLowerCase(); // " and "

    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;

    if (!inSingle && !inDouble) {
      if (ch === '{') brace++;
      if (ch === '}') brace = Math.max(0, brace - 1);
    }

    if (!inSingle && !inDouble && brace === 0 && token === ' and ') {
      out.push(buf.trim());
      buf = '';
      i += 4;
      continue;
    }

    buf += ch;
  }

  if (buf.trim()) out.push(buf.trim());
  return out;
};

const stripQuotes = (s: string) => {
  const t = s.trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) return t.slice(1, -1);
  return t;
};

const parseSet = (raw: string): string[] => {
  const t = raw.trim();
  const inner = t.startsWith('{') && t.endsWith('}') ? t.slice(1, -1) : t;

  const vals: string[] = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;

    if (ch === ',' && !inSingle && !inDouble) {
      if (buf.trim()) vals.push(stripQuotes(buf.trim()));
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) vals.push(stripQuotes(buf.trim()));
  return vals.filter(Boolean);
};

export const ruleToFilters = (rule: string): TableFilter[] => {
  const clauses = splitAnd(rule);
  const filters: TableFilter[] = [];

  for (const c of clauses) {
    const inMatch = c.match(/^\s*([A-Za-z_][A-Za-z0-9_.]*)\s+IN\s+(.+)\s*$/i);
    if (inMatch) {
      const column = inMatch[1];
      const values = parseSet(inMatch[2]);
      filters.push({ column, operator: 'IN', value: values.join(',') });
      continue;
    }

    const cmpMatch = c.match(/^\s*([A-Za-z_][A-Za-z0-9_.]*)\s*(>=|<=|!=|=|==|>|<)\s*(.+)\s*$/);
    if (cmpMatch) {
      const column = cmpMatch[1];
      const operator = cmpMatch[2] === '==' ? '=' : cmpMatch[2];
      const value = stripQuotes(cmpMatch[3]);
      filters.push({ column, operator, value });
    }
  }

  return filters;
};

const getClusterColorFromKey = (clusterKey: string, theme: Theme) => {
  const colors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
  ];

  const index = Number.parseInt(clusterKey, 10);
  if (Number.isNaN(index)) return theme.palette.primary.main;

  return colors[index % colors.length];
};

const FeatureZScoresChart: React.FC<ClusterChartProps> = ({ cluster }) => {
  if (!cluster?.distinctFeatures?.featureStatistics) return null;

  const featureStats = cluster.distinctFeatures.featureStatistics;
  const featureData = Object.entries(featureStats).map(([featureName, stats]: [string, FeatureStatistic]) => ({
    feature: featureName,
    zScore: stats.zScore ?? 0,
    distinctivenessScore: stats.distinctivenessScore ?? 0,
    valueCategory: stats.valueCategory ?? 'unknown',
  }));

  return (
    <ResponsiveCardVegaLite
      title="Key Performance Indicators"
      actions={false}
      details="Z-Score of each feature in this cluster compared to the overall population. Features with extreme scores (far from zero) are what make this cluster unique."
      spec={{
        description: 'Diverging bar chart - cluster mean vs population',
        mark: { type: 'bar' },
        data: { values: featureData },
        encoding: {
          y: {
            field: 'feature',
            type: 'nominal',
            title: null,
            sort: { field: 'zScore', order: 'descending' },
            axis: { labelFontSize: 12 },
          },
          x: {
            field: 'zScore',
            type: 'quantitative',
            title: 'Z-Score',
          },
          color: {
            field: 'zScore',
            type: 'quantitative',
            scale: {
              range: ['#ff6b6b', '#e8e8e8', '#51cf66'],
            },
            legend: null,
          },
          tooltip: [
            { field: 'feature', type: 'nominal', title: 'Feature' },
            { field: 'zScore', type: 'quantitative', title: 'Z-Score', format: '.3f' },
            { field: 'distinctivenessScore', type: 'quantitative', title: 'Distinctiveness', format: '.3f' },
            { field: 'valueCategory', type: 'nominal', title: 'Category' },
          ],
        },
      }}
    />
  );
};

/** Renders rule text with colored logical/math operators */
const StyledRuleText: React.FC<{ rule: string; color: string }> = ({ rule, color }) => {
  // Split on keywords: IN, and, >=, <=, !=, >, <, =
  const parts = rule.split(/(\b(?:IN|and)\b|>=|<=|!=|>|<|=)/gi);
  return (
    <Box
      sx={{
        fontFamily: 'monospace',
        fontSize: 14,
        lineHeight: 1.8,
        color: 'text.primary',
        backgroundColor: 'rgba(0,0,0,0.15)',
        p: 1.5,
        borderRadius: 1,
      }}
    >
      {parts.map((part, i) => {
        const isKeyword = /^(IN|and|>=|<=|!=|>|<|=)$/i.test(part);
        return isKeyword ? (
          <span key={i} style={{ color, fontWeight: 700 }}>{` ${part} `}</span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </Box>
  );
};

/** Circular donut metric */
const CircularMetric: React.FC<{ label: string; value: number; color: string; size?: number }> = ({
  label, value, color, size = 64,
}) => {
  const percent = Math.round((value ?? 0) * 100);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={size}
          thickness={3}
          sx={{ color: 'action.disabledBackground', position: 'absolute' }}
        />
        <CircularProgress
          variant="determinate"
          value={percent}
          size={size}
          thickness={3}
          sx={{ color }}
        />
      </Box>
      <Typography variant="caption" sx={{ color, fontWeight: 700, mt: 0.5 }}>
        {percent}%
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 10 }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const METRIC_ICONS: Record<string, React.ReactNode> = {
  F1: <BoltIcon sx={{ fontSize: 14 }} />,
  PRECISION: <AdjustIcon sx={{ fontSize: 14 }} />,
  RECALL: <BarChartIcon sx={{ fontSize: 14 }} />,
};

const DecisionRulesSection: React.FC<DecisionRulesSectionProps> = ({ rules, clusterKey }) => {
  const theme = useTheme();
  const { experimentId } = useParams<{ experimentId: string }>();

  const [showAlternatives, setShowAlternatives] = useState(false);

  const { experimentHighlights } = useAppSelector(
    (state: RootState) => state.experimentHighlights
  );

  const clusterData = clusterKey ? experimentHighlights.data?.clusterInsights?.[clusterKey] : null;
  const clusterFeatures = clusterData?.highShapFeatures?.features ?? [];

  if (!rules || rules.length === 0) return null;

  const formatPercent = (value: number) => `${Math.round((value ?? 0) * 100)}%`;
  const clusterColor = clusterKey
    ? getClusterColorFromKey(clusterKey, theme)
    : theme.palette.primary.main;

  const [primaryRule, ...alternativeRules] = rules;

  const primaryRuleKey = useMemo(
    () => `ruleFilter-primary-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );
  const alternativeRuleKeys = useMemo(
    () =>
      alternativeRules.map(
        (_, i) =>
          `ruleFilter-alt-${i}-${Date.now()}-${Math.random().toString(16).slice(2)}`
      ),
    [alternativeRules]
  );  
  return (

    <ResponsiveCardTable title="Decision Rules" showSettings={false} showFullScreenButton={false} details="Tree-based rules that best identify workflows belonging to this cluster. The best rule maximizes a combined score of F1, precision, and recall." >
    <Box sx={{ mb: 4 }}>
      <Stack spacing={2}>
        {/* Primary rule — "Best Rule" */}
        <Card
          sx={{
            p: 2.5,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
            border: `2px dashed ${clusterColor}`,
            boxShadow: 'none',
          }}
        >
          <Stack spacing={2}>
            {/* Header row */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <EmojiEventsOutlinedIcon sx={{ color: clusterColor, fontSize: 20 }} />
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: clusterColor }}
                >
                  Best Rule
                </Typography>
              </Stack>
              <Tooltip title="View workflows">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  component="a"
                  href={`/${experimentId}/monitoring?tab=0&ruleFilterId=${primaryRuleKey}`}
                  rel="noopener noreferrer"
                  onMouseDown={() => {
                    const filters = ruleToFilters(primaryRule.rule);
                    setCache(primaryRuleKey, { filters, clusterFeatures }, 5 * 60 * 1000);
                  }}
                  onClick={() => {
                    const filters = ruleToFilters(primaryRule.rule);
                    setCache(primaryRuleKey, { filters, clusterFeatures }, 5 * 60 * 1000);
                  }}
                >
                  {primaryRule.nWorkflowsInCluster} workflows matched
                </Typography>
              </Tooltip>
            </Stack>

            {/* Styled rule text */}
            <StyledRuleText rule={primaryRule.rule} color={clusterColor} />

            {/* Circular metrics */}
            {/* <Stack
              direction="row"
              spacing={4}
              justifyContent="center"
              sx={{ pt: 1 }}
            >
              {[
                { label: 'F1', value: primaryRule.f1Score },
                { label: 'PRECISION', value: primaryRule.precision },
                { label: 'RECALL', value: primaryRule.recall },
                { label: 'COMBINED', value: primaryRule.combinedScore },
              ].map(metric => (
                <CircularMetric
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  color={clusterColor}
                />
              ))}
            </Stack> */}
          </Stack>
        </Card>

        {/* Alternative rules toggle */}
        {alternativeRules.length > 0 && (
          <Box>
            <Button
              size="small"
              onClick={() => setShowAlternatives(prev => !prev)}
              startIcon={
                showAlternatives
                  ? <KeyboardArrowUpIcon fontSize="small" />
                  : <KeyboardArrowDownIcon fontSize="small" />
              }
              sx={{
                textTransform: 'none',
                px: 0,
                color: 'text.secondary',
              }}
            >
              {showAlternatives
                ? `Hide ${alternativeRules.length} Alternative Rule${alternativeRules.length > 1 ? 's' : ''}`
                : `Show ${alternativeRules.length} Alternative Rule${alternativeRules.length > 1 ? 's' : ''}`}
            </Button>

            <Collapse in={showAlternatives}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {alternativeRules.map((rule, index) => {
                  const key = alternativeRuleKeys[index];
                  return (
                  <Card
                    key={key}
                    sx={{
                      p: 2,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 2,
                      boxShadow: 1,
                    }}
                  >
                    <Stack spacing={1.5}>
                      {/* Styled rule text */}
                      <StyledRuleText rule={rule.rule} color={clusterColor} />

                      {/* Compact inline metrics + matched count */}
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ flexWrap: 'wrap', gap: 1 }}
                      >
                        {/* <Stack direction="row" spacing={2} alignItems="center">
                          {[
                            { label: 'F1', value: rule.f1Score },
                            { label: 'PRECISION', value: rule.precision },
                            { label: 'RECALL', value: rule.recall },
                          ].map(metric => (
                            <Stack key={metric.label} direction="row" alignItems="center" spacing={0.5}>
                              <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                                {METRIC_ICONS[metric.label]}
                              </Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                {metric.label}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {formatPercent(metric.value ?? 0)}
                              </Typography>
                            </Stack>
                          ))}
                        </Stack> */}

                        <Tooltip title="View workflows">
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            component="a"
                            href={`/${experimentId}/monitoring?tab=0&ruleFilterId=${key}`}
                            rel="noopener noreferrer"
                            onMouseDown={() => {
                              const filters = ruleToFilters(rule.rule);
                              setCache(key, { filters, clusterFeatures }, 5 * 60 * 1000);
                            }}
                            onClick={() => {
                              const filters = ruleToFilters(rule.rule);
                              setCache(key, { filters, clusterFeatures }, 5 * 60 * 1000);
                            }}
                          >
                            {rule.nWorkflowsInCluster} workflows matched
                          </Typography>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Card>
                )})}
              </Stack>
            </Collapse>
          </Box>
        )}
      </Stack>
    </Box>
    </ResponsiveCardTable>

  );
};

interface ClusterVsOthersRadarProps {
  cluster?: ClusterInsight;
  clusterColor?: string;
  clusterKey?: string;
}

const ClusterVsOthersRadar: React.FC<ClusterVsOthersRadarProps> = ({ cluster, clusterColor, clusterKey }) => {
  const theme = useTheme();

  if (!cluster?.distinctFeatures?.featureStatistics) return null;

  const featureStats = cluster.distinctFeatures.featureStatistics;
  const entries = Object.entries(featureStats);

  const MIN_AXES = 6;
  const axisCount = Math.max(entries.length, MIN_AXES);
  const angleStep = (2 * Math.PI) / axisCount;
  const startAngle = -Math.PI / 2;
  const color = clusterColor ?? theme.palette.primary.main;
  // const clusterName = clusterKey !== undefined && clusterKey !== null ? `Cluster ${clusterKey}` : 'This Cluster';

  // const clusterName = cluster?.metadata?.clusterName
  //   ? cluster.metadata.clusterName
  //   : clusterKey !== undefined && clusterKey !== null
  //     ? `Cluster ${clusterKey}`
  //     : 'This Cluster';

  const clusterName =
    cluster?.metadata?.clusterName ??
    (clusterKey !== undefined && clusterKey !== null ? `Cluster ${clusterKey}` : 'This Cluster');


  const rawFeatures = [
    ...entries.map(([name, stats]: [string, FeatureStatistic], i) => ({
      name,
      absCluster: Math.abs(stats.clusterMean ?? 0),
      absOthers: Math.abs(stats.otherClustersMean ?? 0),
      rawCluster: stats.clusterMean ?? 0,
      rawOthers: stats.otherClustersMean ?? 0,
      index: i,
    })),
    ...Array.from({ length: Math.max(0, axisCount - entries.length) }, (_, j) => ({
      name: '',
      absCluster: 0,
      absOthers: 0,
      rawCluster: 0,
      rawOthers: 0,
      index: entries.length + j,
    })),
  ];

  const maxVal = Math.max(0.001, ...rawFeatures.flatMap(f => [f.absCluster, f.absOthers]));

  // Polygon data — one row per feature per group, with both raw means for tooltip
  const polygonData = rawFeatures.flatMap(f => {
    const theta = startAngle + f.index * angleStep;
    const cNorm = f.absCluster / maxVal;
    const oNorm = f.absOthers / maxVal;
    return [
      { feature: f.name, group: clusterName, x: cNorm * Math.cos(theta), y: cNorm * Math.sin(theta), rawMean: f.rawCluster, clusterMean: f.rawCluster, othersMean: f.rawOthers, order: f.index, sign: f.rawCluster >= 0 ? 'positive' : 'negative' },
      { feature: f.name, group: 'Others', x: oNorm * Math.cos(theta), y: oNorm * Math.sin(theta), rawMean: f.rawOthers, clusterMean: f.rawCluster, othersMean: f.rawOthers, order: f.index, sign: f.rawOthers >= 0 ? 'positive' : 'negative' },
    ];
  });

  // Concentric grid levels
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridData = gridLevels.flatMap(level =>
    Array.from({ length: axisCount }, (_, i) => ({
      level: String(level),
      x: level * Math.cos(startAngle + i * angleStep),
      y: level * Math.sin(startAngle + i * angleStep),
      order: i,
    }))
  );

  // Spoke lines from center to edge
  const spokeData = rawFeatures.map(f => {
    const theta = startAngle + f.index * angleStep;
    return { x: 0, y: 0, x2: Math.cos(theta), y2: Math.sin(theta) };
  });

  // Feature labels around the perimeter — split by alignment
  const labelR = 1.18;
  const allLabels = rawFeatures.map(f => {
    const theta = startAngle + f.index * angleStep;
    const cos = Math.cos(theta);
    return {
      feature: f.name.length > 12 ? `${f.name.slice(0, 11)}\u2026` : f.name,
      x: labelR * Math.cos(theta),
      y: labelR * Math.sin(theta),
      align: cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center' as string,
    };
  });

  const domain: [number, number] = [-1.4, 1.4];

  return (
    <ResponsiveCardVegaLite
      title="Feature Comparison Radar"
      actions={false}
      details="Spider chart comparing the selected cluster's feature means against all other clusters. Values are normalized by the maximum across both groups."
      spec={{
        layer: [
          // Grid polygons
          {
            data: { values: gridData },
            mark: { type: 'line', interpolate: 'linear-closed', strokeDash: [4, 4], stroke: theme.palette.divider, strokeWidth: 0.5 },
            encoding: {
              x: { field: 'x', type: 'quantitative', axis: null, scale: { domain } },
              y: { field: 'y', type: 'quantitative', axis: null, scale: { domain } },
              detail: { field: 'level', type: 'nominal' },
              order: { field: 'order', type: 'quantitative' },
            },
          },
          // Spokes
          {
            data: { values: spokeData },
            mark: { type: 'rule', stroke: theme.palette.divider, strokeWidth: 0.5 },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              x2: { field: 'x2' },
              y2: { field: 'y2' },
            },
          },
          // Others filled polygon
          {
            data: { values: polygonData.filter(d => d.group === 'Others') },
            mark: { type: 'line', interpolate: 'linear-closed', fill: '#888888', fillOpacity: 0.12, stroke: '#888888', strokeWidth: 1.5, strokeDash: [6, 3] },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              order: { field: 'order', type: 'quantitative' },
            },
          },
          // Cluster filled polygon
          {
            data: { values: polygonData.filter(d => d.group === clusterName) },
            mark: { type: 'line', interpolate: 'linear-closed', fill: color, fillOpacity: 0.25, stroke: color, strokeWidth: 2 },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              order: { field: 'order', type: 'quantitative' },
            },
          },
          // Data points with tooltips
          {
            data: { values: polygonData },
            mark: { type: 'point', filled: true, stroke: '#fff', strokeWidth: 1 },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              color: {
                field: 'group', type: 'nominal',
                scale: { domain: [clusterName, 'Others'], range: [color, '#888888'] },
                legend: { orient: 'bottom', title: null },
              },
              size: {
                field: 'group', type: 'nominal',
                scale: { domain: [clusterName, 'Others'], range: [60, 35] },
                legend: null,
              },
              tooltip: [
                { field: 'feature', type: 'nominal', title: 'Feature' },
                { field: 'clusterMean', type: 'quantitative', title: `${clusterName} Mean`, format: '.3f' },
                { field: 'othersMean', type: 'quantitative', title: 'Others Mean', format: '.3f' },
              ],
            },
          },
          // Labels — left-aligned (features on the right side)
          {
            data: { values: allLabels.filter(l => l.align === 'left') },
            mark: { type: 'text', fontSize: 11, fill: theme.palette.text.secondary, align: 'left', dx: 4 },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              text: { field: 'feature', type: 'nominal' },
            },
          },
          // Labels — right-aligned (features on the left side)
          {
            data: { values: allLabels.filter(l => l.align === 'right') },
            mark: { type: 'text', fontSize: 11, fill: theme.palette.text.secondary, align: 'right', dx: -4 },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              text: { field: 'feature', type: 'nominal' },
            },
          },
          // Labels — center-aligned (features at top/bottom)
          {
            data: { values: allLabels.filter(l => l.align === 'center') },
            mark: { type: 'text', fontSize: 11, fill: theme.palette.text.secondary, align: 'center' },
            encoding: {
              x: { field: 'x', type: 'quantitative' },
              y: { field: 'y', type: 'quantitative' },
              text: { field: 'feature', type: 'nominal' },
            },
          },
        ],
      }}
    />
  );
};

const CorrelationAnalysisChart: React.FC<ClusterChartProps> = ({ cluster }) => {
  const correlation = cluster?.correlationAnalysis;

  if (!correlation || !correlation.removedFeatures || correlation.nRemovedFeatures === 0) {
    return null;
  }

  const rows = Object.entries(correlation.removedFeatures)
    .map(([featureName, info]: [string, { maxRelationship: number; relatedTo: string; allRelationships: string[] }]) => ({
      removedFeature: featureName,
      relatedTo: info?.relatedTo ?? 'unknown',
      maxRelationship: info?.maxRelationship ?? 0,
    }))
    // Group visually by `relatedTo`, and within each group sort by strength desc
    .sort((a, b) => {
      const relCmp = a.relatedTo.localeCompare(b.relatedTo);
      if (relCmp !== 0) return relCmp;
      return b.maxRelationship - a.maxRelationship;
    });

  if (rows.length === 0) return null;

  return (
    <ResponsiveCardVegaLite
      title="Secondary Key Performance Indicators"
      actions={false}
      details="Features removed due to high correlation with a retained feature. Bar length shows the maximum relationship strength."
      spec={{
        description: 'Features removed due to strong correlation',
        mark: { type: 'bar' },
        data: { values: rows },
        encoding: {
          y: {
            field: 'removedFeature',
            type: 'nominal',
            title: 'Removed feature',
            // Preserve the pre-sorted order so items
            // sharing the same `relatedTo` appear together
            sort: null,
          },
          x: {
            field: 'maxRelationship',
            type: 'quantitative',
            title: 'Max relationship strength',
            scale: { domain: [0, 1] },
          },
          color: {
            field: 'relatedTo',
            type: 'nominal',
            title: 'Most related to',
            legend: {
              orient: 'bottom',
            },
          },
          tooltip: [
            { field: 'removedFeature', type: 'nominal', title: 'Removed feature' },
            { field: 'relatedTo', type: 'nominal', title: 'Most related to' },
            { field: 'maxRelationship', type: 'quantitative', title: 'Relationship', format: '.3f' },
          ],
        },
      }}
    />
  );
};


const ClusterCard: React.FC<ClusterCardProps> = ({
  clusterKey,
  cluster,
  theme,
  isSelected,
  onSelect,
}) => {
  const [expandedFeatures, setExpandedFeatures] = useState(false);

  const numWorkflows = cluster.metadata?.nWorkflows ?? 0;
  const proportion = (cluster.metadata?.percentageOfTotal ?? 0) / 100;
  const quality = Number(cluster.modelEvaluation?.modelQualityScore) || 0;
  const features = cluster.highShapFeatures?.features ?? [];
  const clusterLabel = cluster.metadata?.clusterName ?? `Cluster ${clusterKey}`;

  const getFeatureColor = (feature: string, cluster: ClusterInsight) => {
    if (!cluster?.distinctFeatures?.featureStatistics?.[feature]) return '#e8e8e8';

    const zScore = cluster.distinctFeatures.featureStatistics[feature].zScore ?? 0;

    if (zScore < -0.5) return '#ff6b6b';
    if (zScore > 0.5) return '#51cf66';
    return '#e8e8e8';
  };


  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }} >
      <Card
        onClick={() => onSelect(clusterKey)}
        sx={{
          p: 2,
          borderLeft: `4px solid ${getClusterColorFromKey(clusterKey, theme)}`,
          backgroundColor: isSelected ? 'action.selected' : 'background.paper',
          boxShadow: isSelected ? 3 : 1,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          border: isSelected ? `2px solid ${getClusterColorFromKey(clusterKey, theme)}` : 'none',
          '&:hover': {
            boxShadow: 3,
            backgroundColor: isSelected ? 'action.selected' : 'action.hover',
          },
        }}
      >
        <Stack spacing={1.5}>
          {/* Cluster Header */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: getClusterColorFromKey(clusterKey, theme),
              }}
            >
              {/* Cluster {clusterLabel} */}
              {clusterLabel}
              {/* {cluster.metadata?.clusterName ?? `Cluster ${clusterKey}`} */}
            </Typography>
          </Box>

          <Divider />

          {/* Number of Workflows */}
          <Box>
            {/* <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Workflows
            </Typography> */}
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Workflows {numWorkflows}
            </Typography>
          </Box>

          {/* Workflow Proportion */}
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Proportion  {(proportion * 100).toFixed(1)}%
            </Typography>
            
            {/* </Box> */}
          </Box>

          {/* Quality */}
          <Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Quality  {(quality * 100).toFixed(1)}%
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={quality * 100 }
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: theme.palette.action.disabledBackground,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getClusterColorFromKey(clusterKey, theme),
                  },
                }}
              />
            </Box>
          </Box>

          {/* Features with Drill-down */}
          {features.length > 0 && (
            <Box>
              <Button
                onClick={() => setExpandedFeatures(!expandedFeatures)}
                sx={{
                  p: 0,
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: 'primary.main',
                  },
                }}
                endIcon={
                  <ChevronRightIcon
                    sx={{
                      transform: expandedFeatures ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                }
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Representative Metrics
                </Typography>
              </Button>

              <Collapse in={expandedFeatures}>
                <Stack spacing={1} sx={{ mt: 1, pl: 2 }}>
                  {features.map((feature: string, idx: number) => (
                    <Box key={idx}>
                      <Chip 
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: getFeatureColor(feature, cluster),
                              }}
                            />
                            {feature}
                          </Box>
                        }
                        variant="outlined" 
                        sx={{ 
                          color: 'text.primary', 
                          fontWeight: 500,
                        }} 
                      />
                    </Box>
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}
        </Stack>
      </Card>
    </Grid>
  );
};

const AnalysisGroup: React.FC = () => {
  const { experimentHighlights } = useAppSelector(
    (state: RootState) => state.experimentHighlights
  );
  const { data } = experimentHighlights;
  const theme = useTheme();
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  const pcaSpace: PcaSpacePoint[] = useMemo(
    () => (data?.pcaSpace ?? []) as PcaSpacePoint[],
    [data]
  );

  const clusters = useMemo(() => {
    if (!data?.clusterInsights) return [];

    return Object.entries(data.clusterInsights).map(
      ([clusterKey, cluster]) => ({
        clusterKey,
        cluster,
      })
    );

  }, [data]);

  const selectedClusterData = useMemo(
    () => clusters.find(c => c.clusterKey === selectedCluster)?.cluster,
    [clusters, selectedCluster]
  );

  if (!data) return (
    <InfoMessage
      message={'No insights available for this experiment.'}
      type="info"
      icon={<AssessmentIcon sx={{ fontSize: 40, color: 'info.main' }} />}
      fullHeight
    />

  );

  return (
    <Box sx={{ p: 2 }}>
      {/* Cluster Grid Cards */}
      {clusters.length > 0 && (
        <Box sx={{ mb: 4 }}>
         
          <ResponsiveCardTable title={"Cluster Overview"} showSettings={false} showFullScreenButton={false} details="Summary cards for each identified cluster. Click a cluster to explore its features, decision rules, and comparisons." >
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              pb: 1,
            }}
          >
            {clusters.map(({ clusterKey, cluster }) => (
              <Box
                key={clusterKey}
                sx={{ minWidth: 280, flexShrink: 0 }}
              >
                <ClusterCard
                  clusterKey={clusterKey}
                  cluster={cluster}
                  theme={theme}
                  isSelected={selectedCluster === clusterKey}
                  onSelect={setSelectedCluster}
                />
              </Box>
            ))}
          </Box>
          </ResponsiveCardTable>
        </Box>
      )}
      {pcaSpace.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{ mb: 1.5, letterSpacing: 0.6 }}
          >

          </Typography>
          <ResponsiveCardVegaLite
            title="Cluster Distribution"
            actions={false}
            details="PCA projection of all workflows colored by cluster assignment. Each point is a workflow positioned by its first two principal components."
            spec={{
              description: 'PCA projection of workflows colored by cluster',
              mark: { type: 'point', tooltip: true },
              // Clone each datum so Vega can annotate rows without
              // mutating frozen/proxied Redux objects.
              data: { values: pcaSpace.map(p => ({ ...p })) },
              encoding: {
                x: {
                  field: 'PC_1',
                  type: 'quantitative',
                  title: 'PC 1',
                },
                y: {
                  field: 'PC_2',
                  type: 'quantitative',
                  title: 'PC 2',
                },
                color: {
                  field: 'cluster',
                  type: 'nominal',
                  title: 'Cluster',
                  legend: { title: 'Cluster' },
                },
                tooltip: [
                  {
                    field: 'workflowId',
                    type: 'nominal',
                    title: 'Workflow ID',
                  },
                  { field: 'cluster', type: 'nominal', title: 'Cluster' },
                  { field: 'PC_1', type: 'quantitative', title: 'PC 1' },
                  { field: 'PC_2', type: 'quantitative', title: 'PC 2' },
                ],
              },
            }}
          />
        </Box>
      )}  
      {selectedCluster && clusters.length > 0 && (
        <Grid container spacing={2}>
          
          <Grid size={{ xs: 6 }}>
            <Box>
              <FeatureZScoresChart cluster={selectedClusterData ?? undefined} />
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box>
              <CorrelationAnalysisChart cluster={selectedClusterData ?? undefined} />
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <DecisionRulesSection
              rules={selectedClusterData?.decisionTreeRules}
              clusterKey={selectedCluster}
            />
          </Grid>
        </Grid>
        )}
    </Box>
    
  );
};


export default AnalysisGroup;

