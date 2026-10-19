import { api } from './api';
import type { Conversation, EvaluateConversationResponse } from '../../shared/models/observability/conversation';

const base = (sessionId: string) => `/observability/sessions/${encodeURIComponent(sessionId)}/conversation`;

export const getConversation = (sessionId: string) => api.get<Conversation>(base(sessionId)).then(r => r.data);

export const evaluateConversation = (
  sessionId: string,
  request: { metrics: string[]; model?: string; role?: string },
) => api.post<EvaluateConversationResponse>(`${base(sessionId)}/evaluate`, request).then(r => r.data);
