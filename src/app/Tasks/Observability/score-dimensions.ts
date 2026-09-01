// Config-driven annotation dimensions (Langfuse-style: NUMERIC/CATEGORICAL/
// BOOLEAN scores) rather than one free-typed rating. All names are prefixed
// `human_` so they can be told apart from judge/automated scores wherever
// scores from a trace are read back (EvaluationTab, AllTracesTable, etc).

export type ScoreDimensionType = 'numeric' | 'categorical' | 'boolean';

// RAG semantics: 'bad' is what a reviewer should actually act on, 'warn' is
// borderline/worth a glance, 'good' is nothing to see. Kept as a 3-state
// scale (not just pass/fail) since e.g. a 3/5 correctness score isn't a
// failure, but it's not "fine" either.
export type ReviewTone = 'good' | 'warn' | 'bad';

export interface ScoreDimension {
    name: string;
    label: string;
    type: ScoreDimensionType;
    min?: number;
    max?: number;
    options?: string[];
    /** Numeric only: value >= goodAt is 'good', >= warnAt is 'warn', else 'bad'. */
    goodAt?: number;
    warnAt?: number;
    /** Boolean only: which raw value (1 or 0) is the problem case. */
    badWhen?: 0 | 1;
    /** Categorical only: which option strings are 'bad' / 'warn'. */
    badOptions?: string[];
    warnOptions?: string[];
}

export const SCORE_DIMENSIONS: ScoreDimension[] = [
    { name: 'human_correctness', label: 'Correctness', type: 'numeric', min: 1, max: 5, goodAt: 4, warnAt: 3 },
    { name: 'human_helpful', label: 'Helpful', type: 'boolean', badWhen: 0 },
    {
        name: 'human_escalation_appropriateness',
        label: 'Escalation appropriateness',
        type: 'categorical',
        options: ['Correctly escalated', 'Missed escalation', 'Over-escalated', 'Not applicable'],
        badOptions: ['Missed escalation'],
        warnOptions: ['Over-escalated'],
    },
    { name: 'human_tone', label: 'Tone', type: 'numeric', min: 1, max: 5, goodAt: 4, warnAt: 3 },
    { name: 'human_policy_violation', label: 'Policy violation', type: 'boolean', badWhen: 1 },
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

export interface ToneableScore {
    name: string | null;
    value: number | null;
    stringValue?: string | null;
}

/** RAG tone for one score, from its dimension's configured thresholds. Any
 * score whose dimension isn't in SCORE_DIMENSIONS (unknown/legacy name) —
 * or that has no thresholds configured — reads as 'good' (nothing to flag),
 * not 'bad', so an unrecognized score never falsely raises an alarm. */
export const scoreTone = (score: ToneableScore): ReviewTone => {
    const dim = dimensionByName(score.name);

    if (!dim) return 'good';

    if (dim.type === 'boolean') {
        if (dim.badWhen === undefined) return 'good';

        return score.value === dim.badWhen ? 'bad' : 'good';
    }

    if (dim.type === 'categorical') {
        const v = score.stringValue;

        if (v && dim.badOptions?.includes(v)) return 'bad';
        if (v && dim.warnOptions?.includes(v)) return 'warn';

        return 'good';
    }

    if (dim.type === 'numeric') {
        if (score.value === null || score.value === undefined) return 'good';
        if (dim.goodAt === undefined && dim.warnAt === undefined) return 'good';
        if (dim.goodAt !== undefined && score.value >= dim.goodAt) return 'good';
        if (dim.warnAt !== undefined && score.value >= dim.warnAt) return 'warn';

        return 'bad';
    }

    return 'good';
};

export const needsReview = (score: ToneableScore): boolean => scoreTone(score) !== 'good';

/** Worst tone across a set of scores — 'bad' beats 'warn' beats 'good' —
 * for rolling a whole trace/step's annotations up into one badge color. */
export const worstTone = (tones: ReviewTone[]): ReviewTone => {
    if (tones.includes('bad')) return 'bad';
    if (tones.includes('warn')) return 'warn';

    return 'good';
};

export const TONE_COLOR: Record<ReviewTone, string> = {
    good: '#16a34a',
    warn: '#ed6c02',
    bad: '#dc2626',
};

export const TONE_LABEL: Record<ReviewTone, string> = {
    good: 'Good',
    warn: 'Needs a look',
    bad: 'Needs review',
};
