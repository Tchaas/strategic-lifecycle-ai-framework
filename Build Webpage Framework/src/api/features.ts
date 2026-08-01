// Features API. Thin, typed wrappers over the shared client.
//
// Features nest under a lean business case, so list/create go through the case id (caseId),
// but update/delete go through the feature's own id (featureId) — the same collection/item
// asymmetry as capabilities under a business architecture.
//
// Verified endpoints:
//   GET    /workspaces/{ws}/lean-business-cases/{caseId}/features -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/lean-business-cases/{caseId}/features -> 201
//   PATCH  /workspaces/{ws}/features/{featureId}
//   DELETE /workspaces/{ws}/features/{featureId}                  -> 204

import { api, getList, type ListResult } from './client';
import type { Feature } from '../types/model';

// list/create nest under the case (caseId); update/delete use the feature's own id (featureId).
const collectionPath = (workspaceId: string, caseId: string) =>
  `/workspaces/${workspaceId}/lean-business-cases/${caseId}/features`;
const itemPath = (workspaceId: string, featureId: string) =>
  `/workspaces/${workspaceId}/features/${featureId}`;

export function listFeatures(workspaceId: string, caseId: string): Promise<ListResult<Feature>> {
  return getList<Feature>(collectionPath(workspaceId, caseId));
}

export function createFeature(
  workspaceId: string,
  caseId: string,
  body: Partial<Feature>,
): Promise<Feature> {
  return api.post<Feature>(collectionPath(workspaceId, caseId), body);
}

export function updateFeature(
  workspaceId: string,
  featureId: string,
  patch: Partial<Feature>,
): Promise<Feature> {
  return api.patch<Feature>(itemPath(workspaceId, featureId), patch);
}

export function deleteFeature(workspaceId: string, featureId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, featureId));
}
