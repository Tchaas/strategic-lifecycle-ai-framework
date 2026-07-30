// Lean business cases API. Thin, typed wrappers over the shared client.
//
// Cases nest under a strategic objective (like key activities nest under a value stream), so
// list/create go through the objective id (objId), but item ops go through the case's own id
// (caseId). Status lives behind a SEPARATE endpoint from content edits, keeping lifecycle
// transitions distinct from field updates. The cardinality limit (10) is per objective.
//
// Verified endpoints:
//   GET    /workspaces/{ws}/strategic-objectives/{objId}/lean-business-cases -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/strategic-objectives/{objId}/lean-business-cases -> 201
//   PATCH  /workspaces/{ws}/lean-business-cases/{caseId}
//   PATCH  /workspaces/{ws}/lean-business-cases/{caseId}/status              <- separate status body
// There is intentionally no DELETE endpoint for lean business cases.

import { api, getList, type ListResult } from './client';
import type { CaseStatus, LeanBusinessCase } from '../types/model';

// list/create nest under the objective (objId); update/status use the case's own id (caseId).
const collectionPath = (workspaceId: string, objId: string) =>
  `/workspaces/${workspaceId}/strategic-objectives/${objId}/lean-business-cases`;
const itemPath = (workspaceId: string, caseId: string) =>
  `/workspaces/${workspaceId}/lean-business-cases/${caseId}`;

export function listBusinessCases(workspaceId: string, objId: string): Promise<ListResult<LeanBusinessCase>> {
  return getList<LeanBusinessCase>(collectionPath(workspaceId, objId));
}

export function createBusinessCase(
  workspaceId: string,
  objId: string,
  body: Partial<LeanBusinessCase>,
): Promise<LeanBusinessCase> {
  return api.post<LeanBusinessCase>(collectionPath(workspaceId, objId), body);
}

export function updateBusinessCase(
  workspaceId: string,
  caseId: string,
  patch: Partial<LeanBusinessCase>,
): Promise<LeanBusinessCase> {
  return api.patch<LeanBusinessCase>(itemPath(workspaceId, caseId), patch);
}

// Lifecycle transitions go through the dedicated status endpoint, not the content PATCH.
export function updateBusinessCaseStatus(
  workspaceId: string,
  caseId: string,
  status: CaseStatus,
): Promise<LeanBusinessCase> {
  return api.patch<LeanBusinessCase>(`${itemPath(workspaceId, caseId)}/status`, { status });
}
