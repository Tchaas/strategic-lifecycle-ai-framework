// Business Impacts API. Thin, typed wrappers over the shared client.
//
// Impacts nest under the workspace's Business Architecture singleton, which produces an
// endpoint asymmetry: list/create go through the architecture id (ba_id), but update/delete
// go through the impact's own id (impact_id).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/business-architecture/{baId}/business-impacts -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/business-architecture/{baId}/business-impacts -> 201
//   PATCH  /workspaces/{ws}/business-impacts/{impactId}
//   DELETE /workspaces/{ws}/business-impacts/{impactId}                   -> 204

import { api, getList, type ListResult } from './client';
import type { BusinessImpact } from '../types/model';

// create/list nest under the architecture (ba_id); update/delete use the impact's own id.
const collectionPath = (workspaceId: string, baId: string) =>
  `/workspaces/${workspaceId}/business-architecture/${baId}/business-impacts`;
const itemPath = (workspaceId: string, impactId: string) =>
  `/workspaces/${workspaceId}/business-impacts/${impactId}`;

export function listBusinessImpacts(workspaceId: string, baId: string): Promise<ListResult<BusinessImpact>> {
  return getList<BusinessImpact>(collectionPath(workspaceId, baId));
}

export function createBusinessImpact(
  workspaceId: string,
  baId: string,
  body: Partial<BusinessImpact>,
): Promise<BusinessImpact> {
  return api.post<BusinessImpact>(collectionPath(workspaceId, baId), body);
}

export function updateBusinessImpact(
  workspaceId: string,
  impactId: string,
  patch: Partial<BusinessImpact>,
): Promise<BusinessImpact> {
  return api.patch<BusinessImpact>(itemPath(workspaceId, impactId), patch);
}

export function deleteBusinessImpact(workspaceId: string, impactId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, impactId));
}
