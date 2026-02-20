import type React from 'react';
import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { RootState } from '../../../store/store';
import { useAppSelector } from '../../../store/store';
import type { ClusterInsight, PcaSpacePoint } from '../../../shared/models/experiment.highlights.model';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InfoMessage from '../../../shared/components/InfoMessage';
import ResponsiveCardVegaLite from '../../../shared/components/responsive-card-vegalite';
import ResponsiveCardTable from '../../../shared/components/responsive-card-table';


interface ClusterCardProps {
  clusterKey: string;
  cluster: ClusterInsight;
  theme: any;
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

const getClusterColorFromKey = (clusterKey: string, theme: any) => {
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
  const featureData = Object.entries(featureStats).map(([featureName, stats]: [string, any]) => ({
    feature: featureName,
    zScore: stats.zScore ?? 0,
    distinctivenessScore: stats.distinctivenessScore ?? 0,
    valueCategory: stats.valueCategory ?? 'unknown',
  }));

  return (
    <ResponsiveCardVegaLite
      title="Feature Z-Scores"
      actions={false}
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

const DecisionRulesSection: React.FC<DecisionRulesSectionProps> = ({ rules, clusterKey }) => {
  const theme = useTheme();

  if (!rules || rules.length === 0) return null;

   const [showAlternatives, setShowAlternatives] = useState(false);

  const formatPercent = (value: number) => `${Math.round((value ?? 0) * 100)}%`;
  const clusterColor = clusterKey
    ? getClusterColorFromKey(clusterKey, theme)
    : theme.palette.primary.main;

  const [primaryRule, ...alternativeRules] = rules;

  return (

    <ResponsiveCardTable title={" DECISION RULES"} showSettings={false} showFullScreenButton={false} >
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, letterSpacing: 0.6, fontWeight: 700 }}
      >
       
      </Typography>
      <Stack spacing={2}>
        {/* Primary rule */}
        <Card
          sx={{
            p: 2,
            backgroundColor: theme.palette.background.paper,
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <Stack spacing={1.5}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                color: 'text.primary',
                fontSize: 13,
              }}
            >
              {primaryRule.rule}
            </Typography>

            <Stack
              direction="row"
              spacing={3}
              sx={{ mt: 0.5, flexWrap: 'wrap' }}
            >
              {[{
                label: 'F1',
                value: primaryRule.f1Score,
              }, {
                label: 'PRECISION',
                value: primaryRule.precision,
              }, {
                label: 'RECALL',
                value: primaryRule.recall,
              }, {
                label: 'COMBINED',
                value: primaryRule.combinedScore,
              }].map(metric => (
                <Box
                  key={metric.label}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        letterSpacing: 0.8,
                        minWidth: 70,
                      }}
                    >
                      {metric.label}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(metric.value ?? 0) * 100}
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: theme.palette.action.disabledBackground,
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: clusterColor,
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ minWidth: 40, textAlign: 'right', color: 'text.secondary' }}
                    >
                      {formatPercent(metric.value ?? 0)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              {primaryRule.nWorkflowsInCluster} workflows matched
            </Typography>
          </Stack>
        </Card>

        {/* Alternative rules toggle */}
        {alternativeRules.length > 0 && (
          <Box>
            <Button
              size="small"
              onClick={() => setShowAlternatives(prev => !prev)}
              sx={{
                textTransform: 'none',
                px: 0,
                mt: 1,
              }}
            >
              {showAlternatives ? 'Hide Alternative Rules' : `Alternative Rules (${alternativeRules.length})`}
            </Button>

            <Collapse in={showAlternatives}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {alternativeRules.map((rule, index) => (
                  <Card
                    key={index}
                    sx={{
                      p: 2,
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: 1,
                      boxShadow: 1,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'text.primary',
                          fontSize: 13,
                        }}
                      >
                        {rule.rule}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={3}
                        sx={{ mt: 0.5, flexWrap: 'wrap' }}
                      >
                        {[{
                          label: 'F1',
                          value: rule.f1Score,
                        }, {
                          label: 'PRECISION',
                          value: rule.precision,
                        }, {
                          label: 'RECALL',
                          value: rule.recall,
                        }, {
                          label: 'COMBINED',
                          value: rule.combinedScore,
                        }].map(metric => (
                          <Box
                            key={metric.label}
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  letterSpacing: 0.8,
                                  minWidth: 70,
                                }}
                              >
                                {metric.label}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={(metric.value ?? 0) * 100}
                                sx={{
                                  flex: 1,
                                  height: 6,
                                  borderRadius: 999,
                                  backgroundColor: theme.palette.action.disabledBackground,
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: clusterColor,
                                  },
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{ minWidth: 40, textAlign: 'right', color: 'text.secondary' }}
                              >
                                {formatPercent(metric.value ?? 0)}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Stack>

                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', mt: 0.5 }}
                      >
                        {rule.nWorkflowsInCluster} workflows matched
                      </Typography>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}
      </Stack>
    </Box>
    </ResponsiveCardTable>

  );
};

const ClusterVsOthersChart: React.FC<ClusterChartProps> = ({ cluster }) => {
  if (!cluster?.distinctFeatures?.featureStatistics) return null;

  const featureStats = cluster.distinctFeatures.featureStatistics;
  const comparisonData = Object.entries(featureStats)
    .map(([featureName, stats]: [string, any]) => [
      {
        feature: featureName,
        mean: stats.otherClustersMean ?? 0,
        type: 'others',
      },
      {
        feature: featureName,
        mean: stats.clusterMean ?? 0,
        type: 'cluster',
      },
    ])
    .flat();

  if (comparisonData.length === 0) return null;

  return (
    <ResponsiveCardVegaLite
      title="Cluster vs. Others"
      actions={false}
      spec={{
        description: 'Feature means comparison - grouped bar chart',
        mark: { type: 'bar' },
        data: { values: comparisonData },
        encoding: {
          y: {
            field: 'feature',
            type: 'nominal',
            title: null,
            axis: { labelFontSize: 11 },
          },
          x: {
            field: 'mean',
            type: 'quantitative',
            title: 'Mean Value',
          },
          yOffset: {
            field: 'type',
            type: 'nominal',
          },
          color: {
            field: 'type',
            type: 'nominal',
            scale: {
              domain: ['others', 'cluster'],
              range: ['#888888', '#51cf66'],
            },
            legend: { title: null },
          },
          tooltip: [
            { field: 'feature', type: 'nominal', title: 'Feature' },
            { field: 'mean', type: 'quantitative', title: 'Mean', format: '.3f' },
            { field: 'type', type: 'nominal', title: 'Type' },
          ],
        },
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
    .map(([featureName, info]: [string, any]) => ({
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
      title="REMOVED FEATURES CORRELATION"
      actions={false}
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
              Cluster {clusterKey}
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
                  High Impact Features
                </Typography>
              </Button>

              <Collapse in={expandedFeatures}>
                <Stack spacing={1} sx={{ mt: 1, pl: 2 }}>
                  {features.map((feature: string, idx: number) => (
                    <Box key={idx}>
                      <Chip label={feature} variant="outlined" sx={{ color: 'text.primary', fontWeight: 500 }} />
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
         
          <ResponsiveCardTable title={"CLUSTER OVERVIEW"} showSettings={false} showFullScreenButton={false} >
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
            title="CLUSTER DISTRIBUTION"
            actions={false}
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
      <Typography variant="subtitle2" sx={{ mb: 2, letterSpacing: 0.6, fontWeight: 700 }}>
        EXPERIMENT GROUPS
      </Typography>
      
      {selectedCluster && clusters.length > 0 && (
        <Grid container spacing={2}>
          
          <Grid size={{ xs: 6 }}>
            <Box>
              <FeatureZScoresChart cluster={selectedClusterData ?? undefined} />
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box>
              <ClusterVsOthersChart cluster={selectedClusterData ?? undefined} />
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

