import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../app/api/api';

// Mirrors explainabilityService.proto's RagAttributionEntry / RagCounterfactual /
// ExplanationsResponse rag_* fields, as printed to JSON by protobuf-java's JsonFormat
// (snake_case proto fields -> lowerCamelCase JSON keys). Field names are intentionally
// identical to the Java/Python side - no renaming across hops.
export interface RagAttributionEntry {
  chunkLabel: string;
  source: string;
  text: string;
  score: number;
}

export interface RagCounterfactual {
  topChunkLabel: string;
  originalAnswer: string;
  counterfactualAnswer: string;
  changed: boolean;
  similarityScore: number;
}

export interface RagExplanation {
  ragOutput: string;
  ragAttribution: RagAttributionEntry[];
  ragHeatmap: string;
  ragCounterfactual?: RagCounterfactual;
}

export interface FetchRagExplanationPayload {
  experimentId: string;
  runId: string;
  exampleId: number;
  runCounterfactual?: boolean;
}

// POST /api/rag-explainability/{experimentId}/{runId}/{exampleId}
// "Explain this answer" - user-triggered, not run automatically on the grid.
export const fetchRagExplanation = createAsyncThunk(
  'ragExplainability/fetch_explanation',
  async (payload: FetchRagExplanationPayload) => {
    const requestUrl = `rag-explainability/${payload.experimentId}/${payload.runId}/${payload.exampleId}`;
    const response = await api.post<RagExplanation>(requestUrl, {
      run_counterfactual: payload.runCounterfactual ?? true,
    });

    return response.data;
  }
);
