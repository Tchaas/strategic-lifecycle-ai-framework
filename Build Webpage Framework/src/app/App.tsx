import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Github, LayoutDashboard, LogIn, Menu, Pencil, Plus, X, Check, AlertCircle, Lightbulb, Users, Target, TrendingUp, Database, GitBranch, Shield, BookOpen, FileCode, Activity, Layers, Gauge, PanelTop, ListChecks, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Progress } from './components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Textarea } from './components/ui/textarea';

type PrototypeRoute =
  | '/'
  | '/login'
  | '/signup'
  | '/workspace-onboarding'
  | '/dashboard'
  | '/strategic-objectives'
  | '/lean-business-case'
  | '/lifecycle-entry';

type Workspace = {
  id: string;
  name: string;
  legalName: string;
  description: string;
  industry: string;
  companySize: '' | '1-50' | '51-200' | '201-1000' | '1000+';
  headquartersRegion: string;
  website: string;
  logoUrl: string;
  annualRevenue: number | null;
  createdAt: string;
  updatedAt: string;
};

type StrategicValueCategory =
  | ''
  | 'revenue_growth'
  | 'cost_reduction'
  | 'operational_efficiency'
  | 'customer_experience'
  | 'risk_reduction'
  | 'scalability'
  | 'competitive_advantage';

type ProblemType = '' | 'customer' | 'internal' | 'both';
type ExpectedValueType = '' | 'financial' | 'operational' | 'mixed';
type ObjectiveStatus = 'draft' | 'active' | 'completed' | 'archived';
type MetricCategory = '' | 'financial' | 'operational' | 'customer' | 'risk';
type Priority = '' | 'low' | 'medium' | 'high';
type CaseValueType = '' | 'cost_savings' | 'revenue' | 'risk_reduction' | 'efficiency';
type CaseStatus = 'draft' | 'active' | 'completed' | 'archived';

type StrategicObjective = {
  id: string;
  workspaceId: string;
  strategicInitiativeName: string;
  executiveObjective: string;
  strategicValueCategory: StrategicValueCategory;
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
  problemType: ProblemType;
  valueHypothesis: string;
  valueMeasurementApproach: string;
  expectedValueType: ExpectedValueType;
  valueRealizationTimeframe: string;
  status: ObjectiveStatus;
  createdAt: string;
  updatedAt: string;
};

type StoredStrategicObjective = StrategicObjective & Record<string, string | undefined>;
type StoredWorkspace = Workspace & Record<string, unknown>;

type AuthProvider = 'password' | 'google';

type PrototypeUser = {
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

type PrototypeRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

type StrategicObjectiveMetric = {
  id: string;
  strategicObjectiveId: string;
  workspaceId: string;
  name: string;
  metricCategory: MetricCategory;
  baselineValue: number | null;
  targetValue: number | null;
  unit: string;
  timeframe: string;
  createdAt: string;
  updatedAt: string;
};

type LeanBusinessCase = {
  id: string;
  workspaceId: string;
  strategicObjectiveId: string;
  ownerUserId: string;
  title: string;
  summary: string;
  problemOpportunityStatement: string;
  valueHypothesis: string;
  priority: Priority;
  forecastCost: number | null;
  forecastValue: number | null;
  valueType: CaseValueType;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
};

type GenericRecord = {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: string;
};

type GenericEntityKey =
  | 'departments'
  | 'businessArchitecture'
  | 'valueStreams'
  | 'keyActivities'
  | 'businessCapabilities'
  | 'businessProcesses'
  | 'stakeholderPersonas'
  | 'informationConcepts'
  | 'businessImpacts'
  | 'strategicObjectiveValueStreams'
  | 'strategicObjectiveCapabilities'
  | 'valueStreamCapabilities'
  | 'keyActivityCapabilities'
  | 'leanBusinessCaseValueStreams'
  | 'leanBusinessCaseKeyActivities'
  | 'leanBusinessCaseCapabilities'
  | 'discovery'
  | 'discoveryStakeholderPersonas'
  | 'discoveryBusinessProcesses'
  | 'discoveryInformationConcepts'
  | 'features'
  | 'requirements'
  | 'conceptualDeliverables'
  | 'implementation'
  | 'implementationValueStreams';

type GenericField =
  | { name: string; label: string; type: 'text' | 'textarea' | 'number' | 'date'; required?: boolean }
  | { name: string; label: string; type: 'select'; options: { value: string; label: string }[]; required?: boolean }
  | { name: string; label: string; type: 'relationship'; source: 'objectives' | 'leanBusinessCases' | GenericEntityKey; required?: boolean };

type GenericEntityConfig = {
  key: GenericEntityKey;
  title: string;
  tableName: string;
  stage: 'company' | 'architecture' | 'case' | 'discovery' | 'solution' | 'implementation';
  description: string;
  primaryField: string;
  statusKind?: 'draftActive' | 'linear' | 'implementation';
  maxCount?: number;
  maxByField?: string;
  singleton?: boolean;
  fields: GenericField[];
};

const workspaceStorageKey = 'slaf.prototype.workspace';
const usersStorageKey = 'slaf.prototype.users';
const refreshTokensStorageKey = 'slaf.prototype.refreshTokens';
const objectivesStorageKey = 'slaf.prototype.strategicObjectives';
const metricsStorageKey = 'slaf.prototype.metrics';
const lbcStorageKey = 'slaf.prototype.leanBusinessCases';
const genericRecordStorageKey = 'slaf.prototype.lifecycleRecords';

const strategicValueCategoryOptions: { value: Exclude<StrategicValueCategory, ''>; label: string }[] = [
  { value: 'revenue_growth', label: 'Revenue Growth' },
  { value: 'cost_reduction', label: 'Cost Reduction' },
  { value: 'operational_efficiency', label: 'Operational Efficiency' },
  { value: 'customer_experience', label: 'Customer Experience' },
  { value: 'risk_reduction', label: 'Risk Reduction' },
  { value: 'scalability', label: 'Scalability' },
  { value: 'competitive_advantage', label: 'Competitive Advantage' },
];

const objectiveStatusOptions: { value: ObjectiveStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const problemTypeOptions: { value: Exclude<ProblemType, ''>; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
  { value: 'both', label: 'Both' },
];

const expectedValueTypeOptions: { value: Exclude<ExpectedValueType, ''>; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'mixed', label: 'Mixed' },
];

const metricCategoryOptions: { value: Exclude<MetricCategory, ''>; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'customer', label: 'Customer' },
  { value: 'risk', label: 'Risk' },
];

const priorityOptions: { value: Exclude<Priority, ''>; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const caseValueTypeOptions: { value: Exclude<CaseValueType, ''>; label: string }[] = [
  { value: 'cost_savings', label: 'Cost Savings' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'risk_reduction', label: 'Risk Reduction' },
  { value: 'efficiency', label: 'Efficiency' },
];

const caseStatusOptions: { value: CaseStatus; label: string }[] = objectiveStatusOptions;
const companySizeOptions: Workspace['companySize'][] = ['1-50', '51-200', '201-1000', '1000+'];

const getOptionLabel = <T extends string>(value: T | '', options: { value: T; label: string }[]) =>
  options.find(option => option.value === value)?.label || '';

const draftActiveStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
];

const linearStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

const implementationStatusOptions = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const originOptions = [
  { value: 'architecture', label: 'Architecture' },
  { value: 'discovery', label: 'Discovery' },
];

const valueStreamTypeOptions = [
  { value: 'current_state', label: 'Current State' },
  { value: 'future_state', label: 'Future State' },
  { value: 'modified_existing', label: 'Modified Existing' },
];

const stakeholderTypeOptions = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'executive', label: 'Executive' },
  { value: 'customer', label: 'Customer' },
];

const impactTypeOptions = [
  { value: 'process', label: 'Process' },
  { value: 'financial', label: 'Financial' },
  { value: 'customer', label: 'Customer' },
  { value: 'risk', label: 'Risk' },
  { value: 'operational', label: 'Operational' },
];

const featureTypeOptions = [
  { value: 'user_facing', label: 'User Facing' },
  { value: 'operational', label: 'Operational' },
  { value: 'analytical', label: 'Analytical' },
  { value: 'integration', label: 'Integration' },
  { value: 'platform', label: 'Platform' },
];

const requirementTypeOptions = [
  { value: 'functional', label: 'Functional' },
  { value: 'non_functional', label: 'Non-Functional' },
  { value: 'data', label: 'Data' },
  { value: 'integration', label: 'Integration' },
  { value: 'security', label: 'Security' },
];

const deliverableTypeOptions = [
  { value: 'conceptual_architecture_document', label: 'Conceptual Architecture Document' },
  { value: 'end_to_end_architecture_diagram', label: 'End-to-End Architecture Diagram' },
  { value: 'system_context_diagram', label: 'System Context Diagram' },
  { value: 'capability_to_component_diagram', label: 'Capability-to-Component Diagram' },
  { value: 'value_stream_to_feature_map', label: 'Value Stream-to-Feature Map' },
  { value: 'data_flow_diagram', label: 'Data Flow Diagram' },
  { value: 'api_integration_view', label: 'API Integration View' },
  { value: 'governance_oversight_view', label: 'Governance Oversight View' },
  { value: 'prioritized_epic_feature_roadmap', label: 'Prioritized Epic/Feature Roadmap' },
  { value: 'requirement_sets', label: 'Requirement Sets' },
  { value: 'risk_dependency_register', label: 'Risk Dependency Register' },
  { value: 'traceability_matrix', label: 'Traceability Matrix' },
];

const deliverableSourceOptions = [
  { value: 'suggested', label: 'Suggested' },
  { value: 'user_finalized', label: 'User Finalized' },
];

const lifecycleEntityConfigs: GenericEntityConfig[] = [
  {
    key: 'departments',
    title: 'Departments',
    tableName: 'departments',
    stage: 'company',
    description: 'Optional lean org structure linked by architecture components.',
    primaryField: 'name',
    fields: [
      { name: 'parentDepartmentId', label: 'Parent Department', type: 'relationship', source: 'departments' },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    key: 'businessArchitecture',
    title: 'Business Architecture Component',
    tableName: 'business_architecture_components',
    stage: 'architecture',
    description: 'One company-level architecture component shared across all objectives and cases.',
    primaryField: 'name',
    statusKind: 'draftActive',
    singleton: true,
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'currentStateSummary', label: 'Current State Summary', type: 'textarea' },
      { name: 'futureStateSummary', label: 'Future State Summary', type: 'textarea' },
    ],
  },
  {
    key: 'valueStreams',
    title: 'Value Streams',
    tableName: 'value_streams',
    stage: 'architecture',
    description: 'Current, future, or modified value streams under the company architecture.',
    primaryField: 'name',
    statusKind: 'draftActive',
    maxCount: 6,
    fields: [
      { name: 'businessArchitectureId', label: 'Business Architecture', type: 'relationship', source: 'businessArchitecture', required: true },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'valueStreamType', label: 'Value Stream Type', type: 'select', options: valueStreamTypeOptions },
      { name: 'strategicAlignment', label: 'Strategic Alignment', type: 'textarea' },
      { name: 'triggeringStakeholder', label: 'Triggering Stakeholder', type: 'text' },
      { name: 'valueRecipient', label: 'Value Recipient', type: 'text' },
      { name: 'linkedDepartmentId', label: 'Linked Department', type: 'relationship', source: 'departments' },
    ],
  },
  {
    key: 'keyActivities',
    title: 'Key Activities',
    tableName: 'key_activities',
    stage: 'architecture',
    description: 'Ordered stages within a value stream.',
    primaryField: 'activityName',
    statusKind: 'draftActive',
    maxByField: 'valueStreamId',
    maxCount: 6,
    fields: [
      { name: 'valueStreamId', label: 'Value Stream', type: 'relationship', source: 'valueStreams', required: true },
      { name: 'activityName', label: 'Activity Name', type: 'text', required: true },
      { name: 'activityDescription', label: 'Activity Description', type: 'textarea' },
      { name: 'sequenceOrder', label: 'Sequence Order', type: 'number' },
      { name: 'currentStateIssue', label: 'Current State Issue', type: 'textarea' },
      { name: 'futureStateChange', label: 'Future State Change', type: 'textarea' },
      { name: 'businessImpact', label: 'Business Impact', type: 'textarea' },
      { name: 'origin', label: 'Origin', type: 'select', options: originOptions },
    ],
  },
  {
    key: 'businessCapabilities',
    title: 'Business Capabilities',
    tableName: 'business_capabilities',
    stage: 'architecture',
    description: 'Stable business capabilities with current and target maturity.',
    primaryField: 'capabilityName',
    statusKind: 'draftActive',
    fields: [
      { name: 'businessArchitectureId', label: 'Business Architecture', type: 'relationship', source: 'businessArchitecture', required: true },
      { name: 'capabilityName', label: 'Capability Name', type: 'text', required: true },
      { name: 'capabilityDescription', label: 'Capability Description', type: 'textarea' },
      { name: 'currentMaturity', label: 'Current Maturity', type: 'text' },
      { name: 'targetMaturity', label: 'Target Maturity', type: 'text' },
      { name: 'capabilityGap', label: 'Capability Gap', type: 'textarea' },
      { name: 'owningDepartmentId', label: 'Owning Department', type: 'relationship', source: 'departments' },
      { name: 'origin', label: 'Origin', type: 'select', options: originOptions },
    ],
  },
  {
    key: 'businessProcesses',
    title: 'Business Processes',
    tableName: 'business_processes',
    stage: 'architecture',
    description: 'Supporting current and future process details.',
    primaryField: 'processName',
    statusKind: 'draftActive',
    fields: [
      { name: 'businessArchitectureId', label: 'Business Architecture', type: 'relationship', source: 'businessArchitecture', required: true },
      { name: 'processName', label: 'Process Name', type: 'text', required: true },
      { name: 'currentStateProcess', label: 'Current State Process', type: 'textarea' },
      { name: 'futureStateProcess', label: 'Future State Process', type: 'textarea' },
      { name: 'processGap', label: 'Process Gap', type: 'textarea' },
      { name: 'impactedSystems', label: 'Impacted Systems', type: 'textarea' },
      { name: 'linkedValueStreamId', label: 'Linked Value Stream', type: 'relationship', source: 'valueStreams' },
      { name: 'origin', label: 'Origin', type: 'select', options: originOptions },
    ],
  },
  {
    key: 'stakeholderPersonas',
    title: 'Stakeholders & Personas',
    tableName: 'stakeholders_personas',
    stage: 'architecture',
    description: 'Stakeholders, roles, personas, needs, pain points, and received value.',
    primaryField: 'name',
    statusKind: 'draftActive',
    fields: [
      { name: 'businessArchitectureId', label: 'Business Architecture', type: 'relationship', source: 'businessArchitecture', required: true },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'roleOrPersona', label: 'Role or Persona', type: 'text' },
      { name: 'stakeholderType', label: 'Stakeholder Type', type: 'select', options: stakeholderTypeOptions },
      { name: 'needs', label: 'Needs', type: 'textarea' },
      { name: 'painPoints', label: 'Pain Points', type: 'textarea' },
      { name: 'valueReceived', label: 'Value Received', type: 'textarea' },
      { name: 'linkedValueStreamId', label: 'Linked Value Stream', type: 'relationship', source: 'valueStreams' },
      { name: 'origin', label: 'Origin', type: 'select', options: originOptions },
    ],
  },
  {
    key: 'informationConcepts',
    title: 'Information Concepts',
    tableName: 'information_concepts',
    stage: 'architecture',
    description: 'Business data concepts, owners, systems, quality issues, and usage.',
    primaryField: 'conceptName',
    statusKind: 'draftActive',
    fields: [
      { name: 'businessArchitectureId', label: 'Business Architecture', type: 'relationship', source: 'businessArchitecture', required: true },
      { name: 'conceptName', label: 'Concept Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'dataOwner', label: 'Data Owner', type: 'text' },
      { name: 'sourceSystem', label: 'Source System', type: 'text' },
      { name: 'targetSystem', label: 'Target System', type: 'text' },
      { name: 'dataQualityIssue', label: 'Data Quality Issue', type: 'textarea' },
      { name: 'businessUsage', label: 'Business Usage', type: 'textarea' },
      { name: 'linkedValueStreamId', label: 'Linked Value Stream', type: 'relationship', source: 'valueStreams' },
      { name: 'origin', label: 'Origin', type: 'select', options: originOptions },
    ],
  },
  {
    key: 'businessImpacts',
    title: 'Business Impacts',
    tableName: 'business_impacts',
    stage: 'architecture',
    description: 'Business impacts with optional value stream and Lean Business Case traceability.',
    primaryField: 'impactedArea',
    statusKind: 'draftActive',
    fields: [
      { name: 'businessArchitectureId', label: 'Business Architecture', type: 'relationship', source: 'businessArchitecture', required: true },
      { name: 'impactedArea', label: 'Impacted Area', type: 'text', required: true },
      { name: 'impactDescription', label: 'Impact Description', type: 'textarea' },
      { name: 'impactType', label: 'Impact Type', type: 'select', options: impactTypeOptions },
      { name: 'severity', label: 'Severity', type: 'select', options: priorityOptions },
      { name: 'mitigationNotes', label: 'Mitigation Notes', type: 'textarea' },
      { name: 'expectedValue', label: 'Expected Value', type: 'textarea' },
      { name: 'linkedValueStreamId', label: 'Linked Value Stream', type: 'relationship', source: 'valueStreams' },
      { name: 'linkedLeanBusinessCaseId', label: 'Linked Lean Business Case', type: 'relationship', source: 'leanBusinessCases' },
    ],
  },
  {
    key: 'strategicObjectiveValueStreams',
    title: 'Strategic Objective Value Stream Links',
    tableName: 'strategic_objective_value_streams',
    stage: 'architecture',
    description: 'Optional direct links from a strategic objective to existing value streams.',
    primaryField: 'strategicObjectiveId',
    fields: [
      { name: 'strategicObjectiveId', label: 'Strategic Objective', type: 'relationship', source: 'objectives', required: true },
      { name: 'valueStreamId', label: 'Value Stream', type: 'relationship', source: 'valueStreams', required: true },
    ],
  },
  {
    key: 'strategicObjectiveCapabilities',
    title: 'Strategic Objective Capability Links',
    tableName: 'strategic_objective_capabilities',
    stage: 'architecture',
    description: 'Optional direct links from a strategic objective to existing capabilities.',
    primaryField: 'strategicObjectiveId',
    fields: [
      { name: 'strategicObjectiveId', label: 'Strategic Objective', type: 'relationship', source: 'objectives', required: true },
      { name: 'capabilityId', label: 'Business Capability', type: 'relationship', source: 'businessCapabilities', required: true },
    ],
  },
  {
    key: 'valueStreamCapabilities',
    title: 'Value Stream Capability Links',
    tableName: 'value_stream_capabilities',
    stage: 'architecture',
    description: 'Traceability backbone linking value streams to business capabilities.',
    primaryField: 'valueStreamId',
    fields: [
      { name: 'valueStreamId', label: 'Value Stream', type: 'relationship', source: 'valueStreams', required: true },
      { name: 'capabilityId', label: 'Business Capability', type: 'relationship', source: 'businessCapabilities', required: true },
    ],
  },
  {
    key: 'keyActivityCapabilities',
    title: 'Key Activity Capability Links',
    tableName: 'key_activity_capabilities',
    stage: 'architecture',
    description: 'Traceability links from key activities back to business capabilities.',
    primaryField: 'keyActivityId',
    fields: [
      { name: 'keyActivityId', label: 'Key Activity', type: 'relationship', source: 'keyActivities', required: true },
      { name: 'capabilityId', label: 'Business Capability', type: 'relationship', source: 'businessCapabilities', required: true },
    ],
  },
  {
    key: 'leanBusinessCaseValueStreams',
    title: 'Lean Business Case Value Stream Links',
    tableName: 'lean_business_case_value_streams',
    stage: 'case',
    description: 'Links a Lean Business Case to the value streams it works through.',
    primaryField: 'leanBusinessCaseId',
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'valueStreamId', label: 'Value Stream', type: 'relationship', source: 'valueStreams', required: true },
    ],
  },
  {
    key: 'leanBusinessCaseKeyActivities',
    title: 'Lean Business Case Key Activity Links',
    tableName: 'lean_business_case_key_activities',
    stage: 'case',
    description: 'Links a Lean Business Case to the key activities it works through.',
    primaryField: 'leanBusinessCaseId',
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'keyActivityId', label: 'Key Activity', type: 'relationship', source: 'keyActivities', required: true },
    ],
  },
  {
    key: 'leanBusinessCaseCapabilities',
    title: 'Lean Business Case Capability Links',
    tableName: 'lean_business_case_capabilities',
    stage: 'case',
    description: 'Links a Lean Business Case to the business capabilities it works through.',
    primaryField: 'leanBusinessCaseId',
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'capabilityId', label: 'Business Capability', type: 'relationship', source: 'businessCapabilities', required: true },
    ],
  },
  {
    key: 'discovery',
    title: 'Discovery',
    tableName: 'discovery',
    stage: 'discovery',
    description: 'One discovery record per Lean Business Case with 10 qualitative finding areas.',
    primaryField: 'problemStatement',
    statusKind: 'linear',
    maxByField: 'leanBusinessCaseId',
    maxCount: 1,
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'problemStatement', label: 'Problem Statement', type: 'textarea', required: true },
      { name: 'personaFindings', label: 'Persona Findings', type: 'textarea' },
      { name: 'journeyMap', label: 'Journey Map', type: 'textarea' },
      { name: 'currentStateProcessMap', label: 'Current State Process Map', type: 'textarea' },
      { name: 'bottleneckAnalysis', label: 'Bottleneck Analysis', type: 'textarea' },
      { name: 'dataFindings', label: 'Data Findings', type: 'textarea' },
      { name: 'legacyConstraints', label: 'Legacy Constraints', type: 'textarea' },
      { name: 'futureStateNeeds', label: 'Future State Needs', type: 'textarea' },
      { name: 'discoveryMetrics', label: 'Discovery Metrics', type: 'textarea' },
      { name: 'governanceFindings', label: 'Governance Findings', type: 'textarea' },
    ],
  },
  {
    key: 'discoveryStakeholderPersonas',
    title: 'Discovery Stakeholder / Persona Links',
    tableName: 'discovery_stakeholders_personas',
    stage: 'discovery',
    description: 'Links discovery findings to existing stakeholders or personas.',
    primaryField: 'discoveryId',
    fields: [
      { name: 'discoveryId', label: 'Discovery', type: 'relationship', source: 'discovery', required: true },
      { name: 'stakeholderPersonaId', label: 'Stakeholder / Persona', type: 'relationship', source: 'stakeholderPersonas', required: true },
    ],
  },
  {
    key: 'discoveryBusinessProcesses',
    title: 'Discovery Business Process Links',
    tableName: 'discovery_business_processes',
    stage: 'discovery',
    description: 'Links discovery findings to existing business processes.',
    primaryField: 'discoveryId',
    fields: [
      { name: 'discoveryId', label: 'Discovery', type: 'relationship', source: 'discovery', required: true },
      { name: 'businessProcessId', label: 'Business Process', type: 'relationship', source: 'businessProcesses', required: true },
    ],
  },
  {
    key: 'discoveryInformationConcepts',
    title: 'Discovery Information Concept Links',
    tableName: 'discovery_information_concepts',
    stage: 'discovery',
    description: 'Links discovery findings to existing information concepts.',
    primaryField: 'discoveryId',
    fields: [
      { name: 'discoveryId', label: 'Discovery', type: 'relationship', source: 'discovery', required: true },
      { name: 'informationConceptId', label: 'Information Concept', type: 'relationship', source: 'informationConcepts', required: true },
    ],
  },
  {
    key: 'features',
    title: 'Features',
    tableName: 'features',
    stage: 'solution',
    description: 'Solution features that enable business capabilities.',
    primaryField: 'featureName',
    statusKind: 'linear',
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'capabilityId', label: 'Capability Enabled', type: 'relationship', source: 'businessCapabilities' },
      { name: 'featureName', label: 'Feature Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'featureType', label: 'Feature Type', type: 'select', options: featureTypeOptions },
      { name: 'priority', label: 'Priority', type: 'select', options: priorityOptions },
    ],
  },
  {
    key: 'requirements',
    title: 'Requirements',
    tableName: 'requirements',
    stage: 'solution',
    description: 'Detailed requirements under a feature.',
    primaryField: 'requirementName',
    statusKind: 'linear',
    fields: [
      { name: 'featureId', label: 'Feature', type: 'relationship', source: 'features', required: true },
      { name: 'requirementName', label: 'Requirement Name', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'requirementType', label: 'Requirement Type', type: 'select', options: requirementTypeOptions },
      { name: 'acceptanceCriteria', label: 'Acceptance Criteria', type: 'textarea' },
      { name: 'priority', label: 'Priority', type: 'select', options: priorityOptions },
    ],
  },
  {
    key: 'conceptualDeliverables',
    title: 'Conceptual Deliverables',
    tableName: 'conceptual_deliverables',
    stage: 'solution',
    description: 'The 12 governed deliverable types: suggested drafts that users can finalize.',
    primaryField: 'title',
    statusKind: 'linear',
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'deliverableType', label: 'Deliverable Type', type: 'select', options: deliverableTypeOptions, required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'content', label: 'Content', type: 'textarea' },
      { name: 'source', label: 'Source', type: 'select', options: deliverableSourceOptions },
    ],
  },
  {
    key: 'implementation',
    title: 'Implementation',
    tableName: 'implementation',
    stage: 'implementation',
    description: 'One implementation record per Lean Business Case where actual cost and value land.',
    primaryField: 'leanBusinessCaseId',
    statusKind: 'implementation',
    maxByField: 'leanBusinessCaseId',
    maxCount: 1,
    fields: [
      { name: 'leanBusinessCaseId', label: 'Lean Business Case', type: 'relationship', source: 'leanBusinessCases', required: true },
      { name: 'actualCost', label: 'Actual Cost', type: 'number' },
      { name: 'actualValue', label: 'Actual Value', type: 'number' },
      { name: 'valueType', label: 'Value Type', type: 'select', options: caseValueTypeOptions },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'completionDate', label: 'Completion Date', type: 'date' },
      { name: 'outcomeNotes', label: 'Outcome Notes', type: 'textarea' },
    ],
  },
  {
    key: 'implementationValueStreams',
    title: 'Implementation Value Stream Actuals',
    tableName: 'implementation_value_streams',
    stage: 'implementation',
    description: 'Per-value-stream actual allocations that support objective and value-stream rollups.',
    primaryField: 'implementationId',
    fields: [
      { name: 'implementationId', label: 'Implementation', type: 'relationship', source: 'implementation', required: true },
      { name: 'valueStreamId', label: 'Value Stream', type: 'relationship', source: 'valueStreams', required: true },
      { name: 'allocatedCost', label: 'Allocated Cost', type: 'number' },
      { name: 'allocatedValue', label: 'Allocated Value', type: 'number' },
    ],
  },
];

const lifecycleEntityConfigByKey = lifecycleEntityConfigs.reduce((acc, config) => {
  acc[config.key] = config;
  return acc;
}, {} as Record<GenericEntityKey, GenericEntityConfig>);

const lifecycleTransitions: Record<ObjectiveStatus, ObjectiveStatus[]> = {
  draft: ['draft', 'active', 'archived'],
  active: ['active', 'completed', 'archived'],
  completed: ['completed', 'archived'],
  archived: ['archived', 'draft'],
};

const getLifecycleStatusOptions = <T extends ObjectiveStatus | CaseStatus>(
  currentStatus: T,
  options: { value: T; label: string }[],
) => {
  const allowed = lifecycleTransitions[currentStatus] as T[];
  return options.filter(option => allowed.includes(option.value));
};

const isLifecycleTransitionAllowed = <T extends ObjectiveStatus | CaseStatus>(currentStatus: T, nextStatus: T) =>
  (lifecycleTransitions[currentStatus] as T[]).includes(nextStatus);

const processFlow = [
  'Strategic Objectives',
  'Business Architecture',
  'Lean Business Cases',
  'Product Discovery',
  'Features & Requirements',
  'Conceptual Deliverables',
  'Implementation',
];

const defaultObjectiveForm: Omit<StrategicObjective, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'> = {
  strategicInitiativeName: '',
  executiveObjective: '',
  strategicValueCategory: '',
  expectedBusinessOutcome: '',
  financialImpact: '',
  urgencyRationale: '',
  targetImplementationYear: '',
  targetImplementationStartDate: '',
  targetImplementationEndDate: '',
  problemOpportunityStatement: '',
  costOfInaction: '',
  currentLimitation: '',
  impactedTeams: '',
  problemType: '',
  valueHypothesis: '',
  valueMeasurementApproach: '',
  expectedValueType: '',
  valueRealizationTimeframe: '',
  status: 'draft',
};

const defaultLbcForm: Omit<LeanBusinessCase, 'id' | 'workspaceId' | 'strategicObjectiveId' | 'ownerUserId' | 'createdAt' | 'updatedAt'> = {
  title: '',
  summary: '',
  problemOpportunityStatement: '',
  valueHypothesis: '',
  priority: '',
  forecastCost: null,
  forecastValue: null,
  valueType: '',
  status: 'draft',
};

const navigateTo = (route: PrototypeRoute, params?: Record<string, string>) => {
  const query = params ? `?${new URLSearchParams(params).toString()}` : '';
  window.location.hash = `${route}${query}`;
};

const normalizeRoute = (hash: string): PrototypeRoute => {
  const route = (hash.replace(/^#/, '').split('?')[0] || '/') as PrototypeRoute;
  const knownRoutes: PrototypeRoute[] = ['/', '/login', '/signup', '/workspace-onboarding', '/dashboard', '/strategic-objectives', '/lean-business-case', '/lifecycle-entry'];
  return knownRoutes.includes(route) ? route : '/';
};

const getRouteParams = () => new URLSearchParams(window.location.hash.replace(/^#[^?]*\??/, ''));

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const migrateValueCategory = (value: string): StrategicValueCategory => {
  const map: Record<string, Exclude<StrategicValueCategory, ''>> = {
    'Revenue Growth': 'revenue_growth',
    'Cost Savings': 'cost_reduction',
    'Cost Reduction': 'cost_reduction',
    'Customer Experience': 'customer_experience',
    'Operational Efficiency': 'operational_efficiency',
    'Risk Reduction': 'risk_reduction',
    'Scalability': 'scalability',
    'Competitive Advantage': 'competitive_advantage',
  };
  return map[value] || (strategicValueCategoryOptions.some(option => option.value === value) ? value as StrategicValueCategory : '');
};

const migrateStatus = (value: string): ObjectiveStatus => {
  const map: Record<string, ObjectiveStatus> = { Draft: 'draft', Active: 'active', Completed: 'completed', Archived: 'archived' };
  return map[value] || (objectiveStatusOptions.some(option => option.value === value) ? value as ObjectiveStatus : 'draft');
};

const normalizeObjective = (objective: StoredStrategicObjective): StrategicObjective => {
  const legacyYearKey = 'time' + 'Horizon';
  const targetImplementationYear = objective.targetImplementationYear || objective[legacyYearKey] || '';

  return {
    id: objective.id || createId('objective'),
    workspaceId: objective.workspaceId || '',
    strategicInitiativeName: objective.strategicInitiativeName || objective.title || '',
    executiveObjective: objective.executiveObjective || objective.objectiveStatement || '',
    strategicValueCategory: migrateValueCategory(objective.strategicValueCategory || objective.strategicValueType || ''),
    expectedBusinessOutcome: objective.expectedBusinessOutcome || objective.companyGoal || objective.targetOutcome || '',
    financialImpact: objective.financialImpact || '',
    urgencyRationale: objective.urgencyRationale || objective.strategicRationale || '',
    targetImplementationYear,
    targetImplementationStartDate: objective.targetImplementationStartDate || '',
    targetImplementationEndDate: objective.targetImplementationEndDate || '',
    problemOpportunityStatement: objective.problemOpportunityStatement || objective.businessProblem || '',
    costOfInaction: objective.costOfInaction || '',
    currentLimitation: objective.currentLimitation || objective.currentStateSummary || '',
    impactedTeams: objective.impactedTeams || '',
    problemType: (['customer', 'internal', 'both'].includes(objective.problemType || '') ? objective.problemType : '') as ProblemType,
    valueHypothesis: objective.valueHypothesis || objective.desiredFutureState || '',
    valueMeasurementApproach: objective.valueMeasurementApproach || objective.targetMetric || '',
    expectedValueType: (['financial', 'operational', 'mixed'].includes(objective.expectedValueType || '') ? objective.expectedValueType : '') as ExpectedValueType,
    valueRealizationTimeframe: objective.valueRealizationTimeframe || '',
    status: migrateStatus(objective.status || 'draft'),
    createdAt: objective.createdAt || new Date().toISOString(),
    updatedAt: objective.updatedAt || new Date().toISOString(),
  };
};

const loadWorkspace = (): Workspace | null => {
  try {
    const rawWorkspace = localStorage.getItem(workspaceStorageKey);
    if (!rawWorkspace) return null;
    const parsed = JSON.parse(rawWorkspace) as StoredWorkspace;
    return {
      id: (parsed.id as string) || createId('workspace'),
      name: (parsed.name as string) || '',
      legalName: (parsed.legalName as string) || '',
      description: (parsed.description as string) || '',
      industry: (parsed.industry as string) || '',
      companySize: (parsed.companySize as Workspace['companySize']) || '',
      headquartersRegion: (parsed.headquartersRegion as string) || '',
      website: (parsed.website as string) || '',
      logoUrl: (parsed.logoUrl as string) || '',
      annualRevenue: typeof parsed.annualRevenue === 'number' ? parsed.annualRevenue : null,
      createdAt: (parsed.createdAt as string) || new Date().toISOString(),
      updatedAt: (parsed.updatedAt as string) || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const loadObjectives = (): StrategicObjective[] => {
  try {
    const rawObjectives = localStorage.getItem(objectivesStorageKey);
    if (!rawObjectives) return [];
    const parsed = JSON.parse(rawObjectives) as StoredStrategicObjective[];
    if (!Array.isArray(parsed)) return [];
    const migratedObjectives = parsed.map(normalizeObjective).slice(0, 3);
    localStorage.setItem(objectivesStorageKey, JSON.stringify(migratedObjectives));
    return migratedObjectives;
  } catch {
    return [];
  }
};

const loadList = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mockPasswordHash = (password: string) => `mock-password-hash:${password}`;

const loadUsers = (): PrototypeUser[] => loadList<PrototypeUser>(usersStorageKey);

const saveUsers = (users: PrototypeUser[]) => {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
};

const createRefreshToken = (userId: string): PrototypeRefreshToken => {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: createId('refresh-token'),
    userId,
    tokenHash: `mock-token-hash:${createId('token')}`,
    expiresAt,
    revokedAt: null,
    createdAt,
  };
};

const saveRefreshToken = (token: PrototypeRefreshToken) => {
  const existing = loadList<PrototypeRefreshToken>(refreshTokensStorageKey);
  localStorage.setItem(refreshTokensStorageKey, JSON.stringify([...existing, token]));
};

const loadGenericRecords = (): Record<GenericEntityKey, GenericRecord[]> => {
  try {
    const raw = localStorage.getItem(genericRecordStorageKey);
    const parsed = raw ? JSON.parse(raw) : {};
    return lifecycleEntityConfigs.reduce((acc, config) => {
      acc[config.key] = Array.isArray(parsed[config.key]) ? parsed[config.key] : [];
      return acc;
    }, {} as Record<GenericEntityKey, GenericRecord[]>);
  } catch {
    return lifecycleEntityConfigs.reduce((acc, config) => {
      acc[config.key] = [];
      return acc;
    }, {} as Record<GenericEntityKey, GenericRecord[]>);
  }
};

const getGenericStatusOptions = (statusKind?: GenericEntityConfig['statusKind']) => {
  if (statusKind === 'implementation') return implementationStatusOptions;
  if (statusKind === 'linear') return linearStatusOptions;
  if (statusKind === 'draftActive') return draftActiveStatusOptions;
  return [];
};

const getGenericDefaultStatus = (statusKind?: GenericEntityConfig['statusKind']) => {
  if (statusKind === 'implementation') return 'not_started';
  if (statusKind === 'linear' || statusKind === 'draftActive') return 'draft';
  return '';
};

const getGenericRecordTitle = (record: GenericRecord, config: GenericEntityConfig) =>
  record[config.primaryField] || record.name || record.title || record.id;

const getRelatedOptions = (
  source: GenericField extends infer F ? F extends { type: 'relationship'; source: infer S } ? S : never : never,
  objectives: StrategicObjective[],
  leanBusinessCases: LeanBusinessCase[],
  genericRecords: Record<GenericEntityKey, GenericRecord[]>,
) => {
  if (source === 'objectives') {
    return objectives.map(objective => ({ value: objective.id, label: objective.strategicInitiativeName || objective.id }));
  }
  if (source === 'leanBusinessCases') {
    return leanBusinessCases.map(businessCase => ({ value: businessCase.id, label: businessCase.title || businessCase.id }));
  }
  const config = lifecycleEntityConfigByKey[source as GenericEntityKey];
  return (genericRecords[source as GenericEntityKey] || []).map(record => ({
    value: record.id,
    label: config ? getGenericRecordTitle(record, config) : record.id,
  }));
};

function PrototypeHeader({ workspace }: { workspace: Workspace | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div>
          <p className="text-sm text-slate-300">{workspace?.name || 'Workspace setup in progress'}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project Site
          </Button>
          {workspace && (
            <>
              <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/workspace-onboarding')}>
                Workspace
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function PrototypeShell({ workspace, children }: { workspace: Workspace | null; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PrototypeHeader workspace={workspace} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function Field({ id, label, helper, children }: { id: string; label: string; helper?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-200">{label}</Label>
      {helper && <p className="text-xs leading-relaxed text-slate-400">{helper}</p>}
      {children}
    </div>
  );
}

function AuthScreen({ mode, workspace }: { mode: 'login' | 'signup'; workspace: Workspace | null }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const continueAfterAuth = (user: PrototypeUser) => {
    saveRefreshToken(createRefreshToken(user.id));
    navigateTo(workspace ? '/dashboard' : '/workspace-onboarding');
  };

  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    const users = loadUsers();

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Full name is required.');
        return;
      }

      if (users.some(user => user.email === normalizedEmail)) {
        setError('A mock user already exists for this email.');
        return;
      }

      const now = new Date().toISOString();
      const newUser: PrototypeUser = {
        id: createId('user'),
        email: normalizedEmail,
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
        authProvider: 'password',
        passwordHash: mockPasswordHash(password),
        googleSub: null,
        emailVerified: false,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      };
      saveUsers([...users, newUser]);
      continueAfterAuth(newUser);
      return;
    }

    const existingUser = users.find(user => user.email === normalizedEmail && user.authProvider === 'password');
    if (!existingUser || existingUser.passwordHash !== mockPasswordHash(password)) {
      setError('Email or password is incorrect for the mock user store.');
      return;
    }

    const now = new Date().toISOString();
    const updatedUser: PrototypeUser = { ...existingUser, lastLoginAt: now, updatedAt: now };
    saveUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
    continueAfterAuth(updatedUser);
  };

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Front-end prototype</Badge>
          <h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">
            {mode === 'login' ? 'Sign In / Login' : 'Create Prototype Account'}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
            Sign in to begin mapping strategic objectives into Lean Business Cases, value streams, product discovery, and conceptual architecture.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['users table shape in localStorage', 'refresh token mock records', 'auth_provider = password', 'Lifecycle data-entry tabs'].map((item) => (
              <div key={item} className="flex items-center gap-3 border border-cyan-500/30 bg-slate-900 p-3 text-sm text-slate-200">
                <Check className="h-4 w-4 flex-shrink-0 text-lime-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">{mode === 'login' ? 'Access Prototype' : 'Set Up Access'}</CardTitle>
            <CardDescription className="text-slate-300">Mock email and password authentication using frontend-only users and refresh token records.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitAuth}>
              {mode === 'signup' && (
                <>
                  <Field id="full-name" label="Full Name">
                    <Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Alex Smith" className="border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                  <Field id="avatar-url" label="Avatar URL">
                    <Input id="avatar-url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Optional" className="border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                </>
              )}
              <Field id="email" label="Email">
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <Field id="password" label="Password">
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Prototype password" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-3 text-xs text-cyan-100">
                Auth provider is stored as <code>password</code>. <code>password_hash</code> is a mock value, <code>google_sub</code> is null, and <code>email_verified</code> defaults to false.
              </div>
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}
              <Button type="submit" className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                <LogIn className="mr-2 h-4 w-4" />
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" className="text-cyan-300 hover:text-cyan-100" onClick={() => navigateTo(mode === 'login' ? '/signup' : '/login')}>
                  {mode === 'login' ? 'Create Account / Sign Up' : 'Already have an account? Sign In'}
                </button>
                <button type="button" className="text-slate-400 hover:text-slate-200">Forgot password?</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function WorkspaceOnboardingScreen({
  workspace,
  setWorkspace,
}: {
  workspace: Workspace | null;
  setWorkspace: (workspace: Workspace) => void;
}) {
  const [form, setForm] = useState({
    name: workspace?.name || '',
    legalName: workspace?.legalName || '',
    description: workspace?.description || '',
    industry: workspace?.industry || '',
    companySize: workspace?.companySize || '',
    headquartersRegion: workspace?.headquartersRegion || '',
    website: workspace?.website || '',
    logoUrl: workspace?.logoUrl || '',
    annualRevenue: workspace?.annualRevenue?.toString() || '',
  });

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitWorkspace = (event: FormEvent) => {
    event.preventDefault();
    const nextWorkspace: Workspace = {
      id: workspace?.id || createId('workspace'),
      name: form.name.trim() || 'Prototype Workspace',
      legalName: form.legalName,
      description: form.description,
      industry: form.industry,
      companySize: form.companySize as Workspace['companySize'],
      headquartersRegion: form.headquartersRegion,
      website: form.website,
      logoUrl: form.logoUrl,
      annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : null,
      createdAt: workspace?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(workspaceStorageKey, JSON.stringify(nextWorkspace));
    setWorkspace(nextWorkspace);
    navigateTo('/dashboard');
  };

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Default admin setup</Badge>
          <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Workspace Onboarding</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            Create a company profile workspace for the front-end prototype. The first user who creates the workspace is treated as the default admin for now.
          </p>
        </div>
        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="grid gap-5" onSubmit={submitWorkspace}>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="workspace-name" label="Company / Initiative Name">
                  <Input id="workspace-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="legal-name" label="Legal Name">
                  <Input id="legal-name" value={form.legalName} onChange={(event) => updateField('legalName', event.target.value)} placeholder="Optional" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>
              <Field id="workspace-description" label="Workspace Description">
                <Textarea id="workspace-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="industry" label="Primary Industry">
                  <Input id="industry" value={form.industry} onChange={(event) => updateField('industry', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="company-size" label="Company Size">
                  <Select value={form.companySize} onValueChange={(value) => updateField('companySize', value)}>
                    <SelectTrigger id="company-size" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {companySizeOptions.map((size) => <SelectItem key={size} value={size}>{size} employees</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="headquarters-region" label="Headquarters Region">
                  <Input id="headquarters-region" value={form.headquartersRegion} onChange={(event) => updateField('headquartersRegion', event.target.value)} placeholder="Optional" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="website" label="Website">
                  <Input id="website" value={form.website} onChange={(event) => updateField('website', event.target.value)} placeholder="https://example.com" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="logo-url" label="Logo URL">
                  <Input id="logo-url" value={form.logoUrl} onChange={(event) => updateField('logoUrl', event.target.value)} placeholder="Optional" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="annual-revenue" label="Annual Revenue">
                  <Input id="annual-revenue" type="number" value={form.annualRevenue} onChange={(event) => updateField('annualRevenue', event.target.value)} placeholder="Optional" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'Update Workspace' : 'Create Workspace'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function DashboardScreen({
  workspace,
  objectives,
  metrics,
  leanBusinessCases,
  genericRecords,
}: {
  workspace: Workspace | null;
  objectives: StrategicObjective[];
  metrics: StrategicObjectiveMetric[];
  leanBusinessCases: LeanBusinessCase[];
  genericRecords: Record<GenericEntityKey, GenericRecord[]>;
}) {
  const hasReachedLimit = objectives.length >= 3;
  const architectureKeys: GenericEntityKey[] = [
    'businessArchitecture',
    'valueStreams',
    'keyActivities',
    'businessCapabilities',
    'businessProcesses',
    'stakeholderPersonas',
    'informationConcepts',
    'businessImpacts',
    'strategicObjectiveValueStreams',
    'strategicObjectiveCapabilities',
    'valueStreamCapabilities',
    'keyActivityCapabilities',
  ];
  const caseLinkKeys: GenericEntityKey[] = ['leanBusinessCaseValueStreams', 'leanBusinessCaseKeyActivities', 'leanBusinessCaseCapabilities'];
  const discoveryKeys: GenericEntityKey[] = ['discovery', 'discoveryStakeholderPersonas', 'discoveryBusinessProcesses', 'discoveryInformationConcepts'];
  const solutionKeys: GenericEntityKey[] = ['features', 'requirements', 'conceptualDeliverables'];
  const implementationKeys: GenericEntityKey[] = ['implementation', 'implementationValueStreams'];

  const EntityBox = ({ config }: { config: GenericEntityConfig }) => {
    const count = genericRecords[config.key]?.length || 0;
    return (
      <button
        type="button"
        onClick={() => navigateTo('/lifecycle-entry', { entity: config.key })}
        className="rounded-md border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="retro-heading text-sm text-cyan-300">{config.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{config.description}</p>
          </div>
          <Badge className="rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-800">{count}</Badge>
        </div>
        <div className="mt-3 text-xs text-slate-500">{config.tableName}</div>
      </button>
    );
  };

  return (
    <PrototypeShell workspace={workspace}>
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-2xl text-cyan-300">Welcome to {workspace?.name || 'Prototype Workspace'}</CardTitle>
              <CardDescription className="text-slate-300">Current prototype phase: Step 1: Define Strategic Objectives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="leading-relaxed text-slate-300">
                Strategic objectives represent the company’s primary goals and provide the foundation for Lean Business Cases, reusable business architecture, product discovery, features, deliverables, and implementation actuals.
              </p>
              <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">
                Prototype version: each workspace can define up to three strategic objectives and up to ten Lean Business Cases per objective.
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-fuchsia-300">Workspace</CardTitle>
              <CardDescription className="text-slate-300">{workspace?.industry || 'Primary industry not set'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>{workspace?.description || 'Use onboarding to add a workspace description.'}</p>
              {workspace?.companySize && <p className="text-cyan-300">{workspace.companySize} employees</p>}
              {workspace?.headquartersRegion && <p className="text-slate-400">{workspace.headquartersRegion}</p>}
              {workspace?.annualRevenue !== null && workspace?.annualRevenue !== undefined && (
                <p className="text-slate-400">Annual revenue context: ${workspace.annualRevenue.toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">Strategy to Implementation Flow</CardTitle>
            <CardDescription className="text-slate-300">Matches the Phase 1 and Phase 2 architecture path.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-7">
              {processFlow.map((step, index) => (
                <div key={step} className={`rounded-md border p-3 text-center text-xs ${index === 0 ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                  <div className="mb-1 font-semibold">{index + 1}</div>
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="strategy" className="space-y-5">
          <TabsList className="grid h-auto grid-cols-2 gap-2 rounded-md border border-cyan-500/30 bg-slate-900 p-2 md:grid-cols-6">
            <TabsTrigger value="strategy" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black">Strategy</TabsTrigger>
            <TabsTrigger value="architecture" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black">Architecture</TabsTrigger>
            <TabsTrigger value="case" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black">Business Cases</TabsTrigger>
            <TabsTrigger value="discovery" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black">Discovery</TabsTrigger>
            <TabsTrigger value="solution" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black">Solution</TabsTrigger>
            <TabsTrigger value="implementation" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black">Implementation</TabsTrigger>
          </TabsList>

          <TabsContent value="strategy" className="space-y-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="retro-heading text-2xl text-cyan-300">Strategic Objectives</h2>
                <p className="text-sm text-slate-300">{objectives.length} of 3 strategic objectives created. Departments are optional setup.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => navigateTo('/lifecycle-entry', { entity: 'departments' })} className="rounded-sm border-cyan-500 text-cyan-200 hover:bg-cyan-500 hover:text-black">Manage Departments</Button>
                <Button disabled={hasReachedLimit} onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Strategic Objective
                </Button>
              </div>
            </div>
            {hasReachedLimit && (
              <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">
                You have reached the prototype limit of three strategic objectives.
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-3">
              {[0, 1, 2].map((slotIndex) => (
                <ObjectiveSlot
                  key={slotIndex}
                  slotIndex={slotIndex}
                  objective={objectives[slotIndex]}
                  metrics={objectives[slotIndex] ? metrics.filter(metric => metric.strategicObjectiveId === objectives[slotIndex].id) : []}
                  leanBusinessCases={objectives[slotIndex] ? leanBusinessCases.filter(businessCase => businessCase.strategicObjectiveId === objectives[slotIndex].id) : []}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="architecture" className="space-y-4">
            <div>
              <h2 className="retro-heading text-2xl text-cyan-300">Business Architecture</h2>
              <p className="text-sm text-slate-300">Company-level architecture is shared across all objectives and cases. Value streams are limited to 6; key activities are limited to 6 per value stream.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{architectureKeys.map(key => <EntityBox key={key} config={lifecycleEntityConfigByKey[key]} />)}</div>
          </TabsContent>

          <TabsContent value="case" className="space-y-4">
            <div>
              <h2 className="retro-heading text-2xl text-cyan-300">Lean Business Cases</h2>
              <p className="text-sm text-slate-300">Each case belongs to one strategic objective and can link to architecture components through the traceability spine.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {objectives.map(objective => {
                const cases = leanBusinessCases.filter(businessCase => businessCase.strategicObjectiveId === objective.id);
                return (
                  <Card key={objective.id} className="rounded-md border-fuchsia-500/40 bg-slate-900 text-slate-100">
                    <CardHeader>
                      <CardTitle className="retro-heading text-fuchsia-300">{objective.strategicInitiativeName}</CardTitle>
                      <CardDescription className="text-slate-300">{cases.length} of 10 Lean Business Cases</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button disabled={cases.length >= 10} onClick={() => navigateTo('/lean-business-case', { objectiveId: objective.id })} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Create Lean Business Case</Button>
                      {cases.map(businessCase => (
                        <button key={businessCase.id} type="button" onClick={() => navigateTo('/lean-business-case', { id: businessCase.id, objectiveId: objective.id })} className="block w-full rounded border border-slate-700 bg-slate-950 p-2 text-left text-sm text-slate-200 hover:border-fuchsia-400">
                          {businessCase.title}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">{caseLinkKeys.map(key => <EntityBox key={key} config={lifecycleEntityConfigByKey[key]} />)}</div>
          </TabsContent>

          <TabsContent value="discovery" className="space-y-4">
            <div>
              <h2 className="retro-heading text-2xl text-cyan-300">Discovery</h2>
              <p className="text-sm text-slate-300">Discovery is one-to-one with a Lean Business Case and captures the 10 qualitative findings from the architecture.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{discoveryKeys.map(key => <EntityBox key={key} config={lifecycleEntityConfigByKey[key]} />)}</div>
          </TabsContent>

          <TabsContent value="solution" className="space-y-4">
            <div>
              <h2 className="retro-heading text-2xl text-cyan-300">Features, Requirements & Deliverables</h2>
              <p className="text-sm text-slate-300">Features enable capabilities, requirements sit under features, and deliverables move from suggested to user-finalized.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">{solutionKeys.map(key => <EntityBox key={key} config={lifecycleEntityConfigByKey[key]} />)}</div>
          </TabsContent>

          <TabsContent value="implementation" className="space-y-4">
            <div>
              <h2 className="retro-heading text-2xl text-cyan-300">Implementation Actuals</h2>
              <p className="text-sm text-slate-300">Actuals are entered once at implementation and allocated by value stream for rollups.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{implementationKeys.map(key => <EntityBox key={key} config={lifecycleEntityConfigByKey[key]} />)}</div>
          </TabsContent>
        </Tabs>
      </section>
    </PrototypeShell>
  );
}

function ObjectiveSlot({
  slotIndex,
  objective,
  metrics,
  leanBusinessCases,
}: {
  slotIndex: number;
  objective?: StrategicObjective;
  metrics: StrategicObjectiveMetric[];
  leanBusinessCases: LeanBusinessCase[];
}) {
  if (!objective) {
    return (
      <Card className="rounded-md border-dashed border-slate-600 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle className="retro-heading text-slate-300">Strategic Objective {slotIndex + 1}</CardTitle>
          <CardDescription className="text-slate-400">No strategic objective created yet</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigateTo('/strategic-objectives')} className="w-full rounded-sm border-cyan-500 text-cyan-200 hover:bg-cyan-500 hover:text-black">
            Create Objective
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="retro-heading text-cyan-300">{objective.strategicInitiativeName}</CardTitle>
            <CardDescription className="mt-1 text-slate-300">Strategic Objective {slotIndex + 1}</CardDescription>
          </div>
          <Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{getOptionLabel(objective.status, objectiveStatusOptions)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-3 text-slate-300">
          <div>
            <dt className="text-xs uppercase text-slate-500">Executive Objective</dt>
            <dd className="text-slate-100">{objective.executiveObjective || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Strategic Value Category</dt>
            <dd className="text-slate-100">{getOptionLabel(objective.strategicValueCategory, strategicValueCategoryOptions) || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Metrics</dt>
            <dd className="text-slate-100">{metrics.length} measurable goal{metrics.length === 1 ? '' : 's'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Lean Business Cases</dt>
            <dd className="text-slate-100">{leanBusinessCases.length} of 10</dd>
          </div>
        </dl>
        {leanBusinessCases.length > 0 && (
          <div className="space-y-2">
            {leanBusinessCases.map((businessCase) => (
              <button
                key={businessCase.id}
                type="button"
                onClick={() => navigateTo('/lean-business-case', { id: businessCase.id, objectiveId: objective.id })}
                className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-left text-xs text-slate-200 transition hover:border-fuchsia-400 hover:text-fuchsia-200"
              >
                <span className="block truncate">{businessCase.title}</span>
                <span className="text-slate-500">{getOptionLabel(businessCase.status, caseStatusOptions)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-2">
          <Button variant="outline" onClick={() => navigateTo('/strategic-objectives', { id: objective.id })} className="rounded-sm border-cyan-500 text-cyan-200 hover:bg-cyan-500 hover:text-black">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button disabled={leanBusinessCases.length >= 10} onClick={() => navigateTo('/lean-business-case', { objectiveId: objective.id })} className="rounded-sm bg-fuchsia-500 text-white hover:bg-fuchsia-400 disabled:opacity-50">
            {leanBusinessCases.length >= 10 ? 'Case Limit Reached' : 'Build Lean Business Case'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StrategicObjectiveFormScreen({
  workspace,
  objectives,
  setObjectives,
  allMetrics,
  setAllMetrics,
}: {
  workspace: Workspace | null;
  objectives: StrategicObjective[];
  setObjectives: (objectives: StrategicObjective[]) => void;
  allMetrics: StrategicObjectiveMetric[];
  setAllMetrics: (metrics: StrategicObjectiveMetric[]) => void;
}) {
  const editId = getRouteParams().get('id');
  const existingObjective = objectives.find((objective) => objective.id === editId);
  const [form, setForm] = useState({ ...defaultObjectiveForm, ...existingObjective });
  const [metrics, setMetrics] = useState<StrategicObjectiveMetric[]>(editId ? allMetrics.filter(metric => metric.strategicObjectiveId === editId) : []);
  const [error, setError] = useState('');
  const isEditing = Boolean(existingObjective);
  const hasReachedLimit = objectives.length >= 3 && !isEditing;
  const currentStatus = existingObjective?.status || 'draft';
  const activeRequiredFields = [
    ['strategicInitiativeName', 'Strategic Initiative Name'],
    ['executiveObjective', 'Executive Objective'],
    ['strategicValueCategory', 'Strategic Value Category'],
    ['problemOpportunityStatement', 'Problem or Opportunity Statement'],
    ['valueHypothesis', 'Value Hypothesis'],
  ] as const;
  const missingActiveFields = activeRequiredFields
    .filter(([field]) => !String(form[field] || '').trim())
    .map(([, label]) => label);

  const updateField = (field: keyof typeof defaultObjectiveForm, value: string | ObjectiveStatus) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addMetric = () => {
    const now = new Date().toISOString();
    setMetrics(current => [
      ...current,
      {
        id: createId('metric'),
        strategicObjectiveId: editId || '',
        workspaceId: workspace?.id || '',
        name: '',
        metricCategory: '',
        baselineValue: null,
        targetValue: null,
        unit: '',
        timeframe: '',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  const updateMetric = (metricId: string, field: keyof StrategicObjectiveMetric, value: string | number | null) => {
    setMetrics(current => current.map(metric => (
      metric.id === metricId ? { ...metric, [field]: value, updatedAt: new Date().toISOString() } : metric
    )));
  };

  const removeMetric = (metricId: string) => {
    setMetrics(current => current.filter(metric => metric.id !== metricId));
  };

  const submitObjective = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.strategicInitiativeName.trim()) {
      setError('Strategic Initiative Name is required before saving a draft.');
      return;
    }

    if (form.targetImplementationYear && !/^\d{4}$/.test(form.targetImplementationYear)) {
      setError('Target Implementation Year must be a four-digit year, such as 2026.');
      return;
    }

    if (hasReachedLimit) {
      setError('You have reached the prototype limit of three strategic objectives.');
      return;
    }

    if (!isLifecycleTransitionAllowed(currentStatus, form.status)) {
      setError(`Status cannot move from ${getOptionLabel(currentStatus, objectiveStatusOptions)} to ${getOptionLabel(form.status, objectiveStatusOptions)}.`);
      return;
    }

    if (form.status === 'active' && missingActiveFields.length > 0) {
      setError(`Complete these fields before marking the objective Active: ${missingActiveFields.join(', ')}.`);
      return;
    }

    const metricWithDecimal = metrics.find(metric =>
      (metric.baselineValue !== null && !Number.isInteger(metric.baselineValue)) ||
      (metric.targetValue !== null && !Number.isInteger(metric.targetValue))
    );
    if (metricWithDecimal) {
      setError('Metric baseline and target values must be whole numbers.');
      return;
    }

    const now = new Date().toISOString();
    const objectiveId = existingObjective?.id || createId('objective');
    const savedObjective: StrategicObjective = {
      ...form,
      id: objectiveId,
      workspaceId: workspace?.id || '',
      strategicInitiativeName: form.strategicInitiativeName.trim(),
      createdAt: existingObjective?.createdAt || now,
      updatedAt: now,
    };

    const nextObjectives = isEditing
      ? objectives.map((objective) => (objective.id === savedObjective.id ? savedObjective : objective))
      : [...objectives, savedObjective].slice(0, 3);

    const nextMetrics = [
      ...allMetrics.filter(metric => metric.strategicObjectiveId !== objectiveId),
      ...metrics
        .filter(metric => metric.name.trim())
        .map(metric => ({
          ...metric,
          strategicObjectiveId: objectiveId,
          workspaceId: workspace?.id || '',
          name: metric.name.trim(),
        })),
    ];

    localStorage.setItem(objectivesStorageKey, JSON.stringify(nextObjectives));
    localStorage.setItem(metricsStorageKey, JSON.stringify(nextMetrics));
    setObjectives(nextObjectives);
    setAllMetrics(nextMetrics);
    navigateTo('/dashboard');
  };

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Step 1</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">{isEditing ? 'Edit Strategic Objective' : 'Create Strategic Objective'}</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Define the strategic intent, business problem, value hypothesis, and measurable goals that anchor downstream Lean Business Cases.</p>
          </div>
          <Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button>
        </div>

        {hasReachedLimit && (
          <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            You have reached the prototype limit of three strategic objectives.
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        )}

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="grid gap-5" onSubmit={submitObjective}>
              <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                Draft requires only Strategic Initiative Name. Active also requires Executive Objective, Strategic Value Category, Problem or Opportunity Statement, and Value Hypothesis.
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="strategic-initiative-name" label="Strategic Initiative Name">
                  <Input id="strategic-initiative-name" value={form.strategicInitiativeName} onChange={(event) => updateField('strategicInitiativeName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="executive-objective" label="Executive Objective">
                  <Input id="executive-objective" value={form.executiveObjective} onChange={(event) => updateField('executiveObjective', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <Field id="strategic-value-category" label="Strategic Value Category">
                  <Select value={form.strategicValueCategory} onValueChange={(value) => updateField('strategicValueCategory', value)}>
                    <SelectTrigger id="strategic-value-category" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {strategicValueCategoryOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="target-implementation-year" label="Target Implementation Year">
                  <Input id="target-implementation-year" inputMode="numeric" value={form.targetImplementationYear} onChange={(event) => updateField('targetImplementationYear', event.target.value)} placeholder="Example: 2026" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="status" label="Status">
                  <Select value={form.status} onValueChange={(value) => updateField('status', value)}>
                    <SelectTrigger id="status" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {getLifecycleStatusOptions(currentStatus, objectiveStatusOptions).map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field id="target-implementation-start-date" label="Target Implementation Start Date">
                  <Input id="target-implementation-start-date" type="date" value={form.targetImplementationStartDate} onChange={(event) => updateField('targetImplementationStartDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="target-implementation-end-date" label="Target Implementation End Date">
                  <Input id="target-implementation-end-date" type="date" value={form.targetImplementationEndDate} onChange={(event) => updateField('targetImplementationEndDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>

              <Field id="expected-business-outcome" label="Expected Business Outcome">
                <Textarea id="expected-business-outcome" value={form.expectedBusinessOutcome} onChange={(event) => updateField('expectedBusinessOutcome', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field id="financial-impact" label="Financial Impact">
                  <Textarea id="financial-impact" value={form.financialImpact} onChange={(event) => updateField('financialImpact', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="urgency-rationale" label="Urgency Rationale">
                  <Textarea id="urgency-rationale" value={form.urgencyRationale} onChange={(event) => updateField('urgencyRationale', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>

              <Separator className="bg-slate-700" />

              <Field id="problem-opportunity-statement" label="Problem or Opportunity Statement">
                <Textarea id="problem-opportunity-statement" value={form.problemOpportunityStatement} onChange={(event) => updateField('problemOpportunityStatement', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field id="cost-of-inaction" label="Cost of Inaction">
                  <Textarea id="cost-of-inaction" value={form.costOfInaction} onChange={(event) => updateField('costOfInaction', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="current-limitation" label="Current Limitation">
                  <Textarea id="current-limitation" value={form.currentLimitation} onChange={(event) => updateField('currentLimitation', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field id="impacted-teams" label="Impacted Teams">
                  <Textarea id="impacted-teams" value={form.impactedTeams} onChange={(event) => updateField('impactedTeams', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="problem-type" label="Problem Type">
                  <Select value={form.problemType} onValueChange={(value) => updateField('problemType', value)}>
                    <SelectTrigger id="problem-type" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue placeholder="Select problem type" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {problemTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Separator className="bg-slate-700" />

              <Field id="value-hypothesis" label="Value Hypothesis">
                <Textarea id="value-hypothesis" value={form.valueHypothesis} onChange={(event) => updateField('valueHypothesis', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
              </Field>

              <div className="grid gap-5 md:grid-cols-3">
                <Field id="value-measurement-approach" label="Value Measurement Approach">
                  <Textarea id="value-measurement-approach" value={form.valueMeasurementApproach} onChange={(event) => updateField('valueMeasurementApproach', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100 md:col-span-1" />
                </Field>
                <Field id="expected-value-type" label="Expected Value Type">
                  <Select value={form.expectedValueType} onValueChange={(value) => updateField('expectedValueType', value)}>
                    <SelectTrigger id="expected-value-type" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue placeholder="Select value type" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {expectedValueTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="value-realization-timeframe" label="Value Realization Timeframe">
                  <Input id="value-realization-timeframe" value={form.valueRealizationTimeframe} onChange={(event) => updateField('valueRealizationTimeframe', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>

              <Card className="rounded-md border-slate-700 bg-slate-950 text-slate-100">
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle className="retro-heading text-cyan-300">Strategic Objective Metrics</CardTitle>
                      <CardDescription className="text-slate-400">Structured measurable goals with integer baseline and target values.</CardDescription>
                    </div>
                    <Button type="button" onClick={addMetric} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Metric
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics.length === 0 && (
                    <div className="rounded-md border border-dashed border-slate-700 p-5 text-sm text-slate-400">No metrics added yet.</div>
                  )}
                  {metrics.map((metric, index) => (
                    <div key={metric.id} className="rounded-md border border-slate-700 bg-slate-900 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="retro-heading text-sm text-cyan-300">Metric {index + 1}</span>
                        <Button type="button" variant="ghost" onClick={() => removeMetric(metric.id)} className="h-8 w-8 p-0 text-red-300 hover:bg-red-500/20 hover:text-red-200">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field id={`metric-name-${metric.id}`} label="Metric Name">
                          <Input id={`metric-name-${metric.id}`} value={metric.name} onChange={(event) => updateMetric(metric.id, 'name', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                        </Field>
                        <Field id={`metric-category-${metric.id}`} label="Metric Category">
                          <Select value={metric.metricCategory} onValueChange={(value) => updateMetric(metric.id, 'metricCategory', value)}>
                            <SelectTrigger id={`metric-category-${metric.id}`} className="border-slate-700 bg-slate-950 text-slate-100">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                              {metricCategoryOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-4">
                        <Field id={`metric-baseline-${metric.id}`} label="Baseline">
                          <Input id={`metric-baseline-${metric.id}`} type="number" step="1" value={metric.baselineValue?.toString() ?? ''} onChange={(event) => updateMetric(metric.id, 'baselineValue', event.target.value ? Number(event.target.value) : null)} className="border-slate-700 bg-slate-950 text-slate-100" />
                        </Field>
                        <Field id={`metric-target-${metric.id}`} label="Target">
                          <Input id={`metric-target-${metric.id}`} type="number" step="1" value={metric.targetValue?.toString() ?? ''} onChange={(event) => updateMetric(metric.id, 'targetValue', event.target.value ? Number(event.target.value) : null)} className="border-slate-700 bg-slate-950 text-slate-100" />
                        </Field>
                        <Field id={`metric-unit-${metric.id}`} label="Unit">
                          <Input id={`metric-unit-${metric.id}`} value={metric.unit} onChange={(event) => updateMetric(metric.id, 'unit', event.target.value)} placeholder="USD | % | days" className="border-slate-700 bg-slate-950 text-slate-100" />
                        </Field>
                        <Field id={`metric-timeframe-${metric.id}`} label="Timeframe">
                          <Input id={`metric-timeframe-${metric.id}`} value={metric.timeframe} onChange={(event) => updateMetric(metric.id, 'timeframe', event.target.value)} placeholder="By FY2026" className="border-slate-700 bg-slate-950 text-slate-100" />
                        </Field>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 text-slate-200 hover:bg-slate-800">Cancel</Button>
                <Button type="submit" disabled={hasReachedLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Save Objective</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function LeanBusinessCaseFormScreen({
  workspace,
  objectives,
  leanBusinessCases,
  setLeanBusinessCases,
}: {
  workspace: Workspace | null;
  objectives: StrategicObjective[];
  leanBusinessCases: LeanBusinessCase[];
  setLeanBusinessCases: (businessCases: LeanBusinessCase[]) => void;
}) {
  const params = getRouteParams();
  const editId = params.get('id');
  const objectiveId = params.get('objectiveId');
  const existingCase = leanBusinessCases.find((businessCase) => businessCase.id === editId);
  const resolvedObjectiveId = existingCase?.strategicObjectiveId || objectiveId || '';
  const selectedObjective = objectives.find((objective) => objective.id === resolvedObjectiveId);
  const [form, setForm] = useState({ ...defaultLbcForm, ...existingCase });
  const [error, setError] = useState('');
  const isEditing = Boolean(existingCase);
  const currentStatus = existingCase?.status || 'draft';
  const casesForObjective = leanBusinessCases.filter((businessCase) => businessCase.strategicObjectiveId === resolvedObjectiveId);
  const hasReachedLimit = casesForObjective.length >= 10 && !isEditing;
  const activeRequiredFields = [
    ['title', 'Title'],
    ['summary', 'Summary'],
    ['problemOpportunityStatement', 'Problem or Opportunity Statement'],
    ['valueHypothesis', 'Value Hypothesis'],
    ['priority', 'Priority'],
  ] as const;
  const missingActiveFields = activeRequiredFields
    .filter(([field]) => !String(form[field] || '').trim())
    .map(([, label]) => label);

  const updateField = <K extends keyof typeof defaultLbcForm>(field: K, value: (typeof defaultLbcForm)[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitCase = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!selectedObjective) {
      setError('A strategic objective must be selected.');
      return;
    }

    if (!form.title.trim()) {
      setError('Title is required before saving a draft.');
      return;
    }

    if (form.status === 'active' && missingActiveFields.length > 0) {
      setError(`Complete these fields before marking the case Active: ${missingActiveFields.join(', ')}.`);
      return;
    }

    if (!isLifecycleTransitionAllowed(currentStatus, form.status)) {
      setError(`Status cannot move from ${getOptionLabel(currentStatus, caseStatusOptions)} to ${getOptionLabel(form.status, caseStatusOptions)}.`);
      return;
    }

    if (hasReachedLimit) {
      setError('This objective has reached the limit of 10 Lean Business Cases.');
      return;
    }

    const now = new Date().toISOString();
    const savedCase: LeanBusinessCase = {
      ...form,
      id: existingCase?.id || createId('case'),
      workspaceId: workspace?.id || '',
      strategicObjectiveId: selectedObjective.id,
      ownerUserId: 'prototype-user',
      title: form.title.trim(),
      createdAt: existingCase?.createdAt || now,
      updatedAt: now,
    };

    const nextCases = isEditing
      ? leanBusinessCases.map((businessCase) => (businessCase.id === savedCase.id ? savedCase : businessCase))
      : [...leanBusinessCases, savedCase];

    localStorage.setItem(lbcStorageKey, JSON.stringify(nextCases));
    setLeanBusinessCases(nextCases);
    navigateTo('/dashboard');
  };

  if (!selectedObjective) {
    return (
      <PrototypeShell workspace={workspace}>
        <section className="mx-auto max-w-4xl">
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-2xl text-fuchsia-300">Lean Business Case</CardTitle>
              <CardDescription className="text-slate-300">Select a strategic objective from the dashboard first.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Return to Dashboard</Button>
            </CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-fuchsia-500 text-white hover:bg-fuchsia-400">Step 2</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-fuchsia-300">{isEditing ? 'Edit Lean Business Case' : 'Create Lean Business Case'}</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Objective: <span className="text-cyan-300">{selectedObjective.strategicInitiativeName}</span>
            </p>
          </div>
          <Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button>
        </div>

        {hasReachedLimit && (
          <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            This objective has reached the prototype limit of 10 Lean Business Cases.
          </div>
        )}
        {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="retro-heading text-fuchsia-300">Business Case Details</CardTitle>
            <CardDescription className="text-slate-300">Draft requires title only. Active requires summary, problem, value hypothesis, and priority.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={submitCase}>
              <Field id="case-title" label="Title">
                <Input id="case-title" value={form.title} onChange={(event) => updateField('title', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <Field id="case-summary" label="Summary">
                <Textarea id="case-summary" value={form.summary} onChange={(event) => updateField('summary', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="case-problem" label="Problem or Opportunity Statement">
                  <Textarea id="case-problem" value={form.problemOpportunityStatement} onChange={(event) => updateField('problemOpportunityStatement', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="case-value-hypothesis" label="Value Hypothesis">
                  <Textarea id="case-value-hypothesis" value={form.valueHypothesis} onChange={(event) => updateField('valueHypothesis', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <Field id="case-priority" label="Priority">
                  <Select value={form.priority} onValueChange={(value) => updateField('priority', value as Priority)}>
                    <SelectTrigger id="case-priority" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {priorityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="case-value-type" label="Value Type">
                  <Select value={form.valueType} onValueChange={(value) => updateField('valueType', value as CaseValueType)}>
                    <SelectTrigger id="case-value-type" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue placeholder="Select value type" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {caseValueTypeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="case-status" label="Status">
                  <Select value={form.status} onValueChange={(value) => updateField('status', value as CaseStatus)}>
                    <SelectTrigger id="case-status" className="border-slate-700 bg-slate-950 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                      {getLifecycleStatusOptions(currentStatus, caseStatusOptions).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="forecast-cost" label="Forecast Cost">
                  <Input id="forecast-cost" type="number" value={form.forecastCost?.toString() ?? ''} onChange={(event) => updateField('forecastCost', event.target.value ? Number(event.target.value) : null)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Field id="forecast-value" label="Forecast Value">
                  <Input id="forecast-value" type="number" value={form.forecastValue?.toString() ?? ''} onChange={(event) => updateField('forecastValue', event.target.value ? Number(event.target.value) : null)} className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              </div>

              <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                Architecture traceability is captured in the Lean Business Case link tables on the Business Cases dashboard tab.
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 text-slate-200 hover:bg-slate-800">Cancel</Button>
                <Button type="submit" disabled={hasReachedLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Save Lean Business Case</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function GenericLifecycleEntryScreen({
  workspace,
  objectives,
  leanBusinessCases,
  genericRecords,
  setGenericRecords,
}: {
  workspace: Workspace | null;
  objectives: StrategicObjective[];
  leanBusinessCases: LeanBusinessCase[];
  genericRecords: Record<GenericEntityKey, GenericRecord[]>;
  setGenericRecords: (records: Record<GenericEntityKey, GenericRecord[]>) => void;
}) {
  const entityKey = getRouteParams().get('entity') as GenericEntityKey | null;
  const config = entityKey ? lifecycleEntityConfigByKey[entityKey] : undefined;
  const existingRecords = config ? genericRecords[config.key] || [] : [];
  const defaultStatus = getGenericDefaultStatus(config?.statusKind);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config?.fields.forEach(field => {
      initial[field.name] = field.type === 'select' && field.name === 'origin' ? 'architecture' : '';
    });
    if (config?.statusKind) initial.status = defaultStatus;
    if (config?.key === 'conceptualDeliverables') initial.source = 'suggested';
    return initial;
  });
  const [error, setError] = useState('');

  if (!config) {
    return (
      <PrototypeShell workspace={workspace}>
        <section className="mx-auto max-w-4xl">
          <Card className="rounded-md border-red-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-red-300">Lifecycle Entry Not Found</CardTitle>
              <CardDescription className="text-slate-300">Return to the dashboard and choose a lifecycle box.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button>
            </CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

  const updateField = (fieldName: string, value: string) => {
    setForm(current => ({ ...current, [fieldName]: value }));
  };

  const submitRecord = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const missingField = config.fields.find(field => field.required && !form[field.name]?.trim());
    if (missingField) {
      setError(`${missingField.label} is required.`);
      return;
    }

    if (config.singleton && existingRecords.length >= 1) {
      setError(`${config.title} is limited to one record per workspace.`);
      return;
    }

    if (config.maxCount && !config.maxByField && existingRecords.length >= config.maxCount) {
      setError(`${config.title} is limited to ${config.maxCount} record${config.maxCount === 1 ? '' : 's'}.`);
      return;
    }

    if (config.maxCount && config.maxByField) {
      const parentValue = form[config.maxByField];
      const countForParent = existingRecords.filter(record => record[config.maxByField || ''] === parentValue).length;
      if (parentValue && countForParent >= config.maxCount) {
        setError(`${config.title} is limited to ${config.maxCount} per selected parent.`);
        return;
      }
    }

    const now = new Date().toISOString();
    const record: GenericRecord = {
      id: createId(config.key),
      workspaceId: workspace?.id || '',
      createdAt: now,
      updatedAt: now,
      ...form,
    };

    const nextRecords = {
      ...genericRecords,
      [config.key]: [...existingRecords, record],
    };
    localStorage.setItem(genericRecordStorageKey, JSON.stringify(nextRecords));
    setGenericRecords(nextRecords);

    const resetForm: Record<string, string> = {};
    config.fields.forEach(field => {
      resetForm[field.name] = field.type === 'select' && field.name === 'origin' ? 'architecture' : '';
    });
    if (config.statusKind) resetForm.status = defaultStatus;
    if (config.key === 'conceptualDeliverables') resetForm.source = 'suggested';
    setForm(resetForm);
  };

  const renderField = (field: GenericField) => {
    if (field.type === 'textarea') {
      return (
        <Textarea
          id={field.name}
          value={form[field.name] || ''}
          onChange={(event) => updateField(field.name, event.target.value)}
          className="min-h-24 border-slate-700 bg-slate-950 text-slate-100"
        />
      );
    }

    if (field.type === 'select') {
      return (
        <Select value={form[field.name] || ''} onValueChange={(value) => updateField(field.name, value)}>
          <SelectTrigger id={field.name} className="border-slate-700 bg-slate-950 text-slate-100">
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
            {field.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'relationship') {
      const options = getRelatedOptions(field.source, objectives, leanBusinessCases, genericRecords);
      return (
        <Select value={form[field.name] || ''} onValueChange={(value) => updateField(field.name, value)}>
          <SelectTrigger id={field.name} className="border-slate-700 bg-slate-950 text-slate-100">
            <SelectValue placeholder={options.length ? `Select ${field.label.toLowerCase()}` : 'No related records yet'} />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
            {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        id={field.name}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={form[field.name] || ''}
        onChange={(event) => updateField(field.name, event.target.value)}
        className="border-slate-700 bg-slate-950 text-slate-100"
      />
    );
  };

  const statusOptions = getGenericStatusOptions(config.statusKind);

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">{config.tableName}</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">{config.title}</h1>
            <p className="mt-3 max-w-3xl text-slate-300">{config.description}</p>
          </div>
          <Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button>
        </div>

        {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-cyan-300">Add Record</CardTitle>
              <CardDescription className="text-slate-300">Frontend-only record entry. No API or backend call is made.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={submitRecord}>
                <div className="grid gap-5 md:grid-cols-2">
                  {config.fields.map(field => (
                    <Field key={field.name} id={field.name} label={`${field.label}${field.required ? ' *' : ''}`}>
                      {renderField(field)}
                    </Field>
                  ))}
                  {statusOptions.length > 0 && (
                    <Field id="status" label={config.statusKind === 'implementation' ? 'Implementation Status' : 'Status'}>
                      <Select value={form.status || defaultStatus} onValueChange={(value) => updateField('status', value)}>
                        <SelectTrigger id="status" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {statusOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>
                <Button type="submit" className="w-fit rounded-sm bg-lime-500 text-black hover:bg-lime-400">Save Record</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-md border-slate-700 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-cyan-300">Saved Records</CardTitle>
              <CardDescription className="text-slate-300">{existingRecords.length} record{existingRecords.length === 1 ? '' : 's'} saved locally.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingRecords.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-700 p-5 text-sm text-slate-400">No records yet.</div>
              )}
              {existingRecords.map(record => (
                <div key={record.id} className="rounded-md border border-slate-700 bg-slate-950 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{getGenericRecordTitle(record, config)}</div>
                      <div className="mt-1 text-xs text-slate-500">{record.id}</div>
                    </div>
                    {record.status && <Badge className="rounded-sm bg-slate-800 text-slate-300 hover:bg-slate-800">{record.status.replace(/_/g, ' ')}</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </PrototypeShell>
  );
}

export default function App() {
  const [route, setRoute] = useState<PrototypeRoute>(() => normalizeRoute(window.location.hash));
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>(() => loadObjectives());
  const [objectiveMetrics, setObjectiveMetrics] = useState<StrategicObjectiveMetric[]>(() => loadList<StrategicObjectiveMetric>(metricsStorageKey));
  const [leanBusinessCases, setLeanBusinessCases] = useState<LeanBusinessCase[]>(() => loadList<LeanBusinessCase>(lbcStorageKey));
  const [genericRecords, setGenericRecords] = useState<Record<GenericEntityKey, GenericRecord[]>>(() => loadGenericRecords());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(normalizeRoute(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash) {
      window.location.hash = '/';
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(objectivesStorageKey, JSON.stringify(strategicObjectives));
  }, [strategicObjectives]);

  useEffect(() => {
    localStorage.setItem(metricsStorageKey, JSON.stringify(objectiveMetrics));
  }, [objectiveMetrics]);

  useEffect(() => {
    localStorage.setItem(lbcStorageKey, JSON.stringify(leanBusinessCases));
  }, [leanBusinessCases]);

  useEffect(() => {
    localStorage.setItem(genericRecordStorageKey, JSON.stringify(genericRecords));
  }, [genericRecords]);

  const frameworkStages = [
    {
      id: 1,
      title: "Executive Strategic Objectives",
      purpose: "Define high-level business goals and strategic direction",
      keyQuestions: ["What outcomes do we need?", "What business value are we targeting?", "What are our strategic priorities?"],
      aiOpportunity: "Parse strategic documents, identify themes, extract objectives",
      artifact: "Strategic initiative document, executive brief",
      governance: "Executive review and sign-off"
    },
    {
      id: 2,
      title: "Business Architecture Translation",
      purpose: "Translate executive goals into capabilities, value streams, key activities, personas, processes, and information concepts",
      keyQuestions: ["What capabilities do we need?", "What value streams are affected?", "Who are the key stakeholders?"],
      aiOpportunity: "Assist with capability mapping, value stream analysis, persona clustering, and documentation synthesis",
      artifact: "Capability map, value stream map, stakeholder/persona model",
      governance: "Human validation by business architects and stakeholders"
    },
    {
      id: 3,
      title: "Product Discovery",
      purpose: "Validate problem space, understand user needs, and define product direction",
      keyQuestions: ["What problem are we solving?", "Who experiences this problem?", "What would success look like?"],
      aiOpportunity: "Journey mapping, user research synthesis, opportunity prioritization",
      artifact: "Journey maps, opportunity canvas, validated hypotheses",
      governance: "Product owner and stakeholder validation"
    },
    {
      id: 4,
      title: "Gap and Bottleneck Analysis",
      purpose: "Identify gaps between current and desired state",
      keyQuestions: ["What's missing?", "Where are the constraints?", "What dependencies exist?"],
      aiOpportunity: "Process mining, dependency mapping, constraint identification",
      artifact: "Gap analysis report, dependency matrix",
      governance: "Cross-functional team review"
    },
    {
      id: 5,
      title: "Conceptual Architecture",
      purpose: "Define high-level solution structure needed to support implementation readiness",
      keyQuestions: ["What components are needed?", "How do they interact?", "What patterns apply?"],
      aiOpportunity: "Architecture pattern recommendation, component ideation, integration mapping",
      artifact: "Conceptual architecture diagram, component model",
      governance: "Architecture review board approval"
    },
    {
      id: 6,
      title: "AI-Augmented Artifact Generation",
      purpose: "Accelerate creation of documentation and design artifacts",
      keyQuestions: ["What artifacts are needed?", "What quality standards apply?", "How do we maintain consistency?"],
      aiOpportunity: "Template generation, documentation synthesis, diagram creation",
      artifact: "Generated specifications, diagrams, documentation",
      governance: "Technical writer and architect review"
    },
    {
      id: 7,
      title: "Agile / Scrum Translation",
      purpose: "Transform architecture into agile delivery structures",
      keyQuestions: ["What are the epics?", "How do we sequence work?", "What are the acceptance criteria?"],
      aiOpportunity: "Epic generation, story mapping, acceptance criteria drafting",
      artifact: "Epic breakdown, user stories, sprint planning artifacts",
      governance: "Scrum master and team validation"
    },
    {
      id: 8,
      title: "Requirements Definition",
      purpose: "Document detailed functional and non-functional requirements",
      keyQuestions: ["What must the system do?", "What are the constraints?", "What are the quality attributes?"],
      aiOpportunity: "Requirement extraction, completeness checking, traceability mapping",
      artifact: "Requirements specification, traceability matrix",
      governance: "Business analyst and stakeholder approval"
    },
    {
      id: 9,
      title: "Implementation Readiness",
      purpose: "Ensure all prerequisites for development are in place",
      keyQuestions: ["Are requirements clear?", "Are dependencies resolved?", "Is the team ready?"],
      aiOpportunity: "Readiness checklist generation, risk identification, gap flagging",
      artifact: "Readiness assessment, risk register",
      governance: "Program manager and delivery lead sign-off"
    },
    {
      id: 10,
      title: "Strategic Value Measurement",
      purpose: "Track and measure outcomes against strategic objectives",
      keyQuestions: ["Are we achieving our goals?", "What is the business impact?", "What should we adjust?"],
      aiOpportunity: "Metrics tracking, trend analysis, insight generation",
      artifact: "Value dashboard, outcome reports",
      governance: "Executive review and continuous improvement"
    }
  ];

  const aiAugmentationCards = [
    { title: "Strategic initiative interpretation", icon: Target },
    { title: "Stakeholder and persona analysis", icon: Users },
    { title: "Value stream mapping", icon: TrendingUp },
    { title: "Journey mapping", icon: Activity },
    { title: "Process gap analysis", icon: AlertCircle },
    { title: "Requirement generation", icon: FileText },
    { title: "Conceptual architecture ideation", icon: Lightbulb },
    { title: "API and data mapping support", icon: Database },
    { title: "Documentation acceleration", icon: BookOpen },
    { title: "Decision traceability", icon: GitBranch },
    { title: "Governance checkpoint identification", icon: Shield }
  ];

  const useCases = [
    {
      name: "FedEx Network 2.0 / DRIVE",
      goal: "Transform global logistics network for speed and efficiency",
      valueType: "Operational efficiency, cost reduction",
      baFocus: "Network optimization capabilities, route value streams",
      aiOpportunity: "Network topology analysis, route optimization patterns",
      conceptualOutput: "Distributed logistics orchestration architecture",
      metrics: "15% cost reduction, 20% faster delivery times"
    },
    {
      name: "Walmart Next-Generation Supply Chain",
      goal: "Enable real-time inventory and demand-driven fulfillment",
      valueType: "Customer experience, revenue growth",
      baFocus: "Inventory management capabilities, fulfillment value streams",
      aiOpportunity: "Demand forecasting patterns, inventory optimization",
      conceptualOutput: "Event-driven supply chain architecture",
      metrics: "12% inventory reduction, 25% faster replenishment"
    },
    {
      name: "Amazon Fulfillment Regionalization",
      goal: "Reduce delivery times through regional fulfillment centers",
      valueType: "Customer satisfaction, unit-cost reduction",
      baFocus: "Regional fulfillment capabilities, last-mile value streams",
      aiOpportunity: "Regional demand analysis, placement optimization",
      conceptualOutput: "Multi-region fulfillment mesh architecture",
      metrics: "30% faster same-day delivery, 18% cost per unit reduction"
    }
  ];

  const governanceControls = [
    "Human review checkpoints at every lifecycle stage",
    "Explainability requirements for AI-generated artifacts",
    "Prompt dependency controls and version tracking",
    "Architecture review gates before implementation",
    "Traceability from strategy to requirement",
    "Risk and compliance review integration",
    "Data quality validation and testing",
    "Final stakeholder approval workflows"
  ];

  const researchDeliverables = [
    "Industry baseline assessment",
    "Task analysis documentation",
    "Product discovery lifecycle analysis",
    "Software lifecycle management analysis",
    "Gap analysis report",
    "Human-AI governance assessment",
    "Final research paper"
  ];

  const architectureDeliverables = [
    "Conceptual architecture framework",
    "AI integration capability model",
    "Product discovery workflow diagrams",
    "UML activity/use case diagrams",
    "Strategic initiative traceability model",
    "Governance process flows",
    "Lifecycle transformation diagrams"
  ];

  const problemCards = [
    {
      title: "Misalignment between executive intent and implementation execution",
      icon: Target
    },
    {
      title: "Delays in product discovery and requirements analysis",
      icon: AlertCircle
    },
    {
      title: "Fragmented communication between business and technical stakeholders",
      icon: Users
    },
    {
      title: "Limited decision traceability across lifecycle phases",
      icon: GitBranch
    }
  ];

  const componentGroups = [
    {
      name: "Navigation and commands",
      count: 10,
      icon: PanelTop,
      examples: ["Button", "Navigation Menu", "Dropdown Menu", "Tabs", "Breadcrumb"]
    },
    {
      name: "Data and status",
      count: 9,
      icon: Gauge,
      examples: ["Badge", "Progress", "Table", "Chart", "Skeleton"]
    },
    {
      name: "Forms and input",
      count: 11,
      icon: ListChecks,
      examples: ["Input", "Textarea", "Select", "Checkbox", "Radio Group"]
    },
    {
      name: "Panels and overlays",
      count: 15,
      icon: Layers,
      examples: ["Card", "Dialog", "Sheet", "Drawer", "Accordion"]
    }
  ];

  const scrollToSection = (id: string) => {
    if (route !== '/') {
      navigateTo('/');
      window.setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
      setMobileMenuOpen(false);
      return;
    }

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  if (route === '/login') {
    return <AuthScreen mode="login" workspace={workspace} />;
  }

  if (route === '/signup') {
    return <AuthScreen mode="signup" workspace={workspace} />;
  }

  if (route === '/workspace-onboarding') {
    return <WorkspaceOnboardingScreen workspace={workspace} setWorkspace={setWorkspace} />;
  }

  if (route === '/dashboard') {
    return (
      <DashboardScreen
        workspace={workspace}
        objectives={strategicObjectives}
        metrics={objectiveMetrics}
        leanBusinessCases={leanBusinessCases}
        genericRecords={genericRecords}
      />
    );
  }

  if (route === '/strategic-objectives') {
    return (
      <StrategicObjectiveFormScreen
        workspace={workspace}
        objectives={strategicObjectives}
        setObjectives={setStrategicObjectives}
        allMetrics={objectiveMetrics}
        setAllMetrics={setObjectiveMetrics}
      />
    );
  }

  if (route === '/lean-business-case') {
    return (
      <LeanBusinessCaseFormScreen
        workspace={workspace}
        objectives={strategicObjectives}
        leanBusinessCases={leanBusinessCases}
        setLeanBusinessCases={setLeanBusinessCases}
      />
    );
  }

  if (route === '/lifecycle-entry') {
    return (
      <GenericLifecycleEntryScreen
        workspace={workspace}
        objectives={strategicObjectives}
        leanBusinessCases={leanBusinessCases}
        genericRecords={genericRecords}
        setGenericRecords={setGenericRecords}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation - Retro HUD Style */}
      <nav className="sticky top-0 z-50 bg-black border-b-2 border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 relative">
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-cyan-400"></div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 mr-6 text-sm text-cyan-400 retro-heading">
              <button onClick={() => scrollToSection('overview')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Overview</button>
              <button onClick={() => scrollToSection('framework')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Framework</button>
              <button onClick={() => scrollToSection('ai-augmentation')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">AI Powers</button>
              <button onClick={() => scrollToSection('use-cases')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Missions</button>
              <button onClick={() => scrollToSection('governance')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Governance</button>
              <button onClick={() => scrollToSection('ui-components')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Components</button>
              <button onClick={() => scrollToSection('deliverables')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Deliverables</button>
              <button onClick={() => scrollToSection('team')} className="hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all whitespace-nowrap">Player</button>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-sm retro-heading">
              <button className="px-3 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white border-2 border-fuchsia-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.8)] transition-all flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View Research
              </button>
              <button onClick={() => navigateTo('/login')} className="px-3 py-2 border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_20px_rgba(0,255,255,0.8)] transition-all flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign In / Login
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden text-cyan-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-2 border-t border-cyan-400/30 mt-2 pt-2">
              <button onClick={() => scrollToSection('overview')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Overview</button>
              <button onClick={() => scrollToSection('framework')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Framework</button>
              <button onClick={() => scrollToSection('ai-augmentation')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">AI Powers</button>
              <button onClick={() => scrollToSection('use-cases')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Missions</button>
              <button onClick={() => scrollToSection('governance')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Governance</button>
              <button onClick={() => scrollToSection('ui-components')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Components</button>
              <button onClick={() => scrollToSection('deliverables')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Deliverables</button>
              <button onClick={() => scrollToSection('team')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Player</button>
              <button onClick={() => navigateTo('/login')} className="block w-full text-left py-2 text-cyan-400 hover:text-lime-400">Sign In / Login</button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section - Arcade Start Screen */}
      <section className="relative bg-gradient-to-br from-black via-purple-950 to-black py-20 px-4 grid-bg scanlines overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="mb-4 text-lime-400 retro-heading text-sm tracking-widest animate-pulse">
            [ MISSION START ]
          </div>
          <h1 className="retro-heading text-3xl md:text-4xl lg:text-5xl mb-6 bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.8)]">
            AI-Augmented Framework for Product Discovery and Software Lifecycle Transformation
          </h1>
          <p className="text-lg md:text-xl mb-8 text-cyan-200 max-w-4xl mx-auto leading-relaxed">
            Translating strategic objectives into implementation-ready software outcomes through business architecture, product discovery, conceptual architecture, AI augmentation, and governance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => scrollToSection('framework')}
              className="retro-heading px-8 py-4 bg-gradient-to-r from-lime-500 to-emerald-500 text-black border-4 border-lime-400 hover:shadow-[0_0_30px_rgba(0,255,0,0.8)] hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              ▶ START MISSION
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollToSection('deliverables')}
              className="retro-heading px-8 py-4 border-4 border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-black hover:shadow-[0_0_30px_rgba(236,72,153,0.8)] hover:scale-105 transition-all"
            >
              VIEW ARTIFACTS
            </button>
          </div>

          {/* Game Progress Flow */}
          <div className="bg-black/60 border-2 border-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.5)] p-6 max-w-5xl mx-auto">
            <div className="text-cyan-400 retro-heading text-xs mb-3">MISSION PROGRESSION</div>
            <div className="flex flex-wrap justify-center items-center gap-2 text-xs md:text-sm">
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 1: Strategy</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 2: Business Arch</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 3: Discovery</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 4: Architecture</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-400 text-white">LVL 5: Lifecycle</div>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 border border-fuchsia-400 text-white font-bold">BOSS: Value</div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Problem Section - Retro Alert Screen */}
      <section id="overview" className="py-16 px-4 bg-gradient-to-b from-gray-950 to-black relative">
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-red-500 bg-red-500/20 text-red-400 retro-heading text-xs mb-4 animate-pulse">
              ⚠ CRITICAL CHALLENGES DETECTED ⚠
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-4 text-center bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            The Strategy-to-Implementation Gap
          </h2>
          <p className="text-lg text-cyan-200 mb-12 max-w-4xl mx-auto text-center leading-relaxed">
            Many enterprise transformation efforts fail not because technology is unavailable, but because organizations lack a structured way to translate strategic intent into operational design, validated product direction, and implementation-ready technical outcomes.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {problemCards.map((problem, index) => {
              const Icon = problem.icon;
              return (
                <div key={index} className="bg-black p-6 border-2 border-orange-500 shadow-[0_0_15px_rgba(255,165,0,0.5)] hover:shadow-[0_0_25px_rgba(255,165,0,0.8)] hover:border-red-500 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-red-600 to-orange-600 border-2 border-orange-400 group-hover:shadow-[0_0_15px_rgba(255,165,0,0.8)]">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-orange-200 flex-1 leading-relaxed">{problem.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Framework Flow Section - Level Select */}
      <section id="framework" className="py-16 px-4 bg-black relative scanlines">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 to-black"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              SELECT STAGE
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-8 text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Framework Lifecycle Map
          </h2>
          <p className="text-center text-purple-300 mb-12 max-w-3xl mx-auto">
            Click on any stage to explore its purpose, key questions, AI augmentation opportunities, and governance checkpoints.
          </p>

          {/* Desktop: Horizontal scrollable flow */}
          <div className="hidden lg:block overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max px-4">
              {frameworkStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedStage(stage.id)}
                    className={`w-64 p-6 border-4 transition-all retro-heading text-sm relative group ${
                      selectedStage === stage.id
                        ? 'border-lime-400 bg-gradient-to-br from-lime-600 to-green-600 text-black shadow-[0_0_30px_rgba(0,255,0,0.8)]'
                        : 'border-purple-500 bg-gradient-to-br from-purple-900 to-black text-purple-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)]'
                    }`}
                  >
                    <div className={`text-xs mb-2 ${selectedStage === stage.id ? 'text-green-900' : 'text-fuchsia-400'}`}>STAGE {stage.id}</div>
                    <div className={`text-sm leading-tight ${selectedStage === stage.id ? 'text-black' : 'text-cyan-300'}`}>{stage.title}</div>
                    {selectedStage === stage.id && (
                      <div className="absolute top-2 right-2 text-xs text-green-900">▶ ACTIVE</div>
                    )}
                  </button>
                  {index < frameworkStages.length - 1 && (
                    <ChevronRight className="w-8 h-8 text-cyan-500 mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet: Vertical list */}
          <div className="lg:hidden space-y-4">
            {frameworkStages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
                className={`w-full p-6 border-4 transition-all text-left retro-heading relative ${
                  selectedStage === stage.id
                    ? 'border-lime-400 bg-gradient-to-br from-lime-600 to-green-600 text-black shadow-[0_0_30px_rgba(0,255,0,0.8)]'
                    : 'border-purple-500 bg-gradient-to-br from-purple-900 to-black text-purple-300 hover:border-cyan-400'
                }`}
              >
                <div className={`text-xs mb-2 ${selectedStage === stage.id ? 'text-green-900' : 'text-fuchsia-400'}`}>STAGE {stage.id}</div>
                <div className={`text-base ${selectedStage === stage.id ? 'text-black' : 'text-cyan-300'}`}>{stage.title}</div>
                {selectedStage === stage.id && (
                  <div className="absolute top-4 right-4 text-xs text-green-900">▶</div>
                )}
              </button>
            ))}
          </div>

          {/* Detail Panel - Mission Briefing */}
          {selectedStage && (
            <div className="mt-8 bg-black p-8 border-4 border-lime-400 shadow-[0_0_40px_rgba(0,255,0,0.6)] relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-cyan-400"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-cyan-400"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-cyan-400"></div>

              {frameworkStages.map((stage) => {
                if (stage.id === selectedStage) {
                  return (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <div>
                          <div className="text-lime-400 retro-heading text-xs mb-1">[ MISSION BRIEFING ]</div>
                          <h3 className="retro-heading text-2xl text-cyan-400">{stage.title}</h3>
                        </div>
                        <span className="px-4 py-2 bg-gradient-to-r from-lime-500 to-green-500 text-black border-2 border-lime-400 retro-heading text-sm">
                          STAGE {stage.id}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                          <div className="border-l-4 border-cyan-400 pl-4">
                            <h4 className="retro-heading text-cyan-400 mb-2 flex items-center gap-2 text-sm">
                              <Target className="w-5 h-5" />
                              OBJECTIVE
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.purpose}</p>
                          </div>

                          <div className="border-l-4 border-fuchsia-400 pl-4">
                            <h4 className="retro-heading text-fuchsia-400 mb-2 flex items-center gap-2 text-sm">
                              <AlertCircle className="w-5 h-5" />
                              KEY QUESTIONS
                            </h4>
                            <ul className="space-y-2">
                              {stage.keyQuestions.map((question, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-purple-200">
                                  <span className="text-lime-400 flex-shrink-0">▸</span>
                                  {question}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="border-l-4 border-lime-400 pl-4">
                            <h4 className="retro-heading text-lime-400 mb-2 flex items-center gap-2 text-sm">
                              <Lightbulb className="w-5 h-5" />
                              AI POWER-UP
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.aiOpportunity}</p>
                          </div>

                          <div className="border-l-4 border-purple-400 pl-4">
                            <h4 className="retro-heading text-purple-400 mb-2 flex items-center gap-2 text-sm">
                              <FileText className="w-5 h-5" />
                              ARTIFACT
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.artifact}</p>
                          </div>

                          <div className="border-l-4 border-orange-400 pl-4">
                            <h4 className="retro-heading text-orange-400 mb-2 flex items-center gap-2 text-sm">
                              <Shield className="w-5 h-5" />
                              CHECKPOINT
                            </h4>
                            <p className="text-purple-200 leading-relaxed">{stage.governance}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </section>

      {/* AI Augmentation Layer - Power-Ups */}
      <section id="ai-augmentation" className="py-16 px-4 bg-gradient-to-b from-black via-purple-950 to-black relative grid-bg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-400 retro-heading text-xs mb-4 animate-pulse">
              ⚡ AI POWER-UPS AVAILABLE ⚡
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-4 text-center bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            AI Support Systems
          </h2>
          <p className="text-center text-purple-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            AI augments research, analysis, and workflow acceleration throughout the framework, while human experts retain responsibility for validation and decision-making.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiAugmentationCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={index} className="bg-gradient-to-br from-purple-900 to-black p-6 border-2 border-fuchsia-500 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,255,255,0.6)] transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-fuchsia-600 to-purple-600 border-2 border-fuchsia-400 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.8)]">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-cyan-300 text-sm">{card.title}</h3>
                  </div>
                  <div className="inline-block px-3 py-1 bg-yellow-400/20 border border-yellow-400 text-yellow-300 text-xs retro-heading">
                    HUMAN OVERSIGHT
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Business Architecture Bridge - Quest Chain */}
      <section className="py-16 px-4 bg-black relative">
        <div className="absolute inset-0 grid-bg opacity-30"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              QUEST CHAIN
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-8 text-center bg-gradient-to-r from-cyan-400 to-lime-400 bg-clip-text text-transparent">
            From Strategy to Implementation
          </h2>

          <div className="bg-black border-4 border-cyan-500 shadow-[0_0_30px_rgba(0,255,255,0.5)] p-8 mb-8">
            <div className="flex flex-wrap justify-center items-center gap-3 text-xs md:text-sm retro-heading">
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Executive Strategy</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Capabilities</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Value Streams</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Activities</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Personas</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Processes</div>
              <ChevronRight className="w-4 h-4 text-cyan-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 border-2 border-cyan-400 text-white">Info Concepts</div>
              <ChevronRight className="w-4 h-4 text-lime-400" />
              <div className="px-3 py-2 bg-gradient-to-r from-lime-500 to-green-500 border-2 border-lime-400 text-black font-bold">Architecture</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-900/40 to-black border-l-4 border-cyan-400 p-6">
            <p className="text-purple-200 text-lg leading-relaxed">
              <strong className="text-cyan-400">Business architecture</strong> identifies where value should be created.
              <strong className="text-lime-400"> Product discovery</strong> validates what problem should be solved.
              <strong className="text-fuchsia-400"> Conceptual architecture</strong> defines the high-level solution structure needed to support implementation readiness.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases - Boss Missions */}
      <section id="use-cases" className="py-16 px-4 bg-gradient-to-b from-gray-950 to-black relative scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,0,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-lime-400 bg-lime-400/10 text-lime-400 retro-heading text-xs mb-4 animate-pulse">
              🎯 ENTERPRISE MISSIONS 🎯
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-12 text-center bg-gradient-to-r from-lime-400 to-green-400 bg-clip-text text-transparent">
            Real-World Scenarios
          </h2>

          <div className="grid lg:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-black border-4 border-lime-500 shadow-[0_0_20px_rgba(0,255,0,0.5)] hover:shadow-[0_0_35px_rgba(0,255,0,0.8)] transition-all overflow-hidden group">
                <div className="bg-gradient-to-r from-lime-600 to-green-600 text-black p-6 border-b-4 border-lime-400">
                  <div className="retro-heading text-xs mb-2">MISSION {index + 1}</div>
                  <h3 className="retro-heading text-base">{useCase.name}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="border-l-2 border-cyan-400 pl-3">
                    <h4 className="retro-heading text-cyan-400 mb-1 text-xs">OBJECTIVE</h4>
                    <p className="text-purple-200 text-sm leading-relaxed">{useCase.goal}</p>
                  </div>
                  <div className="border-l-2 border-fuchsia-400 pl-3">
                    <h4 className="retro-heading text-fuchsia-400 mb-1 text-xs">VALUE TYPE</h4>
                    <p className="text-purple-200 text-sm">{useCase.valueType}</p>
                  </div>
                  <div className="border-l-2 border-purple-400 pl-3">
                    <h4 className="retro-heading text-purple-400 mb-1 text-xs">BA FOCUS</h4>
                    <p className="text-purple-200 text-sm">{useCase.baFocus}</p>
                  </div>
                  <div className="border-l-2 border-yellow-400 pl-3">
                    <h4 className="retro-heading text-yellow-400 mb-1 text-xs">AI OPPORTUNITY</h4>
                    <p className="text-purple-200 text-sm">{useCase.aiOpportunity}</p>
                  </div>
                  <div className="border-l-2 border-orange-400 pl-3">
                    <h4 className="retro-heading text-orange-400 mb-1 text-xs">ARCHITECTURE</h4>
                    <p className="text-purple-200 text-sm">{useCase.conceptualOutput}</p>
                  </div>
                  <div className="pt-4 border-t-2 border-lime-500 bg-lime-400/10 -mx-6 -mb-6 px-6 pb-6 mt-6">
                    <h4 className="retro-heading text-lime-400 mb-1 text-xs">MEASURABLE VALUE</h4>
                    <p className="text-lime-300 text-sm font-bold">{useCase.metrics}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance - Security Protocols */}
      <section id="governance" className="py-16 px-4 bg-black relative">
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-orange-400 bg-orange-400/10 text-orange-400 retro-heading text-xs mb-4 animate-pulse">
              🛡️ SECURITY PROTOCOL ACTIVE 🛡️
            </div>
          </div>
          <h2 className="retro-heading text-2xl md:text-3xl mb-8 text-center bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Governance Preserves Trust and Integrity
          </h2>

          <div className="bg-black border-4 border-yellow-500 shadow-[0_0_30px_rgba(255,255,0,0.5)] p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1 animate-pulse" />
              <p className="text-yellow-200 leading-relaxed">
                <strong className="text-yellow-400 retro-heading text-sm">CRITICAL NOTICE:</strong> AI should augment research, analysis, and workflow acceleration, but human experts remain responsible for validation, judgment, and final decision-making.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {governanceControls.map((control, index) => (
              <div key={index} className="flex items-start gap-3 bg-gradient-to-r from-purple-900/40 to-black p-4 border-2 border-cyan-500 hover:border-lime-400 hover:shadow-[0_0_15px_rgba(0,255,0,0.5)] transition-all">
                <Check className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
                <span className="text-purple-200 text-sm leading-relaxed">{control}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UI Component System - Built Component Inventory */}
      <section id="ui-components" className="py-16 px-4 bg-gradient-to-b from-black via-slate-950 to-black relative">
        <div className="absolute inset-0 grid-bg opacity-20"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              COMPONENT SYSTEM ONLINE
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-4 text-center bg-gradient-to-r from-cyan-400 to-lime-400 bg-clip-text text-transparent">
            Built UI Components
          </h2>
          <p className="text-center text-purple-200 mb-10 max-w-3xl mx-auto leading-relaxed">
            The public build now surfaces the reusable UI component layer included in the project: cards, buttons, tabs, accordions, badges, progress indicators, form controls, overlays, and navigation primitives.
          </p>

          <Tabs defaultValue="inventory" className="w-full">
            <TabsList className="mx-auto mb-8 bg-black border-2 border-cyan-500 rounded-md p-1 h-auto flex-wrap">
              <TabsTrigger value="inventory" className="rounded-sm data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-cyan-300 px-4 py-2">Inventory</TabsTrigger>
              <TabsTrigger value="patterns" className="rounded-sm data-[state=active]:bg-lime-500 data-[state=active]:text-black text-lime-300 px-4 py-2">Patterns</TabsTrigger>
              <TabsTrigger value="readiness" className="rounded-sm data-[state=active]:bg-fuchsia-500 data-[state=active]:text-black text-fuchsia-300 px-4 py-2">Readiness</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {componentGroups.map((group) => {
                  const Icon = group.icon;
                  return (
                    <Card key={group.name} className="bg-black/90 border-2 border-cyan-500 rounded-md shadow-[0_0_18px_rgba(0,255,255,0.25)]">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="p-2 border-2 border-lime-400 bg-lime-400/10">
                            <Icon className="w-5 h-5 text-lime-400" />
                          </div>
                          <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">{group.count} built</Badge>
                        </div>
                        <CardTitle className="retro-heading text-sm text-cyan-300">{group.name}</CardTitle>
                        <CardDescription className="text-purple-300">Reusable primitives available in `src/app/components/ui`.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {group.examples.map((example) => (
                            <Badge key={example} variant="outline" className="rounded-sm border-purple-400 text-purple-200">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="patterns">
              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
                <Card className="bg-black/90 border-2 border-lime-500 rounded-md">
                  <CardHeader>
                    <CardTitle className="retro-heading text-lime-400">Interactive Pattern Library</CardTitle>
                    <CardDescription className="text-purple-300">Sample combinations used by the research website.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Button className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Primary action</Button>
                      <Button variant="outline" className="rounded-sm border-cyan-400 text-cyan-300 bg-black hover:bg-cyan-400 hover:text-black">Secondary action</Button>
                      <Button variant="ghost" className="rounded-sm text-fuchsia-300 hover:bg-fuchsia-400/20 hover:text-fuchsia-100">Quiet action</Button>
                    </div>
                    <Separator className="bg-cyan-500/40" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-cyan-300">Lifecycle UI coverage</span>
                        <span className="text-lime-400 retro-heading text-xs">82%</span>
                      </div>
                      <Progress value={82} className="h-3 bg-cyan-950 [&>div]:bg-lime-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-black/90 border-2 border-fuchsia-500 rounded-md">
                  <CardHeader>
                    <CardTitle className="retro-heading text-fuchsia-400">Component Usage Notes</CardTitle>
                    <CardDescription className="text-purple-300">How the current UI kit supports the public framework page.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="text-purple-200">
                      <AccordionItem value="layout" className="border-cyan-500/40">
                        <AccordionTrigger className="text-cyan-300 hover:text-cyan-100">Layout surfaces</AccordionTrigger>
                        <AccordionContent className="text-purple-200">Cards, tabs, separators, and panels provide the structure for framework stages, deliverables, and review checkpoints.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="workflow" className="border-cyan-500/40">
                        <AccordionTrigger className="text-cyan-300 hover:text-cyan-100">Workflow controls</AccordionTrigger>
                        <AccordionContent className="text-purple-200">Buttons, badges, progress, accordions, and tabs support exploration, state signaling, and compact disclosure.</AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="future" className="border-cyan-500/40">
                        <AccordionTrigger className="text-cyan-300 hover:text-cyan-100">Future expansion</AccordionTrigger>
                        <AccordionContent className="text-purple-200">Dialog, sheet, form, table, chart, command, and calendar components are ready for later research artifacts and project workflows.</AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="readiness">
              <Card className="bg-black/90 border-2 border-purple-500 rounded-md">
                <CardHeader>
                  <CardTitle className="retro-heading text-purple-300">Public Link Readiness</CardTitle>
                  <CardDescription className="text-purple-300">What is included in the deployed artifact.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {["Framework page", "Component showcase", "CI/CD publishing"].map((item) => (
                      <div key={item} className="flex items-center gap-3 border-2 border-lime-500/70 bg-lime-400/10 p-4">
                        <Check className="w-5 h-5 text-lime-400 flex-shrink-0" />
                        <span className="text-purple-100">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Deliverables - Item Inventory */}
      <section id="deliverables" className="py-16 px-4 bg-gradient-to-b from-purple-950 to-black relative scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1)_0%,transparent_70%)]"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-fuchsia-400 bg-fuchsia-400/10 text-fuchsia-400 retro-heading text-xs mb-4">
              📦 MISSION ARTIFACTS 📦
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-12 text-center bg-gradient-to-r from-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
            Project Deliverables
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="retro-heading text-xl text-cyan-400 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Research Items
              </h3>
              <div className="space-y-3">
                {researchDeliverables.map((item, index) => (
                  <div key={index} className="bg-black p-4 border-2 border-cyan-500 hover:border-lime-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.6)] transition-all group">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-cyan-400 group-hover:text-lime-400" />
                      <span className="text-purple-200 text-sm">{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="retro-heading text-xl text-fuchsia-400 mb-6 flex items-center gap-2">
                <FileCode className="w-6 h-6" />
                Architecture Items
              </h3>
              <div className="space-y-3">
                {architectureDeliverables.map((item, index) => (
                  <div key={index} className="bg-black p-4 border-2 border-fuchsia-500 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.6)] transition-all group">
                    <div className="flex items-center gap-3">
                      <GitBranch className="w-5 h-5 text-fuchsia-400 group-hover:text-purple-400" />
                      <span className="text-purple-200 text-sm">{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team - Player Profile */}
      <section id="team" className="py-16 px-4 bg-black relative grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950 to-black opacity-60"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-4">
            <div className="inline-block px-4 py-2 border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400 retro-heading text-xs mb-4">
              👤 PLAYER PROFILE 👤
            </div>
          </div>
          <h2 className="retro-heading text-3xl md:text-4xl mb-8 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Project Information
          </h2>

          <div className="bg-black border-4 border-cyan-500 shadow-[0_0_40px_rgba(0,255,255,0.6)] p-8 relative">
            <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-lime-400"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-lime-400"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-lime-400"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-lime-400"></div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border-l-4 border-cyan-400 pl-4">
                <h3 className="retro-heading text-cyan-400 mb-2 text-sm">Project Lead</h3>
                <p className="text-lg text-purple-200">Tchaas Alexander-Wright</p>
              </div>
              <div className="border-l-4 border-fuchsia-400 pl-4">
                <h3 className="retro-heading text-fuchsia-400 mb-2 text-sm">Team Members</h3>
                <p className="text-lg text-purple-200">N/A</p>
              </div>
              <div className="border-l-4 border-lime-400 pl-4">
                <h3 className="retro-heading text-lime-400 mb-2 text-sm">Program</h3>
                <p className="text-lg text-purple-200">Georgia Tech OMSCS / CS 8903</p>
              </div>
              <div className="border-l-4 border-purple-400 pl-4">
                <h3 className="retro-heading text-purple-400 mb-2 text-sm">Project Type</h3>
                <p className="text-lg text-purple-200">Independent Research Project</p>
              </div>
            </div>

            <div className="pt-8 border-t-2 border-cyan-500 flex flex-col sm:flex-row gap-4">
              <button className="retro-heading flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black border-4 border-cyan-400 hover:shadow-[0_0_30px_rgba(0,255,255,0.8)] hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm">
                <Github className="w-5 h-5" />
                GitHub Repository
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Game Credits */}
      <footer className="bg-black border-t-4 border-cyan-500 py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <div className="retro-heading text-xs text-cyan-400 mb-4 animate-pulse">[ MISSION COMPLETE ]</div>
            <h3 className="retro-heading text-xl md:text-2xl mb-2 bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              AI-Augmented Framework for Product Discovery
            </h3>
            <p className="text-purple-300 text-sm">Georgia Tech CS 8903 Course Project</p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-8 retro-heading text-xs">
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">Research Paper</button>
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">GitHub</button>
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">Contact</button>
            <button className="text-cyan-400 hover:text-lime-400 hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">References</button>
          </div>

          <div className="text-center space-y-2">
            <p className="text-purple-300 text-xs">Designed with accessibility and performance considerations.</p>
            <p className="text-fuchsia-400 text-sm retro-heading">&copy; 2026 Tchaas Alexander-Wright. All Rights Reserved.</p>
            <div className="pt-4 text-cyan-400 text-xs retro-heading animate-pulse">
              PRESS START TO CONTINUE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
