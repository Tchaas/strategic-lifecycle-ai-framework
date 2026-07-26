// Strategic objectives API. Thin, typed wrappers over the shared client.
//
// Verified endpoints:
//   GET   /workspaces/{ws}/strategic-objectives        -> { items, total, limit, offset }
//   GET   /workspaces/{ws}/strategic-objectives/{id}
//   POST  /workspaces/{ws}/strategic-objectives        -> 201
//   PATCH /workspaces/{ws}/strategic-objectives/{id}
// There is intentionally no DELETE endpoint for objectives.

import { api, getList, type ListResult } from './client';
import type { StrategicObjective } from '../types/model';

const basePath = (workspaceId: string) => `/workspaces/${workspaceId}/strategic-objectives`;

export function listObjectives(workspaceId: string): Promise<ListResult<StrategicObjective>> {
  return getList<StrategicObjective>(basePath(workspaceId));
}

export function getObjective(workspaceId: string, id: string): Promise<StrategicObjective> {
  return api.get<StrategicObjective>(`${basePath(workspaceId)}/${id}`);
}

export function createObjective(
  workspaceId: string,
  body: Partial<StrategicObjective>,
): Promise<StrategicObjective> {
  return api.post<StrategicObjective>(basePath(workspaceId), body);
}

export function updateObjective(
  workspaceId: string,
  id: string,
  patch: Partial<StrategicObjective>,
): Promise<StrategicObjective> {
  return api.patch<StrategicObjective>(`${basePath(workspaceId)}/${id}`, patch);
}
