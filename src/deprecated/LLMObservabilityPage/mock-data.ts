// Static mock that mirrors the shape produced by `llm-ollama.py`.
// Replace these exports with backend-driven Redux selectors when wiring real
// MLflow trace + assessment APIs. The UI consumes this module directly.

export type SpanType = 'CHAIN' | 'RETRIEVAL' | 'EMBEDDING' | 'LLM' | 'TOOL';

export interface ISpan {
  id: string;
  parentId: string | null;
  name: string;
  type: SpanType;
  startMs: number;   // relative to trace start
  endMs: number;     // relative to trace start
  status: 'OK' | 'ERROR';
  attributes: Record<string, string | number | boolean>;
}

export interface IAssessment {
  name: string;
  kind: 'judge' | 'scorer';
  value: 'yes' | 'no' | number;
  passed?: boolean;
  rationale: string;
}

export interface IRetrievedDoc {
  source: string;
  score: number;
  text: string;
}

export interface ITrace {
  id: string;
  runId: string;
  runName: string;
  ragName: string;
  promptName: string;
  model: string;
  question: string;
  groundTruth: string;
  answer: string;
  prompt: string;
  retrieved: IRetrievedDoc[];
  totalLatencyMs: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  status: 'OK' | 'ERROR';
  startedAt: string; // ISO
  spans: ISpan[];
  assessments: IAssessment[];
}

export interface ILLMRunSummary {
  runId: string;
  runName: string;
  ragName: string;
  promptName: string;
  chunkSize: number;
  topK: number;
  searchType: 'similarity' | 'mmr';
  temperature: number;
  evalSize: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  avgTotalTokens: number;
  avgTokenF1: number;
  avgContainsTruth: number;
  avgGroundednessPassed: number;
  avgRelevancePassed: number;
  avgConcisenessPassed: number;
  avgKeywordPresencePassed: number;
  avgExactMatchScorerPassed: number;
  avgLatencyCheckPassed: number;
  judgePassRate: number;
  estCostUsd: number;
}

const PROMPT_TEMPLATES: Record<string, string> = {
  prompt_01: 'Answer using only the context.\n\nContext:\n{context}\n\nQuestion: {question}',
  prompt_02: 'You are a precise assistant. Use only the context.\n\nContext:\n{context}\n\nQuestion: {question}',
  prompt_03: 'Answer briefly and faithfully from the context.\n\nContext:\n{context}\n\nQuestion: {question}',
  prompt_04: 'Give a one-sentence grounded answer.\n\nContext:\n{context}\n\nQuestion: {question}',
  prompt_05: "If the answer is missing, say 'Not found in context'.\n\nContext:\n{context}\n\nQuestion: {question}",
};

export const MOCK_PROMPT_TEMPLATES = PROMPT_TEMPLATES;

export const MOCK_QUESTIONS = [
  {
    id: 'q1',
    question: 'What does RAG combine?',
    groundTruth: 'information retrieval with language-model generation',
  },
  {
    id: 'q2',
    question: 'What can tracing capture?',
    groundTruth: 'intermediate steps such as retrieval, prompt assembly, model calls, latency, tokens, and outputs',
  },
  {
    id: 'q3',
    question: 'What should stay the same across all prompt variants in a benchmark?',
    groundTruth: 'the evaluation set',
  },
  {
    id: 'q4',
    question: 'Name two things LLM experiments commonly log.',
    groundTruth: 'correctness and latency',
  },
];

const buildSpans = (latencyMs: number, retrievalMs: number, llmMs: number): ISpan[] => {
  const formatMs = Math.max(2, latencyMs - retrievalMs - llmMs - 8);
  let cursor = 0;
  const spans: ISpan[] = [];

  spans.push({
    id: 'root',
    parentId: null,
    name: 'run_single_example',
    type: 'CHAIN',
    startMs: 0,
    endMs: latencyMs,
    status: 'OK',
    attributes: { trace: 'root' },
  });

  cursor = 4;
  spans.push({
    id: 'retrieve',
    parentId: 'root',
    name: 'retrieve_docs',
    type: 'RETRIEVAL',
    startMs: cursor,
    endMs: cursor + retrievalMs,
    status: 'OK',
    attributes: {
      'retriever.search_type': 'similarity',
      'retriever.top_k': 2,
      'retriever.docs_returned': 2,
    },
  });

  spans.push({
    id: 'embed',
    parentId: 'retrieve',
    name: 'embed_query',
    type: 'EMBEDDING',
    startMs: cursor + 1,
    endMs: cursor + Math.max(8, retrievalMs * 0.45),
    status: 'OK',
    attributes: {
      'embedding.model': 'sentence-transformers/all-MiniLM-L6-v2',
      'embedding.dim': 384,
    },
  });

  cursor += retrievalMs + 2;
  spans.push({
    id: 'format',
    parentId: 'root',
    name: 'format_context',
    type: 'TOOL',
    startMs: cursor,
    endMs: cursor + formatMs,
    status: 'OK',
    attributes: { 'context.length_chars': 412 },
  });

  cursor += formatMs + 2;
  spans.push({
    id: 'llm',
    parentId: 'root',
    name: 'call_llm',
    type: 'LLM',
    startMs: cursor,
    endMs: cursor + llmMs,
    status: 'OK',
    attributes: {
      'llm.model': 'ollama/llama3.2',
      'llm.temperature': 0.0,
      'llm.prompt_tokens': 220,
      'llm.completion_tokens': 38,
    },
  });

  return spans;
};

const baseAssessments = (overrides: Partial<Record<string, 'yes' | 'no'>> = {}): IAssessment[] => {
  const v = (k: string, fallback: 'yes' | 'no'): 'yes' | 'no' => overrides[k] ?? fallback;

  return [
    {
      name: 'groundedness',
      kind: 'judge',
      value: v('groundedness', 'yes'),
      passed: v('groundedness', 'yes') === 'yes',
      rationale:
        'The response is fully supported by the provided context and contains no external knowledge.',
    },
    {
      name: 'relevance',
      kind: 'judge',
      value: v('relevance', 'yes'),
      passed: v('relevance', 'yes') === 'yes',
      rationale:
        'The response directly addresses the question and focuses on the most relevant snippet.',
    },
    {
      name: 'conciseness',
      kind: 'judge',
      value: v('conciseness', 'no'),
      passed: v('conciseness', 'no') === 'yes',
      rationale:
        'Response is over 100 words and includes minor repetition of the source material.',
    },
    {
      name: 'keyword_presence_scorer',
      kind: 'scorer',
      value: v('keyword_presence_scorer', 'yes'),
      passed: v('keyword_presence_scorer', 'yes') === 'yes',
      rationale: 'All expected keywords are present.',
    },
    {
      name: 'exact_match_scorer',
      kind: 'scorer',
      value: v('exact_match_scorer', 'no'),
      passed: v('exact_match_scorer', 'no') === 'yes',
      rationale: 'Response paraphrases the expected text but does not match exactly.',
    },
    {
      name: 'latency_check_scorer',
      kind: 'scorer',
      value: v('latency_check_scorer', 'yes'),
      passed: v('latency_check_scorer', 'yes') === 'yes',
      rationale: 'Response latency under the 5000ms threshold.',
    },
    { name: 'response_char_length', kind: 'scorer', value: 184, rationale: 'Response has 184 characters.' },
    { name: 'response_word_count', kind: 'scorer', value: 31, rationale: 'Response has 31 words.' },
  ];
};

export const MOCK_TRACES: ITrace[] = [
  {
    id: 'tr_001',
    runId: 'run_001',
    runName: 'rag_small_chunks__prompt_01',
    ragName: 'rag_small_chunks',
    promptName: 'prompt_01',
    model: 'ollama/llama3.2',
    question: MOCK_QUESTIONS[0].question,
    groundTruth: MOCK_QUESTIONS[0].groundTruth,
    answer:
      'RAG combines information retrieval with language-model generation, using retrieved context to ground the response.',
    prompt: PROMPT_TEMPLATES.prompt_01
      .replace('{context}', '[1] source=rag_notes.txt\nRetrieval-augmented generation, or RAG, combines information retrieval with language-model generation...')
      .replace('{question}', MOCK_QUESTIONS[0].question),
    retrieved: [
      {
        source: 'rag_notes.txt',
        score: 0.91,
        text: 'Retrieval-augmented generation, or RAG, combines information retrieval with language-model generation. Common tuning dimensions include chunk size, top-k, query rewriting, reranking, and prompt structure.',
      },
      {
        source: 'mlflow_overview.txt',
        score: 0.62,
        text: 'MLflow is an open-source platform for machine learning and generative AI. It supports experiment tracking, model management, tracing, and evaluation.',
      },
    ],
    totalLatencyMs: 1240,
    totalTokens: 258,
    promptTokens: 220,
    completionTokens: 38,
    status: 'OK',
    startedAt: '2026-04-29T10:14:22Z',
    spans: buildSpans(1240, 90, 1130),
    assessments: baseAssessments(),
  },
  {
    id: 'tr_002',
    runId: 'run_001',
    runName: 'rag_small_chunks__prompt_01',
    ragName: 'rag_small_chunks',
    promptName: 'prompt_01',
    model: 'ollama/llama3.2',
    question: MOCK_QUESTIONS[1].question,
    groundTruth: MOCK_QUESTIONS[1].groundTruth,
    answer:
      'Tracing captures intermediate steps such as retrieval, prompt assembly, model calls, latency, tokens, and outputs.',
    prompt: PROMPT_TEMPLATES.prompt_01
      .replace('{context}', '[1] source=tracing_notes.txt\nTracing captures intermediate steps such as retrieval, prompt assembly, model calls, latency, tokens, and outputs...')
      .replace('{question}', MOCK_QUESTIONS[1].question),
    retrieved: [
      {
        source: 'tracing_notes.txt',
        score: 0.94,
        text: 'Tracing captures intermediate steps such as retrieval, prompt assembly, model calls, latency, tokens, and outputs. These traces help debug RAG failures.',
      },
      {
        source: 'evaluation_notes.txt',
        score: 0.55,
        text: 'LLM experiments commonly log correctness, groundedness, latency, token usage, and cost.',
      },
    ],
    totalLatencyMs: 980,
    totalTokens: 244,
    promptTokens: 210,
    completionTokens: 34,
    status: 'OK',
    startedAt: '2026-04-29T10:14:25Z',
    spans: buildSpans(980, 75, 880),
    assessments: baseAssessments({ conciseness: 'yes' }),
  },
  {
    id: 'tr_003',
    runId: 'run_001',
    runName: 'rag_small_chunks__prompt_01',
    ragName: 'rag_small_chunks',
    promptName: 'prompt_01',
    model: 'ollama/llama3.2',
    question: MOCK_QUESTIONS[2].question,
    groundTruth: MOCK_QUESTIONS[2].groundTruth,
    answer: 'The eval data should remain consistent across all variants for a fair benchmark.',
    prompt: PROMPT_TEMPLATES.prompt_01
      .replace('{context}', '[1] source=evaluation_notes.txt\nA good benchmark uses the same evaluation set across all variants.')
      .replace('{question}', MOCK_QUESTIONS[2].question),
    retrieved: [
      {
        source: 'evaluation_notes.txt',
        score: 0.88,
        text: 'A good benchmark uses the same evaluation set across all variants.',
      },
    ],
    totalLatencyMs: 1420,
    totalTokens: 266,
    promptTokens: 224,
    completionTokens: 42,
    status: 'OK',
    startedAt: '2026-04-29T10:14:27Z',
    spans: buildSpans(1420, 110, 1280),
    assessments: baseAssessments({
      keyword_presence_scorer: 'no',
      exact_match_scorer: 'no',
    }),
  },
  {
    id: 'tr_004',
    runId: 'run_002',
    runName: 'rag_large_chunks__prompt_03',
    ragName: 'rag_large_chunks',
    promptName: 'prompt_03',
    model: 'ollama/llama3.2',
    question: MOCK_QUESTIONS[3].question,
    groundTruth: MOCK_QUESTIONS[3].groundTruth,
    answer:
      'LLM experiments commonly log correctness and latency, alongside groundedness, token usage, and cost.',
    prompt: PROMPT_TEMPLATES.prompt_03
      .replace('{context}', '[1] source=evaluation_notes.txt\nLLM experiments commonly log correctness, groundedness, latency, token usage, and cost.')
      .replace('{question}', MOCK_QUESTIONS[3].question),
    retrieved: [
      {
        source: 'evaluation_notes.txt',
        score: 0.96,
        text: 'LLM experiments commonly log correctness, groundedness, latency, token usage, and cost. A good benchmark uses the same evaluation set across all variants.',
      },
    ],
    totalLatencyMs: 1890,
    totalTokens: 312,
    promptTokens: 268,
    completionTokens: 44,
    status: 'OK',
    startedAt: '2026-04-29T10:14:30Z',
    spans: buildSpans(1890, 130, 1720),
    assessments: baseAssessments(),
  },
  {
    id: 'tr_005',
    runId: 'run_003',
    runName: 'rag_mmr__prompt_05',
    ragName: 'rag_mmr',
    promptName: 'prompt_05',
    model: 'ollama/llama3.2',
    question: MOCK_QUESTIONS[0].question,
    groundTruth: MOCK_QUESTIONS[0].groundTruth,
    answer: 'Not found in context.',
    prompt: PROMPT_TEMPLATES.prompt_05
      .replace('{context}', '[1] source=mlflow_overview.txt\nMLflow is an open-source platform for ML and generative AI.\n[2] source=tracing_notes.txt\nTracing captures intermediate steps...')
      .replace('{question}', MOCK_QUESTIONS[0].question),
    retrieved: [
      { source: 'mlflow_overview.txt', score: 0.51, text: 'MLflow is an open-source platform for ML and generative AI.' },
      { source: 'tracing_notes.txt', score: 0.49, text: 'Tracing captures intermediate steps such as retrieval, prompt assembly, model calls, latency, tokens, and outputs.' },
      { source: 'prompting_notes.txt', score: 0.41, text: 'Prompt templates affect factuality, style, brevity, and structure.' },
    ],
    totalLatencyMs: 720,
    totalTokens: 182,
    promptTokens: 158,
    completionTokens: 24,
    status: 'OK',
    startedAt: '2026-04-29T10:14:33Z',
    spans: buildSpans(720, 60, 640),
    assessments: baseAssessments({
      groundedness: 'no',
      relevance: 'no',
      keyword_presence_scorer: 'no',
    }),
  },
  {
    id: 'tr_006',
    runId: 'run_002',
    runName: 'rag_large_chunks__prompt_03',
    ragName: 'rag_large_chunks',
    promptName: 'prompt_03',
    model: 'ollama/llama3.2',
    question: MOCK_QUESTIONS[1].question,
    groundTruth: MOCK_QUESTIONS[1].groundTruth,
    answer: '',
    prompt: PROMPT_TEMPLATES.prompt_03
      .replace('{context}', '')
      .replace('{question}', MOCK_QUESTIONS[1].question),
    retrieved: [],
    totalLatencyMs: 320,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    status: 'ERROR',
    startedAt: '2026-04-29T10:14:36Z',
    spans: buildSpans(320, 60, 220),
    assessments: baseAssessments({
      groundedness: 'no',
      relevance: 'no',
      conciseness: 'no',
      keyword_presence_scorer: 'no',
      exact_match_scorer: 'no',
      latency_check_scorer: 'yes',
    }),
  },
];

export const MOCK_RUN_SUMMARIES: ILLMRunSummary[] = [
  {
    runId: 'run_001',
    runName: 'rag_small_chunks__prompt_01',
    ragName: 'rag_small_chunks',
    promptName: 'prompt_01',
    chunkSize: 220,
    topK: 2,
    searchType: 'similarity',
    temperature: 0.0,
    evalSize: 4,
    avgLatencyMs: 1213,
    p95LatencyMs: 1410,
    avgTotalTokens: 256,
    avgTokenF1: 0.78,
    avgContainsTruth: 0.75,
    avgGroundednessPassed: 1.0,
    avgRelevancePassed: 1.0,
    avgConcisenessPassed: 0.5,
    avgKeywordPresencePassed: 0.75,
    avgExactMatchScorerPassed: 0.0,
    avgLatencyCheckPassed: 1.0,
    judgePassRate: 0.83,
    estCostUsd: 0.0,
  },
  {
    runId: 'run_002',
    runName: 'rag_large_chunks__prompt_03',
    ragName: 'rag_large_chunks',
    promptName: 'prompt_03',
    chunkSize: 500,
    topK: 2,
    searchType: 'similarity',
    temperature: 0.0,
    evalSize: 4,
    avgLatencyMs: 1605,
    p95LatencyMs: 1890,
    avgTotalTokens: 298,
    avgTokenF1: 0.71,
    avgContainsTruth: 0.5,
    avgGroundednessPassed: 0.75,
    avgRelevancePassed: 0.75,
    avgConcisenessPassed: 0.25,
    avgKeywordPresencePassed: 0.5,
    avgExactMatchScorerPassed: 0.0,
    avgLatencyCheckPassed: 1.0,
    judgePassRate: 0.58,
    estCostUsd: 0.0,
  },
  {
    runId: 'run_003',
    runName: 'rag_mmr__prompt_05',
    ragName: 'rag_mmr',
    promptName: 'prompt_05',
    chunkSize: 350,
    topK: 3,
    searchType: 'mmr',
    temperature: 0.0,
    evalSize: 4,
    avgLatencyMs: 740,
    p95LatencyMs: 920,
    avgTotalTokens: 188,
    avgTokenF1: 0.42,
    avgContainsTruth: 0.25,
    avgGroundednessPassed: 0.25,
    avgRelevancePassed: 0.25,
    avgConcisenessPassed: 1.0,
    avgKeywordPresencePassed: 0.25,
    avgExactMatchScorerPassed: 0.0,
    avgLatencyCheckPassed: 1.0,
    judgePassRate: 0.5,
    estCostUsd: 0.0,
  },
];

export const MOCK_KPIS = {
  totalTraces: MOCK_TRACES.length,
  totalRuns: MOCK_RUN_SUMMARIES.length,
  avgLatencyMs: Math.round(
    MOCK_TRACES.reduce((s, t) => s + t.totalLatencyMs, 0) / MOCK_TRACES.length,
  ),
  p95LatencyMs: 1810,
  totalTokens: MOCK_TRACES.reduce((s, t) => s + t.totalTokens, 0),
  errorRate:
    MOCK_TRACES.filter(t => t.status === 'ERROR').length / MOCK_TRACES.length,
  judgePassRate:
    MOCK_TRACES.reduce((s, t) => {
      const judges = t.assessments.filter(a => a.kind === 'judge');
      const passed = judges.filter(a => a.passed).length;
      return s + (judges.length ? passed / judges.length : 0);
    }, 0) / MOCK_TRACES.length,
  estCostUsd: 0.0,
};
