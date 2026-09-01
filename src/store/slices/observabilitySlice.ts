import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../app/api/api';
import type { TracesResponse } from '../../shared/models/observability/traces-response';
import type { TraceDetail } from '../../shared/models/observability/trace-detail';
import type { Trace } from '../../shared/models/observability/trace';
import type { Score } from '../../shared/models/observability/score';
import type { ScoreCreateRequest } from '../../shared/models/observability/score-create-request';
import type { ScoresResponse } from '../../shared/models/observability/scores-response';

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
    // Project-wide annotation listing — powers an "all annotations" browse view,
    // independent of any single trace/session being loaded.
    annotations: {
        data: Score[];
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
    annotations: {
        data: [],
        loading: false,
        error: null,
    },
};

export const getTraces = createAsyncThunk<TracesResponse, { projectId: string; sessionId?: string; userId?: string; }>(
    'observability/getTraces',
    async ({ projectId, sessionId, userId }, { rejectWithValue }) => {
        try {
            const response = await api.get('/observability/traces', {
                params: { projectId, sessionId, userId },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue((error as { response?: { data?: unknown } })?.response?.data);
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
            return rejectWithValue((error as { response?: { data?: unknown } })?.response?.data);
        }
    }
);

export const fetchSessionTraceDetails = createAsyncThunk<
    { workflowId: string; details: TraceDetail[] },
    { projectId: string; experimentId: string; workflowId: string },
    { rejectValue: string }
>(
    'observability/fetchSessionTraceDetails',
    async ({ projectId, experimentId, workflowId }, { rejectWithValue }) => {
        try {
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
            return rejectWithValue(
                (error as { response?: { data?: string } })?.response?.data ?? 'Failed to load session traces',
            );
        }
    },
    {
        condition: ({ workflowId }, { getState }) => {
            const state = getState() as { observability: ObservabilityState };

            return !state.observability.sessions[workflowId]?.loading;
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

            return response.data as Score;
        } catch (error) {
            return rejectWithValue(
                (error as { response?: { data?: string } })?.response?.data ?? 'Failed to save annotation',
            );
        }
    },
);

// Project-wide annotation listing (not scoped to a single trace) — the data
// source for an "all annotations" browse view across the whole experiment.
export const fetchAnnotations = createAsyncThunk<
    ScoresResponse,
    { projectId: string; traceId?: string; name?: string; page?: number; limit?: number },
    { rejectValue: string }
>(
    'observability/fetchAnnotations',
    async ({ projectId, traceId, name, page, limit }, { rejectWithValue }) => {
        try {
            const response = await api.get('/observability/scores', {
                params: { projectId, traceId, name, page, limit },
            });

            return response.data as ScoresResponse;
        } catch (error) {
            return rejectWithValue(
                (error as { response?: { data?: string } })?.response?.data ?? 'Failed to load annotations',
            );
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

                // And into the project-wide annotations bucket — this is the one
                // TracesAccordion's badges actually key off of (the trace list
                // endpoint's own `scores` field is id-only, not full objects).
                state.annotations.data = [...state.annotations.data, score];
            })
            .addCase(fetchAnnotations.pending, (state) => {
                state.annotations.loading = true;
                state.annotations.error = null;
            })
            .addCase(fetchAnnotations.fulfilled, (state, action) => {
                state.annotations.loading = false;
                state.annotations.data = action.payload.data ?? [];
            })
            .addCase(fetchAnnotations.rejected, (state, action) => {
                state.annotations.loading = false;
                state.annotations.error = (action.payload as string) ?? 'Failed to load annotations';
            });
    },
});

type SliceState = { observability: ObservabilityState };

export const selectSessionsMap = (state: SliceState) => state.observability.sessions;

export const selectExperimentTracesLoading = (workflowIds: string[]) => (state: SliceState) =>
    workflowIds.some(id => state.observability.sessions[id]?.loading);

export const selectAnnotations = (state: SliceState) => state.observability.annotations;

export default observabilitySlice.reducer;
