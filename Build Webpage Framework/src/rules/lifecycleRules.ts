import type {
  BusinessArchitecture,
  CaseStatus,
  ConceptualDeliverable,
  DeliveryStatus,
  Implementation,
  ImplementationStatus,
  ImplementationValueStream,
  LeanBusinessCase,
  ObjectiveStatus,
  StrategicObjective,
} from '../types/model';

export const cardinalityLimits = {
  strategicObjectivesPerWorkspace: 3,
  valueStreamsPerBusinessArchitecture: 6,
  keyActivitiesPerValueStream: 6,
  leanBusinessCasesPerObjective: 10,
  businessArchitecturesPerWorkspace: 1,
  discoveriesPerLeanBusinessCase: 1,
  implementationsPerLeanBusinessCase: 1,
} as const;

export type CardinalityCheck = {
  allowed: boolean;
  message: string;
};

export const checkCardinality = (count: number, limit: number, label: string): CardinalityCheck => ({
  allowed: count < limit,
  message: count < limit ? '' : `${label} limit reached (${limit}).`,
});

export const objectiveStatusTransitions: Record<ObjectiveStatus, ObjectiveStatus[]> = {
  draft: ['draft', 'active', 'archived'],
  active: ['active', 'completed', 'archived'],
  completed: ['completed', 'archived'],
  archived: ['archived', 'draft'],
};

export const caseStatusTransitions: Record<CaseStatus, CaseStatus[]> = objectiveStatusTransitions;

export const draftActiveTransitions = {
  draft: ['draft', 'active'],
  active: ['active'],
} as const;

export const deliveryStatusTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
  draft: ['draft', 'active'],
  active: ['active', 'completed'],
  completed: ['completed'],
};

export const implementationStatusTransitions: Record<ImplementationStatus, ImplementationStatus[]> = {
  not_started: ['not_started', 'in_progress', 'on_hold'],
  in_progress: ['in_progress', 'completed', 'on_hold'],
  completed: ['completed'],
  on_hold: ['on_hold', 'in_progress'],
};

export const getValidTransitions = <T extends string>(status: T, transitionMap: Record<T, T[]>): T[] =>
  transitionMap[status] || [status];

export const getMissingObjectiveActiveFields = (objective: Pick<
  StrategicObjective,
  'strategicInitiativeName' | 'executiveObjective' | 'strategicValueCategory' | 'problemOpportunityStatement' | 'valueHypothesis'
>): string[] => {
  const missing: string[] = [];
  if (!objective.strategicInitiativeName.trim()) missing.push('Strategic Initiative Name');
  if (!objective.executiveObjective.trim()) missing.push('Executive Objective');
  if (!objective.strategicValueCategory) missing.push('Strategic Value Category');
  if (!objective.problemOpportunityStatement.trim()) missing.push('Problem Opportunity Statement');
  if (!objective.valueHypothesis.trim()) missing.push('Value Hypothesis');
  return missing;
};

export const getMissingLeanBusinessCaseActiveFields = (businessCase: Pick<
  LeanBusinessCase,
  'title' | 'summary' | 'problemOpportunityStatement' | 'valueHypothesis' | 'priority'
>): string[] => {
  const missing: string[] = [];
  if (!businessCase.title.trim()) missing.push('Title');
  if (!businessCase.summary.trim()) missing.push('Summary');
  if (!businessCase.problemOpportunityStatement.trim()) missing.push('Problem Opportunity Statement');
  if (!businessCase.valueHypothesis.trim()) missing.push('Value Hypothesis');
  if (!businessCase.priority) missing.push('Priority');
  return missing;
};

export const canActivateObjective = (objective: StrategicObjective) =>
  getMissingObjectiveActiveFields(objective).length === 0;

export const canActivateLeanBusinessCase = (businessCase: LeanBusinessCase) =>
  getMissingLeanBusinessCaseActiveFields(businessCase).length === 0;

export type ObjectiveFinancialRollup = {
  forecastCost: number;
  forecastValue: number;
  actualCost: number;
  actualValue: number;
};

export const calculateObjectiveFinancialRollup = (
  objectiveId: string,
  businessCases: LeanBusinessCase[],
  implementations: Implementation[],
  allocations: ImplementationValueStream[],
): ObjectiveFinancialRollup => {
  const objectiveCases = businessCases.filter((businessCase) => businessCase.strategicObjectiveId === objectiveId);
  const caseIds = new Set(objectiveCases.map((businessCase) => businessCase.id));
  const implementationIds = new Set(
    implementations
      .filter((implementation) => caseIds.has(implementation.leanBusinessCaseId))
      .map((implementation) => implementation.id),
  );

  return {
    forecastCost: objectiveCases.reduce((sum, businessCase) => sum + (businessCase.forecastCost || 0), 0),
    forecastValue: objectiveCases.reduce((sum, businessCase) => sum + (businessCase.forecastValue || 0), 0),
    actualCost: allocations
      .filter((allocation) => implementationIds.has(allocation.implementationId))
      .reduce((sum, allocation) => sum + (allocation.allocatedCost || 0), 0),
    actualValue: allocations
      .filter((allocation) => implementationIds.has(allocation.implementationId))
      .reduce((sum, allocation) => sum + (allocation.allocatedValue || 0), 0),
  };
};

export const saveDeliverableAsFinal = (deliverable: ConceptualDeliverable): ConceptualDeliverable => ({
  ...deliverable,
  source: 'user_finalized',
  updatedAt: new Date().toISOString(),
});

export const isSingleBusinessArchitectureOpenAction = (architectures: BusinessArchitecture[]) =>
  architectures.length >= cardinalityLimits.businessArchitecturesPerWorkspace;
