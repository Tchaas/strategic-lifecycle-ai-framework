// ============================================================
// Strategic Lifecycle AI Framework — Entity Types
// All 33 tables from the architecture reference
// ============================================================

// ── Auth ─────────────────────────────────────────────────────

export type AuthProvider = 'password' | 'google';

export type User = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  authProvider: AuthProvider;
  passwordHash: string | null;
  googleSub: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

// ── Company & Organization ───────────────────────────────────

export type CompanySize = '1-50' | '51-200' | '201-1000' | '1000+';

export type Workspace = {
  id: string;
  name: string;
  legalName: string;
  description: string;
  industry: string;
  companySize: CompanySize | '';
  headquartersRegion: string;
  website: string;
  logoUrl: string;
  annualRevenue: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  isAdmin: boolean;
  joinedAt: string;
};

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  invitedByUserId: string;
  inviteToken: string;
  status: InviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
};

export type Department = {
  id: string;
  workspaceId: string;
  parentDepartmentId: string | null;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

// ── Strategy ─────────────────────────────────────────────────

export type StrategicValueCategory =
  | 'revenue_growth'
  | 'cost_reduction'
  | 'operational_efficiency'
  | 'customer_experience'
  | 'risk_reduction'
  | 'scalability'
  | 'competitive_advantage';

export type ProblemType = 'customer' | 'internal' | 'both';

export type ExpectedValueType = 'financial' | 'operational' | 'mixed';

export type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'archived';

export type StrategicObjective = {
  id: string;
  workspaceId: string;
  strategicInitiativeName: string;
  executiveObjective: string;
  strategicValueCategory: StrategicValueCategory | '';
  expectedBusinessOutcome: string;
  financialImpact: string;
  urgencyRationale: string;
  targetImplementationYear: string;
  targetImplementationStartDate: string;
  targetImplementationEndDate: string;
  problemOpportunityStatement: string;
  costOfInaction: string;
  currentLimitation: string;
  impactedTeams: string;
  problemType: ProblemType | '';
  valueHypothesis: string;
  valueMeasurementApproach: string;
  expectedValueType: ExpectedValueType | '';
  valueRealizationTimeframe: string;
  status: ObjectiveStatus;
  createdAt: string;
  updatedAt: string;
};

export type MetricCategory = 'financial' | 'operational' | 'customer' | 'risk';

export type StrategicObjectiveMetric = {
  id: string;
  strategicObjectiveId: string;
  workspaceId: string;
  name: string;
  metricCategory: MetricCategory | '';
  baselineValue: number | null;
  targetValue: number | null;
  unit: string;
  timeframe: string;
  createdAt: string;
  updatedAt: string;
};

export type StrategicObjectiveValueStream = {
  id: string;
  strategicObjectiveId: string;
  valueStreamId: string;
};

export type StrategicObjectiveCapability = {
  id: string;
  strategicObjectiveId: string;
  capabilityId: string;
};

// ── Business Architecture — Core ─────────────────────────────

export type ArchitectureStatus = 'draft' | 'active';

export type BusinessArchitectureComponent = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  currentStateSummary: string;
  futureStateSummary: string;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type ValueStreamType = 'current_state' | 'future_state' | 'modified_existing';

export type ValueStream = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  name: string;
  description: string;
  valueStreamType: ValueStreamType | '';
  strategicAlignment: string;
  triggeringStakeholder: string;
  valueRecipient: string;
  linkedDepartmentId: string | null;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type ArchitectureOrigin = 'architecture' | 'discovery';

export type KeyActivity = {
  id: string;
  workspaceId: string;
  valueStreamId: string;
  activityName: string;
  activityDescription: string;
  sequenceOrder: number | null;
  currentStateIssue: string;
  futureStateChange: string;
  businessImpact: string;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type BusinessCapability = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  capabilityName: string;
  capabilityDescription: string;
  currentMaturity: string;
  targetMaturity: string;
  capabilityGap: string;
  owningDepartmentId: string | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type ValueStreamCapability = {
  id: string;
  valueStreamId: string;
  capabilityId: string;
};

export type KeyActivityCapability = {
  id: string;
  keyActivityId: string;
  capabilityId: string;
};

// ── Business Architecture — Supporting ───────────────────────

export type BusinessProcess = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  processName: string;
  currentStateProcess: string;
  futureStateProcess: string;
  processGap: string;
  impactedSystems: string;
  linkedValueStreamId: string | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type StakeholderType = 'internal' | 'external' | 'executive' | 'customer';

export type StakeholderPersona = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  name: string;
  roleOrPersona: string;
  stakeholderType: StakeholderType | '';
  needs: string;
  painPoints: string;
  valueReceived: string;
  linkedValueStreamId: string | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type InformationConcept = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  conceptName: string;
  description: string;
  dataOwner: string;
  sourceSystem: string;
  targetSystem: string;
  dataQualityIssue: string;
  businessUsage: string;
  linkedValueStreamId: string | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImpactType = 'process' | 'financial' | 'customer' | 'risk' | 'operational';
export type Severity = 'low' | 'medium' | 'high';

export type BusinessImpact = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  impactedArea: string;
  impactDescription: string;
  impactType: ImpactType | '';
  severity: Severity | '';
  mitigationNotes: string;
  expectedValue: string;
  linkedValueStreamId: string | null;
  linkedLeanBusinessCaseId: string | null;
  status: ArchitectureStatus;
  createdAt: string;
  updatedAt: string;
};

// ── Lean Business Case ───────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high';
export type CaseValueType = 'cost_savings' | 'revenue' | 'risk_reduction' | 'efficiency';
export type CaseStatus = 'draft' | 'active' | 'completed' | 'archived';

export type LeanBusinessCase = {
  id: string;
  workspaceId: string;
  strategicObjectiveId: string;
  ownerUserId: string;
  title: string;
  summary: string;
  problemOpportunityStatement: string;
  valueHypothesis: string;
  priority: Priority | '';
  forecastCost: number | null;
  forecastValue: number | null;
  valueType: CaseValueType | '';
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
};

export type LeanBusinessCaseValueStream = {
  id: string;
  leanBusinessCaseId: string;
  valueStreamId: string;
};

export type LeanBusinessCaseKeyActivity = {
  id: string;
  leanBusinessCaseId: string;
  keyActivityId: string;
};

export type LeanBusinessCaseCapability = {
  id: string;
  leanBusinessCaseId: string;
  capabilityId: string;
};

// ── Discovery ────────────────────────────────────────────────

export type DiscoveryStatus = 'draft' | 'active' | 'completed';

export type Discovery = {
  id: string;
  workspaceId: string;
  leanBusinessCaseId: string;
  problemStatement: string;
  personaFindings: string;
  journeyMap: string;
  currentStateProcessMap: string;
  bottleneckAnalysis: string;
  dataFindings: string;
  legacyConstraints: string;
  futureStateNeeds: string;
  discoveryMetrics: string;
  governanceFindings: string;
  status: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
};

export type DiscoveryStakeholderPersona = {
  id: string;
  discoveryId: string;
  stakeholderPersonaId: string;
};

export type DiscoveryBusinessProcess = {
  id: string;
  discoveryId: string;
  businessProcessId: string;
};

export type DiscoveryInformationConcept = {
  id: string;
  discoveryId: string;
  informationConceptId: string;
};

// ── Features & Deliverables ─────────────────────────────────

export type FeatureType = 'user_facing' | 'operational' | 'analytical' | 'integration' | 'platform';

export type Feature = {
  id: string;
  workspaceId: string;
  leanBusinessCaseId: string;
  capabilityId: string | null;
  featureName: string;
  description: string;
  featureType: FeatureType | '';
  priority: Priority | '';
  status: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
};

export type RequirementType = 'functional' | 'non_functional' | 'data' | 'integration' | 'security';

export type Requirement = {
  id: string;
  workspaceId: string;
  featureId: string;
  requirementName: string;
  description: string;
  requirementType: RequirementType | '';
  acceptanceCriteria: string;
  priority: Priority | '';
  status: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
};

export type DeliverableType =
  | 'conceptual_architecture_document'
  | 'end_to_end_architecture_diagram'
  | 'system_context_diagram'
  | 'capability_to_component_diagram'
  | 'value_stream_to_feature_map'
  | 'data_flow_diagram'
  | 'api_integration_view'
  | 'governance_oversight_view'
  | 'prioritized_epic_feature_roadmap'
  | 'requirement_sets'
  | 'risk_dependency_register'
  | 'traceability_matrix';

export type DeliverableSource = 'suggested' | 'user_finalized';

export type ConceptualDeliverable = {
  id: string;
  workspaceId: string;
  leanBusinessCaseId: string;
  deliverableType: DeliverableType | '';
  title: string;
  content: string;
  source: DeliverableSource;
  status: DiscoveryStatus;
  createdAt: string;
  updatedAt: string;
};

// ── Implementation ──────────────────────────────────────────

export type ImplementationStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export type Implementation = {
  id: string;
  workspaceId: string;
  leanBusinessCaseId: string;
  actualCost: number | null;
  actualValue: number | null;
  valueType: CaseValueType | '';
  implementationStatus: ImplementationStatus;
  startDate: string | null;
  completionDate: string | null;
  outcomeNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type ImplementationValueStream = {
  id: string;
  implementationId: string;
  valueStreamId: string;
  allocatedCost: number | null;
  allocatedValue: number | null;
};
