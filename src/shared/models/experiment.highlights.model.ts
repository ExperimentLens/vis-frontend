export type PcaSpacePoint = {
  workflowId: string;
  PC_1: number;
  PC_2: number;
  cluster: number;
};

export type ExperimentHighlightsResponse = {
  success: boolean;
  message: string;
  elapsedTime: number;
  clusterInsights: Record<string, ClusterInsight>;
  // Optional PCA projection of workflows in cluster space
  pcaSpace?: PcaSpacePoint[];
};

export type ClusterInsight = {
  clusterId?: number;
  metadata: {
    nWorkflows: number;
    percentageOfTotal: number;
    medoidWorkflowId: string;
    medoidIndex: number;
  };
  featureSelection?: {
    nFeaturesSelected: number;
    nMetricsTotal: number;
    selectedFeatures: string[];
    featureStatistics: Record<string, FeatureStatistic>;
  };
  modelEvaluation?: {
    testAuc?: string | number;
    balancedAccuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    modelQualityScore?: string | number;
    qualityInterpretation?: string;
    confusionMatrix?: Partial<Record<
      'truePositives' | 'trueNegatives' | 'falsePositives' | 'falseNegatives',
      number
    >>;
  };
  highShapFeatures?: {
    features: string[];
    featureStatistics: Record<string, FeatureStatistic>;
  };
  correlationAnalysis?: {
    nRemovedFeatures: number;
    removedFeatures: Record<string, {
      maxRelationship: number;
      relatedTo: string;
      allRelationships: string[];
    }>;
  };
  tradeOffAnalysis?: {
    nTotalTradeoffs?: number;
    nStrongTradeoffs?: number;
    strongThreshold?: number;
    strongTradeoffs?: Array<{
      metric1: string;
      metric2: string;
      relationshipType: string;
      relationshipStrength: number;
      isTradeoff: number;
    }>;
  };
  decisionTreeRules?: Array<{
    rule: string;
    f1Score: number;
    precision: number;
    recall: number;
    nWorkflowsInCluster: number;
    combinedScore: number;
  }>;
  distinctFeatures?: {
    nDistinctFeatures: number;
    features: string[];
    featureStatistics: Record<string, FeatureStatistic>;
  };
};

export type FeatureStatistic = {
  clusterMean: number;
  clusterStd?: number;
  otherClustersMean: number;
  otherClustersStd?: number;
  valueCategory: string;
  distinctivenessScore: number;
  zScore: number;
};
