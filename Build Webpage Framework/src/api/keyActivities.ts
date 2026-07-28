// Key activities API. Thin, typed wrappers over the shared client.
//
// Key activities nest under a value stream (not the architecture singleton like capabilities
// and value streams), which produces an endpoint asymmetry: list/create go through the value
// stream id (vs_id), but update/delete go through the activity's own id (ka_id). The cardinality
// limit (6) is enforced per value stream, not globally.
//
// Verified endpoints:
//   GET    /workspaces/{ws}/value-streams/{vsId}/key-activities -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/value-streams/{vsId}/key-activities -> 201
//   PATCH  /workspaces/{ws}/key-activities/{kaId}
//   DELETE /workspaces/{ws}/key-activities/{kaId}               -> 204

import { api, getList, type ListResult } from './client';
import type { KeyActivity } from '../types/model';

// create/list nest under the value stream (vs_id); update/delete use the activity's own id (ka_id).
const collectionPath = (workspaceId: string, vsId: string) =>
  `/workspaces/${workspaceId}/value-streams/${vsId}/key-activities`;
const itemPath = (workspaceId: string, kaId: string) =>
  `/workspaces/${workspaceId}/key-activities/${kaId}`;

export function listKeyActivities(workspaceId: string, vsId: string): Promise<ListResult<KeyActivity>> {
  return getList<KeyActivity>(collectionPath(workspaceId, vsId));
}

export function createKeyActivity(
  workspaceId: string,
  vsId: string,
  body: Partial<KeyActivity>,
): Promise<KeyActivity> {
  return api.post<KeyActivity>(collectionPath(workspaceId, vsId), body);
}

export function updateKeyActivity(
  workspaceId: string,
  kaId: string,
  patch: Partial<KeyActivity>,
): Promise<KeyActivity> {
  return api.patch<KeyActivity>(itemPath(workspaceId, kaId), patch);
}

export function deleteKeyActivity(workspaceId: string, kaId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, kaId));
}
