// Capabilities API. Thin, typed wrappers over the shared client.
//
// Capabilities nest under the workspace's Business Architecture singleton, which
// produces an endpoint asymmetry: list/create go through the architecture id (ba_id),
// but update/delete go through the capability's own id (cap_id).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/business-architecture/{baId}/capabilities -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/business-architecture/{baId}/capabilities -> 201
//   PATCH  /workspaces/{ws}/capabilities/{capId}
//   DELETE /workspaces/{ws}/capabilities/{capId}                      -> 204

import { api, getList, type ListResult } from './client';
import type { BusinessCapability } from '../types/model';

// create/list nest under the architecture (ba_id); update/delete use the capability's own id (cap_id).
const collectionPath = (workspaceId: string, baId: string) =>
  `/workspaces/${workspaceId}/business-architecture/${baId}/capabilities`;
const itemPath = (workspaceId: string, capId: string) =>
  `/workspaces/${workspaceId}/capabilities/${capId}`;

export function listCapabilities(workspaceId: string, baId: string): Promise<ListResult<BusinessCapability>> {
  return getList<BusinessCapability>(collectionPath(workspaceId, baId));
}

export function createCapability(
  workspaceId: string,
  baId: string,
  body: Partial<BusinessCapability>,
): Promise<BusinessCapability> {
  return api.post<BusinessCapability>(collectionPath(workspaceId, baId), body);
}

export function updateCapability(
  workspaceId: string,
  capId: string,
  patch: Partial<BusinessCapability>,
): Promise<BusinessCapability> {
  return api.patch<BusinessCapability>(itemPath(workspaceId, capId), patch);
}

export function deleteCapability(workspaceId: string, capId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, capId));
}
