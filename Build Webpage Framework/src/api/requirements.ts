// Requirements API. Thin, typed wrappers over the shared client.
//
// Requirements nest under a feature, so list/create go through the feature id (featureId),
// but update/delete go through the requirement's own id (reqId). Selecting a requirement in
// the UI therefore needs three chained pickers: objective -> case -> feature.
//
// Verified endpoints:
//   GET    /workspaces/{ws}/features/{featureId}/requirements -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/features/{featureId}/requirements -> 201
//   PATCH  /workspaces/{ws}/requirements/{reqId}
//   DELETE /workspaces/{ws}/requirements/{reqId}              -> 204

import { api, getList, type ListResult } from './client';
import type { Requirement } from '../types/model';

// list/create nest under the feature (featureId); update/delete use the requirement's own id (reqId).
const collectionPath = (workspaceId: string, featureId: string) =>
  `/workspaces/${workspaceId}/features/${featureId}/requirements`;
const itemPath = (workspaceId: string, reqId: string) =>
  `/workspaces/${workspaceId}/requirements/${reqId}`;

export function listRequirements(workspaceId: string, featureId: string): Promise<ListResult<Requirement>> {
  return getList<Requirement>(collectionPath(workspaceId, featureId));
}

export function createRequirement(
  workspaceId: string,
  featureId: string,
  body: Partial<Requirement>,
): Promise<Requirement> {
  return api.post<Requirement>(collectionPath(workspaceId, featureId), body);
}

export function updateRequirement(
  workspaceId: string,
  reqId: string,
  patch: Partial<Requirement>,
): Promise<Requirement> {
  return api.patch<Requirement>(itemPath(workspaceId, reqId), patch);
}

export function deleteRequirement(workspaceId: string, reqId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, reqId));
}
