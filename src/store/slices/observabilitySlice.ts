import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../app/api/api';
import type { TracesResponse } from '../../shared/models/observability/traces-response';
import type { TraceDetail } from '../../shared/models/observability/trace-detail';
import type { Trace } from '../../shared/models/observability/trace';
import type { Score } from '../../shared/models/observability/score';
import type { ScoreCreateRequest } from '../../shared/models/observability/score-create-request';
import type { IssueScanRequest, IssueScanResponse } from '../../shared/models/observability/issue-scan';
import { LANGFUSE_PROJECT_TAG } from '../../shared/models/observability/agentic-conventions';

// The API's error body is a Spring-style object ({ timestamp, status, error,
// message, path, ... }), not a plain string — pull the human-readable message
// out of it so slice state (typed `string | null`) never ends up holding an
// object that React would choke on if rendered directly.
const extractErrorMessage = (error: unknown, fallback: string): string => {
    const data = (error as { response?: { data?: unknown } })?.response?.data;

    if (typeof data === 'string' && data.length > 0) return data;
    if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
        return (data as { message: string }).message;
    }

    return fallback;
};

// The Langfuse project comes from the open experiment's tag (written by the SDK).
// Undefined is fine: axios drops it, and Langfuse resolves the project from the
// API keys vis-api uses.
const projectIdOf = (getState: () => unknown): string | undefined => {
    const state = getState() as {
        progressPage?: { experiment?: { data?: { tags?: Record<string, string> } | null } };
    };

    return state.progressPage?.experiment?.data?.tags?.[LANGFUSE_PROJECT_TAG] || undefined;
};

export interface SessionTraces {
    traceIds: string[];
    details: TraceDetail[];
    loading: boolean;
    error: string | null;
}

export interface ObservabilityState {
    traces: {
        data: TracesResponse | null;
        loading: boolean;
        error: string | null;
    };
    trace: {
        data: TraceDetail | null;
        loading: boolean;
        error: string | null;
    };
    // Keyed by workflowId (= sessionId): full trace details for every trace in
    // a session, fanned out from getTraces -> getTrace. Powers experiment-level
    // aggregates without clobbering the single-trace `trace` bucket above.
    sessions: Record<string, SessionTraces>;
    // True while fetchExperimentTraceDetails is filling `sessions` for a whole experiment.
    experimentTracesLoading: boolean;
    // Results of the most recent local-LLM "detect issues" scan — session-only,
    // not persisted server-side (unlike annotations, which are Langfuse scores).
    issueScan: {
        data: IssueScanResponse | null;
        loading: boolean;
        error: string | null;
    };
}

const initialState: ObservabilityState = {
    traces: {
        data: null,
        loading: false,
        error: null,
    },
    trace: {
        data: null,
        loading: false,
        error: null,
    },
    sessions: {},
    experimentTracesLoading: false,
    issueScan: {
        data: null,
        loading: false,
        error: null,
    },
};

export const getTraces = createAsyncThunk<TracesResponse, { sessionId?: string; userId?: string; }>(
    'observability/getTraces',
    async ({ sessionId, userId }, { getState, rejectWithValue }) => {
        try {
            const projectId = projectIdOf(getState);
            const response = await api.get('/observability/traces', {
                params: { projectId, sessionId, userId },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to load traces'));
        }
    }
);

export const getTrace = createAsyncThunk<TraceDetail, string>(
    'observability/getTrace',
    async (traceId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/observability/traces/${traceId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to load trace'));
        }
    }
);

// A session is loaded once a fetch for it succeeded; later reads come from the store.
const isLoaded = (session: SessionTraces | undefined) => Boolean(session && !session.loading && !session.error);

export const fetchSessionTraceDetails = createAsyncThunk<
    { workflowId: string; details: TraceDetail[] },
    // force refetches a session that is already loaded.
    { experimentId: string; workflowId: string; force?: boolean },
    { rejectValue: string }
>(
    'observability/fetchSessionTraceDetails',
    async ({ experimentId, workflowId }, { getState, rejectWithValue }) => {
        try {
            const projectId = projectIdOf(getState);
            const listResp = await api.get('/observability/traces', {
                params: { projectId, userId: experimentId, sessionId: workflowId },
            });
            const traces: Trace[] = listResp.data?.data ?? [];
            const details = await Promise.all(
                traces.map(t =>
                    api.get(`/observability/traces/${t.id}`).then(r => r.data as TraceDetail),
                ),
            );

            return { workflowId, details };
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to load session traces'));
        }
    },
    {
        condition: ({ workflowId, force }, { getState }) => {
            const session = (getState() as { observability: ObservabilityState }).observability.sessions[workflowId];

            return !session?.loading && (force || !isLoaded(session));
        },
    }
);

// Every trace of an experiment in one request, filed into `sessions` by run
// (sessionId = workflowId). Runs without traces get an empty bucket, so they
// count as loaded too.
export const fetchExperimentTraceDetails = createAsyncThunk<
    TraceDetail[],
    // force refetches even when every run is already loaded.
    { experimentId: string; workflowIds: string[]; force?: boolean },
    { rejectValue: string }
>(
    'observability/fetchExperimentTraceDetails',
    async ({ experimentId }, { getState, rejectWithValue }) => {
        try {
            const projectId = projectIdOf(getState);
            const response = await api.get('/observability/traces/details', {
                params: { projectId, userId: experimentId },
            });

            return response.data as TraceDetail[];
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to load session traces'));
        }
    },
    {
        condition: ({ workflowIds, force }, { getState }) => {
            const { experimentTracesLoading, sessions } = (getState() as { observability: ObservabilityState }).observability;

            return !experimentTracesLoading && (force || workflowIds.some(id => !isLoaded(sessions[id])));
        },
    }
);

// Attaches a human annotation to a trace, or to one observation within it when
// `request.observationId` is set. `workflowId` is carried alongside purely so
// the reducer can find the right session bucket to merge the new score into —
// it isn't part of the Langfuse-facing request body.
export const createAnnotation = createAsyncThunk<
    Score,
    { workflowId: string; request: ScoreCreateRequest },
    { rejectValue: string }
>(
    'observability/createAnnotation',
    async ({ request }, { rejectWithValue }) => {
        try {
            const response = await api.post('/observability/scores', request);
            const created = (response.data ?? {}) as Partial<Score>;

            // Langfuse's create-score endpoint can respond with just `{ id }`, so
            // fall back to what we sent — otherwise the reducer can't match the
            // score to its trace/span and the filters that pick out human
            // annotations (by name / observationId) drop it.
            return {
                id: created.id ?? `local-${Date.now()}`,
                traceId: created.traceId ?? request.traceId,
                name: created.name ?? request.name,
                value: created.value ?? request.value ?? null,
                stringValue: created.stringValue ?? request.stringValue ?? null,
                dataType: created.dataType ?? request.dataType,
                observationId: created.observationId ?? request.observationId ?? '',
                timestamp: created.timestamp ?? new Date().toISOString(),
                comment: created.comment ?? request.comment ?? '',
            } as Score;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to save annotation'));
        }
    },
);

// Runs a local Ollama model as a judge over a batch of traces (MLflow's
// "Detect Issues", but pointed at whatever's on localhost:11434 instead of a
// hosted provider). Session-only: results aren't written back as Langfuse
// scores, so a page refresh clears them.
export const detectIssues = createAsyncThunk<
    IssueScanResponse,
    IssueScanRequest,
    { rejectValue: string }
>(
    'observability/detectIssues',
    async (request, { rejectWithValue }) => {
        try {
            const response = await api.post('/observability/detect-issues', request);

            return response.data as IssueScanResponse;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Issue scan failed — is Ollama running?'));
        }
    },
);

const observabilitySlice = createSlice({
    name: 'observability',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getTraces.pending, (state) => {
                state.traces.loading = true;
                state.traces.error = null;
            })
            .addCase(getTraces.fulfilled, (state, action) => {
                state.traces.loading = false;
                state.traces.data = action.payload;
            })
            .addCase(getTraces.rejected, (state, action) => {
                state.traces.loading = false;
                state.traces.error = action.payload as string;
            })
            .addCase(getTrace.pending, (state) => {
                state.trace.loading = true;
                state.trace.error = null;
            })
            .addCase(getTrace.fulfilled, (state, action) => {
                state.trace.loading = false;
                state.trace.data = action.payload;
            })
            .addCase(getTrace.rejected, (state, action) => {
                state.trace.loading = false;
                state.trace.error = action.payload as string;
            })
            .addCase(fetchSessionTraceDetails.pending, (state, action) => {
                const { workflowId } = action.meta.arg;

                state.sessions[workflowId] = {
                    traceIds: state.sessions[workflowId]?.traceIds ?? [],
                    details: state.sessions[workflowId]?.details ?? [],
                    loading: true,
                    error: null,
                };
            })
            .addCase(fetchSessionTraceDetails.fulfilled, (state, action) => {
                const { workflowId, details } = action.payload;

                state.sessions[workflowId] = {
                    traceIds: details.map(d => d.id),
                    details,
                    loading: false,
                    error: null,
                };
            })
            .addCase(fetchSessionTraceDetails.rejected, (state, action) => {
                const { workflowId } = action.meta.arg;

                state.sessions[workflowId] = {
                    traceIds: state.sessions[workflowId]?.traceIds ?? [],
                    details: state.sessions[workflowId]?.details ?? [],
                    loading: false,
                    error: (action.payload as string) ?? 'Failed to load session traces',
                };
            })
            .addCase(fetchExperimentTraceDetails.pending, (state, action) => {
                state.experimentTracesLoading = true;
                action.meta.arg.workflowIds.forEach(id => {
                    state.sessions[id] = {
                        traceIds: state.sessions[id]?.traceIds ?? [],
                        details: state.sessions[id]?.details ?? [],
                        loading: true,
                        error: null,
                    };
                });
            })
            .addCase(fetchExperimentTraceDetails.fulfilled, (state, action) => {
                const bySession: Record<string, TraceDetail[]> = {};

                action.payload.forEach(detail => {
                    if (detail.sessionId) (bySession[detail.sessionId] ??= []).push(detail);
                });

                state.experimentTracesLoading = false;
                new Set([...action.meta.arg.workflowIds, ...Object.keys(bySession)]).forEach(id => {
                    const details = bySession[id] ?? [];

                    state.sessions[id] = { traceIds: details.map(d => d.id), details, loading: false, error: null };
                });
            })
            .addCase(fetchExperimentTraceDetails.rejected, (state, action) => {
                state.experimentTracesLoading = false;
                action.meta.arg.workflowIds.forEach(id => {
                    state.sessions[id] = {
                        traceIds: state.sessions[id]?.traceIds ?? [],
                        details: state.sessions[id]?.details ?? [],
                        loading: false,
                        error: action.payload ?? 'Failed to load session traces',
                    };
                });
            })
            .addCase(createAnnotation.fulfilled, (state, action) => {
                const { workflowId } = action.meta.arg;
                const score = action.payload;
                const session = state.sessions[workflowId];
                const sessionTrace = session?.details.find(d => d.id === score.traceId);

                if (sessionTrace) {
                    sessionTrace.scores = [...(sessionTrace.scores ?? []), score];
                }

                // Also merge into the single-trace bucket the Workflow Tab reads from,
                // if it happens to be the same trace.
                if (state.trace.data && state.trace.data.id === score.traceId) {
                    state.trace.data.scores = [...(state.trace.data.scores ?? []), score];
                }

                // And into the trace LIST bucket (TracesAccordion's "Session Traces"),
                // so its annotated-count badge updates without a refetch. `Trace.scores`
                // is typed as string[] (score ids) but TracesAccordion already reads it
                // defensively, so pushing the full Score object here is safe at runtime.
                const listTrace = state.traces.data?.data.find(t => t.id === score.traceId);

                if (listTrace) {
                    listTrace.scores = [...(listTrace.scores ?? []), score] as unknown as string[];
                }
            })
            .addCase(detectIssues.pending, (state) => {
                state.issueScan.loading = true;
                state.issueScan.error = null;
            })
            .addCase(detectIssues.fulfilled, (state, action) => {
                state.issueScan.loading = false;
                state.issueScan.data = action.payload;
            })
            .addCase(detectIssues.rejected, (state, action) => {
                state.issueScan.loading = false;
                state.issueScan.error = (action.payload as string) ?? 'Issue scan failed';
            });
    },
});

type SliceState = { observability: ObservabilityState };

export const selectSessionsMap = (state: SliceState) => state.observability.sessions;

export const selectExperimentTracesLoading = (workflowIds: string[]) => (state: SliceState) =>
    workflowIds.some(id => state.observability.sessions[id]?.loading);

export const selectIssueScan = (state: SliceState) => state.observability.issueScan;

export default observabilitySlice.reducer;
