import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Database,
  FileText,
  GitBranch,
  KeyRound,
  Layers,
  Link2,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Shield,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react';
import { landingCaseStudies, seededStrategicLifecycleState } from '../mock/strategicLifecycleMock';
import { calculateObjectiveFinancialRollup, cardinalityLimits, getMissingLeanBusinessCaseActiveFields, getMissingObjectiveActiveFields } from '../rules/lifecycleRules';
import { TableScroller } from './components/TableScroller';
import type {
  ArchitectureOrigin,
  BusinessArchitecture,
  BusinessCapability,
  BusinessImpact,
  BusinessProcess,
  ConceptualDeliverable,
  CaseStatus,
  Discovery,
  Feature,
  InformationConcept,
  KeyActivity,
  LeanBusinessCase,
  Requirement,
  StakeholderPersona,
  StrategicLifecycleMockState,
  StrategicObjective,
  ValueStream,
} from '../types/model';
import { api, getList, setTokens, clearTokens, getRefreshToken, ApiError } from '../api/client';
import { listObjectives, createObjective, updateObjective } from '../api/objectives';
import { getQuestions, generate, type AiResourceType, type AiQuestion } from '../api/ai';
import { getArchitecture, createArchitecture, updateArchitecture } from '../api/architecture';
import { listValueStreams, createValueStream, updateValueStream, deleteValueStream } from '../api/valueStreams';
import { listCapabilities, createCapability, updateCapability, deleteCapability } from '../api/capabilities';
import { listKeyActivities, createKeyActivity, updateKeyActivity, deleteKeyActivity } from '../api/keyActivities';
import { listProcesses, createProcess, updateProcess, deleteProcess } from '../api/processes';
import { listStakeholders, createStakeholder, updateStakeholder, deleteStakeholder } from '../api/stakeholders';
import { listInformationConcepts, createInformationConcept, updateInformationConcept, deleteInformationConcept } from '../api/informationConcepts';
import { listBusinessImpacts, createBusinessImpact, updateBusinessImpact, deleteBusinessImpact } from '../api/businessImpacts';
import { listBusinessCases, createBusinessCase, updateBusinessCase, updateBusinessCaseStatus } from '../api/businessCases';
import { getDiscoveryForCase, createDiscovery, updateDiscovery } from '../api/discovery';
import { listFeatures, createFeature, updateFeature, deleteFeature } from '../api/features';
import { listRequirements, createRequirement, updateRequirement, deleteRequirement } from '../api/requirements';
import { listDeliverables, createDeliverable, updateDeliverable, deleteDeliverable } from '../api/deliverables';
import { getImplementationForCase, createImplementation, updateImplementation } from '../api/implementation';

type RouteId =
  | 'landing'
  | 'signup'
  | 'login'
  | 'dashboard'
  | 'company'
  | 'departments'
  | 'objectives'
  | 'architecture'
  | 'value-streams'
  | 'key-activities'
  | 'capabilities'
  | 'processes'
  | 'personas'
  | 'information'
  | 'impacts'
  | 'cases'
  | 'discovery'
  | 'features'
  | 'requirements'
  | 'deliverables'
  | 'implementation'
  | 'ai';

type AuthSession = {
  email: string;
  authProvider: 'password' | 'google';
  signedInAt: string;
};

type NavGroup = {
  label: string;
  gate: 'always' | 'out' | 'in';
  items: { route: RouteId; label: string }[];
};

type PrimaryNavGroup = {
  id: 'overview' | 'setup' | 'phase1' | 'phase2' | 'ai';
  label: string;
  fullLabel: string;
  gate: 'always' | 'in';
  defaultRoute: RouteId;
  items: { route: RouteId; label: string }[];
  routes: RouteId[];
};

type TenantData = ReturnType<typeof getTenantData>;
type AiDraftState = {
  objectives: Record<string, Partial<StrategicObjective>>;
  cases: Record<string, Partial<LeanBusinessCase>>;
  discoveries: Record<string, Partial<Discovery>>;
};
type AiActions = {
  pending: AiDraftState;
  saved: AiDraftState;
  draftObjective: (workspaceName: string, objective: StrategicObjective) => void;
  draftCase: (workspaceName: string, businessCase: LeanBusinessCase) => void;
  draftDiscovery: (workspaceName: string, discovery: Discovery) => void;
  updateObjective: (id: string, field: keyof StrategicObjective, value: string) => void;
  updateCase: (id: string, field: keyof LeanBusinessCase, value: string) => void;
  updateDiscovery: (id: string, field: keyof Discovery, value: string) => void;
  refineObjective: (id: string, field: keyof StrategicObjective, value: string) => void;
  refineCase: (id: string, field: keyof LeanBusinessCase, value: string) => void;
  refineDiscovery: (id: string, field: keyof Discovery, value: string) => void;
  saveObjective: (id: string) => void;
  saveCase: (id: string) => void;
  saveDiscovery: (id: string) => void;
  discardObjective: (id: string) => void;
  discardCase: (id: string) => void;
  discardDiscovery: (id: string) => void;
};

const state: StrategicLifecycleMockState = seededStrategicLifecycleState;
const activeWorkspaceStorageKey = 'slaf.wireframe.activeWorkspaceId';
const apiWorkspaceStorageKey = 'slaf.activeWorkspace';
const emptyAiDraftState = (): AiDraftState => ({ objectives: {}, cases: {}, discoveries: {} });

// A workspace from the real GET /workspaces list — only id + name are needed for the switcher.
type ApiWorkspace = { id: string; name: string };

// Restore the persisted workspace choice, validating it still exists in the fetched list;
// fall back to the first workspace (or null if the list is empty).
const resolveApiWorkspaceId = (items: ApiWorkspace[]): string | null => {
  if (items.length === 0) return null;
  try {
    const saved = localStorage.getItem(apiWorkspaceStorageKey);
    if (saved && items.some((w) => w.id === saved)) return saved;
  } catch { /* ignore */ }
  return items[0].id;
};

const routeByHash: Record<string, RouteId> = {
  '': 'landing',
  '/': 'landing',
  '/signup': 'signup',
  '/login': 'login',
  '/dashboard': 'dashboard',
  '/company': 'company',
  '/departments': 'departments',
  '/objectives': 'objectives',
  '/architecture': 'architecture',
  '/value-streams': 'value-streams',
  '/key-activities': 'key-activities',
  '/capabilities': 'capabilities',
  '/processes': 'processes',
  '/personas': 'personas',
  '/information': 'information',
  '/impacts': 'impacts',
  '/cases': 'cases',
  '/discovery': 'discovery',
  '/features': 'features',
  '/requirements': 'requirements',
  '/deliverables': 'deliverables',
  '/implementation': 'implementation',
  '/ai': 'ai',
};

const hashByRoute = Object.fromEntries(Object.entries(routeByHash).map(([hash, route]) => [route, hash || '/'])) as Record<RouteId, string>;
const gatedRoutes = new Set<RouteId>([
  'dashboard',
  'company',
  'departments',
  'objectives',
  'architecture',
  'value-streams',
  'key-activities',
  'capabilities',
  'processes',
  'personas',
  'information',
  'impacts',
  'cases',
  'discovery',
  'features',
  'requirements',
  'deliverables',
  'implementation',
  'ai',
]);

const navGroups: NavGroup[] = [
  { label: 'Public Site', gate: 'always', items: [{ route: 'landing', label: 'Landing · Overview' }] },
  { label: 'Account', gate: 'out', items: [{ route: 'signup', label: 'Sign Up' }, { route: 'login', label: 'Log In' }] },
  {
    label: 'Account & Setup',
    gate: 'in',
    items: [{ route: 'dashboard', label: 'Dashboard' }, { route: 'company', label: 'Company Profile' }, { route: 'departments', label: 'Departments' }],
  },
  {
    label: 'Phase 1 · Strategy',
    gate: 'in',
    items: [
      { route: 'objectives', label: 'Strategic Objectives' },
      { route: 'architecture', label: 'Business Architecture' },
      { route: 'value-streams', label: 'Value Streams' },
      { route: 'key-activities', label: 'Key Activities' },
      { route: 'capabilities', label: 'Capabilities' },
      { route: 'processes', label: 'Business Processes' },
      { route: 'personas', label: 'Stakeholders & Personas' },
      { route: 'information', label: 'Information Concepts' },
      { route: 'impacts', label: 'Business Impacts' },
    ],
  },
  {
    label: 'Phase 2 · Delivery',
    gate: 'in',
    items: [
      { route: 'cases', label: 'Lean Business Cases' },
      { route: 'discovery', label: 'Discovery' },
      { route: 'features', label: 'Features' },
      { route: 'requirements', label: 'Requirements' },
      { route: 'deliverables', label: 'Conceptual Deliverables' },
      { route: 'implementation', label: 'Implementation' },
    ],
  },
  { label: 'AI Layer', gate: 'in', items: [{ route: 'ai', label: 'AI Assistance' }] },
];

const primaryNavGroups: PrimaryNavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    fullLabel: 'Public Site',
    gate: 'always',
    defaultRoute: 'landing',
    items: [{ route: 'landing', label: 'Landing' }],
  },
  {
    id: 'setup',
    label: 'Setup',
    fullLabel: 'Account & Setup',
    gate: 'in',
    defaultRoute: 'dashboard',
    items: [{ route: 'dashboard', label: 'Dashboard' }, { route: 'company', label: 'Company Profile' }, { route: 'departments', label: 'Departments' }],
  },
  {
    id: 'phase1',
    label: 'Phase 1',
    fullLabel: 'Strategy',
    gate: 'in',
    defaultRoute: 'objectives',
    items: [
      { route: 'objectives', label: 'Strategic Objectives' },
      { route: 'architecture', label: 'Business Architecture' },
      { route: 'value-streams', label: 'Value Streams' },
      { route: 'key-activities', label: 'Key Activities' },
      { route: 'capabilities', label: 'Capabilities' },
      { route: 'processes', label: 'Business Processes' },
      { route: 'personas', label: 'Stakeholders & Personas' },
      { route: 'information', label: 'Information Concepts' },
      { route: 'impacts', label: 'Business Impacts' },
    ],
  },
  {
    id: 'phase2',
    label: 'Phase 2',
    fullLabel: 'Delivery',
    gate: 'in',
    defaultRoute: 'cases',
    items: [
      { route: 'cases', label: 'Lean Business Cases' },
      { route: 'discovery', label: 'Discovery' },
      { route: 'features', label: 'Features' },
      { route: 'requirements', label: 'Requirements' },
      { route: 'deliverables', label: 'Conceptual Deliverables' },
      { route: 'implementation', label: 'Implementation' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    fullLabel: 'AI Layer',
    gate: 'in',
    defaultRoute: 'ai',
    items: [{ route: 'ai', label: 'AI Assistance' }],
  },
].map((group) => ({ ...group, routes: group.items.map((item) => item.route) }));

const getPrimaryNavGroupForRoute = (route: RouteId) => primaryNavGroups.find((group) => group.routes.includes(route)) || primaryNavGroups[0];

const implementedRoutes = new Set<RouteId>([
  'dashboard',
  'company',
  'departments',
  'objectives',
  'architecture',
  'value-streams',
  'key-activities',
  'capabilities',
  'processes',
  'personas',
  'information',
  'impacts',
  'cases',
  'discovery',
  'features',
  'requirements',
  'deliverables',
  'implementation',
  'ai',
]);

const dataModelCoverage = [
  ['Auth', 'users, refresh_tokens'],
  ['Company', 'workspaces, workspace_members, workspace_invites, departments'],
  ['Strategy', 'strategic_objectives, strategic_objective_metrics, objective links'],
  ['Architecture', 'business_architecture_components, value_streams, key_activities, capabilities, link tables'],
  ['Architecture support', 'business_processes, stakeholders_personas, information_concepts, business_impacts'],
  ['Phase 2', 'lean_business_cases, discovery, features, requirements, deliverables, implementation'],
];

const landingChallenges = [
  'Misalignment between executive intent and implementation execution',
  'Delays in product discovery and requirements analysis',
  'Fragmented communication between business and technical stakeholders',
  'Limited decision traceability across lifecycle phases',
];

const landingClosureMap = [
  {
    gap: 'Misalignment',
    heading: 'A traceable spine',
    text: 'Every objective links through value streams, capabilities, features, and requirements to implementation actuals.',
  },
  {
    gap: 'Discovery delays',
    heading: 'Guided discovery + AI drafting',
    text: 'The roll-down builder and one-click Draft-with-AI accelerate persona, process, and requirement work.',
  },
  {
    gap: 'Fragmented communication',
    heading: 'One connected model',
    text: 'A single workspace ties business architecture, product discovery, and delivery together for business and technical stakeholders.',
  },
  {
    gap: 'Limited traceability',
    heading: 'End-to-end traceability + computed value',
    text: 'Decisions trace from strategy to requirement, and implementation actuals roll up to objective value automatically.',
  },
];

const frameworkStages = [
  {
    id: 1,
    title: 'Executive Strategic Objectives',
    purpose: 'Define high-level business goals and strategic direction.',
    keyQuestions: ['What outcomes do we need?', 'What business value are we targeting?', 'What are our strategic priorities?'],
    aiOpportunity: 'Parse strategic documents, identify themes, and extract objectives.',
    artifact: 'Strategic initiative document, executive brief.',
    governance: 'Executive review and sign-off.',
  },
  {
    id: 2,
    title: 'Business Architecture Translation',
    purpose: 'Translate executive goals into capabilities, value streams, key activities, personas, processes, and information concepts.',
    keyQuestions: ['What capabilities do we need?', 'What value streams are affected?', 'Who are the key stakeholders?'],
    aiOpportunity: 'Assist with capability mapping, value stream analysis, persona clustering, and documentation synthesis.',
    artifact: 'Capability map, value stream map, stakeholder/persona model.',
    governance: 'Human validation by business architects and stakeholders.',
  },
  {
    id: 3,
    title: 'Product Discovery',
    purpose: 'Validate problem space, understand user needs, and define product direction.',
    keyQuestions: ['What problem are we solving?', 'Who experiences this problem?', 'What would success look like?'],
    aiOpportunity: 'Journey mapping, user research synthesis, and opportunity prioritization.',
    artifact: 'Journey maps, opportunity canvas, validated hypotheses.',
    governance: 'Product owner and stakeholder validation.',
  },
  {
    id: 4,
    title: 'Gap and Bottleneck Analysis',
    purpose: 'Identify gaps between current and desired state.',
    keyQuestions: ['What is missing?', 'Where are the constraints?', 'What dependencies exist?'],
    aiOpportunity: 'Process mining, dependency mapping, and constraint identification.',
    artifact: 'Gap analysis report, dependency matrix.',
    governance: 'Cross-functional team review.',
  },
  {
    id: 5,
    title: 'Conceptual Architecture',
    purpose: 'Define high-level solution structure needed to support implementation readiness.',
    keyQuestions: ['What components are needed?', 'How do they interact?', 'What patterns apply?'],
    aiOpportunity: 'Architecture pattern recommendation, component ideation, and integration mapping.',
    artifact: 'Conceptual architecture diagram, component model.',
    governance: 'Architecture review board approval.',
  },
  {
    id: 6,
    title: 'AI-Augmented Artifact Generation',
    purpose: 'Accelerate creation of documentation and design artifacts.',
    keyQuestions: ['What artifacts are needed?', 'What quality standards apply?', 'How do we maintain consistency?'],
    aiOpportunity: 'Template generation, documentation synthesis, and diagram creation.',
    artifact: 'Generated specifications, diagrams, documentation.',
    governance: 'Technical writer and architect review.',
  },
  {
    id: 7,
    title: 'Agile / Scrum Translation',
    purpose: 'Transform architecture into agile delivery structures.',
    keyQuestions: ['What are the epics?', 'How do we sequence work?', 'What are the acceptance criteria?'],
    aiOpportunity: 'Epic generation, story mapping, and acceptance criteria drafting.',
    artifact: 'Epic breakdown, user stories, sprint planning artifacts.',
    governance: 'Scrum master and team validation.',
  },
  {
    id: 8,
    title: 'Requirements Definition',
    purpose: 'Document detailed functional and non-functional requirements.',
    keyQuestions: ['What must the system do?', 'What are the constraints?', 'What are the quality attributes?'],
    aiOpportunity: 'Requirement extraction, completeness checking, and traceability mapping.',
    artifact: 'Requirements specification, traceability matrix.',
    governance: 'Business analyst and stakeholder approval.',
  },
  {
    id: 9,
    title: 'Implementation Readiness',
    purpose: 'Ensure all prerequisites for development are in place.',
    keyQuestions: ['Are requirements clear?', 'Are dependencies resolved?', 'Is the team ready?'],
    aiOpportunity: 'Readiness checklist generation, risk identification, and gap flagging.',
    artifact: 'Readiness assessment, risk register.',
    governance: 'Program manager and delivery lead sign-off.',
  },
  {
    id: 10,
    title: 'Strategic Value Measurement',
    purpose: 'Track and measure outcomes against strategic objectives.',
    keyQuestions: ['Are we achieving our goals?', 'What is the business impact?', 'What should we adjust?'],
    aiOpportunity: 'Metrics tracking, trend analysis, and insight generation.',
    artifact: 'Value dashboard, outcome reports.',
    governance: 'Executive review and continuous improvement.',
  },
];

const aiSupportSystems = [
  'strategic initiative interpretation',
  'stakeholder and persona analysis',
  'value stream mapping',
  'journey mapping',
  'process gap analysis',
  'requirement generation',
  'conceptual architecture ideation',
  'API and data mapping support',
  'documentation acceleration',
  'decision traceability',
  'governance checkpoint identification',
];

const governanceControls = [
  'human review checkpoints at every lifecycle stage',
  'explainability requirements for AI-generated artifacts',
  'prompt dependency controls and version tracking',
  'architecture review gates before implementation',
  'traceability from strategy to requirement',
  'risk and compliance review integration',
  'data quality validation and testing',
  'final stakeholder approval workflows',
];

const researchDeliverables = [
  'Industry baseline assessment',
  'Task analysis documentation',
  'Product discovery lifecycle analysis',
  'Software lifecycle management analysis',
  'Gap analysis report',
  'Human-AI governance assessment',
  'Final research paper',
];

const architectureDeliverables = [
  'Conceptual architecture framework',
  'AI integration capability model',
  'Product discovery workflow diagrams',
  'UML activity/use case diagrams',
  'Strategic initiative traceability model',
  'Governance process flows',
  'Lifecycle transformation diagrams',
];

const getRoute = (): RouteId => routeByHash[window.location.hash.replace(/^#/, '').split('?')[0]] || 'landing';
const navigateTo = (route: RouteId) => {
  window.location.hash = hashByRoute[route] || '/';
};

const formatCurrency = (value: number | null | undefined) =>
  value == null ? 'Not entered' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatValue = (value: ReactNode) => {
  if (value === null || value === undefined || value === '') return 'Not entered';
  if (typeof value === 'number') return new Intl.NumberFormat('en-US').format(value);
  return value;
};

// Turn an enum value like `revenue_growth` into a readable label `Revenue growth`.
const prettifyEnum = (value: string) => {
  const spaced = value.replaceAll('_', ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: prettifyEnum(value) }));

const strategicValueCategoryOptions = toOptions([
  'revenue_growth', 'cost_reduction', 'operational_efficiency', 'customer_experience',
  'risk_reduction', 'scalability', 'competitive_advantage',
]);
const problemTypeOptions = toOptions(['customer', 'internal', 'both']);
const expectedValueTypeOptions = toOptions(['financial', 'operational', 'mixed']);
const valueStreamTypeOptions = toOptions(['current_state', 'future_state', 'modified_existing']);
const stakeholderTypeOptions = toOptions(['internal', 'external', 'executive', 'customer']);
const impactTypeOptions = toOptions(['process', 'financial', 'customer', 'risk', 'operational']);
const severityOptions = toOptions(['low', 'medium', 'high']);
const priorityOptions = toOptions(['low', 'medium', 'high']);
const caseValueTypeOptions = toOptions(['cost_savings', 'revenue', 'risk_reduction', 'efficiency']);
// Phase 2 delivery enums (backend/app/schemas/solution.py + implementation.py). Feature/requirement/
// deliverable `status` reuse discoveryStatusOptions (draft->active->completed, PATCH-only).
const featureTypeOptions = toOptions(['user_facing', 'operational', 'analytical', 'integration', 'platform']);
const requirementTypeOptions = toOptions(['functional', 'non_functional', 'data', 'integration', 'security']);
const deliverableTypeOptions = toOptions([
  'conceptual_architecture_document', 'end_to_end_architecture_diagram', 'system_context_diagram',
  'capability_to_component_diagram', 'value_stream_to_feature_map', 'data_flow_diagram',
  'api_integration_view', 'governance_oversight_view', 'prioritized_epic_feature_roadmap',
  'requirement_sets', 'risk_dependency_register', 'traceability_matrix',
]);
const deliverableSourceOptions = toOptions(['suggested', 'user_finalized']);
const implementationStatusOptions = toOptions(['not_started', 'in_progress', 'completed', 'on_hold']);

// Target dates come in as ISO strings or '' / null. Show "Not entered" when both are blank,
// matching every other empty field — instead of the literal "null to null".
const formatTargetDates = (start: string | null | undefined, end: string | null | undefined) => {
  const s = start || '';
  const e = end || '';
  if (!s && !e) return 'Not entered';
  if (s && e) return `${s} to ${e}`;
  return s || e;
};

// A 422 `fields` entry is a pydantic error object ({type, loc, msg, ...}) — but treat it as
// unknown and never assume its shape. Strings are prettified; objects yield a field name from
// `loc` (last element), optionally with `msg`; anything else is dropped. Must not throw.
const describeValidationField = (field: unknown): string => {
  if (typeof field === 'string') return prettifyEnum(field);
  if (field && typeof field === 'object') {
    const { loc, msg } = field as { loc?: unknown; msg?: unknown };
    const last = Array.isArray(loc) ? loc[loc.length - 1] : undefined;
    const name = typeof last === 'string' ? prettifyEnum(last) : typeof last === 'number' ? String(last) : '';
    const message = typeof msg === 'string' ? msg : '';
    if (name && message) return `${name}: ${message}`;
    return name || message;
  }
  return '';
};

// Turn an ApiError into a readable, on-screen message. The backend enforces rules the mock
// never did; each must render as text, not a console error or silent failure.
const renderApiMessage = (error: ApiError, entityLabel = 'records', remedy = ''): string => {
  const details = (error.details ?? {}) as { limit?: number; current?: number; fields?: unknown };
  if (error.status === 409 && error.code === 'cardinality_limit') {
    const limit = details.limit ?? 3;
    const suffix = remedy ? ` ${remedy}` : '';
    return `You've reached the limit of ${limit} ${entityLabel}.${suffix}`;
  }
  if (error.status === 422) {
    const fields = Array.isArray(details.fields) ? details.fields : [];
    const parts = fields.map(describeValidationField).filter(Boolean);
    const suffix = parts.length ? ` (${parts.join(', ')})` : '';
    return `${error.message}${suffix}`;
  }
  return error.message;
};

const tenantFocus = (workspaceName: string) => {
  if (workspaceName.includes('Walmart')) return 'store fulfillment reliability';
  if (workspaceName.includes('Amazon')) return 'returns flow optimization';
  return 'Network 2.0 transformation';
};

const mockObjectiveDraft = (workspaceName: string): Partial<StrategicObjective> => {
  const focus = tenantFocus(workspaceName);
  return {
    executiveObjective: `Accelerate ${focus} by keeping strategy, architecture, discovery, and implementation value connected.`,
    expectedBusinessOutcome: `A measurable improvement in ${focus} with clear traceability from objective to delivery.`,
    problemOpportunityStatement: `Current planning artifacts for ${focus} are spread across teams and lose traceability before implementation.`,
    valueHypothesis: `If teams use a shared lifecycle spine for ${focus}, they can reduce handoff loss and focus delivery on measurable outcomes.`,
    valueMeasurementApproach: 'Track forecast value, implementation actuals, cycle time, and adoption by impacted teams.',
    urgencyRationale: `The operating model for ${focus} needs faster, governed decisions before the next planning cycle.`,
    costOfInaction: 'Continued rework, duplicated analysis, and delayed realization of expected value.',
    currentLimitation: 'Traceability is manually reconstructed across planning, architecture, and delivery artifacts.',
    impactedTeams: 'Strategy, Business Architecture, Product, Delivery, Operations, Finance',
    valueRealizationTimeframe: 'Within the first governed rollout cycle.',
  };
};

const mockCaseDraft = (workspaceName: string): Partial<LeanBusinessCase> => {
  const focus = tenantFocus(workspaceName);
  return {
    summary: `Focused initiative to prove ${focus} value through linked architecture, discovery, and implementation evidence.`,
    problemOpportunityStatement: `Teams lack a concise case that connects ${focus} pain points to reusable architecture and delivery outcomes.`,
    valueHypothesis: `A scoped pilot for ${focus} will produce measurable operational value while preserving human governance.`,
    priority: 'high',
  };
};

const mockDiscoveryDraft = (workspaceName: string): Partial<Discovery> => {
  const focus = tenantFocus(workspaceName);
  return {
    problemStatement: `Teams need a validated discovery view of ${focus} before committing delivery scope.`,
    personaFindings: 'Primary users need explainable recommendations, clear tradeoffs, and confidence that final decisions remain human-owned.',
    journeyMap: 'User identifies impacted area, reviews current constraints, compares options, confirms linked records, and saves the approved direction.',
    currentStateProcessMap: 'Current work moves through disconnected planning, analysis, and delivery artifacts.',
    bottleneckAnalysis: 'The biggest delay is reconstructing context and traceability across teams.',
    dataFindings: 'Useful signals exist, but definitions and ownership vary across systems.',
    legacyConstraints: 'Existing workflows depend on manual reconciliation and local team conventions.',
    futureStateNeeds: 'Reusable linked records, transparent rationale, and clear save/finalization gates.',
    discoveryMetrics: 'Cycle time, linked-record coverage, acceptance rate, and implemented value.',
    governanceFindings: 'Human review remains required before saving or finalizing any AI-assisted content.',
  };
};

const refinedText = (value: string) => `${value.trim()} Refined for clearer outcome, traceability, and implementation governance.`;

const loadWorkspaceId = () => {
  try {
    const saved = localStorage.getItem(activeWorkspaceStorageKey);
    return state.workspaces.some((workspace) => workspace.id === saved) ? saved || state.workspaces[0].id : state.workspaces[0].id;
  } catch {
    return state.workspaces[0].id;
  }
};

function getTenantData(workspaceId: string) {
  const workspace = state.workspaces.find((candidate) => candidate.id === workspaceId) || state.workspaces[0];
  const workspaceMembers = state.workspaceMembers.filter((member) => member.workspaceId === workspace.id);
  const workspaceInvites = state.workspaceInvites.filter((invite) => invite.workspaceId === workspace.id);
  const departments = state.departments.filter((department) => department.workspaceId === workspace.id);
  const objectives = state.strategicObjectives.filter((objective) => objective.workspaceId === workspace.id);
  const objectiveIds = new Set(objectives.map((objective) => objective.id));
  const metrics = state.strategicObjectiveMetrics.filter((metric) => metric.workspaceId === workspace.id);
  const architecture = state.businessArchitectures.find((candidate) => candidate.workspaceId === workspace.id);
  const valueStreams = state.valueStreams.filter((stream) => stream.workspaceId === workspace.id);
  const valueStreamIds = new Set(valueStreams.map((stream) => stream.id));
  const keyActivities = state.keyActivities.filter((activity) => activity.workspaceId === workspace.id);
  const keyActivityIds = new Set(keyActivities.map((activity) => activity.id));
  const capabilities = state.businessCapabilities.filter((capability) => capability.workspaceId === workspace.id);
  const processes = state.businessProcesses.filter((process) => process.workspaceId === workspace.id);
  const personas = state.stakeholderPersonas.filter((persona) => persona.workspaceId === workspace.id);
  const informationConcepts = state.informationConcepts.filter((concept) => concept.workspaceId === workspace.id);
  const impacts = state.businessImpacts.filter((impact) => impact.workspaceId === workspace.id);
  const cases = state.leanBusinessCases.filter((businessCase) => businessCase.workspaceId === workspace.id);
  const caseIds = new Set(cases.map((businessCase) => businessCase.id));
  const discoveries = state.discoveries.filter((discovery) => discovery.workspaceId === workspace.id);
  const features = state.features.filter((feature) => feature.workspaceId === workspace.id);
  const featureIds = new Set(features.map((feature) => feature.id));
  const requirements = state.requirements.filter((requirement) => requirement.workspaceId === workspace.id);
  const conceptualDeliverables = state.conceptualDeliverables.filter((deliverable) => deliverable.workspaceId === workspace.id);
  const implementations = state.implementations.filter((implementation) => implementation.workspaceId === workspace.id);
  const implementationIds = new Set(implementations.map((implementation) => implementation.id));
  const implementationValueStreams = state.implementationValueStreams.filter((allocation) => implementationIds.has(allocation.implementationId));

  return {
    workspace,
    workspaceMembers,
    workspaceInvites,
    departments,
    objectives,
    objectiveIds,
    metrics,
    architecture,
    valueStreams,
    valueStreamIds,
    keyActivities,
    keyActivityIds,
    capabilities,
    processes,
    personas,
    informationConcepts,
    impacts,
    cases,
    caseIds,
    discoveries,
    features,
    featureIds,
    requirements,
    conceptualDeliverables,
    implementations,
    implementationValueStreams,
  };
}

function HudButton({
  children,
  onClick,
  href,
  download,
  variant = 'primary',
  type = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  download?: boolean;
  variant?: 'primary' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const className = `hud-button ${variant === 'ghost' ? 'hud-button--ghost' : ''}`;
  if (href) {
    return <a className={className} href={href} download={download}>{children}</a>;
  }
  return <button className={className} type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

function HudPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`hud-panel ${className}`}>{children}</section>;
}

function HudBadge({ children, tone = 'cyan' }: { children: ReactNode; tone?: 'cyan' | 'green' | 'amber' | 'pink' }) {
  return <span className={`hud-badge hud-badge--${tone}`}>{children}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status.includes('active') || status.includes('completed') ? 'green' : status.includes('draft') || status.includes('pending') || status.includes('not_started') ? 'amber' : 'pink';
  return <HudBadge tone={tone}>{status.replaceAll('_', ' ')}</HudBadge>;
}

function OriginBadge({ origin }: { origin: ArchitectureOrigin }) {
  return <HudBadge tone={origin === 'discovery' ? 'pink' : 'cyan'}>origin: {origin}</HudBadge>;
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="hud-section-title">
      {eyebrow && <div className="hud-eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

function TextInput({ label, value, onChange, type = 'text', readOnly = false }: { label: string; value: string; onChange?: (value: string) => void; type?: string; readOnly?: boolean }) {
  return (
    <label className="hud-field">
      <span>{label}</span>
      <input value={value} type={type} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

// Multi-line sibling of TextInput for paragraph-length fields. Same field styling as the
// textareas already used elsewhere on the page (hud-field--area), without the Refine button.
function TextAreaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="hud-field hud-field--area">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="hud-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select…</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="hud-readonly">
      <span>{label}</span>
      <strong>{formatValue(value)}</strong>
    </div>
  );
}

function FieldGrid({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return <div className="hud-field-grid">{rows.map((row) => <ReadOnlyField key={row.label} label={row.label} value={row.value} />)}</div>;
}

function LifecycleFlow() {
  const stages = [
    { label: 'Strategy', subLabel: 'Objectives' },
    { label: 'Architecture', subLabel: 'Value streams' },
    { label: 'Discovery', subLabel: 'Personas' },
    { label: 'Delivery', subLabel: 'Implementation' },
  ];

  return (
    <div className="hud-flow">
      {stages.map((stage, index) => (
        <div className="hud-flow-step" key={stage.label}>
          {index > 0 && <ChevronRight className="hud-flow-arrow" size={18} />}
          <div className="hud-flow-node">
            <b>{stage.label}</b>
            <small>{stage.subLabel}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function RuleNote({ children }: { children: ReactNode }) {
  return <div className="hud-rule-note"><FileText size={17} /><span>{children}</span></div>;
}

function AiBanner({ discovery = false }: { discovery?: boolean }) {
  return (
    <div className="hud-ai-banner">
      <Sparkles size={17} />
      <span>{discovery ? "'Draft findings with AI' fills the ten finding fields below in one call — edit any of them inline, then Save. Nothing is stored until you save." : 'AI filled these fields — edit any of them, then Save. Nothing is stored yet.'}</span>
    </div>
  );
}

function AiTextArea({
  label,
  value,
  onChange,
  onRefine,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRefine: () => void;
}) {
  return (
    <label className="hud-field hud-field--area">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      <button className="hud-mini-button" type="button" onClick={onRefine}>Refine</button>
    </label>
  );
}

// Reusable AI interview modal. Fetches the question set for a resource type, collects
// plain-language answers, and on explicit submit calls /generate — returning the suggested
// field values to the caller via onGenerated. It persists nothing itself; the caller decides
// what to do with the returned fields (here: pre-populate a create form for human review).
// Built once so Cases and Discovery can reuse it by passing a different resourceType.
function AiInterviewModal({
  workspaceId,
  resourceType,
  parentId,
  onGenerated,
  onClose,
}: {
  workspaceId: string;
  resourceType: AiResourceType;
  parentId?: string;
  onGenerated: (fields: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<ApiError | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuestions(true);
    setQuestionsError(null);
    getQuestions(workspaceId, resourceType)
      .then((set) => { if (!cancelled) setQuestions(set.questions ?? []); })
      .catch((err) => {
        if (cancelled) return;
        setQuestionsError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load AI questions.', status: 0 }));
      })
      .finally(() => { if (!cancelled) setLoadingQuestions(false); });
    return () => { cancelled = true; };
  }, [workspaceId, resourceType]);

  const setAnswer = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));

  // Submit is allowed only once every REQUIRED question has a non-empty answer.
  const requiredMet = questions.every((question) => !question.required || (answers[question.id] ?? '').trim() !== '');
  const canSubmit = !loadingQuestions && !questionsError && questions.length > 0 && requiredMet && !generating;

  // The AI call fires ONLY here, on explicit submit — never on mount, typing, focus, or blur.
  const submit = async () => {
    if (!canSubmit) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      // Send only non-empty answers, keyed by question id (e.g. "initiative", "outcomes").
      const payloadAnswers = Object.fromEntries(
        questions
          .map((question) => [question.id, (answers[question.id] ?? '').trim()] as const)
          .filter(([, value]) => value !== ''),
      );
      const result = await generate(workspaceId, { resourceType, answers: payloadAnswers, parentId });
      onGenerated(result.fields ?? {});
      onClose();
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to generate suggestions.', status: 0 }));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="hud-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hud-modal" onClick={(event) => event.stopPropagation()}>
        <div className="hud-modal-head">
          <div><Sparkles size={18} /> <strong>Draft with AI</strong></div>
          <button className="hud-modal-close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="hud-modal-intro">Answer what you can in plain language. AI drafts the fields for you to review and edit — nothing is saved until you click Create.</p>

        {loadingQuestions && <p>Loading questions…</p>}
        {questionsError && <p className="hud-form-error" role="alert">{renderApiMessage(questionsError, 'AI questions')}</p>}

        {!loadingQuestions && !questionsError && questions.map((question) => (
          <label className="hud-modal-question" key={question.id}>
            <span className="hud-modal-prompt">{question.prompt}{question.required && <em> (required)</em>}</span>
            <small className="hud-modal-helper">{question.helper}</small>
            <textarea
              value={answers[question.id] ?? ''}
              maxLength={question.maxLength}
              onChange={(event) => setAnswer(question.id, event.target.value)}
            />
          </label>
        ))}

        {generateError && <p className="hud-form-error" role="alert">{renderApiMessage(generateError, 'AI suggestions')}</p>}

        {!loadingQuestions && !questionsError && (
          <div className="hud-modal-actions">
            <HudButton onClick={submit} disabled={!canSubmit}>
              <Sparkles size={16} /> {generating ? 'Generating… this can take 5–15 seconds' : 'Generate draft'}
            </HudButton>
            <HudButton variant="ghost" onClick={onClose} disabled={generating}>Cancel</HudButton>
          </div>
        )}
      </div>
    </div>
  );
}

function ReferenceOrCreate({ label, items }: { label: string; items: { id: string; name: string; origin?: ArchitectureOrigin }[] }) {
  const [suggested, setSuggested] = useState(false);
  const proposed = items.slice(0, 2);

  return (
    <div className="hud-reference">
      <div className="hud-reference-head"><Link2 size={15} /><span>{label} · reference or create</span></div>
      <div className="hud-chip-row">
        {items.map((item) => <span className="hud-chip" key={item.id}>{item.name}{item.origin && <small>{item.origin}</small>}</span>)}
        <button className="hud-chip hud-chip--action" type="button">+ reference existing</button>
        <button className="hud-chip hud-chip--action" type="button">+ create new</button>
        <button className="hud-chip hud-chip--action" type="button" onClick={() => setSuggested(true)}>Suggest links</button>
      </div>
      {suggested && (
        <div className="hud-ai-suggestion">
          <Sparkles size={15} />
          <span>{proposed.length ? `Suggested references: ${proposed.map((item) => item.name).join(', ')}. User confirmation required.` : 'No existing records available to suggest.'}</span>
        </div>
      )}
      <p>References link to existing workspace records; they do not copy records. Origin is provenance only and never restricts reuse.</p>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <TableScroller className="hud-table-wrap">
      <table className="hud-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </TableScroller>
  );
}

function MobileRecordCard({
  title,
  summary,
  badge,
  rows,
  action,
}: {
  title: string;
  summary?: string;
  badge: ReactNode;
  rows: { label: string; value: ReactNode }[];
  action: ReactNode;
}) {
  return (
    <article className="hud-mobile-record-card">
      <div className="hud-mobile-record-head">
        <div>
          <h2>{title}</h2>
          {summary && <p>{summary}</p>}
        </div>
        {badge}
      </div>
      <dl className="hud-mobile-record-fields">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value || 'Not entered'}</dd>
          </div>
        ))}
      </dl>
      <div className="hud-mobile-record-actions">{action}</div>
    </article>
  );
}

function Shell({
  session,
  route,
  apiWorkspaceId,
  workspaces,
  onWorkspaceChange,
  children,
  onSignOut,
}: {
  session: AuthSession | null;
  route: RouteId;
  apiWorkspaceId: string | null;
  workspaces: ApiWorkspace[];
  onWorkspaceChange: (workspaceId: string) => void;
  children: ReactNode;
  onSignOut: () => void;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const visiblePrimaryGroups = primaryNavGroups.filter((group) => group.gate === 'always' || session);
  const activeGroup = getPrimaryNavGroupForRoute(route);
  const showSubnav = activeGroup.items.length > 1 && (!gatedRoutes.has(activeGroup.defaultRoute) || Boolean(session));

  return (
    <div className="hud-app">
      <div className="hud-stars" />
      <header className="hud-topbar">
        <button className="hud-menu" type="button" aria-label="Toggle navigation" onClick={() => setNavOpen((open) => !open)}>
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <button className="hud-brand" type="button" onClick={() => navigateTo(session ? 'dashboard' : 'landing')}>
          <Shield size={19} />
          <span>Strategic Lifecycle AI Framework</span>
        </button>

        <nav className="hud-primary-tabs" aria-label="Primary navigation">
          {visiblePrimaryGroups.map((group) => (
            <button
              key={group.id}
              className={`hud-primary-tab ${activeGroup.id === group.id ? 'hud-primary-tab--active' : ''}`}
              type="button"
              onClick={() => {
                navigateTo(group.defaultRoute);
                setNavOpen(false);
              }}
              title={group.fullLabel}
            >
              {group.label}
            </button>
          ))}
        </nav>

        <div className="hud-right-cluster">
          {session && workspaces.length > 0 && (
            <label className="hud-switcher">
              <span>Workspace</span>
              <select value={apiWorkspaceId ?? ''} onChange={(event) => onWorkspaceChange(event.target.value)}>
                {workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}
              </select>
            </label>
          )}
          <div className="hud-shields">
            <span>SHIELDS</span>
            <strong>{session ? '100' : 'PUBLIC'}</strong>
          </div>
          <div className="hud-auth-actions">
            {session ? (
              <button className="hud-auth-link hud-auth-link--logout" type="button" onClick={onSignOut}>
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            ) : (
              <>
                <button className="hud-auth-link" type="button" onClick={() => navigateTo('signup')}>
                  <UserPlus size={14} />
                  <span>Sign Up</span>
                </button>
                <button className="hud-auth-link hud-auth-link--primary" type="button" onClick={() => navigateTo('login')}>
                  <LogIn size={14} />
                  <span>Log In</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <nav className={`hud-mobile-nav ${navOpen ? 'hud-mobile-nav--open' : ''}`} aria-label="Mobile navigation">
        {visiblePrimaryGroups.map((group) => (
          <div className="hud-mobile-group" key={group.id}>
            <button
              className={`hud-mobile-group-title ${activeGroup.id === group.id ? 'hud-mobile-group-title--active' : ''}`}
              type="button"
              onClick={() => {
                navigateTo(group.defaultRoute);
                setNavOpen(false);
              }}
            >
              {group.label}
            </button>
            {group.items.length > 1 && (
              <div className="hud-mobile-links">
                {group.items.map((item) => (
                  <button
                    key={item.route}
                    className={`hud-mobile-link ${route === item.route ? 'hud-mobile-link--active' : ''}`}
                    type="button"
                    onClick={() => {
                      navigateTo(item.route);
                      setNavOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {showSubnav && (
        <nav className="hud-subnav" aria-label={`${activeGroup.fullLabel} pages`}>
          {activeGroup.items.map((item) => (
            <button
              key={item.route}
              className={`hud-subnav-chip ${route === item.route ? 'hud-subnav-chip--active' : ''}`}
              type="button"
              onClick={() => navigateTo(item.route)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <main className="hud-main hud-main--full">{children}</main>
    </div>
  );
}

// Note: Public landing page for the research artifact. It explains the lifecycle framework, governance model,
// case studies, and downloadable project deliverables before a user enters the authenticated workspace shell.
function LandingPage() {
  const [selectedStage, setSelectedStage] = useState(frameworkStages[0].id);
  const activeStage = frameworkStages.find((stage) => stage.id === selectedStage) || frameworkStages[0];

  return (
    <div className="hud-page">
      <section className="hud-hero">
        <div className="hud-hero-copy">
          <HudBadge tone="green">Public research artifact · no tenant data</HudBadge>
          <h1>AI-AUGMENTED LIFECYCLE</h1>
          <p>An AI-augmented framework for product discovery and software lifecycle transformation.</p>
          <div className="hud-actions">
            <HudButton variant="ghost" href={`${import.meta.env.BASE_URL}assets/research-paper.pdf`} download>
              <ArrowDownToLine size={16} /> Download the research paper
            </HudButton>
          </div>
        </div>
      </section>

      <HudPanel>
        <SectionTitle
          eyebrow="CRITICAL CHALLENGES DETECTED"
          title="THE STRATEGY-TO-IMPLEMENTATION GAP"
          subtitle="Many enterprise transformation efforts fail not because technology is unavailable, but because organizations lack a structured way to translate strategic intent into operational design, validated product direction, and implementation-ready technical outcomes."
        />
        <div className="hud-card-grid hud-card-grid--four">
          {landingChallenges.map((challenge) => (
            <div className="hud-info-card hud-info-card--alert" key={challenge}>
              <Shield size={18} />
              <p>{challenge}</p>
            </div>
          ))}
        </div>
      </HudPanel>

      <HudPanel>
        <SectionTitle eyebrow="COUNTERMEASURES" title="HOW THE FRAMEWORK CLOSES THE GAP" />
        <div className="hud-card-grid hud-card-grid--four">
          {landingClosureMap.map((item) => (
            <div className="hud-info-card" key={item.gap}>
              <div className="hud-eyebrow">{item.gap}</div>
              <h2>{item.heading}</h2>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </HudPanel>

      <HudPanel>
        <SectionTitle
          eyebrow="SELECT STAGE"
          title="FRAMEWORK LIFECYCLE MAP"
          subtitle="Click on any stage to explore its purpose, key questions, AI augmentation opportunities, and governance checkpoints."
        />
        <div className="hud-stage-map">
          {frameworkStages.map((stage) => (
            <button
              className={`hud-stage-button ${stage.id === selectedStage ? 'hud-stage-button--active' : ''}`}
              key={stage.id}
              type="button"
              onClick={() => setSelectedStage(stage.id)}
            >
              <span>Stage {stage.id}</span>
              <strong>{stage.title}</strong>
            </button>
          ))}
        </div>
        <div className="hud-stage-detail">
          <div>
            <div className="hud-eyebrow">Purpose</div>
            <p>{activeStage.purpose}</p>
          </div>
          <div>
            <div className="hud-eyebrow">Key questions</div>
            <ul>{activeStage.keyQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
          </div>
          <div>
            <div className="hud-eyebrow">AI augmentation</div>
            <p>{activeStage.aiOpportunity}</p>
          </div>
          <div>
            <div className="hud-eyebrow">Governance checkpoint</div>
            <p>{activeStage.governance}</p>
          </div>
        </div>
      </HudPanel>

      <HudPanel>
        <SectionTitle
          eyebrow="AI POWER-UPS"
          title="AI SUPPORT SYSTEMS"
          subtitle="AI augments research, analysis, and workflow acceleration throughout the framework, while human experts retain responsibility for validation and decision-making."
        />
        <div className="hud-card-grid hud-card-grid--three">
          {aiSupportSystems.map((item) => (
            <div className="hud-info-card" key={item}>
              <Sparkles size={18} />
              <h2>{item}</h2>
              <HudBadge tone="green">HUMAN OVERSIGHT</HudBadge>
            </div>
          ))}
        </div>
      </HudPanel>

      <HudPanel>
        <SectionTitle eyebrow="ARCHITECTURE SPINE" title="FROM STRATEGY TO IMPLEMENTATION" />
        <div className="hud-chain">
          {['Executive Strategy', 'Capabilities', 'Value Streams', 'Activities', 'Personas', 'Processes', 'Information Concepts', 'Architecture'].map((item, index) => (
            <span key={item}>{index > 0 && <ChevronRight size={14} />}<b>{item}</b></span>
          ))}
        </div>
        <p>Business architecture identifies where value should be created. Product discovery validates what problem should be solved. Conceptual architecture defines the high-level solution structure needed to support implementation readiness.</p>
      </HudPanel>

      <HudPanel>
        <SectionTitle
          eyebrow="ENTERPRISE CASE STUDIES"
          title="REAL-WORLD SCENARIOS"
          subtitle="The framework is demonstrated on three real transformation programs — each a workspace you can open and explore end to end."
        />
        <div className="hud-case-grid">
          {landingCaseStudies.map((study) => (
            <article className="hud-case-card" key={study.company}>
              <div className="hud-eyebrow">{study.company}</div>
              <h2>{study.initiativeName}</h2>
              <FieldGrid rows={[
                { label: 'Objective', value: study.strategicObjective },
                { label: 'Value type', value: study.valueType },
                { label: 'BA focus', value: study.baFocus },
                { label: 'AI opportunity', value: study.aiOpportunity },
                { label: 'Architecture', value: study.architecture },
                { label: 'Measurable value', value: study.measurableValue },
              ]} />
              <p>{study.summary}</p>
              <div className="hud-eyebrow">Paper-grounded targets</div>
              <div className="hud-chip-row">
                {study.targetMetrics.map((metric) => <span className="hud-chip" key={metric}>{metric}</span>)}
              </div>
            </article>
          ))}
        </div>
      </HudPanel>

      <HudPanel>
        <SectionTitle eyebrow="SECURITY PROTOCOL ACTIVE" title="GOVERNANCE PRESERVES TRUST AND INTEGRITY" />
        <RuleNote>AI should augment research, analysis, and workflow acceleration, but human experts remain responsible for validation, judgment, and final decision-making.</RuleNote>
        <div className="hud-card-grid hud-card-grid--four">
          {governanceControls.map((control) => (
            <div className="hud-info-card" key={control}>
              <Check size={18} />
              <p>{control}</p>
            </div>
          ))}
        </div>
      </HudPanel>

      <div className="hud-landing-deliverables">
        <HudPanel>
          <SectionTitle eyebrow="PROJECT DELIVERABLES" title="RESEARCH ITEMS" />
          <ul className="hud-plain-list hud-plain-list--columns">{researchDeliverables.map((item) => <li key={item}>{item}</li>)}</ul>
          <HudButton variant="ghost" href={`${import.meta.env.BASE_URL}assets/research-paper.pdf`} download><ArrowDownToLine size={16} /> Download research paper</HudButton>
        </HudPanel>
        <HudPanel>
          <SectionTitle eyebrow="PROJECT INFO" title="RESEARCH CONTEXT" />
          <div className="hud-project-info-grid">
            <ReadOnlyField label="Project lead" value="Tchaas Alexander-Wright" />
            <ReadOnlyField label="Program" value="Georgia Tech CS 8903" />
            <ReadOnlyField label="Project type" value="Independent Research Project" />
            <ReadOnlyField label="GitHub" value="strategic-lifecycle-ai-framework" />
          </div>
          <SectionTitle eyebrow="Architecture items" title="MODELING DELIVERABLES" />
          <ul className="hud-plain-list hud-plain-list--columns">{architectureDeliverables.map((item) => <li key={item}>{item}</li>)}</ul>
        </HudPanel>
      </div>

    </div>
  );
}

// Sign-up/login page that authenticates against the backend and flips the shell into
// authenticated workspace mode. Session state lives in the top-level WireframeApp; this
// page only reports the resolved session + active workspace id back up via onAuthenticated.
function AuthPage({ mode, onAuthenticated }: {
  mode: 'signup' | 'login';
  onAuthenticated: (session: AuthSession, workspaces: ApiWorkspace[]) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let userEmail: string;
      let workspaces: ApiWorkspace[];
      if (mode === 'signup') {
        const res = await api.post<{ accessToken: string; refreshToken: string; user: { email: string }; workspace: { id: string; name: string } }>(
          '/auth/signup',
          { email, password, fullName, workspaceName: companyName },
        );
        setTokens(res.accessToken, res.refreshToken);
        userEmail = res.user.email;
        workspaces = [{ id: res.workspace.id, name: res.workspace.name }]; // signup returns the one new workspace
      } else {
        const res = await api.post<{ accessToken: string; refreshToken: string; user: { email: string } }>(
          '/auth/login',
          { email, password },
        );
        setTokens(res.accessToken, res.refreshToken);
        const ws = await getList<ApiWorkspace>('/workspaces'); // login response has no workspace
        userEmail = res.user.email;
        workspaces = ws.items;
      }
      onAuthenticated(
        { email: userEmail, authProvider: 'password', signedInAt: new Date().toISOString() },
        workspaces,
      );
      navigateTo('dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hud-page hud-auth-page">
      <HudPanel className="hud-auth-copy">
        <SectionTitle
          eyebrow="Account"
          title={mode === 'signup' ? 'Sign Up' : 'Log In'}
          subtitle="A successful sign-in flips the shell into authenticated workspace mode."
        />
        <RuleNote>Route guard redirects gated lifecycle routes here while signed out. Credentials are verified against the backend and the session is restored on refresh.</RuleNote>
      </HudPanel>

      <HudPanel className="hud-auth-card">
        <form onSubmit={submit} className="hud-form">
          {mode === 'signup' && <TextInput label="Company / Workspace name" value={companyName} onChange={setCompanyName} />}
          {mode === 'signup' && <TextInput label="Full name" value={fullName} onChange={setFullName} />}
          <TextInput label="Email" value={email} onChange={setEmail} type="email" />
          <TextInput label="Password" value={password} onChange={setPassword} type="password" />
          {error && <p className="hud-form-error" role="alert">{error}</p>}
          <HudButton type="submit" disabled={submitting}>{mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />} {mode === 'signup' ? 'Create account' : 'Log in'}</HudButton>
          <HudButton variant="ghost" disabled>
            <Sparkles size={16} /> Continue with Google
          </HudButton>
        </form>
      </HudPanel>
    </div>
  );
}

// Note: Authenticated workspace overview scoped to the selected tenant. It summarizes company context,
// lifecycle progress, and the 33-table data model coverage.
function DashboardPage({ tenant }: { tenant: TenantData }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Account & Setup" title="Dashboard" subtitle="Workspace overview scoped to the active tenant." />
      <LifecycleFlow />
      <div className="hud-grid hud-grid--three">
        <HudPanel>
          <Building2 className="hud-panel-icon" size={20} />
          <h2>{tenant.workspace.name}</h2>
          <p>{tenant.workspace.strategicContext}</p>
        </HudPanel>
        <HudPanel>
          <Database className="hud-panel-icon" size={20} />
          <h2>Data model coverage · 33 tables</h2>
          <p>{tenant.objectives.length} objective · {tenant.valueStreams.length} value streams · {tenant.cases.length} lean cases in this workspace.</p>
        </HudPanel>
        <HudPanel>
          <GitBranch className="hud-panel-icon" size={20} />
          <h2>{tenant.architecture ? tenant.architecture.name : 'No architecture yet'}</h2>
          <p>Business Architecture is company-level: one reusable record per workspace.</p>
        </HudPanel>
      </div>
      <HudPanel>
        <SectionTitle eyebrow="Coverage" title="Data model coverage map" />
        <DataTable headers={['Area', 'Tables surfaced']} rows={dataModelCoverage.map(([area, tables]) => [area, tables])} />
      </HudPanel>
    </div>
  );
}

// Note: Company profile and team-access page for the active workspace. It shows the tenant boundary,
// member roles, and invite status while keeping invite tokens hidden.
function CompanyPage({ tenant }: { tenant: TenantData }) {
  const members = tenant.workspaceMembers.map((member) => {
    const user = state.users.find((candidate) => candidate.id === member.userId);
    return [
      user?.email || 'Unknown user',
      user?.fullName || 'Unknown',
      <HudBadge tone={member.isAdmin ? 'green' : 'cyan'}>{member.isAdmin ? 'admin' : 'member'}</HudBadge>,
      new Date(member.joinedAt).toLocaleDateString(),
    ];
  });

  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Account & Setup" title="Company Profile" subtitle="The workspace is the tenant boundary for every lifecycle artifact." />
      <HudPanel>
        <FieldGrid rows={[
          { label: 'Name', value: tenant.workspace.name },
          { label: 'Legal name', value: tenant.workspace.legalName },
          { label: 'Business unit', value: tenant.workspace.businessUnit },
          { label: 'Description', value: tenant.workspace.description },
          { label: 'Industry', value: tenant.workspace.industry },
          { label: 'Operating model', value: tenant.workspace.operatingModel },
          { label: 'Business model', value: tenant.workspace.businessModel },
          { label: 'Primary customers', value: tenant.workspace.primaryCustomers },
          { label: 'Primary products', value: tenant.workspace.primaryProducts },
          { label: 'Strategic context', value: tenant.workspace.strategicContext },
          { label: 'Company size', value: tenant.workspace.companySize },
          { label: 'Headquarters region', value: tenant.workspace.headquartersRegion },
          { label: 'Website', value: tenant.workspace.website },
          { label: 'Logo URL', value: tenant.workspace.logoUrl },
          { label: 'Annual revenue', value: formatCurrency(tenant.workspace.annualRevenue) },
          { label: 'Workspace ID', value: tenant.workspace.id },
        ]} />
        <RuleNote>Annual revenue is static profile context only. It is not part of the forecast or actuals model.</RuleNote>
      </HudPanel>
      <HudPanel>
        <SectionTitle eyebrow="Team" title="Team & access" />
        <DataTable headers={['Email', 'Name', 'Access', 'Joined']} rows={members} />
        <DataTable
          headers={['Invited email', 'Invited by', 'Status', 'Accepted']}
          rows={tenant.workspaceInvites.map((invite) => {
            const inviter = state.users.find((user) => user.id === invite.invitedByUserId);
            return [invite.invitedEmail, inviter?.email || 'Unknown', <StatusBadge status={invite.status} />, invite.acceptedAt ? new Date(invite.acceptedAt).toLocaleDateString() : 'Not accepted'];
          })}
        />
        <RuleNote>Invite tokens exist in mock data for contract shape only and are never rendered.</RuleNote>
      </HudPanel>
    </div>
  );
}

// Note: Department hierarchy page for optional org-structure metadata. Departments support references from
// value streams and capabilities without owning or deleting lifecycle work.
function DepartmentsPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Account & Setup"
      title="Departments"
      subtitle="Optional organization structure. Value streams and capabilities can link to a department."
      rule={`Departments are setup records scoped to ${tenant.workspace.name}.`}
      rows={tenant.departments.map((department) => ({
        id: department.id,
        title: department.name,
        meta: department.parentDepartmentId ? `Parent: ${department.parentDepartmentId}` : 'Top-level department',
        badges: [],
        fields: [
          { label: 'Description', value: department.description },
          { label: 'Workspace ID', value: department.workspaceId },
        ],
      }))}
    />
  );
}

// Note: Strategic objectives page for executive intent, activation-gate fields, metrics, traceability links,
// and computed financial rollups. Mobile uses summary cards while desktop shows the full working record.
function ObjectivesPage({ tenant, ai, apiWorkspaceId }: { tenant: TenantData; ai: AiActions; apiWorkspaceId: string | null }) {
  // The objectives list is the one dataset on this page sourced from the real API.
  // Everything else (metrics, links, rollups) still reads the mock via `tenant`.
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // "New objective" form — all 18 populatable fields, in model/display order.
  const emptyCreateForm = {
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
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // AI interview → pre-populate the create form. The modal fires the AI call; applyGenerated
  // maps its returned fields onto this form for human review. aiFilled drives the banner.
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // Enum fields whose generated value must be one of the allowed options, else dropped.
  const enumOptions: Partial<Record<keyof typeof emptyCreateForm, { value: string; label: string }[]>> = {
    strategicValueCategory: strategicValueCategoryOptions,
    problemType: problemTypeOptions,
    expectedValueType: expectedValueTypeOptions,
  };

  const applyGenerated = (fields: Record<string, unknown>) => {
    const next = { ...emptyCreateForm };
    (Object.keys(emptyCreateForm) as (keyof typeof emptyCreateForm)[]).forEach((key) => {
      const raw = fields[key];
      if (raw == null) return; // null-safe: skip null/undefined
      const value = String(raw);
      const opts = enumOptions[key];
      if (opts && !opts.some((option) => option.value === value)) return; // drop invalid enum
      next[key] = value;
    });
    setCreateForm(next);
    setAiFilled(true);
    setShowCreate(true);
    setShowAiModal(false);
    setCreateError(null);
  };

  // Inline edit (desktop) — one objective at a time. cardError is scoped to a single card id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ strategicInitiativeName: '', executiveObjective: '', problemOpportunityStatement: '', valueHypothesis: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) {
      // No workspace resolved (shouldn't happen behind auth) — treat as empty, not a spinner.
      setObjectives([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      setObjectives(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId]);

  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId) return;
    setCreateError(null);
    setCreating(true);
    try {
      // Send only the fields the user actually filled in.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<StrategicObjective>;
      await createObjective(apiWorkspaceId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      setAiFilled(false);
      await loadObjectives();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create objective.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (objective: StrategicObjective) => {
    setCardError(null);
    setEditingId(objective.id);
    setEditDraft({
      strategicInitiativeName: objective.strategicInitiativeName ?? '',
      executiveObjective: objective.executiveObjective ?? '',
      problemOpportunityStatement: objective.problemOpportunityStatement ?? '',
      valueHypothesis: objective.valueHypothesis ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.strategicInitiativeName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Strategic initiative name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      await updateObjective(apiWorkspaceId, id, editDraft);
      setEditingId(null);
      await loadObjectives();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save objective.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const archiveObjective = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await updateObjective(apiWorkspaceId, id, { status: 'archived' });
      await loadObjectives();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to archive objective.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="hud-page">
        <SectionTitle eyebrow="Phase 1 · Strategy" title="Strategic Objectives" subtitle="Executive intent and strategic value. Forecast only; actuals roll up from implementation." />
        <HudPanel><p>Loading strategic objectives…</p></HudPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hud-page">
        <SectionTitle eyebrow="Phase 1 · Strategy" title="Strategic Objectives" subtitle="Executive intent and strategic value. Forecast only; actuals roll up from implementation." />
        <HudPanel><p>Could not load strategic objectives: {error.message}</p></HudPanel>
      </div>
    );
  }

  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 1 · Strategy" title="Strategic Objectives" subtitle="Executive intent and strategic value. Forecast only; actuals roll up from implementation." />
      <RuleNote>Cardinality: objectives {objectives.filter((objective) => objective.status !== 'archived').length} / {cardinalityLimits.strategicObjectivesPerWorkspace}. Active requires name, executive objective, value category, problem/opportunity statement, and value hypothesis.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); setAiFilled(false); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New objective'}
        </HudButton>
        <HudButton variant="ghost" onClick={() => setShowAiModal(true)} disabled={!apiWorkspaceId}>
          <Sparkles size={16} /> Draft with AI
        </HudButton>
      </div>
      {showAiModal && apiWorkspaceId && (
        <AiInterviewModal
          workspaceId={apiWorkspaceId}
          resourceType="strategic_objective"
          onGenerated={applyGenerated}
          onClose={() => setShowAiModal(false)}
        />
      )}
      {showCreate && (
        <HudPanel>
          {aiFilled && (
            <div className="hud-ai-banner">
              <Sparkles size={17} />
              <span>AI filled these fields — edit any of them, then Create. Nothing is saved yet.</span>
            </div>
          )}
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Strategic initiative name (required)" value={createForm.strategicInitiativeName} onChange={(value) => setCreateField('strategicInitiativeName', value)} />
            <TextAreaInput label="Executive objective" value={createForm.executiveObjective} onChange={(value) => setCreateField('executiveObjective', value)} />
            <SelectInput label="Strategic value category" value={createForm.strategicValueCategory} onChange={(value) => setCreateField('strategicValueCategory', value)} options={strategicValueCategoryOptions} />
            <TextAreaInput label="Expected business outcome" value={createForm.expectedBusinessOutcome} onChange={(value) => setCreateField('expectedBusinessOutcome', value)} />
            <TextInput label="Financial impact" value={createForm.financialImpact} onChange={(value) => setCreateField('financialImpact', value)} />
            <TextAreaInput label="Urgency rationale" value={createForm.urgencyRationale} onChange={(value) => setCreateField('urgencyRationale', value)} />
            <TextInput label="Target implementation year" value={createForm.targetImplementationYear} onChange={(value) => setCreateField('targetImplementationYear', value)} />
            <TextInput label="Target implementation start date" type="date" value={createForm.targetImplementationStartDate} onChange={(value) => setCreateField('targetImplementationStartDate', value)} />
            <TextInput label="Target implementation end date" type="date" value={createForm.targetImplementationEndDate} onChange={(value) => setCreateField('targetImplementationEndDate', value)} />
            <TextAreaInput label="Problem / opportunity statement" value={createForm.problemOpportunityStatement} onChange={(value) => setCreateField('problemOpportunityStatement', value)} />
            <TextAreaInput label="Cost of inaction" value={createForm.costOfInaction} onChange={(value) => setCreateField('costOfInaction', value)} />
            <TextAreaInput label="Current limitation" value={createForm.currentLimitation} onChange={(value) => setCreateField('currentLimitation', value)} />
            <TextAreaInput label="Impacted teams" value={createForm.impactedTeams} onChange={(value) => setCreateField('impactedTeams', value)} />
            <SelectInput label="Problem type" value={createForm.problemType} onChange={(value) => setCreateField('problemType', value)} options={problemTypeOptions} />
            <TextAreaInput label="Value hypothesis" value={createForm.valueHypothesis} onChange={(value) => setCreateField('valueHypothesis', value)} />
            <TextAreaInput label="Value measurement approach" value={createForm.valueMeasurementApproach} onChange={(value) => setCreateField('valueMeasurementApproach', value)} />
            <SelectInput label="Expected value type" value={createForm.expectedValueType} onChange={(value) => setCreateField('expectedValueType', value)} options={expectedValueTypeOptions} />
            <TextInput label="Value realization timeframe" value={createForm.valueRealizationTimeframe} onChange={(value) => setCreateField('valueRealizationTimeframe', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'active objectives', 'Archive one to create another.')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.strategicInitiativeName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create objective'}</HudButton>
          </form>
        </HudPanel>
      )}

      {objectives.length === 0 && (
        <HudPanel><p>No strategic objectives yet. Create your first objective to begin defining executive intent for this workspace.</p></HudPanel>
      )}

      <div className="hud-primary-list-mobile">
        {objectives.map((objective) => {
          const pending = ai.pending.objectives[objective.id];
          const saved = ai.saved.objectives[objective.id];
          const displayObjective = { ...objective, ...saved, ...pending };
          const rollup = calculateObjectiveFinancialRollup(objective.id, tenant.cases, tenant.implementations, tenant.implementationValueStreams);

          return (
            <MobileRecordCard
              key={objective.id}
              title={displayObjective.strategicInitiativeName?.trim() || '(unnamed objective)'}
              summary={displayObjective.executiveObjective}
              badge={<StatusBadge status={displayObjective.status} />}
              rows={[
                { label: 'Category', value: displayObjective.strategicValueCategory },
                { label: 'Target dates', value: formatTargetDates(displayObjective.targetImplementationStartDate, displayObjective.targetImplementationEndDate) },
                { label: 'Forecast cost', value: formatCurrency(rollup.forecastCost) },
                { label: 'Computed actual value', value: formatCurrency(rollup.actualValue) },
              ]}
              action={<HudButton variant="ghost" onClick={() => ai.draftObjective(tenant.workspace.name, objective)}><Sparkles size={16} /> Draft with AI</HudButton>}
            />
          );
        })}
      </div>
      <div className="hud-primary-list-desktop">
      {objectives.map((objective) => {
        const pending = ai.pending.objectives[objective.id];
        const saved = ai.saved.objectives[objective.id];
        const displayObjective = { ...objective, ...saved, ...pending };
        const rollup = calculateObjectiveFinancialRollup(objective.id, tenant.cases, tenant.implementations, tenant.implementationValueStreams);
        const missing = getMissingObjectiveActiveFields(displayObjective);
        const objectiveMetrics = tenant.metrics.filter((metric) => metric.strategicObjectiveId === objective.id);
        const linkedValueStreams = state.strategicObjectiveValueStreams
          .filter((link) => link.strategicObjectiveId === objective.id)
          .map((link) => tenant.valueStreams.find((stream) => stream.id === link.valueStreamId))
          .filter(Boolean) as ValueStream[];
        const linkedCapabilities = state.strategicObjectiveCapabilities
          .filter((link) => link.strategicObjectiveId === objective.id)
          .map((link) => tenant.capabilities.find((capability) => capability.id === link.capabilityId))
          .filter(Boolean) as BusinessCapability[];

        return (
          <HudPanel key={objective.id}>
            <div className="hud-record-head">
              <div><h2>{displayObjective.strategicInitiativeName?.trim() || '(unnamed objective)'}</h2><p>{displayObjective.executiveObjective}</p></div>
              <div className="hud-badge-stack">
                <HudButton variant="ghost" onClick={() => ai.draftObjective(tenant.workspace.name, objective)}><Sparkles size={16} /> Draft with AI</HudButton>
                {editingId !== objective.id && <HudButton variant="ghost" onClick={() => startEdit(objective)}>Edit</HudButton>}
                {objective.status !== 'archived' && <HudButton variant="ghost" disabled={savingId === objective.id} onClick={() => archiveObjective(objective.id)}>Archive</HudButton>}
                <StatusBadge status={displayObjective.status} />
              </div>
            </div>
            {editingId === objective.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Strategic initiative name" value={editDraft.strategicInitiativeName} onChange={(value) => setEditDraft((prev) => ({ ...prev, strategicInitiativeName: value }))} />
                  <TextInput label="Executive objective" value={editDraft.executiveObjective} onChange={(value) => setEditDraft((prev) => ({ ...prev, executiveObjective: value }))} />
                  <TextInput label="Problem / opportunity" value={editDraft.problemOpportunityStatement} onChange={(value) => setEditDraft((prev) => ({ ...prev, problemOpportunityStatement: value }))} />
                  <TextInput label="Value hypothesis" value={editDraft.valueHypothesis} onChange={(value) => setEditDraft((prev) => ({ ...prev, valueHypothesis: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === objective.id} onClick={() => saveEdit(objective.id)}>{savingId === objective.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === objective.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'active objectives', 'Archive one to create another.')}</p>}
            {pending && (
              <div className="hud-ai-edit-panel">
                <AiBanner />
                <div className="hud-ai-edit-grid">
                  <AiTextArea label="Executive objective" value={String(displayObjective.executiveObjective || '')} onChange={(value) => ai.updateObjective(objective.id, 'executiveObjective', value)} onRefine={() => ai.refineObjective(objective.id, 'executiveObjective', String(displayObjective.executiveObjective || ''))} />
                  <AiTextArea label="Expected outcome" value={String(displayObjective.expectedBusinessOutcome || '')} onChange={(value) => ai.updateObjective(objective.id, 'expectedBusinessOutcome', value)} onRefine={() => ai.refineObjective(objective.id, 'expectedBusinessOutcome', String(displayObjective.expectedBusinessOutcome || ''))} />
                  <AiTextArea label="Problem / opportunity" value={String(displayObjective.problemOpportunityStatement || '')} onChange={(value) => ai.updateObjective(objective.id, 'problemOpportunityStatement', value)} onRefine={() => ai.refineObjective(objective.id, 'problemOpportunityStatement', String(displayObjective.problemOpportunityStatement || ''))} />
                  <AiTextArea label="Value hypothesis" value={String(displayObjective.valueHypothesis || '')} onChange={(value) => ai.updateObjective(objective.id, 'valueHypothesis', value)} onRefine={() => ai.refineObjective(objective.id, 'valueHypothesis', String(displayObjective.valueHypothesis || ''))} />
                  <AiTextArea label="Measurement approach" value={String(displayObjective.valueMeasurementApproach || '')} onChange={(value) => ai.updateObjective(objective.id, 'valueMeasurementApproach', value)} onRefine={() => ai.refineObjective(objective.id, 'valueMeasurementApproach', String(displayObjective.valueMeasurementApproach || ''))} />
                  <AiTextArea label="Urgency rationale" value={String(displayObjective.urgencyRationale || '')} onChange={(value) => ai.updateObjective(objective.id, 'urgencyRationale', value)} onRefine={() => ai.refineObjective(objective.id, 'urgencyRationale', String(displayObjective.urgencyRationale || ''))} />
                </div>
                <div className="hud-actions">
                  <HudButton onClick={() => ai.saveObjective(objective.id)}>Save</HudButton>
                  <HudButton variant="ghost" onClick={() => ai.discardObjective(objective.id)}>Clear / discard</HudButton>
                </div>
              </div>
            )}
            <FieldGrid rows={[
              { label: 'Strategic value category', value: displayObjective.strategicValueCategory },
              { label: 'Expected outcome', value: displayObjective.expectedBusinessOutcome },
              { label: 'Financial impact', value: displayObjective.financialImpact },
              { label: 'Urgency rationale', value: displayObjective.urgencyRationale },
              { label: 'Target year', value: displayObjective.targetImplementationYear },
              { label: 'Target dates', value: formatTargetDates(displayObjective.targetImplementationStartDate, displayObjective.targetImplementationEndDate) },
              { label: 'Problem / opportunity', value: displayObjective.problemOpportunityStatement },
              { label: 'Cost of inaction', value: displayObjective.costOfInaction },
              { label: 'Current limitation', value: displayObjective.currentLimitation },
              { label: 'Impacted teams', value: displayObjective.impactedTeams },
              { label: 'Problem type', value: displayObjective.problemType },
              { label: 'Value hypothesis', value: displayObjective.valueHypothesis },
              { label: 'Measurement approach', value: displayObjective.valueMeasurementApproach },
              { label: 'Expected value type', value: displayObjective.expectedValueType },
              { label: 'Realization timeframe', value: displayObjective.valueRealizationTimeframe },
            ]} />
            <p>Metrics, links and financials not yet connected to the API.</p>
            <DataTable headers={['Metric', 'Category', 'Baseline', 'Target', 'Unit', 'Timeframe']} rows={objectiveMetrics.map((metric) => [metric.name, metric.metricCategory, metric.baselineValue, metric.targetValue, metric.unit, metric.timeframe])} />
            <ReferenceOrCreate label="Selected value streams" items={linkedValueStreams.map((stream) => ({ id: stream.id, name: stream.name, origin: stream.origin }))} />
            <ReferenceOrCreate label="Selected capabilities" items={linkedCapabilities.map((capability) => ({ id: capability.id, name: capability.capabilityName, origin: capability.origin }))} />
            <div className="hud-grid hud-grid--four">
              <ReadOnlyField label="Forecast cost" value={formatCurrency(rollup.forecastCost)} />
              <ReadOnlyField label="Forecast value" value={formatCurrency(rollup.forecastValue)} />
              <ReadOnlyField label="Computed actual cost" value={formatCurrency(rollup.actualCost)} />
              <ReadOnlyField label="Computed actual value" value={formatCurrency(rollup.actualValue)} />
            </div>
            {missing.length > 0 && <RuleNote>Cannot mark active. Missing: {missing.join(', ')}.</RuleNote>}
            <RuleNote>Objective actuals are computed read-only from implementation value-stream allocations. They are never editable here.</RuleNote>
          </HudPanel>
        );
      })}
      </div>
    </div>
  );
}

// Note: Business architecture singleton page for the workspace-level architecture record. It anchors reusable
// value streams, activities, capabilities, and supporting architecture content. Wired to the real API
// (singleton, not a list): the record is fetched at app level and passed in; this page creates/edits it.
const emptyArchitectureForm = { name: '', description: '', currentStateSummary: '', futureStateSummary: '' };

function ArchitecturePage({ tenant, apiWorkspaceId, architecture, architectureId, refetchArchitecture, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architecture: BusinessArchitecture | null;
  architectureId: string | null;
  refetchArchitecture: () => Promise<void>;
  architectureLoading: boolean;
}) {
  // Create-form state (shown only when no record exists yet).
  const [createForm, setCreateForm] = useState(emptyArchitectureForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // Inline-edit state (singleton, so no id needed to scope it).
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(emptyArchitectureForm);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<ApiError | null>(null);

  // Real value-stream / capability counts, fetched from the (now wired) list endpoints.
  const [valueStreamCount, setValueStreamCount] = useState<number | null>(null);
  const [capabilityCount, setCapabilityCount] = useState<number | null>(null);

  const loadCounts = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) { setValueStreamCount(null); setCapabilityCount(null); return; }
    try {
      const [vs, caps] = await Promise.all([
        listValueStreams(apiWorkspaceId, architectureId),
        listCapabilities(apiWorkspaceId, architectureId),
      ]);
      setValueStreamCount(vs.total);
      setCapabilityCount(caps.total);
    } catch {
      // Secondary summary numbers — fall back to em dash rather than blocking the page.
      setValueStreamCount(null);
      setCapabilityCount(null);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const setCreateField = (field: keyof typeof emptyArchitectureForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  const setEditField = (field: keyof typeof emptyArchitectureForm, value: string) =>
    setEditDraft((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId) return;
    setCreateError(null);
    setCreating(true);
    try {
      // Send only the fields the user actually filled in.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<BusinessArchitecture>;
      await createArchitecture(apiWorkspaceId, body);
      setCreateForm(emptyArchitectureForm);
      await refetchArchitecture();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create business architecture.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (record: BusinessArchitecture) => {
    setEditError(null);
    setEditDraft({
      name: record.name ?? '',
      description: record.description ?? '',
      currentStateSummary: record.currentStateSummary ?? '',
      futureStateSummary: record.futureStateSummary ?? '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!apiWorkspaceId || !architectureId) return;
    setEditError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless record. Guard before the PATCH.
    if (!editDraft.name.trim()) {
      setEditError(new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }));
      return;
    }
    setSaving(true);
    try {
      await updateArchitecture(apiWorkspaceId, architectureId, editDraft);
      setEditing(false);
      await refetchArchitecture();
    } catch (err) {
      setEditError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save business architecture.', status: 0 }));
    } finally {
      setSaving(false);
    }
  };

  // State 0 — loading. Guard first so the create form never flashes before the fetch resolves.
  if (architectureLoading || !apiWorkspaceId) {
    return (
      <div className="hud-page">
        <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Architecture" subtitle="The company's architecture: one record, reused across every objective and case." />
        <HudPanel><p>Loading business architecture…</p></HudPanel>
      </div>
    );
  }

  // State 1 — loaded, no record yet. Offer a create form.
  if (!architecture) {
    return (
      <div className="hud-page">
        <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Architecture" subtitle="The company's architecture: one record, reused across every objective and case." />
        <RuleNote>One Business Architecture per workspace. Once it exists, the action is Open, not Create.</RuleNote>
        <HudPanel><p>No business architecture yet for this workspace.</p></HudPanel>
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Name (required)" value={createForm.name} onChange={(value) => setCreateField('name', value)} />
            <TextInput label="Description" value={createForm.description} onChange={(value) => setCreateField('description', value)} />
            <TextInput label="Current state summary" value={createForm.currentStateSummary} onChange={(value) => setCreateField('currentStateSummary', value)} />
            <TextInput label="Future state summary" value={createForm.futureStateSummary} onChange={(value) => setCreateField('futureStateSummary', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError)}</p>}
            <HudButton type="submit" disabled={creating || !createForm.name.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create business architecture'}</HudButton>
          </form>
        </HudPanel>
      </div>
    );
  }

  // State 2 — loaded record. View + inline edit of its text fields. Fields may be null from the
  // API even though the type marks them non-null, so every access below is null-guarded.
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Architecture" subtitle="The company's architecture: one record, reused across every objective and case." />
      <RuleNote>One Business Architecture per workspace. Once it exists, the action is Open, not Create.</RuleNote>
      <HudPanel>
        <div className="hud-record-head">
          <div><h2>{architecture.name?.trim() || '(unnamed architecture)'}</h2><p>{architecture.description ?? ''}</p></div>
          <div className="hud-badge-stack">
            <OriginBadge origin={architecture.origin ?? 'architecture'} />
            <StatusBadge status={architecture.status ?? 'draft'} />
            {!editing && <HudButton variant="ghost" onClick={() => startEdit(architecture)}>Edit</HudButton>}
          </div>
        </div>
        {editing && (
          <div className="hud-ai-edit-panel">
            <div className="hud-ai-edit-grid">
              <TextInput label="Name" value={editDraft.name} onChange={(value) => setEditField('name', value)} />
              <TextInput label="Description" value={editDraft.description} onChange={(value) => setEditField('description', value)} />
              <TextInput label="Current state summary" value={editDraft.currentStateSummary} onChange={(value) => setEditField('currentStateSummary', value)} />
              <TextInput label="Future state summary" value={editDraft.futureStateSummary} onChange={(value) => setEditField('futureStateSummary', value)} />
            </div>
            <div className="hud-actions">
              <HudButton disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</HudButton>
              <HudButton variant="ghost" onClick={() => { setEditing(false); setEditError(null); }}>Cancel</HudButton>
            </div>
          </div>
        )}
        {editError && <p className="hud-form-error" role="alert">{renderApiMessage(editError)}</p>}
        <FieldGrid rows={[
          { label: 'Current state summary', value: architecture.currentStateSummary ?? '' },
          { label: 'Future state summary', value: architecture.futureStateSummary ?? '' },
          { label: 'Value streams', value: `${valueStreamCount ?? '—'} / ${cardinalityLimits.valueStreamsPerBusinessArchitecture}` },
          { label: 'Capabilities', value: capabilityCount ?? '—' },
        ]} />
      </HudPanel>
    </div>
  );
}

type ListRecord = {
  id: string;
  title: string;
  meta: string;
  badges: ReactNode[];
  fields: { label: string; value: ReactNode }[];
  references?: ReactNode;
};

// Note: Shared list-page renderer used by several lifecycle resources with the same HUD record layout. It keeps
// badges, field grids, reference blocks, and rule notes consistent across pages.
function ListPage({ eyebrow, title, subtitle, rule, rows }: { eyebrow: string; title: string; subtitle: string; rule: string; rows: ListRecord[] }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <RuleNote>{rule}</RuleNote>
      <div className="hud-list-layout">
        <HudPanel>
          <div className="hud-list">
            {rows.map((row) => (
              <div className="hud-list-row" key={row.id}>
                <div><strong>{row.title}</strong><span>{row.meta}</span></div>
                <div className="hud-badge-stack">{row.badges}</div>
              </div>
            ))}
          </div>
        </HudPanel>
        {rows.map((row) => (
          <HudPanel key={`${row.id}-detail`}>
            <div className="hud-record-head">
              <div><h2>{row.title}</h2><p>{row.meta}</p></div>
              <div className="hud-badge-stack">{row.badges}</div>
            </div>
            <FieldGrid rows={row.fields} />
            {row.references}
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Value streams page. The value-streams list is sourced from the real API; value streams nest
// under the Business Architecture singleton, so the page needs a "no architecture yet" state that
// objectives don't. Everything else (linked departments/capabilities) still reads the mock via `tenant`.
function ValueStreamsPage({ tenant, apiWorkspaceId, architectureId, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  const [items, setItems] = useState<ValueStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // "New value stream" form.
  const emptyCreateForm = {
    name: '',
    description: '',
    valueStreamType: '',
    strategicAlignment: '',
    triggeringStakeholder: '',
    valueRecipient: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // Inline edit (desktop) — one stream at a time. cardError is scoped to a single card id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', description: '', strategicAlignment: '', valueRecipient: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadValueStreams = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      // No architecture resolved yet — the render guards below handle messaging; don't spin or call the API.
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listValueStreams(apiWorkspaceId, architectureId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load value streams.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadValueStreams(); }, [loadValueStreams]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !architectureId) return;
    setCreateError(null);
    setCreating(true);
    try {
      // Send only the fields the user actually filled in.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<ValueStream>;
      await createValueStream(apiWorkspaceId, architectureId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadValueStreams();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create value stream.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (stream: ValueStream) => {
    setCardError(null);
    setEditingId(stream.id);
    setEditDraft({
      name: stream.name ?? '',
      description: stream.description ?? '',
      strategicAlignment: stream.strategicAlignment ?? '',
      valueRecipient: stream.valueRecipient ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.name.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      await updateValueStream(apiWorkspaceId, id, editDraft);
      setEditingId(null);
      await loadValueStreams();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save value stream.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeValueStream = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteValueStream(apiWorkspaceId, id);
      await loadValueStreams();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete value stream.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Value Streams" subtitle="How value flows through the business. Lives under the company architecture." />
  );

  // State 0 — architecture still loading. Guard first so nothing flashes before the fetch resolves.
  if (architectureLoading || !apiWorkspaceId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Loading…</p></HudPanel>
      </div>
    );
  }

  // State 1 — no architecture yet. Value streams nest under it, so there is nothing to list or create.
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — value streams belong to it.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }

  // State 2 — value streams loading.
  if (loading) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Loading value streams…</p></HudPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Could not load value streams: {error.message}</p></HudPanel>
      </div>
    );
  }

  // State 3 — loaded. Real records return null for unfilled fields, so every access below is null-guarded.
  return (
    <div className="hud-page">
      {header}
      <RuleNote>Cardinality: value streams {items.length} / {cardinalityLimits.valueStreamsPerBusinessArchitecture}. Capabilities link here; origin never restricts reuse.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New value stream'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Name (required)" value={createForm.name} onChange={(value) => setCreateField('name', value)} />
            <TextInput label="Description" value={createForm.description} onChange={(value) => setCreateField('description', value)} />
            <SelectInput label="Value stream type" value={createForm.valueStreamType} onChange={(value) => setCreateField('valueStreamType', value)} options={valueStreamTypeOptions} />
            <TextInput label="Strategic alignment" value={createForm.strategicAlignment} onChange={(value) => setCreateField('strategicAlignment', value)} />
            <TextInput label="Triggering stakeholder" value={createForm.triggeringStakeholder} onChange={(value) => setCreateField('triggeringStakeholder', value)} />
            <TextInput label="Value recipient" value={createForm.valueRecipient} onChange={(value) => setCreateField('valueRecipient', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'value streams', 'Delete one to create another.')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.name.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create value stream'}</HudButton>
          </form>
        </HudPanel>
      )}

      {items.length === 0 && (
        <HudPanel><p>No value streams yet. Create your first value stream to map how value flows through this architecture.</p></HudPanel>
      )}

      <div className="hud-primary-list-desktop">
        {items.map((stream) => (
          <HudPanel key={stream.id}>
            <div className="hud-record-head">
              <div><h2>{stream.name?.trim() || '(unnamed value stream)'}</h2><p>{stream.description ?? ''}</p></div>
              <div className="hud-badge-stack">
                {editingId !== stream.id && <HudButton variant="ghost" onClick={() => startEdit(stream)}>Edit</HudButton>}
                <HudButton variant="ghost" disabled={savingId === stream.id} onClick={() => removeValueStream(stream.id)}>Delete</HudButton>
                <OriginBadge origin={stream.origin ?? 'architecture'} />
                <StatusBadge status={stream.status ?? 'draft'} />
              </div>
            </div>
            {editingId === stream.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Name" value={editDraft.name} onChange={(value) => setEditDraft((prev) => ({ ...prev, name: value }))} />
                  <TextInput label="Description" value={editDraft.description} onChange={(value) => setEditDraft((prev) => ({ ...prev, description: value }))} />
                  <TextInput label="Strategic alignment" value={editDraft.strategicAlignment} onChange={(value) => setEditDraft((prev) => ({ ...prev, strategicAlignment: value }))} />
                  <TextInput label="Value recipient" value={editDraft.valueRecipient} onChange={(value) => setEditDraft((prev) => ({ ...prev, valueRecipient: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === stream.id} onClick={() => saveEdit(stream.id)}>{savingId === stream.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === stream.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'value streams', 'Delete one to create another.')}</p>}
            <FieldGrid rows={[
              { label: 'Type', value: stream.valueStreamType },
              { label: 'Strategic alignment', value: stream.strategicAlignment },
              { label: 'Triggering stakeholder', value: stream.triggeringStakeholder },
              { label: 'Value recipient', value: stream.valueRecipient },
              { label: 'Linked department', value: tenant.departments.find((department) => department.id === stream.linkedDepartmentId)?.name },
            ]} />
            <RuleNote>Linked capabilities and departments are not yet connected to the API.</RuleNote>
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Key activities page for ordered stages inside value streams. It shows sequence, current/future changes,
// business impact text, and capability traceability.
// Note: Key activities are the ordered stages of a value stream. Unlike capabilities and value
// streams (which nest under the architecture singleton), activities nest under a value stream, so
// this page first loads the workspace's value streams and renders a picker; selecting a stream
// loads that stream's activities. The 6-limit is enforced per value stream, not globally.
function KeyActivitiesPage({ apiWorkspaceId, architectureId, architectureLoading }: {
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  // Value stream picker — activities belong to a stream, so we need a selected stream before we can list them.
  const [valueStreams, setValueStreams] = useState<ValueStream[]>([]);
  const [vsLoading, setVsLoading] = useState(true);
  const [vsError, setVsError] = useState<ApiError | null>(null);
  const [selectedVsId, setSelectedVsId] = useState<string>('');

  const [items, setItems] = useState<KeyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // "New key activity" form. All fields are held as strings; sequenceOrder is coerced to a number on submit.
  const emptyCreateForm = {
    activityName: '',
    activityDescription: '',
    sequenceOrder: '',
    currentStateIssue: '',
    futureStateChange: '',
    businessImpact: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // Inline edit (desktop) — one activity at a time. cardError is scoped to a single card id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ activityName: '', activityDescription: '', sequenceOrder: '', currentStateIssue: '', futureStateChange: '', businessImpact: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  // Load the workspace's value streams, then auto-select the first so the loaded state shows picker + list.
  const loadValueStreams = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      // No architecture resolved yet — render guards below handle messaging; don't spin or call the API.
      setValueStreams([]);
      setSelectedVsId('');
      setVsLoading(false);
      return;
    }
    setVsLoading(true);
    setVsError(null);
    try {
      const result = await listValueStreams(apiWorkspaceId, architectureId);
      setValueStreams(result.items);
      setSelectedVsId(result.items[0]?.id ?? '');
    } catch (err) {
      setValueStreams([]);
      setSelectedVsId('');
      setVsError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load value streams.', status: 0 }));
    } finally {
      setVsLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadValueStreams(); }, [loadValueStreams]);

  const loadKeyActivities = useCallback(async () => {
    if (!apiWorkspaceId || !selectedVsId) {
      // No stream selected (or none exist) — nothing to list; the render guards handle messaging.
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listKeyActivities(apiWorkspaceId, selectedVsId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load key activities.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, selectedVsId]);

  useEffect(() => { loadKeyActivities(); }, [loadKeyActivities]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedVsId) return;
    setCreateError(null);
    setCreating(true);
    try {
      // Send only the fields the user actually filled in; sequenceOrder is numeric, so coerce it separately.
      const { sequenceOrder, ...strings } = createForm;
      const body = Object.fromEntries(Object.entries(strings).filter(([, value]) => value !== '')) as Partial<KeyActivity>;
      if (sequenceOrder.trim() !== '' && !Number.isNaN(Number(sequenceOrder))) {
        body.sequenceOrder = Number(sequenceOrder);
      }
      await createKeyActivity(apiWorkspaceId, selectedVsId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadKeyActivities();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create key activity.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (activity: KeyActivity) => {
    setCardError(null);
    setEditingId(activity.id);
    setEditDraft({
      activityName: activity.activityName ?? '',
      activityDescription: activity.activityDescription ?? '',
      sequenceOrder: activity.sequenceOrder != null ? String(activity.sequenceOrder) : '',
      currentStateIssue: activity.currentStateIssue ?? '',
      futureStateChange: activity.futureStateChange ?? '',
      businessImpact: activity.businessImpact ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.activityName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      const { sequenceOrder, ...strings } = editDraft;
      const patch: Partial<KeyActivity> = {
        ...strings,
        // Empty clears the sequence (null); otherwise send the number, guarding NaN → null.
        sequenceOrder: sequenceOrder.trim() === '' || Number.isNaN(Number(sequenceOrder)) ? null : Number(sequenceOrder),
      };
      await updateKeyActivity(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadKeyActivities();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save key activity.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeKeyActivity = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteKeyActivity(apiWorkspaceId, id);
      await loadKeyActivities();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete key activity.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Key Activities" subtitle="The ordered stages of a value stream where value is created, delayed, or transferred." />
  );

  // State 0 — architecture or value streams still loading. Guard first so nothing flashes before the fetch resolves.
  if (architectureLoading || vsLoading || !apiWorkspaceId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Loading…</p></HudPanel>
      </div>
    );
  }

  // State 1 — no architecture yet. Value streams (and their activities) nest under it.
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — key activities belong to one.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }

  if (vsError) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Could not load value streams: {vsError.message}</p></HudPanel>
      </div>
    );
  }

  // State 2 — architecture exists but no value streams. Activities have nowhere to live, so no picker/form/API call.
  if (valueStreams.length === 0) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a value stream first — key activities belong to one.</p></HudPanel>
        <RuleNote>Head to the Value Streams page to create one, then return here.</RuleNote>
      </div>
    );
  }

  // Loaded shell — picker + create form stay mounted so switching streams doesn't unmount the dropdown.
  // The list region below swaps on the activity-fetch state (error / loading / empty / records).
  return (
    <div className="hud-page">
      {header}
      <RuleNote>Cardinality: key activities {items.length} / {cardinalityLimits.keyActivitiesPerValueStream} in this value stream. Sequence is ordering only.</RuleNote>

      <HudPanel>
        <SelectInput
          label="Value stream"
          value={selectedVsId}
          onChange={setSelectedVsId}
          options={valueStreams.map((stream) => ({ value: stream.id, label: stream.name ?? '(unnamed value stream)' }))}
        />
      </HudPanel>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New key activity'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Name (required)" value={createForm.activityName} onChange={(value) => setCreateField('activityName', value)} />
            <TextInput label="Description" value={createForm.activityDescription} onChange={(value) => setCreateField('activityDescription', value)} />
            <TextInput label="Sequence order" type="number" value={createForm.sequenceOrder} onChange={(value) => setCreateField('sequenceOrder', value)} />
            <TextInput label="Current state issue" value={createForm.currentStateIssue} onChange={(value) => setCreateField('currentStateIssue', value)} />
            <TextInput label="Future state change" value={createForm.futureStateChange} onChange={(value) => setCreateField('futureStateChange', value)} />
            <TextInput label="Business impact" value={createForm.businessImpact} onChange={(value) => setCreateField('businessImpact', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'key activities in this value stream', 'Delete one to create another.')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.activityName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create key activity'}</HudButton>
          </form>
        </HudPanel>
      )}

      {error ? (
        <HudPanel><p>Could not load key activities: {error.message}</p></HudPanel>
      ) : loading ? (
        <HudPanel><p>Loading key activities…</p></HudPanel>
      ) : items.length === 0 ? (
        <HudPanel><p>No key activities in this value stream yet. Create your first to map its stages.</p></HudPanel>
      ) : (
        <div className="hud-primary-list-desktop">
          {items.map((activity) => (
            <HudPanel key={activity.id}>
              <div className="hud-record-head">
                <div><h2>{activity.activityName?.trim() || '(unnamed activity)'}</h2><p>{activity.activityDescription ?? ''}</p></div>
                <div className="hud-badge-stack">
                  {editingId !== activity.id && <HudButton variant="ghost" onClick={() => startEdit(activity)}>Edit</HudButton>}
                  <HudButton variant="ghost" disabled={savingId === activity.id} onClick={() => removeKeyActivity(activity.id)}>Delete</HudButton>
                  <OriginBadge origin={activity.origin ?? 'architecture'} />
                  <StatusBadge status={activity.status ?? 'draft'} />
                </div>
              </div>
              {editingId === activity.id && (
                <div className="hud-ai-edit-panel">
                  <div className="hud-ai-edit-grid">
                    <TextInput label="Name" value={editDraft.activityName} onChange={(value) => setEditDraft((prev) => ({ ...prev, activityName: value }))} />
                    <TextInput label="Description" value={editDraft.activityDescription} onChange={(value) => setEditDraft((prev) => ({ ...prev, activityDescription: value }))} />
                    <TextInput label="Sequence order" type="number" value={editDraft.sequenceOrder} onChange={(value) => setEditDraft((prev) => ({ ...prev, sequenceOrder: value }))} />
                    <TextInput label="Current state issue" value={editDraft.currentStateIssue} onChange={(value) => setEditDraft((prev) => ({ ...prev, currentStateIssue: value }))} />
                    <TextInput label="Future state change" value={editDraft.futureStateChange} onChange={(value) => setEditDraft((prev) => ({ ...prev, futureStateChange: value }))} />
                    <TextInput label="Business impact" value={editDraft.businessImpact} onChange={(value) => setEditDraft((prev) => ({ ...prev, businessImpact: value }))} />
                  </div>
                  <div className="hud-actions">
                    <HudButton disabled={savingId === activity.id} onClick={() => saveEdit(activity.id)}>{savingId === activity.id ? 'Saving…' : 'Save'}</HudButton>
                    <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                  </div>
                </div>
              )}
              {cardError?.id === activity.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'key activities in this value stream', 'Delete one to create another.')}</p>}
              <FieldGrid rows={[
                { label: 'Sequence', value: activity.sequenceOrder ?? '—' },
                { label: 'Current issue', value: activity.currentStateIssue },
                { label: 'Future change', value: activity.futureStateChange },
                { label: 'Business impact', value: activity.businessImpact },
              ]} />
            </HudPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// Note: Capabilities page for stable business building blocks and maturity gaps. Capabilities are reusable
// across streams, activities, objectives, cases, and solution features. Wired to the real API like value
// streams; linked departments still read the mock via `tenant`.
function CapabilitiesPage({ tenant, apiWorkspaceId, architectureId, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  const [items, setItems] = useState<BusinessCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // "New capability" form.
  const emptyCreateForm = {
    capabilityName: '',
    capabilityDescription: '',
    currentMaturity: '',
    targetMaturity: '',
    capabilityGap: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // Inline edit (desktop) — one capability at a time. cardError is scoped to a single card id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ capabilityName: '', capabilityDescription: '', currentMaturity: '', targetMaturity: '', capabilityGap: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadCapabilities = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      // No architecture resolved yet — the render guards below handle messaging; don't spin or call the API.
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listCapabilities(apiWorkspaceId, architectureId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load capabilities.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadCapabilities(); }, [loadCapabilities]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !architectureId) return;
    setCreateError(null);
    setCreating(true);
    try {
      // Send only the fields the user actually filled in.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<BusinessCapability>;
      await createCapability(apiWorkspaceId, architectureId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadCapabilities();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create capability.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (capability: BusinessCapability) => {
    setCardError(null);
    setEditingId(capability.id);
    setEditDraft({
      capabilityName: capability.capabilityName ?? '',
      capabilityDescription: capability.capabilityDescription ?? '',
      currentMaturity: capability.currentMaturity ?? '',
      targetMaturity: capability.targetMaturity ?? '',
      capabilityGap: capability.capabilityGap ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.capabilityName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      await updateCapability(apiWorkspaceId, id, editDraft);
      setEditingId(null);
      await loadCapabilities();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save capability.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeCapability = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteCapability(apiWorkspaceId, id);
      await loadCapabilities();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete capability.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Capabilities" subtitle="What the business does. Stable building blocks with current and target maturity." />
  );

  // State 0 — architecture still loading. Guard first so nothing flashes before the fetch resolves.
  if (architectureLoading || !apiWorkspaceId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Loading…</p></HudPanel>
      </div>
    );
  }

  // State 1 — no architecture yet. Capabilities nest under it, so there is nothing to list or create.
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — capabilities belong to it.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }

  // State 2 — capabilities loading.
  if (loading) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Loading capabilities…</p></HudPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Could not load capabilities: {error.message}</p></HudPanel>
      </div>
    );
  }

  // State 3 — loaded. Real records return null for unfilled fields, so every access below is null-guarded.
  return (
    <div className="hud-page">
      {header}
      <RuleNote>Capabilities are company-level and reusable by value streams, key activities, objectives, cases, and features.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New capability'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Name (required)" value={createForm.capabilityName} onChange={(value) => setCreateField('capabilityName', value)} />
            <TextInput label="Description" value={createForm.capabilityDescription} onChange={(value) => setCreateField('capabilityDescription', value)} />
            <TextInput label="Current maturity" value={createForm.currentMaturity} onChange={(value) => setCreateField('currentMaturity', value)} />
            <TextInput label="Target maturity" value={createForm.targetMaturity} onChange={(value) => setCreateField('targetMaturity', value)} />
            <TextInput label="Gap" value={createForm.capabilityGap} onChange={(value) => setCreateField('capabilityGap', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'capabilities')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.capabilityName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create capability'}</HudButton>
          </form>
        </HudPanel>
      )}

      {items.length === 0 && (
        <HudPanel><p>No capabilities yet. Create your first capability to map what this architecture does.</p></HudPanel>
      )}

      <div className="hud-primary-list-desktop">
        {items.map((capability) => (
          <HudPanel key={capability.id}>
            <div className="hud-record-head">
              <div><h2>{capability.capabilityName?.trim() || '(unnamed capability)'}</h2><p>{capability.capabilityDescription ?? ''}</p></div>
              <div className="hud-badge-stack">
                {editingId !== capability.id && <HudButton variant="ghost" onClick={() => startEdit(capability)}>Edit</HudButton>}
                <HudButton variant="ghost" disabled={savingId === capability.id} onClick={() => removeCapability(capability.id)}>Delete</HudButton>
                <OriginBadge origin={capability.origin ?? 'architecture'} />
                <StatusBadge status={capability.status ?? 'draft'} />
              </div>
            </div>
            {editingId === capability.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Name" value={editDraft.capabilityName} onChange={(value) => setEditDraft((prev) => ({ ...prev, capabilityName: value }))} />
                  <TextInput label="Description" value={editDraft.capabilityDescription} onChange={(value) => setEditDraft((prev) => ({ ...prev, capabilityDescription: value }))} />
                  <TextInput label="Current maturity" value={editDraft.currentMaturity} onChange={(value) => setEditDraft((prev) => ({ ...prev, currentMaturity: value }))} />
                  <TextInput label="Target maturity" value={editDraft.targetMaturity} onChange={(value) => setEditDraft((prev) => ({ ...prev, targetMaturity: value }))} />
                  <TextInput label="Gap" value={editDraft.capabilityGap} onChange={(value) => setEditDraft((prev) => ({ ...prev, capabilityGap: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === capability.id} onClick={() => saveEdit(capability.id)}>{savingId === capability.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === capability.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'capabilities')}</p>}
            <FieldGrid rows={[
              { label: 'Current maturity', value: capability.currentMaturity },
              { label: 'Target maturity', value: capability.targetMaturity },
              { label: 'Gap', value: capability.capabilityGap },
              { label: 'Owning department', value: tenant.departments.find((department) => department.id === capability.owningDepartmentId)?.name },
            ]} />
            <RuleNote>Linked departments are not yet connected to the API.</RuleNote>
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Business Processes page. Wired to the real API — processes nest under the workspace's
// Business Architecture singleton (list/create via ba_id; update/delete via the process's own id).
function ProcessesPage({ tenant, apiWorkspaceId, architectureId, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  const [items, setItems] = useState<BusinessProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = {
    processName: '',
    currentStateProcess: '',
    futureStateProcess: '',
    processGap: '',
    impactedSystems: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ processName: '', currentStateProcess: '', futureStateProcess: '', processGap: '', impactedSystems: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadProcesses = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listProcesses(apiWorkspaceId, architectureId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load processes.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadProcesses(); }, [loadProcesses]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !architectureId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<BusinessProcess>;
      await createProcess(apiWorkspaceId, architectureId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadProcesses();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create process.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (process: BusinessProcess) => {
    setCardError(null);
    setEditingId(process.id);
    setEditDraft({
      processName: process.processName ?? '',
      currentStateProcess: process.currentStateProcess ?? '',
      futureStateProcess: process.futureStateProcess ?? '',
      processGap: process.processGap ?? '',
      impactedSystems: process.impactedSystems ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.processName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Process name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      await updateProcess(apiWorkspaceId, id, editDraft);
      setEditingId(null);
      await loadProcesses();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save process.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeProcess = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteProcess(apiWorkspaceId, id);
      await loadProcesses();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete process.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Processes" subtitle="Current- and future-state process detail supporting the architecture." />
  );

  if (architectureLoading || !apiWorkspaceId) {
    return <div className="hud-page">{header}<HudPanel><p>Loading…</p></HudPanel></div>;
  }
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — processes belong to it.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }
  if (loading) {
    return <div className="hud-page">{header}<HudPanel><p>Loading processes…</p></HudPanel></div>;
  }
  if (error) {
    return <div className="hud-page">{header}<HudPanel><p>Could not load processes: {error.message}</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}
      <RuleNote>Supporting components use reference-or-create: reference links an existing workspace record and never copies it.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New process'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Process name (required)" value={createForm.processName} onChange={(value) => setCreateField('processName', value)} />
            <TextInput label="Current state" value={createForm.currentStateProcess} onChange={(value) => setCreateField('currentStateProcess', value)} />
            <TextInput label="Future state" value={createForm.futureStateProcess} onChange={(value) => setCreateField('futureStateProcess', value)} />
            <TextInput label="Process gap" value={createForm.processGap} onChange={(value) => setCreateField('processGap', value)} />
            <TextInput label="Impacted systems" value={createForm.impactedSystems} onChange={(value) => setCreateField('impactedSystems', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'processes')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.processName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create process'}</HudButton>
          </form>
        </HudPanel>
      )}

      {items.length === 0 && (
        <HudPanel><p>No processes yet. Create your first process to document current- and future-state detail.</p></HudPanel>
      )}

      <div className="hud-primary-list-desktop">
        {items.map((process) => (
          <HudPanel key={process.id}>
            <div className="hud-record-head">
              <div><h2>{process.processName?.trim() || '(unnamed process)'}</h2><p>{process.currentStateProcess ?? ''}</p></div>
              <div className="hud-badge-stack">
                {editingId !== process.id && <HudButton variant="ghost" onClick={() => startEdit(process)}>Edit</HudButton>}
                <HudButton variant="ghost" disabled={savingId === process.id} onClick={() => removeProcess(process.id)}>Delete</HudButton>
                <OriginBadge origin={process.origin ?? 'architecture'} />
                <StatusBadge status={process.status ?? 'draft'} />
              </div>
            </div>
            {editingId === process.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Process name" value={editDraft.processName} onChange={(value) => setEditDraft((prev) => ({ ...prev, processName: value }))} />
                  <TextInput label="Current state" value={editDraft.currentStateProcess} onChange={(value) => setEditDraft((prev) => ({ ...prev, currentStateProcess: value }))} />
                  <TextInput label="Future state" value={editDraft.futureStateProcess} onChange={(value) => setEditDraft((prev) => ({ ...prev, futureStateProcess: value }))} />
                  <TextInput label="Process gap" value={editDraft.processGap} onChange={(value) => setEditDraft((prev) => ({ ...prev, processGap: value }))} />
                  <TextInput label="Impacted systems" value={editDraft.impactedSystems} onChange={(value) => setEditDraft((prev) => ({ ...prev, impactedSystems: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === process.id} onClick={() => saveEdit(process.id)}>{savingId === process.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === process.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'processes')}</p>}
            <FieldGrid rows={[
              { label: 'Current state', value: process.currentStateProcess },
              { label: 'Future state', value: process.futureStateProcess },
              { label: 'Process gap', value: process.processGap },
              { label: 'Impacted systems', value: process.impactedSystems },
              { label: 'Linked value stream', value: tenant.valueStreams.find((stream) => stream.id === process.linkedValueStreamId)?.name },
            ]} />
            <RuleNote>Linked value streams are not yet connected to the API.</RuleNote>
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Stakeholders & Personas page. Wired to the real API — stakeholders nest under the workspace's
// Business Architecture singleton (list/create via ba_id; update/delete via the stakeholder's own id).
function PersonasPage({ tenant, apiWorkspaceId, architectureId, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  const [items, setItems] = useState<StakeholderPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = {
    name: '',
    roleOrPersona: '',
    stakeholderType: '',
    needs: '',
    painPoints: '',
    valueReceived: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', roleOrPersona: '', stakeholderType: '', needs: '', painPoints: '', valueReceived: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadStakeholders = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listStakeholders(apiWorkspaceId, architectureId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load stakeholders.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadStakeholders(); }, [loadStakeholders]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !architectureId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<StakeholderPersona>;
      await createStakeholder(apiWorkspaceId, architectureId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadStakeholders();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create stakeholder.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (stakeholder: StakeholderPersona) => {
    setCardError(null);
    setEditingId(stakeholder.id);
    setEditDraft({
      name: stakeholder.name ?? '',
      roleOrPersona: stakeholder.roleOrPersona ?? '',
      stakeholderType: stakeholder.stakeholderType ?? '',
      needs: stakeholder.needs ?? '',
      painPoints: stakeholder.painPoints ?? '',
      valueReceived: stakeholder.valueReceived ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.name.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      // Drop an unselected enum — '' is not a valid stakeholderType and would 422.
      const patch: Partial<StakeholderPersona> = { ...editDraft } as Partial<StakeholderPersona>;
      if (!patch.stakeholderType) delete patch.stakeholderType;
      await updateStakeholder(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadStakeholders();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save stakeholder.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeStakeholder = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteStakeholder(apiWorkspaceId, id);
      await loadStakeholders();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete stakeholder.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Stakeholders & Personas" subtitle="The people the value streams serve or depend on." />
  );

  if (architectureLoading || !apiWorkspaceId) {
    return <div className="hud-page">{header}<HudPanel><p>Loading…</p></HudPanel></div>;
  }
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — stakeholders belong to it.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }
  if (loading) {
    return <div className="hud-page">{header}<HudPanel><p>Loading stakeholders…</p></HudPanel></div>;
  }
  if (error) {
    return <div className="hud-page">{header}<HudPanel><p>Could not load stakeholders: {error.message}</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}
      <RuleNote>Supporting components use reference-or-create: reference links an existing workspace record and never copies it.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New stakeholder'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Name (required)" value={createForm.name} onChange={(value) => setCreateField('name', value)} />
            <TextInput label="Role or persona" value={createForm.roleOrPersona} onChange={(value) => setCreateField('roleOrPersona', value)} />
            <SelectInput label="Stakeholder type" value={createForm.stakeholderType} onChange={(value) => setCreateField('stakeholderType', value)} options={stakeholderTypeOptions} />
            <TextInput label="Needs" value={createForm.needs} onChange={(value) => setCreateField('needs', value)} />
            <TextInput label="Pain points" value={createForm.painPoints} onChange={(value) => setCreateField('painPoints', value)} />
            <TextInput label="Value received" value={createForm.valueReceived} onChange={(value) => setCreateField('valueReceived', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'stakeholders')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.name.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create stakeholder'}</HudButton>
          </form>
        </HudPanel>
      )}

      {items.length === 0 && (
        <HudPanel><p>No stakeholders yet. Create your first stakeholder or persona to map who the value streams serve.</p></HudPanel>
      )}

      <div className="hud-primary-list-desktop">
        {items.map((stakeholder) => (
          <HudPanel key={stakeholder.id}>
            <div className="hud-record-head">
              <div><h2>{stakeholder.name?.trim() || '(unnamed stakeholder)'}</h2><p>{stakeholder.roleOrPersona ?? ''}</p></div>
              <div className="hud-badge-stack">
                {editingId !== stakeholder.id && <HudButton variant="ghost" onClick={() => startEdit(stakeholder)}>Edit</HudButton>}
                <HudButton variant="ghost" disabled={savingId === stakeholder.id} onClick={() => removeStakeholder(stakeholder.id)}>Delete</HudButton>
                <OriginBadge origin={stakeholder.origin ?? 'architecture'} />
                <StatusBadge status={stakeholder.status ?? 'draft'} />
              </div>
            </div>
            {editingId === stakeholder.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Name" value={editDraft.name} onChange={(value) => setEditDraft((prev) => ({ ...prev, name: value }))} />
                  <TextInput label="Role or persona" value={editDraft.roleOrPersona} onChange={(value) => setEditDraft((prev) => ({ ...prev, roleOrPersona: value }))} />
                  <SelectInput label="Stakeholder type" value={editDraft.stakeholderType} onChange={(value) => setEditDraft((prev) => ({ ...prev, stakeholderType: value }))} options={stakeholderTypeOptions} />
                  <TextInput label="Needs" value={editDraft.needs} onChange={(value) => setEditDraft((prev) => ({ ...prev, needs: value }))} />
                  <TextInput label="Pain points" value={editDraft.painPoints} onChange={(value) => setEditDraft((prev) => ({ ...prev, painPoints: value }))} />
                  <TextInput label="Value received" value={editDraft.valueReceived} onChange={(value) => setEditDraft((prev) => ({ ...prev, valueReceived: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === stakeholder.id} onClick={() => saveEdit(stakeholder.id)}>{savingId === stakeholder.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === stakeholder.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'stakeholders')}</p>}
            <FieldGrid rows={[
              { label: 'Role or persona', value: stakeholder.roleOrPersona },
              { label: 'Stakeholder type', value: stakeholder.stakeholderType },
              { label: 'Needs', value: stakeholder.needs },
              { label: 'Pain points', value: stakeholder.painPoints },
              { label: 'Value received', value: stakeholder.valueReceived },
              { label: 'Linked value stream', value: tenant.valueStreams.find((stream) => stream.id === stakeholder.linkedValueStreamId)?.name },
            ]} />
            <RuleNote>Linked value streams are not yet connected to the API.</RuleNote>
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Information Concepts page. Wired to the real API — concepts nest under the workspace's
// Business Architecture singleton (list/create via ba_id; update/delete via the concept's own id).
function InformationPage({ tenant, apiWorkspaceId, architectureId, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  const [items, setItems] = useState<InformationConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = {
    conceptName: '',
    description: '',
    dataOwner: '',
    sourceSystem: '',
    targetSystem: '',
    dataQualityIssue: '',
    businessUsage: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ conceptName: '', description: '', dataOwner: '', sourceSystem: '', targetSystem: '', dataQualityIssue: '', businessUsage: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadConcepts = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listInformationConcepts(apiWorkspaceId, architectureId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load information concepts.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadConcepts(); }, [loadConcepts]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !architectureId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<InformationConcept>;
      await createInformationConcept(apiWorkspaceId, architectureId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadConcepts();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create information concept.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (concept: InformationConcept) => {
    setCardError(null);
    setEditingId(concept.id);
    setEditDraft({
      conceptName: concept.conceptName ?? '',
      description: concept.description ?? '',
      dataOwner: concept.dataOwner ?? '',
      sourceSystem: concept.sourceSystem ?? '',
      targetSystem: concept.targetSystem ?? '',
      dataQualityIssue: concept.dataQualityIssue ?? '',
      businessUsage: concept.businessUsage ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked name would save a headerless card. Guard before the PATCH.
    if (!editDraft.conceptName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Concept name is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      await updateInformationConcept(apiWorkspaceId, id, editDraft);
      setEditingId(null);
      await loadConcepts();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save information concept.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeConcept = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteInformationConcept(apiWorkspaceId, id);
      await loadConcepts();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete information concept.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Information Concepts" subtitle="The key data objects the architecture produces and consumes." />
  );

  if (architectureLoading || !apiWorkspaceId) {
    return <div className="hud-page">{header}<HudPanel><p>Loading…</p></HudPanel></div>;
  }
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — information concepts belong to it.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }
  if (loading) {
    return <div className="hud-page">{header}<HudPanel><p>Loading information concepts…</p></HudPanel></div>;
  }
  if (error) {
    return <div className="hud-page">{header}<HudPanel><p>Could not load information concepts: {error.message}</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}
      <RuleNote>Supporting components use reference-or-create: reference links an existing workspace record and never copies it.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New information concept'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Concept name (required)" value={createForm.conceptName} onChange={(value) => setCreateField('conceptName', value)} />
            <TextInput label="Description" value={createForm.description} onChange={(value) => setCreateField('description', value)} />
            <TextInput label="Data owner" value={createForm.dataOwner} onChange={(value) => setCreateField('dataOwner', value)} />
            <TextInput label="Source system" value={createForm.sourceSystem} onChange={(value) => setCreateField('sourceSystem', value)} />
            <TextInput label="Target system" value={createForm.targetSystem} onChange={(value) => setCreateField('targetSystem', value)} />
            <TextInput label="Data quality issue" value={createForm.dataQualityIssue} onChange={(value) => setCreateField('dataQualityIssue', value)} />
            <TextInput label="Business usage" value={createForm.businessUsage} onChange={(value) => setCreateField('businessUsage', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'information concepts')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.conceptName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create information concept'}</HudButton>
          </form>
        </HudPanel>
      )}

      {items.length === 0 && (
        <HudPanel><p>No information concepts yet. Create your first concept to map the data the architecture produces and consumes.</p></HudPanel>
      )}

      <div className="hud-primary-list-desktop">
        {items.map((concept) => (
          <HudPanel key={concept.id}>
            <div className="hud-record-head">
              <div><h2>{concept.conceptName?.trim() || '(unnamed concept)'}</h2><p>{concept.description ?? ''}</p></div>
              <div className="hud-badge-stack">
                {editingId !== concept.id && <HudButton variant="ghost" onClick={() => startEdit(concept)}>Edit</HudButton>}
                <HudButton variant="ghost" disabled={savingId === concept.id} onClick={() => removeConcept(concept.id)}>Delete</HudButton>
                <OriginBadge origin={concept.origin ?? 'architecture'} />
                <StatusBadge status={concept.status ?? 'draft'} />
              </div>
            </div>
            {editingId === concept.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Concept name" value={editDraft.conceptName} onChange={(value) => setEditDraft((prev) => ({ ...prev, conceptName: value }))} />
                  <TextInput label="Description" value={editDraft.description} onChange={(value) => setEditDraft((prev) => ({ ...prev, description: value }))} />
                  <TextInput label="Data owner" value={editDraft.dataOwner} onChange={(value) => setEditDraft((prev) => ({ ...prev, dataOwner: value }))} />
                  <TextInput label="Source system" value={editDraft.sourceSystem} onChange={(value) => setEditDraft((prev) => ({ ...prev, sourceSystem: value }))} />
                  <TextInput label="Target system" value={editDraft.targetSystem} onChange={(value) => setEditDraft((prev) => ({ ...prev, targetSystem: value }))} />
                  <TextInput label="Data quality issue" value={editDraft.dataQualityIssue} onChange={(value) => setEditDraft((prev) => ({ ...prev, dataQualityIssue: value }))} />
                  <TextInput label="Business usage" value={editDraft.businessUsage} onChange={(value) => setEditDraft((prev) => ({ ...prev, businessUsage: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === concept.id} onClick={() => saveEdit(concept.id)}>{savingId === concept.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === concept.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'information concepts')}</p>}
            <FieldGrid rows={[
              { label: 'Description', value: concept.description },
              { label: 'Data owner', value: concept.dataOwner },
              { label: 'Source system', value: concept.sourceSystem },
              { label: 'Target system', value: concept.targetSystem },
              { label: 'Data quality issue', value: concept.dataQualityIssue },
              { label: 'Business usage', value: concept.businessUsage },
              { label: 'Linked value stream', value: tenant.valueStreams.find((stream) => stream.id === concept.linkedValueStreamId)?.name },
            ]} />
            <RuleNote>Linked value streams are not yet connected to the API.</RuleNote>
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Business Impacts page. Wired to the real API — impacts nest under the workspace's
// Business Architecture singleton (list/create via ba_id; update/delete via the impact's own id).
function ImpactsPage({ tenant, apiWorkspaceId, architectureId, architectureLoading }: {
  tenant: TenantData;
  apiWorkspaceId: string | null;
  architectureId: string | null;
  architectureLoading: boolean;
}) {
  const [items, setItems] = useState<BusinessImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = {
    impactedArea: '',
    impactDescription: '',
    impactType: '',
    severity: '',
    mitigationNotes: '',
    expectedValue: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ impactedArea: '', impactDescription: '', impactType: '', severity: '', mitigationNotes: '', expectedValue: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadImpacts = useCallback(async () => {
    if (!apiWorkspaceId || !architectureId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listBusinessImpacts(apiWorkspaceId, architectureId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load business impacts.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, architectureId]);

  useEffect(() => { loadImpacts(); }, [loadImpacts]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !architectureId) return;
    setCreateError(null);
    setCreating(true);
    try {
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<BusinessImpact>;
      await createBusinessImpact(apiWorkspaceId, architectureId, body);
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      await loadImpacts();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create business impact.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (impact: BusinessImpact) => {
    setCardError(null);
    setEditingId(impact.id);
    setEditDraft({
      impactedArea: impact.impactedArea ?? '',
      impactDescription: impact.impactDescription ?? '',
      impactType: impact.impactType ?? '',
      severity: impact.severity ?? '',
      mitigationNotes: impact.mitigationNotes ?? '',
      expectedValue: impact.expectedValue ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats fields as optional and '' counts as "provided",
    // so a blanked value would save a headerless card. Guard before the PATCH.
    if (!editDraft.impactedArea.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Impacted area is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      // Drop unselected enums — '' is not a valid impactType/severity and would 422.
      const patch: Partial<BusinessImpact> = { ...editDraft } as Partial<BusinessImpact>;
      if (!patch.impactType) delete patch.impactType;
      if (!patch.severity) delete patch.severity;
      await updateBusinessImpact(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadImpacts();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save business impact.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const removeImpact = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await deleteBusinessImpact(apiWorkspaceId, id);
      await loadImpacts();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete business impact.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Impacts" subtitle="Effects that later justify lean business cases and discovery priorities." />
  );

  if (architectureLoading || !apiWorkspaceId) {
    return <div className="hud-page">{header}<HudPanel><p>Loading…</p></HudPanel></div>;
  }
  if (!architectureId) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a Business Architecture for this workspace first — business impacts belong to it.</p></HudPanel>
        <RuleNote>Head to the Business Architecture page to create the workspace architecture, then return here.</RuleNote>
      </div>
    );
  }
  if (loading) {
    return <div className="hud-page">{header}<HudPanel><p>Loading business impacts…</p></HudPanel></div>;
  }
  if (error) {
    return <div className="hud-page">{header}<HudPanel><p>Could not load business impacts: {error.message}</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}
      <RuleNote>Impacts carry optional value-stream and lean-case links. Origin is provenance only.</RuleNote>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New impact'}
        </HudButton>
      </div>
      {showCreate && (
        <HudPanel>
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Impacted area (required)" value={createForm.impactedArea} onChange={(value) => setCreateField('impactedArea', value)} />
            <TextInput label="Impact description" value={createForm.impactDescription} onChange={(value) => setCreateField('impactDescription', value)} />
            <SelectInput label="Impact type" value={createForm.impactType} onChange={(value) => setCreateField('impactType', value)} options={impactTypeOptions} />
            <SelectInput label="Severity" value={createForm.severity} onChange={(value) => setCreateField('severity', value)} options={severityOptions} />
            <TextInput label="Mitigation notes" value={createForm.mitigationNotes} onChange={(value) => setCreateField('mitigationNotes', value)} />
            <TextInput label="Expected value" value={createForm.expectedValue} onChange={(value) => setCreateField('expectedValue', value)} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'business impacts')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.impactedArea.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create impact'}</HudButton>
          </form>
        </HudPanel>
      )}

      {items.length === 0 && (
        <HudPanel><p>No business impacts yet. Create your first impact to capture effects that later justify cases and discovery.</p></HudPanel>
      )}

      <div className="hud-primary-list-desktop">
        {items.map((impact) => (
          <HudPanel key={impact.id}>
            <div className="hud-record-head">
              <div><h2>{impact.impactedArea?.trim() || '(unnamed impact)'}</h2><p>{impact.impactDescription ?? ''}</p></div>
              <div className="hud-badge-stack">
                {editingId !== impact.id && <HudButton variant="ghost" onClick={() => startEdit(impact)}>Edit</HudButton>}
                <HudButton variant="ghost" disabled={savingId === impact.id} onClick={() => removeImpact(impact.id)}>Delete</HudButton>
                <OriginBadge origin={impact.origin ?? 'architecture'} />
                <StatusBadge status={impact.status ?? 'draft'} />
              </div>
            </div>
            {editingId === impact.id && (
              <div className="hud-ai-edit-panel">
                <div className="hud-ai-edit-grid">
                  <TextInput label="Impacted area" value={editDraft.impactedArea} onChange={(value) => setEditDraft((prev) => ({ ...prev, impactedArea: value }))} />
                  <TextInput label="Impact description" value={editDraft.impactDescription} onChange={(value) => setEditDraft((prev) => ({ ...prev, impactDescription: value }))} />
                  <SelectInput label="Impact type" value={editDraft.impactType} onChange={(value) => setEditDraft((prev) => ({ ...prev, impactType: value }))} options={impactTypeOptions} />
                  <SelectInput label="Severity" value={editDraft.severity} onChange={(value) => setEditDraft((prev) => ({ ...prev, severity: value }))} options={severityOptions} />
                  <TextInput label="Mitigation notes" value={editDraft.mitigationNotes} onChange={(value) => setEditDraft((prev) => ({ ...prev, mitigationNotes: value }))} />
                  <TextInput label="Expected value" value={editDraft.expectedValue} onChange={(value) => setEditDraft((prev) => ({ ...prev, expectedValue: value }))} />
                </div>
                <div className="hud-actions">
                  <HudButton disabled={savingId === impact.id} onClick={() => saveEdit(impact.id)}>{savingId === impact.id ? 'Saving…' : 'Save'}</HudButton>
                  <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                </div>
              </div>
            )}
            {cardError?.id === impact.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'business impacts')}</p>}
            <FieldGrid rows={[
              { label: 'Impact description', value: impact.impactDescription },
              { label: 'Impact type', value: impact.impactType },
              { label: 'Severity', value: impact.severity },
              { label: 'Mitigation notes', value: impact.mitigationNotes },
              { label: 'Expected value', value: impact.expectedValue },
              { label: 'Linked value stream', value: tenant.valueStreams.find((stream) => stream.id === impact.linkedValueStreamId)?.name },
              { label: 'Linked lean business case', value: tenant.cases.find((businessCase) => businessCase.id === impact.linkedLeanBusinessCaseId)?.title },
            ]} />
            <RuleNote>Linked value streams and lean business cases are not yet connected to the API.</RuleNote>
          </HudPanel>
        ))}
      </div>
    </div>
  );
}

// Note: Lean business cases page — the Phase 2 gate. Cases nest under a strategic objective, so an
// objective picker gates the list (like KeyActivitiesPage's value-stream picker). Wired to the real
// API; lifecycle transitions go through the dedicated /status endpoint. No delete endpoint exists.
function CasesPage({ apiWorkspaceId }: { apiWorkspaceId: string | null }) {
  // Objective picker — cases belong to a strategic objective, so we need one selected before listing.
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [objLoading, setObjLoading] = useState(true);
  const [objError, setObjError] = useState<ApiError | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string>('');

  const [items, setItems] = useState<LeanBusinessCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // "New case" form. All fields held as strings; forecast numbers are coerced on submit.
  const emptyCreateForm = {
    title: '',
    summary: '',
    problemOpportunityStatement: '',
    valueHypothesis: '',
    priority: '',
    forecastCost: '',
    forecastValue: '',
    valueType: '',
  };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // AI interview → pre-populate the create form. The modal fires the AI call; applyGenerated
  // maps its returned fields onto this form for human review. aiFilled drives the banner.
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // Enum fields whose generated value must be one of the allowed options, else dropped.
  const enumOptions: Partial<Record<keyof typeof emptyCreateForm, { value: string; label: string }[]>> = {
    priority: priorityOptions,
    valueType: caseValueTypeOptions,
  };

  const applyGenerated = (fields: Record<string, unknown>) => {
    const next = { ...emptyCreateForm };
    (Object.keys(emptyCreateForm) as (keyof typeof emptyCreateForm)[]).forEach((key) => {
      const raw = fields[key];
      if (raw == null) return; // null-safe: skip null/undefined
      const value = String(raw); // form holds strings; buildBody re-coerces the forecasts
      const opts = enumOptions[key];
      if (opts && !opts.some((option) => option.value === value)) return; // drop invalid enum
      next[key] = value;
    });
    setCreateForm(next);
    setAiFilled(true);
    setShowCreate(true);
    setShowAiModal(false);
    setCreateError(null);
  };

  // Inline edit (desktop) — one case at a time. cardError is scoped to a single card id.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', summary: '', problemOpportunityStatement: '', valueHypothesis: '', priority: '', forecastCost: '', forecastValue: '', valueType: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  // Load the workspace's objectives, drop archived (they can't parent a case), auto-select the first.
  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) {
      // No workspace resolved (shouldn't happen behind auth) — treat as empty, not a spinner.
      setObjectives([]);
      setSelectedObjId('');
      setObjLoading(false);
      return;
    }
    setObjLoading(true);
    setObjError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      const selectable = result.items.filter((objective) => objective.status !== 'archived');
      setObjectives(selectable);
      setSelectedObjId(selectable[0]?.id ?? '');
    } catch (err) {
      setObjectives([]);
      setSelectedObjId('');
      setObjError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally {
      setObjLoading(false);
    }
  }, [apiWorkspaceId]);

  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const loadCases = useCallback(async () => {
    if (!apiWorkspaceId || !selectedObjId) {
      // No objective selected (or none exist) — nothing to list; the render guards handle messaging.
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listBusinessCases(apiWorkspaceId, selectedObjId);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load lean business cases.', status: 0 }));
    } finally {
      setLoading(false);
    }
  }, [apiWorkspaceId, selectedObjId]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  // Turn the string form into a typed body: drop empty strings, coerce the two forecast numbers.
  const buildBody = (form: typeof emptyCreateForm): Partial<LeanBusinessCase> => {
    const { forecastCost, forecastValue, ...strings } = form;
    const body = Object.fromEntries(Object.entries(strings).filter(([, value]) => value !== '')) as Partial<LeanBusinessCase>;
    if (forecastCost.trim() !== '' && !Number.isNaN(Number(forecastCost))) body.forecastCost = Number(forecastCost);
    if (forecastValue.trim() !== '' && !Number.isNaN(Number(forecastValue))) body.forecastValue = Number(forecastValue);
    return body;
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedObjId) return;
    setCreateError(null);
    setCreating(true);
    try {
      await createBusinessCase(apiWorkspaceId, selectedObjId, buildBody(createForm));
      setCreateForm(emptyCreateForm);
      setShowCreate(false);
      setAiFilled(false);
      await loadCases();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create lean business case.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (businessCase: LeanBusinessCase) => {
    setCardError(null);
    setEditingId(businessCase.id);
    setEditDraft({
      title: businessCase.title ?? '',
      summary: businessCase.summary ?? '',
      problemOpportunityStatement: businessCase.problemOpportunityStatement ?? '',
      valueHypothesis: businessCase.valueHypothesis ?? '',
      priority: businessCase.priority ?? '',
      forecastCost: businessCase.forecastCost != null ? String(businessCase.forecastCost) : '',
      forecastValue: businessCase.forecastValue != null ? String(businessCase.forecastValue) : '',
      valueType: businessCase.valueType ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Title is required on create, but PATCH treats fields as optional and '' counts as
    // "provided" — so a blanked title would save a headerless card. Guard before the PATCH.
    if (!editDraft.title.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Title is required.', status: 0 }) });
      return;
    }
    setSavingId(id);
    try {
      const { forecastCost, forecastValue, ...strings } = editDraft;
      const patch: Partial<LeanBusinessCase> = {
        ...strings,
        // Empty clears the forecast (null); otherwise send the number, guarding NaN → null.
        forecastCost: forecastCost.trim() === '' || Number.isNaN(Number(forecastCost)) ? null : Number(forecastCost),
        forecastValue: forecastValue.trim() === '' || Number.isNaN(Number(forecastValue)) ? null : Number(forecastValue),
      };
      // An unselected enum is '', which is not a valid enum member and 422s. Omit these fields
      // entirely rather than sending ''. (Third page to need this — see Stakeholders/Impacts.)
      if (!patch.priority) delete patch.priority;
      if (!patch.valueType) delete patch.valueType;
      await updateBusinessCase(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadCases();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save lean business case.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  // The backend splits Business Case lifecycle across two endpoints, and which endpoint a
  // transition uses is NOT obvious:
  //   draft->active, active->completed   => the CONTENT PATCH /lean-business-cases/{id}
  //   ->archived, archived->draft        => the STATUS  PATCH /lean-business-cases/{id}/status
  // Activate/Complete must therefore go through updateBusinessCase (advanceStatus below), NOT
  // updateBusinessCaseStatus, or the status endpoint rejects them with 409 "Invalid status transition".
  const advanceStatus = async (id: string, status: CaseStatus) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await updateBusinessCase(apiWorkspaceId, id, { status });
      await loadCases();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to update case status.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  // Archive/reactivate legitimately use the dedicated /status endpoint (see the split above).
  const changeStatus = async (id: string, status: CaseStatus) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    setSavingId(id);
    try {
      await updateBusinessCaseStatus(apiWorkspaceId, id, status);
      await loadCases();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to update case status.', status: 0 }) });
    } finally {
      setSavingId(null);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 2 · Delivery" title="Lean Business Cases" subtitle="Granular sub-initiatives of one objective. Each carries its own forecast." />
  );

  // State 0 — objectives still loading. Guard first so nothing flashes before the fetch resolves.
  if (objLoading) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Loading…</p></HudPanel>
      </div>
    );
  }

  if (objError) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Could not load strategic objectives: {objError.message}</p></HudPanel>
      </div>
    );
  }

  // State 1 — no non-archived objective to parent a case. No picker/form/API call.
  if (objectives.length === 0) {
    return (
      <div className="hud-page">
        {header}
        <HudPanel><p>Create a strategic objective first — cases belong to one.</p></HudPanel>
        <RuleNote>Head to the Strategic Objectives page to create one, then return here.</RuleNote>
      </div>
    );
  }

  // Loaded shell — picker + create form stay mounted so switching objectives doesn't unmount the dropdown.
  // The list region below swaps on the case-fetch state (error / loading / empty / records).
  return (
    <div className="hud-page">
      {header}
      <RuleNote>Cardinality: lean business cases {items.length} / {cardinalityLimits.leanBusinessCasesPerObjective} for this objective. Active requires title, summary, problem/opportunity statement, value hypothesis, and priority.</RuleNote>

      <HudPanel>
        <SelectInput
          label="Strategic objective"
          value={selectedObjId}
          onChange={setSelectedObjId}
          options={objectives.map((objective) => ({ value: objective.id, label: objective.strategicInitiativeName ?? '(unnamed objective)' }))}
        />
      </HudPanel>

      <div className="hud-actions">
        <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); setAiFilled(false); }}>
          <Plus size={16} /> {showCreate ? 'Close' : 'New lean business case'}
        </HudButton>
        <HudButton variant="ghost" onClick={() => setShowAiModal(true)} disabled={!apiWorkspaceId || !selectedObjId}>
          <Sparkles size={16} /> Draft with AI
        </HudButton>
      </div>
      {showAiModal && apiWorkspaceId && selectedObjId && (
        <AiInterviewModal
          workspaceId={apiWorkspaceId}
          resourceType="lean_business_case"
          parentId={selectedObjId}
          onGenerated={applyGenerated}
          onClose={() => setShowAiModal(false)}
        />
      )}
      {showCreate && (
        <HudPanel>
          {aiFilled && (
            <div className="hud-ai-banner">
              <Sparkles size={17} />
              <span>AI filled these fields — edit any of them, then Create. Nothing is saved yet.</span>
            </div>
          )}
          <form onSubmit={submitCreate} className="hud-form">
            <TextInput label="Title (required)" value={createForm.title} onChange={(value) => setCreateField('title', value)} />
            <TextAreaInput label="Summary" value={createForm.summary} onChange={(value) => setCreateField('summary', value)} />
            <TextAreaInput label="Problem / opportunity statement" value={createForm.problemOpportunityStatement} onChange={(value) => setCreateField('problemOpportunityStatement', value)} />
            <TextAreaInput label="Value hypothesis" value={createForm.valueHypothesis} onChange={(value) => setCreateField('valueHypothesis', value)} />
            <SelectInput label="Priority" value={createForm.priority} onChange={(value) => setCreateField('priority', value)} options={priorityOptions} />
            <TextInput label="Forecast cost" type="number" value={createForm.forecastCost} onChange={(value) => setCreateField('forecastCost', value)} />
            <TextInput label="Forecast value" type="number" value={createForm.forecastValue} onChange={(value) => setCreateField('forecastValue', value)} />
            <SelectInput label="Value type" value={createForm.valueType} onChange={(value) => setCreateField('valueType', value)} options={caseValueTypeOptions} />
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'lean business cases for this objective')}</p>}
            <HudButton type="submit" disabled={creating || !createForm.title.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create lean business case'}</HudButton>
          </form>
        </HudPanel>
      )}

      {error ? (
        <HudPanel><p>Could not load lean business cases: {error.message}</p></HudPanel>
      ) : loading ? (
        <HudPanel><p>Loading lean business cases…</p></HudPanel>
      ) : items.length === 0 ? (
        <HudPanel><p>No lean business cases for this objective yet. Create your first to break the objective into fundable initiatives.</p></HudPanel>
      ) : (
        <>
        <div className="hud-primary-list-mobile">
          {items.map((businessCase) => {
            const status = businessCase.status ?? 'draft';
            return (
              <MobileRecordCard
                key={businessCase.id}
                title={businessCase.title?.trim() || '(untitled case)'}
                summary={businessCase.summary ?? ''}
                badge={<StatusBadge status={status} />}
                rows={[
                  { label: 'Priority', value: businessCase.priority ? prettifyEnum(businessCase.priority) : '' },
                  { label: 'Value type', value: businessCase.valueType ? prettifyEnum(businessCase.valueType) : '' },
                  { label: 'Forecast cost', value: formatCurrency(businessCase.forecastCost) },
                  { label: 'Forecast value', value: formatCurrency(businessCase.forecastValue) },
                ]}
                action={null}
              />
            );
          })}
        </div>
        <div className="hud-primary-list-desktop">
          {items.map((businessCase) => {
            const missing = getMissingLeanBusinessCaseActiveFields(businessCase);
            const status = businessCase.status ?? 'draft';
            return (
              <HudPanel key={businessCase.id}>
                <div className="hud-record-head">
                  <div><h2>{businessCase.title?.trim() || '(untitled case)'}</h2><p>{businessCase.summary ?? ''}</p></div>
                  <div className="hud-badge-stack">
                    {editingId !== businessCase.id && <HudButton variant="ghost" onClick={() => startEdit(businessCase)}>Edit</HudButton>}
                    {status === 'draft' && <HudButton variant="ghost" disabled={savingId === businessCase.id || missing.length > 0} onClick={() => advanceStatus(businessCase.id, 'active')}>Activate</HudButton>}
                    {status === 'active' && <HudButton variant="ghost" disabled={savingId === businessCase.id} onClick={() => advanceStatus(businessCase.id, 'completed')}>Complete</HudButton>}
                    {status === 'active' && <HudButton variant="ghost" disabled={savingId === businessCase.id} onClick={() => changeStatus(businessCase.id, 'archived')}>Archive</HudButton>}
                    <StatusBadge status={status} />
                  </div>
                </div>
                {editingId === businessCase.id && (
                  <div className="hud-ai-edit-panel">
                    <div className="hud-ai-edit-grid">
                      <TextInput label="Title" value={editDraft.title} onChange={(value) => setEditDraft((prev) => ({ ...prev, title: value }))} />
                      <TextInput label="Summary" value={editDraft.summary} onChange={(value) => setEditDraft((prev) => ({ ...prev, summary: value }))} />
                      <TextInput label="Problem / opportunity statement" value={editDraft.problemOpportunityStatement} onChange={(value) => setEditDraft((prev) => ({ ...prev, problemOpportunityStatement: value }))} />
                      <TextInput label="Value hypothesis" value={editDraft.valueHypothesis} onChange={(value) => setEditDraft((prev) => ({ ...prev, valueHypothesis: value }))} />
                      <SelectInput label="Priority" value={editDraft.priority} onChange={(value) => setEditDraft((prev) => ({ ...prev, priority: value }))} options={priorityOptions} />
                      <TextInput label="Forecast cost" type="number" value={editDraft.forecastCost} onChange={(value) => setEditDraft((prev) => ({ ...prev, forecastCost: value }))} />
                      <TextInput label="Forecast value" type="number" value={editDraft.forecastValue} onChange={(value) => setEditDraft((prev) => ({ ...prev, forecastValue: value }))} />
                      <SelectInput label="Value type" value={editDraft.valueType} onChange={(value) => setEditDraft((prev) => ({ ...prev, valueType: value }))} options={caseValueTypeOptions} />
                    </div>
                    <div className="hud-actions">
                      <HudButton disabled={savingId === businessCase.id} onClick={() => saveEdit(businessCase.id)}>{savingId === businessCase.id ? 'Saving…' : 'Save'}</HudButton>
                      <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                    </div>
                  </div>
                )}
                {cardError?.id === businessCase.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'lean business cases for this objective')}</p>}
                <FieldGrid rows={[
                  { label: 'Priority', value: businessCase.priority ? prettifyEnum(businessCase.priority) : '' },
                  { label: 'Value type', value: businessCase.valueType ? prettifyEnum(businessCase.valueType) : '' },
                  { label: 'Forecast cost', value: formatCurrency(businessCase.forecastCost) },
                  { label: 'Forecast value', value: formatCurrency(businessCase.forecastValue) },
                  { label: 'Problem / opportunity', value: businessCase.problemOpportunityStatement },
                  { label: 'Value hypothesis', value: businessCase.valueHypothesis },
                ]} />
                {status === 'draft' && missing.length > 0 && <RuleNote>Cannot activate. Missing: {missing.join(', ')}.</RuleNote>}
              </HudPanel>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

// The ten qualitative finding areas of a discovery, in display order. All are optional strings on
// both create and PATCH (backend schema `DiscoveryFindingsBase`), so there is no required field.
const emptyDiscoveryForm = {
  problemStatement: '',
  personaFindings: '',
  journeyMap: '',
  currentStateProcessMap: '',
  bottleneckAnalysis: '',
  dataFindings: '',
  legacyConstraints: '',
  futureStateNeeds: '',
  discoveryMetrics: '',
  governanceFindings: '',
};
const discoveryFindingFields: [keyof typeof emptyDiscoveryForm, string][] = [
  ['problemStatement', 'Problem statement'],
  ['personaFindings', 'Persona findings'],
  ['journeyMap', 'Journey map'],
  ['currentStateProcessMap', 'Current process map'],
  ['bottleneckAnalysis', 'Bottleneck analysis'],
  ['dataFindings', 'Data findings'],
  ['legacyConstraints', 'Legacy constraints'],
  ['futureStateNeeds', 'Future-state needs'],
  ['discoveryMetrics', 'Discovery metrics'],
  ['governanceFindings', 'Governance findings'],
];
// Update-only enum. Backend forces `draft` on create and only allows draft->active->completed.
const discoveryStatusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

// Note: Discovery page for the 1:1 case discovery record and its ten qualitative finding areas.
// Discovery is a singleton per lean business case, so two chained pickers (objective -> case) select
// the record before it is fetched GET-or-404, mirroring the Business Architecture singleton flow.
// The roll-down builder and persona/process/concept links are a separate task and intentionally omitted.
function DiscoveryPage({ tenant, apiWorkspaceId }: { tenant: TenantData; apiWorkspaceId: string | null }) {
  // Objective picker — a case belongs to a strategic objective, so one must be selected first.
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [objLoading, setObjLoading] = useState(true);
  const [objError, setObjError] = useState<ApiError | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string>('');

  // Case picker — a discovery is 1:1 with a case. No auto-select: the user picks the case explicitly.
  const [cases, setCases] = useState<LeanBusinessCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<ApiError | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // The singleton discovery for the selected case. null after a 404 means "not created yet".
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<ApiError | null>(null);
  // Holds the caseId of the most recent discovery request so a stale response (after a rapid case
  // switch) can be discarded on arrival — same guard as the app-level refetchArchitecture.
  const discoveryRequestRef = useRef<string | null>(null);
  const discoveryId = discovery?.id ?? null;

  // Create-form state (shown only when the selected case has no discovery yet).
  const [createForm, setCreateForm] = useState(emptyDiscoveryForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  // AI interview → pre-populate the create form. The modal fires the AI call; applyGenerated
  // maps its returned fields onto this form for human review. aiFilled drives the banner.
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const applyGenerated = (fields: Record<string, unknown>) => {
    const next = { ...emptyDiscoveryForm };
    (Object.keys(emptyDiscoveryForm) as (keyof typeof emptyDiscoveryForm)[]).forEach((key) => {
      const raw = fields[key];
      if (raw == null) return; // null-safe: skip null/undefined
      next[key] = String(raw);
    });
    setCreateForm(next);
    setAiFilled(true);
    setShowAiModal(false);
    setCreateError(null);
  };

  // Inline-edit state. editDraft carries the ten findings plus the update-only status enum.
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ ...emptyDiscoveryForm, status: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<ApiError | null>(null);

  const setCreateField = (field: keyof typeof emptyDiscoveryForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  const setEditField = (field: keyof typeof emptyDiscoveryForm | 'status', value: string) =>
    setEditDraft((prev) => ({ ...prev, [field]: value }));

  // Placeholder AI drafting — there is no real discovery AI endpoint (and AI never writes the DB).
  // It only fills the active form's finding fields; persistence is always the explicit Create/Save.
  const mergeAiDraft = (current: Record<string, string>): Record<string, string> => {
    const draft = mockDiscoveryDraft(tenant.workspace.name);
    const next = { ...current };
    for (const [field] of discoveryFindingFields) {
      const value = draft[field];
      if (typeof value === 'string') next[field] = value;
    }
    return next;
  };

  // Load the workspace's objectives, drop archived (they can't parent a case), auto-select the first.
  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) {
      setObjectives([]);
      setSelectedObjId('');
      setObjLoading(false);
      return;
    }
    setObjLoading(true);
    setObjError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      const selectable = result.items.filter((objective) => objective.status !== 'archived');
      setObjectives(selectable);
      setSelectedObjId(selectable[0]?.id ?? '');
    } catch (err) {
      setObjectives([]);
      setSelectedObjId('');
      setObjError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally {
      setObjLoading(false);
    }
  }, [apiWorkspaceId]);

  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  // List cases for the selected objective. Changing the objective re-runs this and resets the case
  // selection, so we never hold a case id that belongs to a different (no-longer-shown) objective.
  const loadCases = useCallback(async () => {
    setSelectedCaseId('');
    if (!apiWorkspaceId || !selectedObjId) {
      setCases([]);
      setCasesLoading(false);
      return;
    }
    setCasesLoading(true);
    setCasesError(null);
    try {
      const result = await listBusinessCases(apiWorkspaceId, selectedObjId);
      setCases(result.items);
    } catch (err) {
      setCases([]);
      setCasesError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load lean business cases.', status: 0 }));
    } finally {
      setCasesLoading(false);
    }
  }, [apiWorkspaceId, selectedObjId]);

  useEffect(() => { loadCases(); }, [loadCases]);

  // GET-or-404 the singleton discovery for the selected case. A 404 means "not created yet" (null).
  const loadDiscovery = useCallback(async () => {
    const requestedCase = selectedCaseId;
    discoveryRequestRef.current = requestedCase;
    // Switching case exits any open edit and clears create state so nothing carries across records.
    setEditing(false);
    setCreateForm(emptyDiscoveryForm);
    setAiFilled(false);
    setCreateError(null);
    setEditError(null);
    setDiscoveryError(null);
    if (!apiWorkspaceId || !requestedCase) {
      setDiscovery(null);
      setDiscoveryLoading(false);
      return;
    }
    setDiscoveryLoading(true);
    try {
      const record = await getDiscoveryForCase(apiWorkspaceId, requestedCase);
      if (discoveryRequestRef.current !== requestedCase) return; // superseded by a newer case
      setDiscovery(record);
    } catch (err) {
      if (discoveryRequestRef.current !== requestedCase) return; // superseded by a newer case
      if (err instanceof ApiError && err.status === 404) {
        setDiscovery(null); // not created yet — expected, not an error
      } else {
        setDiscovery(null);
        setDiscoveryError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load discovery.', status: 0 }));
      }
    } finally {
      if (discoveryRequestRef.current === requestedCase) setDiscoveryLoading(false);
    }
  }, [apiWorkspaceId, selectedCaseId]);

  useEffect(() => { loadDiscovery(); }, [loadDiscovery]);

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedCaseId) return;
    setCreateError(null);
    setCreating(true);
    try {
      // Send only the findings the user actually filled in. Status is not accepted on create.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<Discovery>;
      await createDiscovery(apiWorkspaceId, selectedCaseId, body);
      setCreateForm(emptyDiscoveryForm);
      setAiFilled(false);
      await loadDiscovery();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create discovery.', status: 0 }));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (record: Discovery) => {
    setEditError(null);
    setEditDraft({
      problemStatement: record.problemStatement ?? '',
      personaFindings: record.personaFindings ?? '',
      journeyMap: record.journeyMap ?? '',
      currentStateProcessMap: record.currentStateProcessMap ?? '',
      bottleneckAnalysis: record.bottleneckAnalysis ?? '',
      dataFindings: record.dataFindings ?? '',
      legacyConstraints: record.legacyConstraints ?? '',
      futureStateNeeds: record.futureStateNeeds ?? '',
      discoveryMetrics: record.discoveryMetrics ?? '',
      governanceFindings: record.governanceFindings ?? '',
      status: record.status ?? '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!apiWorkspaceId || !discoveryId) return;
    setEditError(null);
    const patch: Partial<Discovery> = { ...editDraft } as Partial<Discovery>;
    // status is the only enum; '' is not a valid member and would 422 — omit it entirely.
    if (!patch.status) delete patch.status;
    // No required-field guard here on purpose: unlike every other wired page, all discovery fields
    // are optional on the backend, so a blanked finding is a legitimate clear, not an invalid save.
    setSaving(true);
    try {
      // Invalid status transitions (e.g. draft->completed) come back as 409 and render below.
      await updateDiscovery(apiWorkspaceId, discoveryId, patch);
      setEditing(false);
      await loadDiscovery();
    } catch (err) {
      setEditError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save discovery.', status: 0 }));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <SectionTitle eyebrow="Phase 2 · Delivery" title="Discovery" subtitle="Product discovery for a single lean business case." />
  );
  const rule = (
    <RuleNote>Discovery is 1:1 with a lean business case. Pick an objective, then a case, to view or create its discovery.</RuleNote>
  );

  // State 0 — objectives still loading. Guard first so nothing flashes before the fetch resolves.
  if (objLoading) {
    return <div className="hud-page">{header}{rule}<HudPanel><p>Loading…</p></HudPanel></div>;
  }
  if (objError) {
    return <div className="hud-page">{header}{rule}<HudPanel><p>Could not load strategic objectives: {objError.message}</p></HudPanel></div>;
  }
  // State 1 — no non-archived objective to parent a case. No pickers/API call.
  if (objectives.length === 0) {
    return (
      <div className="hud-page">
        {header}{rule}
        <HudPanel><p>Create a strategic objective first — cases (and their discovery) belong to one.</p></HudPanel>
      </div>
    );
  }

  const selectedCase = cases.find((candidate) => candidate.id === selectedCaseId);

  // Loaded shell — both pickers stay mounted so the region below can swap on the case/discovery
  // fetch state without unmounting the dropdowns.
  return (
    <div className="hud-page">
      {header}{rule}
      <HudPanel>
        <SelectInput
          label="Strategic objective"
          value={selectedObjId}
          onChange={setSelectedObjId}
          options={objectives.map((objective) => ({ value: objective.id, label: objective.strategicInitiativeName ?? '(unnamed objective)' }))}
        />
        <SelectInput
          label="Lean business case"
          value={selectedCaseId}
          onChange={setSelectedCaseId}
          options={cases.map((businessCase) => ({ value: businessCase.id, label: businessCase.title?.trim() || '(untitled case)' }))}
        />
      </HudPanel>

      {showAiModal && apiWorkspaceId && selectedCaseId && (
        <AiInterviewModal
          workspaceId={apiWorkspaceId}
          resourceType="discovery"
          parentId={selectedCaseId}
          onGenerated={applyGenerated}
          onClose={() => setShowAiModal(false)}
        />
      )}

      {casesError ? (
        <HudPanel><p>Could not load lean business cases: {casesError.message}</p></HudPanel>
      ) : casesLoading ? (
        <HudPanel><p>Loading lean business cases…</p></HudPanel>
      ) : cases.length === 0 ? (
        <HudPanel><p>No lean business cases for this objective yet. Create one on the Lean Business Cases page first.</p></HudPanel>
      ) : !selectedCaseId ? (
        <HudPanel><p>Select a lean business case to view or create its discovery.</p></HudPanel>
      ) : discoveryError ? (
        <HudPanel><p>Could not load discovery: {discoveryError.message}</p></HudPanel>
      ) : discoveryLoading ? (
        <HudPanel><p>Loading discovery…</p></HudPanel>
      ) : !discovery ? (
        // No discovery for this case yet — offer a create form. Fields may be null; all optional.
        <HudPanel>
          <p>No discovery yet for {selectedCase?.title?.trim() || 'this case'}.</p>
          {aiFilled && (
            <div className="hud-ai-banner">
              <Sparkles size={17} />
              <span>AI filled these fields — edit any of them, then Create. Nothing is saved yet.</span>
            </div>
          )}
          <form onSubmit={submitCreate} className="hud-form">
            {discoveryFindingFields.map(([field, label]) => (
              <TextAreaInput key={field} label={label} value={createForm[field]} onChange={(value) => setCreateField(field, value)} />
            ))}
            <div className="hud-actions">
              <HudButton type="button" variant="ghost" onClick={() => setShowAiModal(true)} disabled={!apiWorkspaceId}><Sparkles size={16} /> Draft with AI</HudButton>
            </div>
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'discovery for this case')}</p>}
            <HudButton type="submit" disabled={creating}><Plus size={16} /> {creating ? 'Creating…' : 'Create discovery'}</HudButton>
          </form>
        </HudPanel>
      ) : (
        // Discovery exists — view + inline edit. Fields may be null despite the type, so guard each.
        <HudPanel>
          <div className="hud-record-head">
            <div><h2>{selectedCase?.title?.trim() || 'Discovery'}</h2><p>{discovery.problemStatement ?? ''}</p></div>
            <div className="hud-badge-stack">
              <StatusBadge status={discovery.status ?? 'draft'} />
              {!editing && <HudButton variant="ghost" onClick={() => startEdit(discovery)}>Edit</HudButton>}
            </div>
          </div>
          {editing && (
            <div className="hud-ai-edit-panel">
              <div className="hud-ai-edit-grid">
                {discoveryFindingFields.map(([field, label]) => (
                  <TextAreaInput key={field} label={label} value={editDraft[field]} onChange={(value) => setEditField(field, value)} />
                ))}
                <SelectInput label="Status" value={editDraft.status} onChange={(value) => setEditField('status', value)} options={discoveryStatusOptions} />
              </div>
              <div className="hud-actions">
                <HudButton type="button" variant="ghost" onClick={() => setEditDraft((prev) => ({ ...prev, ...mergeAiDraft(prev) }))}><Sparkles size={16} /> Draft findings with AI</HudButton>
                <HudButton disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</HudButton>
                <HudButton variant="ghost" onClick={() => { setEditing(false); setEditError(null); }}>Cancel</HudButton>
              </div>
            </div>
          )}
          {editError && <p className="hud-form-error" role="alert">{renderApiMessage(editError, 'discovery for this case')}</p>}
          <FieldGrid rows={discoveryFindingFields
            .filter(([field]) => field !== 'problemStatement')
            .map(([field, label]) => ({ label, value: discovery[field] ?? '' }))} />
        </HudPanel>
      )}
    </div>
  );
}

// Note: Discovery roll-down helper showing how discovery-origin architecture components are created and reused.
// On small screens the flow stacks vertically to avoid clipped process-map content.
function RollDownBuilder({ tenant }: { tenant: TenantData }) {
  const discoveryOriginItems = [
    ...tenant.valueStreams.filter((item) => item.origin === 'discovery').map((item) => item.name),
    ...tenant.keyActivities.filter((item) => item.origin === 'discovery').map((item) => item.activityName),
    ...tenant.capabilities.filter((item) => item.origin === 'discovery').map((item) => item.capabilityName),
  ];

  return (
    <div className="hud-reference">
      <div className="hud-reference-head"><Layers size={15} /><span>Guided roll-down builder</span></div>
      <div className="hud-flow">
        {['Impacted areas', 'Architecture', 'Value streams', 'Key activities', 'Supporting components'].map((step, index) => (
          <span key={step}>{index > 0 && <ChevronRight size={14} />}<b>{step}</b></span>
        ))}
      </div>
      <div className="hud-chip-row">
        {(discoveryOriginItems.length ? discoveryOriginItems : ['No discovery-origin components in this workspace yet']).map((item) => (
          <span className="hud-chip" key={item}>{item}<small>origin: discovery</small></span>
        ))}
      </div>
      <p>Roll-down items are rendered from existing mock records. Creating new records is represented as UI affordance only in this pass.</p>
    </div>
  );
}

// Note: Features page for solution pieces that enable capabilities and belong to a lean business case. It makes
// the capability-to-feature bridge visible before requirements are detailed.
// Note: Features page. Wired to the real API — features nest under a lean business case, so two
// chained pickers (objective -> case) scope the list before the Capabilities-style CRUD below.
// The optional capability link is intentionally omitted to keep the form minimal.
function FeaturesPage({ apiWorkspaceId }: { apiWorkspaceId: string | null }) {
  // Objective picker — a case belongs to a strategic objective, so one must be selected first.
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [objLoading, setObjLoading] = useState(true);
  const [objError, setObjError] = useState<ApiError | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string>('');

  // Case picker — features nest under a case. No auto-select: the user picks the case explicitly.
  const [cases, setCases] = useState<LeanBusinessCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<ApiError | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Features for the selected case.
  const [items, setItems] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = { featureName: '', description: '', featureType: '', priority: '' };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ featureName: '', description: '', featureType: '', priority: '', status: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) { setObjectives([]); setSelectedObjId(''); setObjLoading(false); return; }
    setObjLoading(true); setObjError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      const selectable = result.items.filter((objective) => objective.status !== 'archived');
      setObjectives(selectable);
      setSelectedObjId(selectable[0]?.id ?? '');
    } catch (err) {
      setObjectives([]); setSelectedObjId('');
      setObjError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally { setObjLoading(false); }
  }, [apiWorkspaceId]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  // Changing the objective resets the case selection so we never hold a case from another objective.
  const loadCases = useCallback(async () => {
    setSelectedCaseId('');
    if (!apiWorkspaceId || !selectedObjId) { setCases([]); setCasesLoading(false); return; }
    setCasesLoading(true); setCasesError(null);
    try {
      const result = await listBusinessCases(apiWorkspaceId, selectedObjId);
      setCases(result.items);
    } catch (err) {
      setCases([]);
      setCasesError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load lean business cases.', status: 0 }));
    } finally { setCasesLoading(false); }
  }, [apiWorkspaceId, selectedObjId]);
  useEffect(() => { loadCases(); }, [loadCases]);

  const loadFeatures = useCallback(async () => {
    // Switching case exits any open edit/create so nothing carries across lists.
    setEditingId(null); setShowCreate(false); setCreateForm(emptyCreateForm); setCreateError(null); setCardError(null);
    if (!apiWorkspaceId || !selectedCaseId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const result = await listFeatures(apiWorkspaceId, selectedCaseId);
      setItems(result.items);
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load features.', status: 0 }));
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiWorkspaceId, selectedCaseId]);
  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedCaseId) return;
    setCreateError(null); setCreating(true);
    try {
      // Send only the fields the user actually filled in — this drops empty enums too.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<Feature>;
      await createFeature(apiWorkspaceId, selectedCaseId, body);
      setCreateForm(emptyCreateForm); setShowCreate(false);
      await loadFeatures();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create feature.', status: 0 }));
    } finally { setCreating(false); }
  };

  const startEdit = (feature: Feature) => {
    setCardError(null);
    setEditingId(feature.id);
    setEditDraft({
      featureName: feature.featureName ?? '',
      description: feature.description ?? '',
      featureType: feature.featureType ?? '',
      priority: feature.priority ?? '',
      status: feature.status ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    // Required on create; PATCH treats '' as "provided", so guard the name before saving.
    if (!editDraft.featureName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }) });
      return;
    }
    const patch: Partial<Feature> = { ...editDraft } as Partial<Feature>;
    // Empty enums are not valid members and would 422 — omit each blank one.
    if (!patch.featureType) delete patch.featureType;
    if (!patch.priority) delete patch.priority;
    if (!patch.status) delete patch.status;
    setSavingId(id);
    try {
      await updateFeature(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadFeatures();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save feature.', status: 0 }) });
    } finally { setSavingId(null); }
  };

  const removeFeature = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null); setSavingId(id);
    try {
      await deleteFeature(apiWorkspaceId, id);
      await loadFeatures();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete feature.', status: 0 }) });
    } finally { setSavingId(null); }
  };

  const header = (
    <SectionTitle eyebrow="Phase 2 · Delivery" title="Features" subtitle="Solution pieces that belong to a lean business case." />
  );
  const rule = (
    <RuleNote>Features nest under a lean business case. Pick an objective, then a case, to manage its features.</RuleNote>
  );

  if (objLoading) return <div className="hud-page">{header}{rule}<HudPanel><p>Loading…</p></HudPanel></div>;
  if (objError) return <div className="hud-page">{header}{rule}<HudPanel><p>Could not load strategic objectives: {objError.message}</p></HudPanel></div>;
  if (objectives.length === 0) {
    return <div className="hud-page">{header}{rule}<HudPanel><p>Create a strategic objective first — cases (and their features) belong to one.</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}{rule}
      <HudPanel>
        <SelectInput label="Strategic objective" value={selectedObjId} onChange={setSelectedObjId}
          options={objectives.map((objective) => ({ value: objective.id, label: objective.strategicInitiativeName ?? '(unnamed objective)' }))} />
        <SelectInput label="Lean business case" value={selectedCaseId} onChange={setSelectedCaseId}
          options={cases.map((businessCase) => ({ value: businessCase.id, label: businessCase.title?.trim() || '(untitled case)' }))} />
      </HudPanel>

      {casesError ? (
        <HudPanel><p>Could not load lean business cases: {casesError.message}</p></HudPanel>
      ) : casesLoading ? (
        <HudPanel><p>Loading lean business cases…</p></HudPanel>
      ) : cases.length === 0 ? (
        <HudPanel><p>No lean business cases for this objective yet. Create one on the Lean Business Cases page first.</p></HudPanel>
      ) : !selectedCaseId ? (
        <HudPanel><p>Select a lean business case to manage its features.</p></HudPanel>
      ) : (
        <>
          <div className="hud-actions">
            <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
              <Plus size={16} /> {showCreate ? 'Close' : 'New feature'}
            </HudButton>
          </div>
          {showCreate && (
            <HudPanel>
              <form onSubmit={submitCreate} className="hud-form">
                <TextInput label="Name (required)" value={createForm.featureName} onChange={(value) => setCreateField('featureName', value)} />
                <TextInput label="Description" value={createForm.description} onChange={(value) => setCreateField('description', value)} />
                <SelectInput label="Feature type" value={createForm.featureType} onChange={(value) => setCreateField('featureType', value)} options={featureTypeOptions} />
                <SelectInput label="Priority" value={createForm.priority} onChange={(value) => setCreateField('priority', value)} options={priorityOptions} />
                {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'features')}</p>}
                <HudButton type="submit" disabled={creating || !createForm.featureName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create feature'}</HudButton>
              </form>
            </HudPanel>
          )}

          {error ? (
            <HudPanel><p>Could not load features: {error.message}</p></HudPanel>
          ) : loading ? (
            <HudPanel><p>Loading features…</p></HudPanel>
          ) : (
            <>
              {items.length === 0 && <HudPanel><p>No features for this case yet. Create the first one.</p></HudPanel>}
              <div className="hud-primary-list-desktop">
                {items.map((feature) => (
                  <HudPanel key={feature.id}>
                    <div className="hud-record-head">
                      <div><h2>{feature.featureName?.trim() || '(unnamed feature)'}</h2><p>{feature.description ?? ''}</p></div>
                      <div className="hud-badge-stack">
                        {editingId !== feature.id && <HudButton variant="ghost" onClick={() => startEdit(feature)}>Edit</HudButton>}
                        <HudButton variant="ghost" disabled={savingId === feature.id} onClick={() => removeFeature(feature.id)}>Delete</HudButton>
                        <StatusBadge status={feature.status ?? 'draft'} />
                      </div>
                    </div>
                    {editingId === feature.id && (
                      <div className="hud-ai-edit-panel">
                        <div className="hud-ai-edit-grid">
                          <TextInput label="Name" value={editDraft.featureName} onChange={(value) => setEditDraft((prev) => ({ ...prev, featureName: value }))} />
                          <TextInput label="Description" value={editDraft.description} onChange={(value) => setEditDraft((prev) => ({ ...prev, description: value }))} />
                          <SelectInput label="Feature type" value={editDraft.featureType} onChange={(value) => setEditDraft((prev) => ({ ...prev, featureType: value }))} options={featureTypeOptions} />
                          <SelectInput label="Priority" value={editDraft.priority} onChange={(value) => setEditDraft((prev) => ({ ...prev, priority: value }))} options={priorityOptions} />
                          <SelectInput label="Status" value={editDraft.status} onChange={(value) => setEditDraft((prev) => ({ ...prev, status: value }))} options={discoveryStatusOptions} />
                        </div>
                        <div className="hud-actions">
                          <HudButton disabled={savingId === feature.id} onClick={() => saveEdit(feature.id)}>{savingId === feature.id ? 'Saving…' : 'Save'}</HudButton>
                          <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                        </div>
                      </div>
                    )}
                    {cardError?.id === feature.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'features')}</p>}
                    <FieldGrid rows={[
                      { label: 'Feature type', value: feature.featureType },
                      { label: 'Priority', value: feature.priority },
                    ]} />
                  </HudPanel>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Note: Requirements page. Wired to the real API — requirements nest under a feature, so THREE
// chained pickers (objective -> case -> feature) scope the list before the CRUD below.
function RequirementsPage({ apiWorkspaceId }: { apiWorkspaceId: string | null }) {
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [objLoading, setObjLoading] = useState(true);
  const [objError, setObjError] = useState<ApiError | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string>('');

  const [cases, setCases] = useState<LeanBusinessCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<ApiError | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Feature picker — the third link. No auto-select: the user picks the feature explicitly.
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [featuresError, setFeaturesError] = useState<ApiError | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('');

  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = { requirementName: '', description: '', requirementType: '', acceptanceCriteria: '', priority: '' };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ requirementName: '', description: '', requirementType: '', acceptanceCriteria: '', priority: '', status: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) { setObjectives([]); setSelectedObjId(''); setObjLoading(false); return; }
    setObjLoading(true); setObjError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      const selectable = result.items.filter((objective) => objective.status !== 'archived');
      setObjectives(selectable);
      setSelectedObjId(selectable[0]?.id ?? '');
    } catch (err) {
      setObjectives([]); setSelectedObjId('');
      setObjError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally { setObjLoading(false); }
  }, [apiWorkspaceId]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  // Changing the objective resets the case (which in turn resets the feature).
  const loadCases = useCallback(async () => {
    setSelectedCaseId('');
    if (!apiWorkspaceId || !selectedObjId) { setCases([]); setCasesLoading(false); return; }
    setCasesLoading(true); setCasesError(null);
    try {
      const result = await listBusinessCases(apiWorkspaceId, selectedObjId);
      setCases(result.items);
    } catch (err) {
      setCases([]);
      setCasesError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load lean business cases.', status: 0 }));
    } finally { setCasesLoading(false); }
  }, [apiWorkspaceId, selectedObjId]);
  useEffect(() => { loadCases(); }, [loadCases]);

  // Changing the case resets the feature selection.
  const loadFeatures = useCallback(async () => {
    setSelectedFeatureId('');
    if (!apiWorkspaceId || !selectedCaseId) { setFeatures([]); setFeaturesLoading(false); return; }
    setFeaturesLoading(true); setFeaturesError(null);
    try {
      const result = await listFeatures(apiWorkspaceId, selectedCaseId);
      setFeatures(result.items);
    } catch (err) {
      setFeatures([]);
      setFeaturesError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load features.', status: 0 }));
    } finally { setFeaturesLoading(false); }
  }, [apiWorkspaceId, selectedCaseId]);
  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  const loadRequirements = useCallback(async () => {
    setEditingId(null); setShowCreate(false); setCreateForm(emptyCreateForm); setCreateError(null); setCardError(null);
    if (!apiWorkspaceId || !selectedFeatureId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const result = await listRequirements(apiWorkspaceId, selectedFeatureId);
      setItems(result.items);
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load requirements.', status: 0 }));
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiWorkspaceId, selectedFeatureId]);
  useEffect(() => { loadRequirements(); }, [loadRequirements]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedFeatureId) return;
    setCreateError(null); setCreating(true);
    try {
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<Requirement>;
      await createRequirement(apiWorkspaceId, selectedFeatureId, body);
      setCreateForm(emptyCreateForm); setShowCreate(false);
      await loadRequirements();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create requirement.', status: 0 }));
    } finally { setCreating(false); }
  };

  const startEdit = (requirement: Requirement) => {
    setCardError(null);
    setEditingId(requirement.id);
    setEditDraft({
      requirementName: requirement.requirementName ?? '',
      description: requirement.description ?? '',
      requirementType: requirement.requirementType ?? '',
      acceptanceCriteria: requirement.acceptanceCriteria ?? '',
      priority: requirement.priority ?? '',
      status: requirement.status ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    if (!editDraft.requirementName.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Name is required.', status: 0 }) });
      return;
    }
    const patch: Partial<Requirement> = { ...editDraft } as Partial<Requirement>;
    if (!patch.requirementType) delete patch.requirementType;
    if (!patch.priority) delete patch.priority;
    if (!patch.status) delete patch.status;
    setSavingId(id);
    try {
      await updateRequirement(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadRequirements();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save requirement.', status: 0 }) });
    } finally { setSavingId(null); }
  };

  const removeRequirement = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null); setSavingId(id);
    try {
      await deleteRequirement(apiWorkspaceId, id);
      await loadRequirements();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete requirement.', status: 0 }) });
    } finally { setSavingId(null); }
  };

  const header = (
    <SectionTitle eyebrow="Phase 2 · Delivery" title="Requirements" subtitle="Detailed specifications under a feature." />
  );
  const rule = (
    <RuleNote>Requirements nest under a feature. Pick an objective, a case, then a feature to manage its requirements.</RuleNote>
  );

  if (objLoading) return <div className="hud-page">{header}{rule}<HudPanel><p>Loading…</p></HudPanel></div>;
  if (objError) return <div className="hud-page">{header}{rule}<HudPanel><p>Could not load strategic objectives: {objError.message}</p></HudPanel></div>;
  if (objectives.length === 0) {
    return <div className="hud-page">{header}{rule}<HudPanel><p>Create a strategic objective first — features (and their requirements) belong to one.</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}{rule}
      <HudPanel>
        <SelectInput label="Strategic objective" value={selectedObjId} onChange={setSelectedObjId}
          options={objectives.map((objective) => ({ value: objective.id, label: objective.strategicInitiativeName ?? '(unnamed objective)' }))} />
        <SelectInput label="Lean business case" value={selectedCaseId} onChange={setSelectedCaseId}
          options={cases.map((businessCase) => ({ value: businessCase.id, label: businessCase.title?.trim() || '(untitled case)' }))} />
        <SelectInput label="Feature" value={selectedFeatureId} onChange={setSelectedFeatureId}
          options={features.map((feature) => ({ value: feature.id, label: feature.featureName?.trim() || '(unnamed feature)' }))} />
      </HudPanel>

      {casesError ? (
        <HudPanel><p>Could not load lean business cases: {casesError.message}</p></HudPanel>
      ) : casesLoading ? (
        <HudPanel><p>Loading lean business cases…</p></HudPanel>
      ) : cases.length === 0 ? (
        <HudPanel><p>No lean business cases for this objective yet. Create one on the Lean Business Cases page first.</p></HudPanel>
      ) : !selectedCaseId ? (
        <HudPanel><p>Select a lean business case to see its features.</p></HudPanel>
      ) : featuresError ? (
        <HudPanel><p>Could not load features: {featuresError.message}</p></HudPanel>
      ) : featuresLoading ? (
        <HudPanel><p>Loading features…</p></HudPanel>
      ) : features.length === 0 ? (
        <HudPanel><p>No features for this case yet. Create one on the Features page first.</p></HudPanel>
      ) : !selectedFeatureId ? (
        <HudPanel><p>Select a feature to manage its requirements.</p></HudPanel>
      ) : (
        <>
          <div className="hud-actions">
            <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
              <Plus size={16} /> {showCreate ? 'Close' : 'New requirement'}
            </HudButton>
          </div>
          {showCreate && (
            <HudPanel>
              <form onSubmit={submitCreate} className="hud-form">
                <TextInput label="Name (required)" value={createForm.requirementName} onChange={(value) => setCreateField('requirementName', value)} />
                <TextInput label="Description" value={createForm.description} onChange={(value) => setCreateField('description', value)} />
                <SelectInput label="Requirement type" value={createForm.requirementType} onChange={(value) => setCreateField('requirementType', value)} options={requirementTypeOptions} />
                <TextInput label="Acceptance criteria" value={createForm.acceptanceCriteria} onChange={(value) => setCreateField('acceptanceCriteria', value)} />
                <SelectInput label="Priority" value={createForm.priority} onChange={(value) => setCreateField('priority', value)} options={priorityOptions} />
                {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'requirements')}</p>}
                <HudButton type="submit" disabled={creating || !createForm.requirementName.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create requirement'}</HudButton>
              </form>
            </HudPanel>
          )}

          {error ? (
            <HudPanel><p>Could not load requirements: {error.message}</p></HudPanel>
          ) : loading ? (
            <HudPanel><p>Loading requirements…</p></HudPanel>
          ) : (
            <>
              {items.length === 0 && <HudPanel><p>No requirements for this feature yet. Create the first one.</p></HudPanel>}
              <div className="hud-primary-list-desktop">
                {items.map((requirement) => (
                  <HudPanel key={requirement.id}>
                    <div className="hud-record-head">
                      <div><h2>{requirement.requirementName?.trim() || '(unnamed requirement)'}</h2><p>{requirement.description ?? ''}</p></div>
                      <div className="hud-badge-stack">
                        {editingId !== requirement.id && <HudButton variant="ghost" onClick={() => startEdit(requirement)}>Edit</HudButton>}
                        <HudButton variant="ghost" disabled={savingId === requirement.id} onClick={() => removeRequirement(requirement.id)}>Delete</HudButton>
                        <StatusBadge status={requirement.status ?? 'draft'} />
                      </div>
                    </div>
                    {editingId === requirement.id && (
                      <div className="hud-ai-edit-panel">
                        <div className="hud-ai-edit-grid">
                          <TextInput label="Name" value={editDraft.requirementName} onChange={(value) => setEditDraft((prev) => ({ ...prev, requirementName: value }))} />
                          <TextInput label="Description" value={editDraft.description} onChange={(value) => setEditDraft((prev) => ({ ...prev, description: value }))} />
                          <SelectInput label="Requirement type" value={editDraft.requirementType} onChange={(value) => setEditDraft((prev) => ({ ...prev, requirementType: value }))} options={requirementTypeOptions} />
                          <TextInput label="Acceptance criteria" value={editDraft.acceptanceCriteria} onChange={(value) => setEditDraft((prev) => ({ ...prev, acceptanceCriteria: value }))} />
                          <SelectInput label="Priority" value={editDraft.priority} onChange={(value) => setEditDraft((prev) => ({ ...prev, priority: value }))} options={priorityOptions} />
                          <SelectInput label="Status" value={editDraft.status} onChange={(value) => setEditDraft((prev) => ({ ...prev, status: value }))} options={discoveryStatusOptions} />
                        </div>
                        <div className="hud-actions">
                          <HudButton disabled={savingId === requirement.id} onClick={() => saveEdit(requirement.id)}>{savingId === requirement.id ? 'Saving…' : 'Save'}</HudButton>
                          <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                        </div>
                      </div>
                    )}
                    {cardError?.id === requirement.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'requirements')}</p>}
                    <FieldGrid rows={[
                      { label: 'Requirement type', value: requirement.requirementType },
                      { label: 'Acceptance criteria', value: requirement.acceptanceCriteria },
                      { label: 'Priority', value: requirement.priority },
                    ]} />
                  </HudPanel>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Note: Conceptual deliverables page. Wired to the real API — deliverables nest under a lean business
// case (objective -> case pickers). deliverableType is required and immutable: chosen on create, absent
// from the edit form (PATCH does not accept it).
function DeliverablesPage({ apiWorkspaceId }: { apiWorkspaceId: string | null }) {
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [objLoading, setObjLoading] = useState(true);
  const [objError, setObjError] = useState<ApiError | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string>('');

  const [cases, setCases] = useState<LeanBusinessCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<ApiError | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  const [items, setItems] = useState<ConceptualDeliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const emptyCreateForm = { deliverableType: '', title: '', content: '', source: '' };
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', content: '', source: '', status: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cardError, setCardError] = useState<{ id: string; error: ApiError } | null>(null);

  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) { setObjectives([]); setSelectedObjId(''); setObjLoading(false); return; }
    setObjLoading(true); setObjError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      const selectable = result.items.filter((objective) => objective.status !== 'archived');
      setObjectives(selectable);
      setSelectedObjId(selectable[0]?.id ?? '');
    } catch (err) {
      setObjectives([]); setSelectedObjId('');
      setObjError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally { setObjLoading(false); }
  }, [apiWorkspaceId]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const loadCases = useCallback(async () => {
    setSelectedCaseId('');
    if (!apiWorkspaceId || !selectedObjId) { setCases([]); setCasesLoading(false); return; }
    setCasesLoading(true); setCasesError(null);
    try {
      const result = await listBusinessCases(apiWorkspaceId, selectedObjId);
      setCases(result.items);
    } catch (err) {
      setCases([]);
      setCasesError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load lean business cases.', status: 0 }));
    } finally { setCasesLoading(false); }
  }, [apiWorkspaceId, selectedObjId]);
  useEffect(() => { loadCases(); }, [loadCases]);

  const loadDeliverables = useCallback(async () => {
    setEditingId(null); setShowCreate(false); setCreateForm(emptyCreateForm); setCreateError(null); setCardError(null);
    if (!apiWorkspaceId || !selectedCaseId) { setItems([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const result = await listDeliverables(apiWorkspaceId, selectedCaseId);
      setItems(result.items);
    } catch (err) {
      setItems([]);
      setError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load deliverables.', status: 0 }));
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiWorkspaceId, selectedCaseId]);
  useEffect(() => { loadDeliverables(); }, [loadDeliverables]);

  const setCreateField = (field: keyof typeof emptyCreateForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedCaseId) return;
    setCreateError(null); setCreating(true);
    try {
      // deliverableType and title are required and non-empty; source (enum) is dropped if blank.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<ConceptualDeliverable>;
      await createDeliverable(apiWorkspaceId, selectedCaseId, body);
      setCreateForm(emptyCreateForm); setShowCreate(false);
      await loadDeliverables();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create deliverable.', status: 0 }));
    } finally { setCreating(false); }
  };

  const startEdit = (deliverable: ConceptualDeliverable) => {
    setCardError(null);
    setEditingId(deliverable.id);
    // deliverableType is immutable on PATCH, so it is intentionally not part of the edit draft.
    setEditDraft({
      title: deliverable.title ?? '',
      content: deliverable.content ?? '',
      source: deliverable.source ?? '',
      status: deliverable.status ?? '',
    });
  };

  const saveEdit = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null);
    if (!editDraft.title.trim()) {
      setCardError({ id, error: new ApiError({ code: 'validation_error', message: 'Title is required.', status: 0 }) });
      return;
    }
    const patch: Partial<ConceptualDeliverable> = { ...editDraft } as Partial<ConceptualDeliverable>;
    if (!patch.source) delete patch.source;
    if (!patch.status) delete patch.status;
    setSavingId(id);
    try {
      await updateDeliverable(apiWorkspaceId, id, patch);
      setEditingId(null);
      await loadDeliverables();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save deliverable.', status: 0 }) });
    } finally { setSavingId(null); }
  };

  const removeDeliverable = async (id: string) => {
    if (!apiWorkspaceId) return;
    setCardError(null); setSavingId(id);
    try {
      await deleteDeliverable(apiWorkspaceId, id);
      await loadDeliverables();
    } catch (err) {
      setCardError({ id, error: err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to delete deliverable.', status: 0 }) });
    } finally { setSavingId(null); }
  };

  const header = (
    <SectionTitle eyebrow="Phase 2 · Delivery" title="Conceptual Deliverables" subtitle="The solution outputs for a lean business case." />
  );
  const rule = (
    <RuleNote>Deliverables are suggestions; finalized content is never auto-overwritten. Pick an objective, then a case, to manage them.</RuleNote>
  );

  if (objLoading) return <div className="hud-page">{header}{rule}<HudPanel><p>Loading…</p></HudPanel></div>;
  if (objError) return <div className="hud-page">{header}{rule}<HudPanel><p>Could not load strategic objectives: {objError.message}</p></HudPanel></div>;
  if (objectives.length === 0) {
    return <div className="hud-page">{header}{rule}<HudPanel><p>Create a strategic objective first — cases (and their deliverables) belong to one.</p></HudPanel></div>;
  }

  return (
    <div className="hud-page">
      {header}{rule}
      <HudPanel>
        <SelectInput label="Strategic objective" value={selectedObjId} onChange={setSelectedObjId}
          options={objectives.map((objective) => ({ value: objective.id, label: objective.strategicInitiativeName ?? '(unnamed objective)' }))} />
        <SelectInput label="Lean business case" value={selectedCaseId} onChange={setSelectedCaseId}
          options={cases.map((businessCase) => ({ value: businessCase.id, label: businessCase.title?.trim() || '(untitled case)' }))} />
      </HudPanel>

      {casesError ? (
        <HudPanel><p>Could not load lean business cases: {casesError.message}</p></HudPanel>
      ) : casesLoading ? (
        <HudPanel><p>Loading lean business cases…</p></HudPanel>
      ) : cases.length === 0 ? (
        <HudPanel><p>No lean business cases for this objective yet. Create one on the Lean Business Cases page first.</p></HudPanel>
      ) : !selectedCaseId ? (
        <HudPanel><p>Select a lean business case to manage its deliverables.</p></HudPanel>
      ) : (
        <>
          <div className="hud-actions">
            <HudButton onClick={() => { setShowCreate((prev) => !prev); setCreateError(null); }}>
              <Plus size={16} /> {showCreate ? 'Close' : 'New deliverable'}
            </HudButton>
          </div>
          {showCreate && (
            <HudPanel>
              <form onSubmit={submitCreate} className="hud-form">
                <SelectInput label="Deliverable type (required)" value={createForm.deliverableType} onChange={(value) => setCreateField('deliverableType', value)} options={deliverableTypeOptions} />
                <TextInput label="Title (required)" value={createForm.title} onChange={(value) => setCreateField('title', value)} />
                <TextInput label="Content" value={createForm.content} onChange={(value) => setCreateField('content', value)} />
                <SelectInput label="Source" value={createForm.source} onChange={(value) => setCreateField('source', value)} options={deliverableSourceOptions} />
                {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'deliverables')}</p>}
                <HudButton type="submit" disabled={creating || !createForm.deliverableType || !createForm.title.trim()}><Plus size={16} /> {creating ? 'Creating…' : 'Create deliverable'}</HudButton>
              </form>
            </HudPanel>
          )}

          {error ? (
            <HudPanel><p>Could not load deliverables: {error.message}</p></HudPanel>
          ) : loading ? (
            <HudPanel><p>Loading deliverables…</p></HudPanel>
          ) : (
            <>
              {items.length === 0 && <HudPanel><p>No deliverables for this case yet. Create the first one.</p></HudPanel>}
              <div className="hud-primary-list-desktop">
                {items.map((deliverable) => (
                  <HudPanel key={deliverable.id}>
                    <div className="hud-record-head">
                      <div><h2>{deliverable.title?.trim() || '(untitled deliverable)'}</h2><p>{deliverable.content ?? ''}</p></div>
                      <div className="hud-badge-stack">
                        {editingId !== deliverable.id && <HudButton variant="ghost" onClick={() => startEdit(deliverable)}>Edit</HudButton>}
                        <HudButton variant="ghost" disabled={savingId === deliverable.id} onClick={() => removeDeliverable(deliverable.id)}>Delete</HudButton>
                        {deliverable.source && <HudBadge tone={deliverable.source === 'user_finalized' ? 'green' : 'amber'}>{deliverable.source.replaceAll('_', ' ')}</HudBadge>}
                        <StatusBadge status={deliverable.status ?? 'draft'} />
                      </div>
                    </div>
                    {editingId === deliverable.id && (
                      <div className="hud-ai-edit-panel">
                        <div className="hud-ai-edit-grid">
                          <TextInput label="Title" value={editDraft.title} onChange={(value) => setEditDraft((prev) => ({ ...prev, title: value }))} />
                          <TextInput label="Content" value={editDraft.content} onChange={(value) => setEditDraft((prev) => ({ ...prev, content: value }))} />
                          <SelectInput label="Source" value={editDraft.source} onChange={(value) => setEditDraft((prev) => ({ ...prev, source: value }))} options={deliverableSourceOptions} />
                          <SelectInput label="Status" value={editDraft.status} onChange={(value) => setEditDraft((prev) => ({ ...prev, status: value }))} options={discoveryStatusOptions} />
                        </div>
                        <div className="hud-actions">
                          <HudButton disabled={savingId === deliverable.id} onClick={() => saveEdit(deliverable.id)}>{savingId === deliverable.id ? 'Saving…' : 'Save'}</HudButton>
                          <HudButton variant="ghost" onClick={() => { setEditingId(null); setCardError(null); }}>Cancel</HudButton>
                        </div>
                      </div>
                    )}
                    {cardError?.id === deliverable.id && <p className="hud-form-error" role="alert">{renderApiMessage(cardError.error, 'deliverables')}</p>}
                    <FieldGrid rows={[
                      { label: 'Deliverable type', value: deliverable.deliverableType },
                      { label: 'Source', value: deliverable.source },
                      { label: 'Content', value: deliverable.content },
                    ]} />
                  </HudPanel>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Note: Implementation page. Wired to the real API — a SINGLETON per lean business case (like
// discovery): two chained pickers (objective -> case) select the record, fetched GET-or-404.
// actualCost/actualValue are derived and read-only; the allocation sub-endpoints are out of scope.
function ImplementationPage({ apiWorkspaceId }: { apiWorkspaceId: string | null }) {
  const [objectives, setObjectives] = useState<StrategicObjective[]>([]);
  const [objLoading, setObjLoading] = useState(true);
  const [objError, setObjError] = useState<ApiError | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string>('');

  const [cases, setCases] = useState<LeanBusinessCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<ApiError | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // The singleton implementation for the selected case. null after a 404 means "not created yet".
  const [implementation, setImplementation] = useState<Implementation | null>(null);
  const [implLoading, setImplLoading] = useState(false);
  const [implError, setImplError] = useState<ApiError | null>(null);
  // Guards against a stale response after a rapid case switch (same pattern as discovery).
  const implRequestRef = useRef<string | null>(null);
  const implId = implementation?.id ?? null;

  const emptyForm = { valueType: '', implementationStatus: '', startDate: '', completionDate: '', outcomeNotes: '' };
  const [createForm, setCreateForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<ApiError | null>(null);

  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<ApiError | null>(null);

  const setCreateField = (field: keyof typeof emptyForm, value: string) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  const setEditField = (field: keyof typeof emptyForm, value: string) =>
    setEditDraft((prev) => ({ ...prev, [field]: value }));

  const loadObjectives = useCallback(async () => {
    if (!apiWorkspaceId) { setObjectives([]); setSelectedObjId(''); setObjLoading(false); return; }
    setObjLoading(true); setObjError(null);
    try {
      const result = await listObjectives(apiWorkspaceId);
      const selectable = result.items.filter((objective) => objective.status !== 'archived');
      setObjectives(selectable);
      setSelectedObjId(selectable[0]?.id ?? '');
    } catch (err) {
      setObjectives([]); setSelectedObjId('');
      setObjError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load strategic objectives.', status: 0 }));
    } finally { setObjLoading(false); }
  }, [apiWorkspaceId]);
  useEffect(() => { loadObjectives(); }, [loadObjectives]);

  const loadCases = useCallback(async () => {
    setSelectedCaseId('');
    if (!apiWorkspaceId || !selectedObjId) { setCases([]); setCasesLoading(false); return; }
    setCasesLoading(true); setCasesError(null);
    try {
      const result = await listBusinessCases(apiWorkspaceId, selectedObjId);
      setCases(result.items);
    } catch (err) {
      setCases([]);
      setCasesError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load lean business cases.', status: 0 }));
    } finally { setCasesLoading(false); }
  }, [apiWorkspaceId, selectedObjId]);
  useEffect(() => { loadCases(); }, [loadCases]);

  const loadImplementation = useCallback(async () => {
    const requestedCase = selectedCaseId;
    implRequestRef.current = requestedCase;
    setEditing(false); setCreateForm(emptyForm); setCreateError(null); setEditError(null); setImplError(null);
    if (!apiWorkspaceId || !requestedCase) { setImplementation(null); setImplLoading(false); return; }
    setImplLoading(true);
    try {
      const record = await getImplementationForCase(apiWorkspaceId, requestedCase);
      if (implRequestRef.current !== requestedCase) return; // superseded by a newer case
      setImplementation(record);
    } catch (err) {
      if (implRequestRef.current !== requestedCase) return; // superseded by a newer case
      if (err instanceof ApiError && err.status === 404) {
        setImplementation(null); // not created yet — expected, not an error
      } else {
        setImplementation(null);
        setImplError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to load implementation.', status: 0 }));
      }
    } finally {
      if (implRequestRef.current === requestedCase) setImplLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiWorkspaceId, selectedCaseId]);
  useEffect(() => { loadImplementation(); }, [loadImplementation]);

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!apiWorkspaceId || !selectedCaseId) return;
    setCreateError(null); setCreating(true);
    try {
      // The empty-string filter also drops blank enums (valueType/implementationStatus) and blank
      // dates (startDate/completionDate) — the same "empty string where the backend wants a typed
      // value or nothing" pattern handled on Cases (enums, title) and below on PATCH.
      const body = Object.fromEntries(Object.entries(createForm).filter(([, value]) => value !== '')) as Partial<Implementation>;
      await createImplementation(apiWorkspaceId, selectedCaseId, body);
      setCreateForm(emptyForm);
      await loadImplementation();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to create implementation.', status: 0 }));
    } finally { setCreating(false); }
  };

  const startEdit = (record: Implementation) => {
    setEditError(null);
    setEditDraft({
      valueType: record.valueType ?? '',
      implementationStatus: record.implementationStatus ?? '',
      startDate: record.startDate ?? '',
      completionDate: record.completionDate ?? '',
      outcomeNotes: record.outcomeNotes ?? '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!apiWorkspaceId || !implId) return;
    setEditError(null);
    const patch: Partial<Implementation> = { ...editDraft } as Partial<Implementation>;
    // Empty enums AND empty dates are typed on the backend (enum member / date | None): '' would 422,
    // so omit each blank one — the same pattern as Cases enums/title and the create filter above.
    if (!patch.valueType) delete patch.valueType;
    if (!patch.implementationStatus) delete patch.implementationStatus;
    if (!patch.startDate) delete patch.startDate;
    if (!patch.completionDate) delete patch.completionDate;
    setSaving(true);
    try {
      await updateImplementation(apiWorkspaceId, implId, patch);
      setEditing(false);
      await loadImplementation();
    } catch (err) {
      setEditError(err instanceof ApiError ? err : new ApiError({ code: 'unknown_error', message: 'Failed to save implementation.', status: 0 }));
    } finally { setSaving(false); }
  };

  const header = (
    <SectionTitle eyebrow="Phase 2 · Delivery" title="Implementation" subtitle="Where a lean business case ships and its actual numbers are recorded." />
  );
  const rule = (
    <RuleNote>Implementation is 1:1 with a lean business case. Pick an objective, then a case, to view or create it. Actual cost/value are derived upstream and read-only here.</RuleNote>
  );

  if (objLoading) return <div className="hud-page">{header}{rule}<HudPanel><p>Loading…</p></HudPanel></div>;
  if (objError) return <div className="hud-page">{header}{rule}<HudPanel><p>Could not load strategic objectives: {objError.message}</p></HudPanel></div>;
  if (objectives.length === 0) {
    return <div className="hud-page">{header}{rule}<HudPanel><p>Create a strategic objective first — cases (and their implementation) belong to one.</p></HudPanel></div>;
  }

  const selectedCase = cases.find((candidate) => candidate.id === selectedCaseId);

  const implFormFields = (
    form: typeof emptyForm,
    setField: (field: keyof typeof emptyForm, value: string) => void,
  ) => (
    <>
      <SelectInput label="Value type" value={form.valueType} onChange={(value) => setField('valueType', value)} options={caseValueTypeOptions} />
      <SelectInput label="Implementation status" value={form.implementationStatus} onChange={(value) => setField('implementationStatus', value)} options={implementationStatusOptions} />
      <TextInput label="Start date (YYYY-MM-DD)" value={form.startDate} onChange={(value) => setField('startDate', value)} />
      <TextInput label="Completion date (YYYY-MM-DD)" value={form.completionDate} onChange={(value) => setField('completionDate', value)} />
      <TextInput label="Outcome notes" value={form.outcomeNotes} onChange={(value) => setField('outcomeNotes', value)} />
    </>
  );

  return (
    <div className="hud-page">
      {header}{rule}
      <HudPanel>
        <SelectInput label="Strategic objective" value={selectedObjId} onChange={setSelectedObjId}
          options={objectives.map((objective) => ({ value: objective.id, label: objective.strategicInitiativeName ?? '(unnamed objective)' }))} />
        <SelectInput label="Lean business case" value={selectedCaseId} onChange={setSelectedCaseId}
          options={cases.map((businessCase) => ({ value: businessCase.id, label: businessCase.title?.trim() || '(untitled case)' }))} />
      </HudPanel>

      {casesError ? (
        <HudPanel><p>Could not load lean business cases: {casesError.message}</p></HudPanel>
      ) : casesLoading ? (
        <HudPanel><p>Loading lean business cases…</p></HudPanel>
      ) : cases.length === 0 ? (
        <HudPanel><p>No lean business cases for this objective yet. Create one on the Lean Business Cases page first.</p></HudPanel>
      ) : !selectedCaseId ? (
        <HudPanel><p>Select a lean business case to view or create its implementation.</p></HudPanel>
      ) : implError ? (
        <HudPanel><p>Could not load implementation: {implError.message}</p></HudPanel>
      ) : implLoading ? (
        <HudPanel><p>Loading implementation…</p></HudPanel>
      ) : !implementation ? (
        <HudPanel>
          <p>No implementation yet for {selectedCase?.title?.trim() || 'this case'}.</p>
          <form onSubmit={submitCreate} className="hud-form">
            {implFormFields(createForm, setCreateField)}
            {createError && <p className="hud-form-error" role="alert">{renderApiMessage(createError, 'implementation for this case')}</p>}
            <HudButton type="submit" disabled={creating}><Plus size={16} /> {creating ? 'Creating…' : 'Create implementation'}</HudButton>
          </form>
        </HudPanel>
      ) : (
        <HudPanel>
          <div className="hud-record-head">
            <div><h2>{selectedCase?.title?.trim() || 'Implementation'}</h2><p>{implementation.outcomeNotes ?? ''}</p></div>
            <div className="hud-badge-stack">
              <StatusBadge status={implementation.implementationStatus ?? 'not_started'} />
              {!editing && <HudButton variant="ghost" onClick={() => startEdit(implementation)}>Edit</HudButton>}
            </div>
          </div>
          {editing && (
            <div className="hud-ai-edit-panel">
              <div className="hud-ai-edit-grid">
                {implFormFields(editDraft, setEditField)}
              </div>
              <div className="hud-actions">
                <HudButton disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</HudButton>
                <HudButton variant="ghost" onClick={() => { setEditing(false); setEditError(null); }}>Cancel</HudButton>
              </div>
            </div>
          )}
          {editError && <p className="hud-form-error" role="alert">{renderApiMessage(editError, 'implementation for this case')}</p>}
          <FieldGrid rows={[
            { label: 'Value type', value: implementation.valueType },
            { label: 'Start date', value: implementation.startDate },
            { label: 'Completion date', value: implementation.completionDate },
            { label: 'Actual cost', value: implementation.actualCost === null || implementation.actualCost === undefined ? 'Not directly edited' : formatCurrency(implementation.actualCost) },
            { label: 'Actual value', value: implementation.actualValue === null || implementation.actualValue === undefined ? 'Not directly edited' : formatCurrency(implementation.actualValue) },
          ]} />
        </HudPanel>
      )}
    </div>
  );
}

// Note: AI assistance page explaining the stateless draft/refine/suggest workflow. It documents human review,
// endpoint shape, and cost controls without persisting suggestions automatically.
function AiAssistancePage({ tenant }: { tenant: TenantData }) {
  const usageSeed = tenant.workspace.name.includes('Walmart') ? [18400, 50000] : tenant.workspace.name.includes('Amazon') ? [9600, 50000] : [23100, 50000];
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="AI Layer" title="AI Assistance" subtitle="Helps users fill in each component. Backend-mediated, stateless, and tuned to keep API spend low." />
      <div className="hud-actions">
        <HudButton><Sparkles size={16} /> Draft with AI</HudButton>
      </div>
      <RuleNote>The AI layer adds endpoints only — zero new tables. Suggestions live in the browser until saved through the normal entity endpoints.</RuleNote>

      <HudPanel>
        <SectionTitle eyebrow="How it works" title="Explicit human review" />
        <div className="hud-flow">
          {['Draft with AI', 'one structured call', 'AI suggestion', 'review / edit', 'Save · normal endpoint'].map((step, index) => (
            <div className="hud-flow-step" key={step}>
              {index > 0 && <ChevronRight className="hud-flow-arrow" size={18} />}
              <div className="hud-flow-node"><b>{step}</b><small>{index === 1 ? 'linked context' : index === 4 ? 'persists' : 'user-triggered'}</small></div>
            </div>
          ))}
        </div>
        <p>The backend assembles context from linked records, calls the provider, and returns a draft. The provider key never reaches the browser, and nothing persists until Save.</p>
      </HudPanel>

      <HudPanel>
        <SectionTitle eyebrow="Cost design" title="Spend controls" />
        <DataTable
          headers={['Control', 'Design']}
          rows={[
            ['Calls per component', '1'],
            ['Automatic calls', '0'],
            ['Stored per suggestion', '0 B'],
            ['Model tiering', 'cheap → heavy'],
            ['Prompt caching', 'reused prompt + workspace context'],
            ['Context sent', 'linked records only'],
          ]}
        />
        <RuleNote>Optional per-workspace token/credit budget plus rate limit caps spend. Usage is read via GET /ai/usage.</RuleNote>
      </HudPanel>

      <HudPanel>
        <SectionTitle eyebrow="Endpoints" title="Reference" />
        <DataTable
          headers={['Method', 'Endpoint', 'Purpose']}
          rows={[
            ['POST', '/ai/draft', 'Draft a full component in one structured call'],
            ['POST', '/ai/refine', 'Refine one field on explicit request'],
            ['POST', '/ai/suggest-links', 'Suggest existing records to reference'],
            ['GET', '/ai/usage', 'Read workspace usage and budget'],
          ]}
        />
      </HudPanel>

      <HudPanel>
        <SectionTitle eyebrow="Usage" title={tenant.workspace.name} subtitle="Static mock usage for the active workspace." />
        <div className="hud-grid hud-grid--three">
          <ReadOnlyField label="Tokens used" value={usageSeed[0].toLocaleString()} />
          <ReadOnlyField label="Token budget" value={usageSeed[1].toLocaleString()} />
          <ReadOnlyField label="Remaining" value={(usageSeed[1] - usageSeed[0]).toLocaleString()} />
        </div>
      </HudPanel>
    </div>
  );
}

// Note: Placeholder page for routes intentionally deferred by scope. It keeps navigation complete while making
// clear that no behavior is implemented yet.
function StageLaterPage({ route }: { route: RouteId }) {
  const label = navGroups.flatMap((group) => group.items).find((item) => item.route === route)?.label || 'Later stage';
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Deferred" title={label} subtitle="This route remains visible but is implemented in a later stage." />
      <HudPanel>
        <RuleNote>Per the current scope, this page remains a placeholder. No new behavior is added here.</RuleNote>
      </HudPanel>
    </div>
  );
}

// Note: Generic empty state for resources that require prerequisite data. It gives users a clear, non-error
// explanation when a workspace has no records for a page.
function EmptyPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Empty state" title={title} />
      <HudPanel><p>{message}</p></HudPanel>
    </div>
  );
}

// Note: Central route switch for implemented authenticated pages. It maps each hash route to its page component
// so navigation behavior stays easy to audit in one place.
function ImplementedPage({
  route,
  tenant,
  ai,
  apiWorkspaceId,
  architecture,
  architectureId,
  refetchArchitecture,
  architectureLoading,
}: {
  route: RouteId;
  tenant: TenantData;
  ai: AiActions;
  apiWorkspaceId: string | null;
  // Business architecture is fetched once at app level and passed down so the six pages
  // that nest under it don't each re-fetch. Consumed by ArchitecturePage; others still pending.
  architecture: BusinessArchitecture | null;
  architectureId: string | null;
  refetchArchitecture: () => Promise<void>;
  architectureLoading: boolean;
}) {
  if (route === 'dashboard') return <DashboardPage tenant={tenant} />;
  if (route === 'company') return <CompanyPage tenant={tenant} />;
  if (route === 'departments') return <DepartmentsPage tenant={tenant} />;
  if (route === 'objectives') return <ObjectivesPage tenant={tenant} ai={ai} apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'architecture') return <ArchitecturePage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architecture={architecture} architectureId={architectureId} refetchArchitecture={refetchArchitecture} architectureLoading={architectureLoading} />;
  if (route === 'value-streams') return <ValueStreamsPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'key-activities') return <KeyActivitiesPage apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'capabilities') return <CapabilitiesPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'processes') return <ProcessesPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'personas') return <PersonasPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'information') return <InformationPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'impacts') return <ImpactsPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} architectureId={architectureId} architectureLoading={architectureLoading} />;
  if (route === 'cases') return <CasesPage apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'discovery') return <DiscoveryPage tenant={tenant} apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'features') return <FeaturesPage apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'requirements') return <RequirementsPage apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'deliverables') return <DeliverablesPage apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'implementation') return <ImplementationPage apiWorkspaceId={apiWorkspaceId} />;
  if (route === 'ai') return <AiAssistancePage tenant={tenant} />;
  return <StageLaterPage route={route} />;
}

export default function WireframeApp() {
  const [route, setRoute] = useState<RouteId>(getRoute);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [apiWorkspaceId, setApiWorkspaceId] = useState<string | null>(null);
  const [apiWorkspaces, setApiWorkspaces] = useState<ApiWorkspace[]>([]);
  const [architecture, setArchitecture] = useState<BusinessArchitecture | null>(null);
  const [architectureLoading, setArchitectureLoading] = useState(false);
  const architectureId = architecture?.id ?? null; // derived — the singleton's id, or null if not created yet
  // Tracks the workspace id the most recent architecture request was issued for, so a
  // response for a stale workspace (after a rapid switch) can be discarded on arrival.
  const architectureRequestRef = useRef<string | null>(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(getRefreshToken()));
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(loadWorkspaceId);
  const [pendingAi, setPendingAi] = useState<AiDraftState>(emptyAiDraftState);
  const [savedAi, setSavedAi] = useState<AiDraftState>(emptyAiDraftState);
  const tenant = useMemo(() => getTenantData(activeWorkspaceId), [activeWorkspaceId]);

  const aiActions: AiActions = useMemo(() => {
    const updatePending = <K extends keyof AiDraftState>(kind: K, id: string, patch: AiDraftState[K][string]) => {
      setPendingAi((current) => ({ ...current, [kind]: { ...current[kind], [id]: { ...(current[kind][id] || {}), ...patch } } }));
    };
    const savePending = <K extends keyof AiDraftState>(kind: K, id: string) => {
      setSavedAi((current) => ({ ...current, [kind]: { ...current[kind], [id]: { ...(current[kind][id] || {}), ...(pendingAi[kind][id] || {}) } } }));
      setPendingAi((current) => {
        const nextKind = { ...current[kind] };
        delete nextKind[id];
        return { ...current, [kind]: nextKind };
      });
    };
    const discardPending = <K extends keyof AiDraftState>(kind: K, id: string) => {
      setPendingAi((current) => {
        const nextKind = { ...current[kind] };
        delete nextKind[id];
        return { ...current, [kind]: nextKind };
      });
    };

    return {
      pending: pendingAi,
      saved: savedAi,
      draftObjective: (workspaceName, objective) => updatePending('objectives', objective.id, mockObjectiveDraft(workspaceName)),
      draftCase: (workspaceName, businessCase) => updatePending('cases', businessCase.id, mockCaseDraft(workspaceName)),
      draftDiscovery: (workspaceName, discovery) => updatePending('discoveries', discovery.id, mockDiscoveryDraft(workspaceName)),
      updateObjective: (id, field, value) => updatePending('objectives', id, { [field]: value } as Partial<StrategicObjective>),
      updateCase: (id, field, value) => updatePending('cases', id, { [field]: value } as Partial<LeanBusinessCase>),
      updateDiscovery: (id, field, value) => updatePending('discoveries', id, { [field]: value } as Partial<Discovery>),
      refineObjective: (id, field, value) => updatePending('objectives', id, { [field]: refinedText(value) } as Partial<StrategicObjective>),
      refineCase: (id, field, value) => updatePending('cases', id, { [field]: refinedText(value) } as Partial<LeanBusinessCase>),
      refineDiscovery: (id, field, value) => updatePending('discoveries', id, { [field]: refinedText(value) } as Partial<Discovery>),
      saveObjective: (id) => savePending('objectives', id),
      saveCase: (id) => savePending('cases', id),
      saveDiscovery: (id) => savePending('discoveries', id),
      discardObjective: (id) => discardPending('objectives', id),
      discardCase: (id) => discardPending('cases', id),
      discardDiscovery: (id) => discardPending('discoveries', id),
    };
  }, [pendingAi, savedAi]);

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  // Fetch the workspace's singleton business architecture. Single implementation so the
  // six pages that will consume it (and the effect below) all share one code path.
  // A 404 means "not created yet" — set null and carry on; anything else is a real error.
  const refetchArchitecture = useCallback(async () => {
    const requestedWs = apiWorkspaceId;
    architectureRequestRef.current = requestedWs;
    if (!requestedWs) {
      setArchitecture(null);
      setArchitectureLoading(false);
      return;
    }
    setArchitectureLoading(true);
    try {
      const record = await getArchitecture(requestedWs);
      if (architectureRequestRef.current !== requestedWs) return; // superseded by a newer workspace
      setArchitecture(record);
    } catch (err) {
      if (architectureRequestRef.current !== requestedWs) return; // superseded by a newer workspace
      if (err instanceof ApiError && err.status === 404) {
        setArchitecture(null); // not created yet — expected, not an error
      } else {
        console.error('Failed to load business architecture', err);
        setArchitecture(null);
      }
    } finally {
      // Only the still-current request clears the flag; a late stale response must not flip it
      // off while a newer request for a different workspace is already in flight.
      if (architectureRequestRef.current === requestedWs) setArchitectureLoading(false);
    }
  }, [apiWorkspaceId]);

  useEffect(() => { refetchArchitecture(); }, [refetchArchitecture]);

  useEffect(() => {
    if (!getRefreshToken()) return; // authLoading is already false — nothing to restore
    let cancelled = false;
    (async () => {
      try {
        const user = await api.get<{ email: string }>('/me'); // client auto-refreshes on 401
        const ws = await getList<ApiWorkspace>('/workspaces');
        if (cancelled) return;
        setSession({ email: user.email, authProvider: 'password', signedInAt: new Date().toISOString() });
        applyWorkspaces(ws.items);
      } catch {
        clearTokens(); // dead/invalid session
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (authLoading) return; // don't redirect mid-restore, or a signed-in user flashes the login screen
    if (!session && gatedRoutes.has(route)) navigateTo('login');
    if (session && (route === 'login' || route === 'signup')) navigateTo('dashboard');
  }, [route, session, authLoading]);

  // Store the full workspace list and pick the active one (restored + validated, else first).
  const applyWorkspaces = (items: ApiWorkspace[]) => {
    setApiWorkspaces(items);
    setApiWorkspaceId(resolveApiWorkspaceId(items));
  };

  const handleApiWorkspaceChange = (workspaceId: string) => {
    try { localStorage.setItem(apiWorkspaceStorageKey, workspaceId); } catch { /* ignore */ }
    setApiWorkspaceId(workspaceId);
  };

  const handleAuthenticated = (s: AuthSession, workspaces: ApiWorkspace[]) => {
    setSession(s);
    applyWorkspaces(workspaces);
  };

  const content = useMemo(() => {
    if (route === 'landing') return <LandingPage />;
    if (route === 'signup') return <AuthPage mode="signup" onAuthenticated={handleAuthenticated} />;
    if (route === 'login') return <AuthPage mode="login" onAuthenticated={handleAuthenticated} />;
    return implementedRoutes.has(route) ? (
      <ImplementedPage
        route={route}
        tenant={tenant}
        ai={aiActions}
        apiWorkspaceId={apiWorkspaceId}
        architecture={architecture}
        architectureId={architectureId}
        refetchArchitecture={refetchArchitecture}
        architectureLoading={architectureLoading}
      />
    ) : (
      <StageLaterPage route={route} />
    );
  }, [route, tenant, aiActions, apiWorkspaceId, architecture, architectureId, refetchArchitecture, architectureLoading]);

  const signOut = async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken }); // 204 -> null, fine
    } catch {
      // ignore network/logout errors — still clear the session locally
    }
    clearTokens();
    setSession(null);
    setApiWorkspaceId(null);
    setApiWorkspaces([]);
    setArchitecture(null);
    navigateTo('landing');
  };

  if (authLoading) {
    return (
      <div className="hud-page hud-auth-page">
        <HudPanel>Restoring your session…</HudPanel>
      </div>
    );
  }

  return (
    <Shell session={session} route={route} apiWorkspaceId={apiWorkspaceId} workspaces={apiWorkspaces} onWorkspaceChange={handleApiWorkspaceChange} onSignOut={signOut}>
      {content}
    </Shell>
  );
}
