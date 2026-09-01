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

// Some scores in the wild (automated/system ones, mostly) come back from
// Langfuse with `name: null` rather than an empty string — guard against
// that here so every caller gets a safe `false`/fallback instead of a
// TypeError, rather than each call site having to remember to check first.
export const isHumanScoreName = (name: string | null | undefined): boolean =>
    typeof name === 'string' && name.startsWith(HUMAN_SCORE_PREFIX);

export const dimensionByName = (name: string | null | undefined): ScoreDimension | undefined =>
    typeof name === 'string' ? SCORE_DIMENSIONS.find(d => d.name === name) : undefined;

export const dimensionLabel = (name: string | null | undefined): string => {
    if (typeof name !== 'string') return 'unknown';

    return dimensionByName(name)?.label ?? name.replace(HUMAN_SCORE_PREFIX, '').replace(/_/g, ' ');
};
