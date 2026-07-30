// Discovery API. Thin, typed wrappers over the shared client.
//
// Discovery is a SINGLETON per lean business case (1:1). GET/POST nest under the case id
// (like key activities nest under a value stream); PATCH uses the discovery's own id (like
// lean business cases). A 404 from GET means "not created yet", not an error — callers should
// treat it as null. There is intentionally no list and no DELETE endpoint.
//
// Verified endpoints:
//   GET   /workspaces/{ws}/lean-business-cases/{caseId}/discovery  -> the record, or 404 if none
//   POST  /workspaces/{ws}/lean-business-cases/{caseId}/discovery  -> 201, creates the singleton
//   PATCH /workspaces/{ws}/discovery/{discoveryId}
// Note: `status` (draft|active|completed) is accepted only on PATCH, never on create (the
// backend forces `draft`), and only draft->active->completed transitions are allowed.

import { api } from './client';
import type { Discovery } from '../types/model';

// GET/POST nest under the case id; PATCH uses the discovery's own id.
const casePath = (workspaceId: string, caseId: string) =>
  `/workspaces/${workspaceId}/lean-business-cases/${caseId}/discovery`;
const itemPath = (workspaceId: string, discoveryId: string) =>
  `/workspaces/${workspaceId}/discovery/${discoveryId}`;

// Singleton, not a list — returns the record directly (or throws ApiError 404 if none).
export function getDiscoveryForCase(workspaceId: string, caseId: string): Promise<Discovery> {
  return api.get<Discovery>(casePath(workspaceId, caseId));
}

export function createDiscovery(
  workspaceId: string,
  caseId: string,
  body: Partial<Discovery>,
): Promise<Discovery> {
  return api.post<Discovery>(casePath(workspaceId, caseId), body);
}

export function updateDiscovery(
  workspaceId: string,
  discoveryId: string,
  patch: Partial<Discovery>,
): Promise<Discovery> {
  return api.patch<Discovery>(itemPath(workspaceId, discoveryId), patch);
}
