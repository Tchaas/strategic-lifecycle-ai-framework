// Business architecture API. Thin, typed wrappers over the shared client.
//
// Business architecture is a SINGLETON per workspace — the six entity groups
// (value streams, capabilities, processes, stakeholders, information concepts,
// business impacts) all nest under it.
//
// Verified endpoints:
//   POST  /workspaces/{ws}/business-architecture        -> 201, creates the singleton
//   GET   /workspaces/{ws}/business-architecture        -> the record, or 404 if none
//   PATCH /workspaces/{ws}/business-architecture/{id}
// There is intentionally no DELETE endpoint. A 404 from GET means "not created yet",
// not an error — callers should treat it as null.

import { api } from './client';
import type { BusinessArchitecture } from '../types/model';

const basePath = (workspaceId: string) => `/workspaces/${workspaceId}/business-architecture`;

// Singleton, not a list — returns the record directly (or throws ApiError 404 if none).
export function getArchitecture(workspaceId: string): Promise<BusinessArchitecture> {
  return api.get<BusinessArchitecture>(basePath(workspaceId));
}

export function createArchitecture(
  workspaceId: string,
  body: Partial<BusinessArchitecture>,
): Promise<BusinessArchitecture> {
  return api.post<BusinessArchitecture>(basePath(workspaceId), body);
}

export function updateArchitecture(
  workspaceId: string,
  id: string,
  patch: Partial<BusinessArchitecture>,
): Promise<BusinessArchitecture> {
  return api.patch<BusinessArchitecture>(`${basePath(workspaceId)}/${id}`, patch);
}
