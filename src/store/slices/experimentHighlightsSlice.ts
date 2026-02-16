import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../app/api/api";
import { ExperimentHighlightsResponse } from "../../shared/models/experiment.highlights.model";

interface IExperimentHighlightsState {
    experimentHighlights: {
        data: ExperimentHighlightsResponse | null
        loading: boolean
        error: string | null
    }
}

const initialState: IExperimentHighlightsState = {
    experimentHighlights: {
        data: null,
        loading: false,
        error: null
    }
};

export const experimentHighlightsSlice = createSlice({
    name: "experimentHighlights",
    initialState,
    reducers: {
    },
    extraReducers: (builder) => {
        builder.addCase(fetchExperimentHighlights.pending, (state) => {
            state.experimentHighlights.loading = true;
            state.experimentHighlights.error = null;
        })
        .addCase(fetchExperimentHighlights.fulfilled, (state, action) => {
            state.experimentHighlights.loading = false;
            state.experimentHighlights.data = action.payload;
            state.experimentHighlights.error = null;
        })
        .addCase(fetchExperimentHighlights.rejected, (state, action) => {
            state.experimentHighlights.loading = false;
            state.experimentHighlights.error = action.error.message || "Failed to fetch experiment highlights";
        });
    }
});

export const fetchExperimentHighlights = createAsyncThunk(
    "experimentHighlights/fetchExperimentHighlights",
    async (experimentId: string) => {
        const requestUrl = `explainability/${experimentId}/experiment-highlights`;
        const response = await api.post<ExperimentHighlightsResponse>(requestUrl);
        return response.data;
    }
);

