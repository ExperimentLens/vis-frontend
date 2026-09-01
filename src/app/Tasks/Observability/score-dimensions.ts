// Config-driven annotation dimensions (Langfuse-style: NUMERIC/CATEGORICAL/
// BOOLEAN scores) rather than one free-typed rating. All names are prefixed
// `human_` so they can be told apart from judge/automated scores wherever
// scores from a trace are read back (EvaluationTab, AllTracesTable, etc).

export type ScoreDimensionType = 'numeric' | 'categorical' | 'boolean';

export interface ScoreDimension {
    name: string;
    label: string;
    type: ScoreDimensionType;
    min?: number;
    max?: number;
    options?: string[];
}

export const SCORE_DIMENSIONS: ScoreDimension[] = [
    { name: 'human_correctness', label: 'Correctness', type: 'numeric', min: 1, max: 5 },
    { name: 'human_helpful', label: 'Helpful', type: 'boolean' },
    {
        name: 'human_escalation_appropriateness',
        label: 'Escalation appropriateness',
        type: 'categorical',
        options: ['Correctly escalated', 'Missed escalation', 'Over-escalated', 'Not applicable'],
    },
    { name: 'human_tone', label: 'Tone', type: 'numeric', min: 1, max: 5 },
    { name: 'human_policy_violation', label: 'Policy violation', type: 'boolean' },
];

export const HUMAN_SCORE_PREFIX = 'human_';

export const isHumanScoreName = (name: string): boolean => name.startsWith(HUMAN_SCORE_PREFIX);

export const dimensionByName = (name: string): ScoreDimension | undefined =>
    SCORE_DIMENSIONS.find(d => d.name === name);

export const dimensionLabel = (name: string): string => dimensionByName(name)?.label ?? name.replace(HUMAN_SCORE_PREFIX, '').replace(/_/g, ' ');
