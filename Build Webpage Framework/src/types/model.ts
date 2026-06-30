export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type AuthProvider = 'password' | 'google';
export type CompanySize = '1-50' | '51-200' | '201-1000' | '1000+';
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
export type MetricCategory = 'financial' | 'operational' | 'customer' | 'risk';
export type ArchitectureStatus = 'draft' | 'active';
export type ValueStreamType = 'current_state' | 'future_state' | 'modified_existing';
export type ArchitectureOrigin = 'architecture' | 'discovery';
export type StakeholderType = 'internal' | 'external' | 'executive' | 'customer';
export type ImpactType = 'process' | 'financial' | 'customer' | 'risk' | 'operational';
export type Severity = 'low' | 'medium' | 'high';
export type Priority = 'low' | 'medium' | 'high';
export type CaseValueType = 'cost_savings' | 'revenue' | 'risk_reduction' | 'efficiency';
export type CaseStatus = 'draft' | 'active' | 'completed' | 'archived';
export type DeliveryStatus = 'draft' | 'active' | 'completed';
export type FeatureType = 'user_facing' | 'operational' | 'analytical' | 'integration' | 'platform';
export type RequirementType = 'functional' | 'non_functional' | 'data' | 'integration' | 'security';
export type DeliverableSource = 'suggested' | 'user_finalized';
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
export type ImplementationStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export type AuditFields = {
  createdByUserId: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
};

export type User = {
  id: UUID;
  email: string;
  fullName: string;
  avatarUrl: string;
  authProvider: AuthProvider;
  passwordHash: string | null;
  googleSub: string | null;
  emailVerified: boolean;
  lastLoginAt: ISODateTime | null;
};

export type RefreshToken = {
  id: UUID;
  userId: UUID;
  tokenHash: string;
  expiresAt: ISODateTime;
  revokedAt: ISODateTime | null;
  createdAt: ISODateTime;
};

export type Workspace = AuditFields & {
  id: UUID;
  name: string;
  legalName: string;
  businessUnit: string;
  description: string;
  industry: string;
  operatingModel: string;
  businessModel: string;
  primaryCustomers: string;
  primaryProducts: string;
  strategicContext: string;
  companySize: CompanySize | '';
  headquartersRegion: string;
  website: string;
  logoUrl: string;
  annualRevenue: number | null;
};

export type WorkspaceMember = {
  id: UUID;
  workspaceId: UUID;
  userId: UUID;
  isAdmin: boolean;
  joinedAt: ISODateTime;
};

export type WorkspaceInviteStatus = 'pending' | 'accepted' | 'expired';

export type WorkspaceInvite = {
  id: UUID;
  workspaceId: UUID;
  invitedEmail: string;
  invitedByUserId: UUID;
  inviteToken: string;
  status: WorkspaceInviteStatus;
  expiresAt: ISODateTime;
  acceptedAt: ISODateTime | null;
};

export type Department = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  parentDepartmentId: UUID | null;
  name: string;
  description: string;
};

export type StrategicObjective = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  strategicInitiativeName: string;
  executiveObjective: string;
  strategicValueCategory: StrategicValueCategory | '';
  expectedBusinessOutcome: string;
  financialImpact: string;
  urgencyRationale: string;
  targetImplementationYear: string;
  targetImplementationStartDate: ISODate | '';
  targetImplementationEndDate: ISODate | '';
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
};

export type StrategicObjectiveMetric = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  strategicObjectiveId: UUID;
  name: string;
  metricCategory: MetricCategory | '';
  baselineValue: number | null;
  targetValue: number | null;
  unit: string;
  timeframe: string;
};

export type BusinessArchitecture = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  name: string;
  description: string;
  currentStateSummary: string;
  futureStateSummary: string;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type ValueStream = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  businessArchitectureId: UUID;
  name: string;
  description: string;
  valueStreamType: ValueStreamType | '';
  strategicAlignment: string;
  triggeringStakeholder: string;
  valueRecipient: string;
  linkedDepartmentId: UUID | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type KeyActivity = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  valueStreamId: UUID;
  activityName: string;
  activityDescription: string;
  sequenceOrder: number | null;
  currentStateIssue: string;
  futureStateChange: string;
  businessImpact: string;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type BusinessCapability = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  businessArchitectureId: UUID;
  capabilityName: string;
  capabilityDescription: string;
  currentMaturity: string;
  targetMaturity: string;
  capabilityGap: string;
  owningDepartmentId: UUID | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type BusinessProcess = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  businessArchitectureId: UUID;
  processName: string;
  currentStateProcess: string;
  futureStateProcess: string;
  processGap: string;
  impactedSystems: string;
  linkedValueStreamId: UUID | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type StakeholderPersona = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  businessArchitectureId: UUID;
  name: string;
  roleOrPersona: string;
  stakeholderType: StakeholderType | '';
  needs: string;
  painPoints: string;
  valueReceived: string;
  linkedValueStreamId: UUID | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type InformationConcept = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  businessArchitectureId: UUID;
  conceptName: string;
  description: string;
  dataOwner: string;
  sourceSystem: string;
  targetSystem: string;
  dataQualityIssue: string;
  businessUsage: string;
  linkedValueStreamId: UUID | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type BusinessImpact = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  businessArchitectureId: UUID;
  impactedArea: string;
  impactDescription: string;
  impactType: ImpactType | '';
  severity: Severity | '';
  mitigationNotes: string;
  expectedValue: string;
  linkedValueStreamId: UUID | null;
  linkedLeanBusinessCaseId: UUID | null;
  origin: ArchitectureOrigin;
  status: ArchitectureStatus;
};

export type LeanBusinessCase = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  strategicObjectiveId: UUID;
  ownerUserId: UUID;
  title: string;
  summary: string;
  problemOpportunityStatement: string;
  valueHypothesis: string;
  priority: Priority | '';
  forecastCost: number | null;
  forecastValue: number | null;
  valueType: CaseValueType | '';
  status: CaseStatus;
};

export type Discovery = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  leanBusinessCaseId: UUID;
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
  status: DeliveryStatus;
};

export type Feature = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  leanBusinessCaseId: UUID;
  capabilityId: UUID | null;
  featureName: string;
  description: string;
  featureType: FeatureType | '';
  priority: Priority | '';
  status: DeliveryStatus;
};

export type Requirement = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  featureId: UUID;
  requirementName: string;
  description: string;
  requirementType: RequirementType | '';
  acceptanceCriteria: string;
  priority: Priority | '';
  status: DeliveryStatus;
};

export type ConceptualDeliverable = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  leanBusinessCaseId: UUID;
  deliverableType: DeliverableType | '';
  title: string;
  content: string;
  source: DeliverableSource;
  status: DeliveryStatus;
};

export type Implementation = AuditFields & {
  id: UUID;
  workspaceId: UUID;
  leanBusinessCaseId: UUID;
  actualCost: number | null;
  actualValue: number | null;
  valueType: CaseValueType | '';
  implementationStatus: ImplementationStatus;
  startDate: ISODate | '';
  completionDate: ISODate | '';
  outcomeNotes: string;
};

export type ImplementationValueStream = {
  id: UUID;
  implementationId: UUID;
  valueStreamId: UUID;
  allocatedCost: number | null;
  allocatedValue: number | null;
};

export type StrategicObjectiveValueStream = { id: UUID; strategicObjectiveId: UUID; valueStreamId: UUID };
export type StrategicObjectiveCapability = { id: UUID; strategicObjectiveId: UUID; capabilityId: UUID };
export type ValueStreamCapability = { id: UUID; valueStreamId: UUID; capabilityId: UUID };
export type KeyActivityCapability = { id: UUID; keyActivityId: UUID; capabilityId: UUID };
export type LeanBusinessCaseValueStream = { id: UUID; leanBusinessCaseId: UUID; valueStreamId: UUID };
export type LeanBusinessCaseKeyActivity = { id: UUID; leanBusinessCaseId: UUID; keyActivityId: UUID };
export type LeanBusinessCaseCapability = { id: UUID; leanBusinessCaseId: UUID; capabilityId: UUID };
export type DiscoveryStakeholderPersona = { id: UUID; discoveryId: UUID; stakeholderPersonaId: UUID };
export type DiscoveryBusinessProcess = { id: UUID; discoveryId: UUID; businessProcessId: UUID };
export type DiscoveryInformationConcept = { id: UUID; discoveryId: UUID; informationConceptId: UUID };

export type StrategicLifecycleMockState = {
  users: User[];
  refreshTokens: RefreshToken[];
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  workspaceInvites: WorkspaceInvite[];
  departments: Department[];
  strategicObjectives: StrategicObjective[];
  strategicObjectiveMetrics: StrategicObjectiveMetric[];
  strategicObjectiveValueStreams: StrategicObjectiveValueStream[];
  strategicObjectiveCapabilities: StrategicObjectiveCapability[];
  businessArchitectures: BusinessArchitecture[];
  valueStreams: ValueStream[];
  keyActivities: KeyActivity[];
  businessCapabilities: BusinessCapability[];
  valueStreamCapabilities: ValueStreamCapability[];
  keyActivityCapabilities: KeyActivityCapability[];
  businessProcesses: BusinessProcess[];
  stakeholderPersonas: StakeholderPersona[];
  informationConcepts: InformationConcept[];
  businessImpacts: BusinessImpact[];
  leanBusinessCases: LeanBusinessCase[];
  leanBusinessCaseValueStreams: LeanBusinessCaseValueStream[];
  leanBusinessCaseKeyActivities: LeanBusinessCaseKeyActivity[];
  leanBusinessCaseCapabilities: LeanBusinessCaseCapability[];
  discoveries: Discovery[];
  discoveryStakeholderPersonas: DiscoveryStakeholderPersona[];
  discoveryBusinessProcesses: DiscoveryBusinessProcess[];
  discoveryInformationConcepts: DiscoveryInformationConcept[];
  features: Feature[];
  requirements: Requirement[];
  conceptualDeliverables: ConceptualDeliverable[];
  implementations: Implementation[];
  implementationValueStreams: ImplementationValueStream[];
};
