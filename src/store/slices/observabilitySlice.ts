import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../app/api/api';
import type { TracesResponse } from '../../shared/models/observability/traces-response';
import type { TraceDetail } from '../../shared/models/observability/trace-detail';
import type { Trace } from '../../shared/models/observability/trace';

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
            });
    },
});

type SliceState = { observability: ObservabilityState };

export const selectSessionsMap = (state: SliceState) => state.observability.sessions;

export const selectExperimentTracesLoading = (workflowIds: string[]) => (state: SliceState) =>
    workflowIds.some(id => state.observability.sessions[id]?.loading);

export default observabilitySlice.reducer;
