// Stakeholders & Personas API. Thin, typed wrappers over the shared client.
//
// Stakeholders nest under the workspace's Business Architecture singleton, which produces an
// endpoint asymmetry: list/create go through the architecture id (ba_id), but update/delete
// go through the stakeholder's own id (stakeholder_id).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/business-architecture/{baId}/stakeholders -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/business-architecture/{baId}/stakeholders -> 201
//   PATCH  /workspaces/{ws}/stakeholders/{stakeholderId}
//   DELETE /workspaces/{ws}/stakeholders/{stakeholderId}              -> 204

import { api, getList, type ListResult } from './client';
import type { StakeholderPersona } from '../types/model';

// create/list nest under the architecture (ba_id); update/delete use the stakeholder's own id.
const collectionPath = (workspaceId: string, baId: string) =>
  `/workspaces/${workspaceId}/business-architecture/${baId}/stakeholders`;
const itemPath = (workspaceId: string, stakeholderId: string) =>
  `/workspaces/${workspaceId}/stakeholders/${stakeholderId}`;

export function listStakeholders(workspaceId: string, baId: string): Promise<ListResult<StakeholderPersona>> {
  return getList<StakeholderPersona>(collectionPath(workspaceId, baId));
}

export function createStakeholder(
  workspaceId: string,
  baId: string,
  body: Partial<StakeholderPersona>,
): Promise<StakeholderPersona> {
  return api.post<StakeholderPersona>(collectionPath(workspaceId, baId), body);
}

export function updateStakeholder(
  workspaceId: string,
  stakeholderId: string,
  patch: Partial<StakeholderPersona>,
): Promise<StakeholderPersona> {
  return api.patch<StakeholderPersona>(itemPath(workspaceId, stakeholderId), patch);
}

export function deleteStakeholder(workspaceId: string, stakeholderId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, stakeholderId));
}
