// Business Processes API. Thin, typed wrappers over the shared client.
//
// Processes nest under the workspace's Business Architecture singleton, which produces an
// endpoint asymmetry: list/create go through the architecture id (ba_id), but update/delete
// go through the process's own id (process_id).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/business-architecture/{baId}/processes -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/business-architecture/{baId}/processes -> 201
//   PATCH  /workspaces/{ws}/processes/{processId}
//   DELETE /workspaces/{ws}/processes/{processId}                  -> 204

import { api, getList, type ListResult } from './client';
import type { BusinessProcess } from '../types/model';

// create/list nest under the architecture (ba_id); update/delete use the process's own id (process_id).
const collectionPath = (workspaceId: string, baId: string) =>
  `/workspaces/${workspaceId}/business-architecture/${baId}/processes`;
const itemPath = (workspaceId: string, processId: string) =>
  `/workspaces/${workspaceId}/processes/${processId}`;

export function listProcesses(workspaceId: string, baId: string): Promise<ListResult<BusinessProcess>> {
  return getList<BusinessProcess>(collectionPath(workspaceId, baId));
}

export function createProcess(
  workspaceId: string,
  baId: string,
  body: Partial<BusinessProcess>,
): Promise<BusinessProcess> {
  return api.post<BusinessProcess>(collectionPath(workspaceId, baId), body);
}

export function updateProcess(
  workspaceId: string,
  processId: string,
  patch: Partial<BusinessProcess>,
): Promise<BusinessProcess> {
  return api.patch<BusinessProcess>(itemPath(workspaceId, processId), patch);
}

export function deleteProcess(workspaceId: string, processId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, processId));
}
