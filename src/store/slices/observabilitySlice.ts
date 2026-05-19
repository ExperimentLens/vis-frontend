import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../app/api/api';
import { TracesResponse } from '../../shared/models/observability/traces-response';
import { TraceDetail } from '../../shared/models/observability/trace-detail';

interface ObservabilityState {
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
};

export const getTraces = createAsyncThunk<TracesResponse, { projectId: string; sessionId?: string; userId?: string; }>(
    'observability/getTraces',
    async ({ projectId, sessionId, userId }, { rejectWithValue }) => {
        try {
            const response = await api.get('/observability/traces', {
                params: { projectId, sessionId, userId },
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
    }
);

export const getTrace = createAsyncThunk<TraceDetail, string>(
    'observability/getTrace',
    async (traceId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/observability/traces/${traceId}`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response.data);
        }
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
            });
    },
});

export default observabilitySlice.reducer;
