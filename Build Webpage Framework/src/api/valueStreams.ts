// Value streams API. Thin, typed wrappers over the shared client.
//
// Value streams nest under the workspace's Business Architecture singleton, which
// produces an endpoint asymmetry: list/create go through the architecture id (ba_id),
// but update/delete go through the value stream's own id (vs_id).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/business-architecture/{baId}/value-streams -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/business-architecture/{baId}/value-streams -> 201
//   PATCH  /workspaces/{ws}/value-streams/{vsId}
//   DELETE /workspaces/{ws}/value-streams/{vsId}                       -> 204

import { api, getList, type ListResult } from './client';
import type { ValueStream } from '../types/model';

// create/list nest under the architecture (ba_id); update/delete use the stream's own id (vs_id).
const collectionPath = (workspaceId: string, baId: string) =>
  `/workspaces/${workspaceId}/business-architecture/${baId}/value-streams`;
const itemPath = (workspaceId: string, vsId: string) =>
  `/workspaces/${workspaceId}/value-streams/${vsId}`;

export function listValueStreams(workspaceId: string, baId: string): Promise<ListResult<ValueStream>> {
  return getList<ValueStream>(collectionPath(workspaceId, baId));
}

export function createValueStream(
  workspaceId: string,
  baId: string,
  body: Partial<ValueStream>,
): Promise<ValueStream> {
  return api.post<ValueStream>(collectionPath(workspaceId, baId), body);
}

export function updateValueStream(
  workspaceId: string,
  vsId: string,
  patch: Partial<ValueStream>,
): Promise<ValueStream> {
  return api.patch<ValueStream>(itemPath(workspaceId, vsId), patch);
}

export function deleteValueStream(workspaceId: string, vsId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, vsId));
}
