// AI assistance API. Thin, typed wrappers over the shared client.
//
// The AI layer is stateless: /generate returns suggested field values but persists
// nothing — only an explicit Save through the normal entity endpoints writes.
//
// Verified endpoints:
//   GET  /workspaces/{ws}/ai/questions/{resourceType}
//        -> { resourceType, version, questions: [{ id, prompt, helper, inputType,
//             required, maxLength, fields }] }
//   POST /workspaces/{ws}/ai/generate
//        body { resourceType, answers, parentId? }   // answers keyed by QUESTION ID
//        -> { suggestionId, resourceType, fields, generatedAt }

import { api } from './client';

export type AiResourceType = 'strategic_objective' | 'lean_business_case' | 'discovery';

export interface AiQuestion {
  id: string;
  prompt: string;
  helper: string;
  inputType: string;
  required: boolean;
  maxLength: number;
  fields: string[];
}

export interface AiQuestionSet {
  resourceType: string;
  version: number;
  questions: AiQuestion[];
}

export interface AiGenerateResult {
  suggestionId: string;
  resourceType: string;
  fields: Record<string, unknown>;
  generatedAt: string;
}

// Note: `questions` is a bare array nested inside the object — this is NOT a list-envelope
// endpoint, so use api.get directly rather than getList.
export function getQuestions(
  workspaceId: string,
  resourceType: AiResourceType,
): Promise<AiQuestionSet> {
  return api.get<AiQuestionSet>(`/workspaces/${workspaceId}/ai/questions/${resourceType}`);
}

export function generate(
  workspaceId: string,
  body: { resourceType: AiResourceType; answers: Record<string, string>; parentId?: string },
): Promise<AiGenerateResult> {
  return api.post<AiGenerateResult>(`/workspaces/${workspaceId}/ai/generate`, body);
}
