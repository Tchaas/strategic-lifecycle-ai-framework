// Implementation API. Thin, typed wrappers over the shared client.
//
// Implementation is a SINGLETON per lean business case (1:1), exactly like discovery. GET/POST
// nest under the case id (caseId); PATCH uses the implementation's own id (implId). A 404 from GET
// means "not created yet", not an error — callers should treat it as null. There is intentionally
// no list and no DELETE endpoint. The value-stream allocation sub-endpoints are out of scope here.
//
// Verified endpoints:
//   GET   /workspaces/{ws}/lean-business-cases/{caseId}/implementation -> the record, or 404 if none
//   POST  /workspaces/{ws}/lean-business-cases/{caseId}/implementation -> 201, creates the singleton
//   PATCH /workspaces/{ws}/implementation/{implId}
// Note: actualCost/actualValue are read-only (derived); they are never sent on create or update.

import { api } from './client';
import type { Implementation } from '../types/model';

// GET/POST nest under the case id; PATCH uses the implementation's own id.
const casePath = (workspaceId: string, caseId: string) =>
  `/workspaces/${workspaceId}/lean-business-cases/${caseId}/implementation`;
const itemPath = (workspaceId: string, implId: string) =>
  `/workspaces/${workspaceId}/implementation/${implId}`;

// Singleton, not a list — returns the record directly (or throws ApiError 404 if none).
export function getImplementationForCase(workspaceId: string, caseId: string): Promise<Implementation> {
  return api.get<Implementation>(casePath(workspaceId, caseId));
}

export function createImplementation(
  workspaceId: string,
  caseId: string,
  body: Partial<Implementation>,
): Promise<Implementation> {
  return api.post<Implementation>(casePath(workspaceId, caseId), body);
}

export function updateImplementation(
  workspaceId: string,
  implId: string,
  patch: Partial<Implementation>,
): Promise<Implementation> {
  return api.patch<Implementation>(itemPath(workspaceId, implId), patch);
}
