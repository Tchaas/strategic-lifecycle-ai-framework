// Information Concepts API. Thin, typed wrappers over the shared client.
//
// Information concepts nest under the workspace's Business Architecture singleton, which produces
// an endpoint asymmetry: list/create go through the architecture id (ba_id), but update/delete
// go through the concept's own id (concept_id).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/business-architecture/{baId}/information-concepts -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/business-architecture/{baId}/information-concepts -> 201
//   PATCH  /workspaces/{ws}/information-concepts/{conceptId}
//   DELETE /workspaces/{ws}/information-concepts/{conceptId}                  -> 204

import { api, getList, type ListResult } from './client';
import type { InformationConcept } from '../types/model';

// create/list nest under the architecture (ba_id); update/delete use the concept's own id.
const collectionPath = (workspaceId: string, baId: string) =>
  `/workspaces/${workspaceId}/business-architecture/${baId}/information-concepts`;
const itemPath = (workspaceId: string, conceptId: string) =>
  `/workspaces/${workspaceId}/information-concepts/${conceptId}`;

export function listInformationConcepts(workspaceId: string, baId: string): Promise<ListResult<InformationConcept>> {
  return getList<InformationConcept>(collectionPath(workspaceId, baId));
}

export function createInformationConcept(
  workspaceId: string,
  baId: string,
  body: Partial<InformationConcept>,
): Promise<InformationConcept> {
  return api.post<InformationConcept>(collectionPath(workspaceId, baId), body);
}

export function updateInformationConcept(
  workspaceId: string,
  conceptId: string,
  patch: Partial<InformationConcept>,
): Promise<InformationConcept> {
  return api.patch<InformationConcept>(itemPath(workspaceId, conceptId), patch);
}

export function deleteInformationConcept(workspaceId: string, conceptId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, conceptId));
}
