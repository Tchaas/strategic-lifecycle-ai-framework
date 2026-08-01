// Conceptual deliverables API. Thin, typed wrappers over the shared client.
//
// Deliverables nest under a lean business case, so list/create go through the case id (caseId),
// but update/delete go through the deliverable's own id (delId). deliverableType is required and
// immutable — it is accepted on create but NOT on PATCH (see DeliverableUpdateRequest).
//
// Verified endpoints:
//   GET    /workspaces/{ws}/lean-business-cases/{caseId}/deliverables -> { items, total, limit, offset }
//   POST   /workspaces/{ws}/lean-business-cases/{caseId}/deliverables -> 201
//   PATCH  /workspaces/{ws}/deliverables/{delId}
//   DELETE /workspaces/{ws}/deliverables/{delId}                      -> 204

import { api, getList, type ListResult } from './client';
import type { ConceptualDeliverable } from '../types/model';

// list/create nest under the case (caseId); update/delete use the deliverable's own id (delId).
const collectionPath = (workspaceId: string, caseId: string) =>
  `/workspaces/${workspaceId}/lean-business-cases/${caseId}/deliverables`;
const itemPath = (workspaceId: string, delId: string) =>
  `/workspaces/${workspaceId}/deliverables/${delId}`;

export function listDeliverables(workspaceId: string, caseId: string): Promise<ListResult<ConceptualDeliverable>> {
  return getList<ConceptualDeliverable>(collectionPath(workspaceId, caseId));
}

export function createDeliverable(
  workspaceId: string,
  caseId: string,
  body: Partial<ConceptualDeliverable>,
): Promise<ConceptualDeliverable> {
  return api.post<ConceptualDeliverable>(collectionPath(workspaceId, caseId), body);
}

export function updateDeliverable(
  workspaceId: string,
  delId: string,
  patch: Partial<ConceptualDeliverable>,
): Promise<ConceptualDeliverable> {
  return api.patch<ConceptualDeliverable>(itemPath(workspaceId, delId), patch);
}

export function deleteDeliverable(workspaceId: string, delId: string): Promise<void> {
  return api.del<void>(itemPath(workspaceId, delId));
}
