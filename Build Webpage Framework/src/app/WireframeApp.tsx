import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
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
  BusinessCapability,
  BusinessImpact,
  BusinessProcess,
  ConceptualDeliverable,
  Discovery,
  Feature,
  InformationConcept,
  LeanBusinessCase,
  Requirement,
  StakeholderPersona,
  StrategicLifecycleMockState,
  StrategicObjective,
  ValueStream,
} from '../types/model';

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
const authStorageKey = 'slaf.wireframe.authSession';
const activeWorkspaceStorageKey = 'slaf.wireframe.activeWorkspaceId';
const emptyAiDraftState = (): AiDraftState => ({ objectives: {}, cases: {}, discoveries: {} });

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

const loadSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(authStorageKey);
    return raw ? JSON.parse(raw) as AuthSession : null;
  } catch {
    return null;
  }
};

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
  activeWorkspaceId,
  onWorkspaceChange,
  children,
  onSignOut,
}: {
  session: AuthSession | null;
  route: RouteId;
  activeWorkspaceId: string;
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
          {session && (
            <label className="hud-switcher">
              <span>Workspace</span>
              <select value={activeWorkspaceId} onChange={(event) => onWorkspaceChange(event.target.value)}>
                {state.workspaces.map((workspace) => <option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}
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
            <HudButton variant="ghost" href="/assets/research-paper.pdf" download>
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
          <HudButton variant="ghost" href="/assets/research-paper.pdf" download><ArrowDownToLine size={16} /> Download research paper</HudButton>
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

function AuthPage({ mode, onSignIn }: { mode: 'signup' | 'login'; onSignIn: (session: AuthSession) => void }) {
  const [email, setEmail] = useState(mode === 'login' ? 'network.transformation@example.com' : '');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('FedEx Corporation');

  const submit = (event: FormEvent, authProvider: AuthSession['authProvider'] = 'password') => {
    event.preventDefault();
    const session = {
      email: email.trim() || 'network.transformation@example.com',
      authProvider,
      signedInAt: new Date().toISOString(),
    };
    localStorage.setItem(authStorageKey, JSON.stringify(session));
    onSignIn(session);
    navigateTo('dashboard');
  };

  return (
    <div className="hud-page hud-auth-page">
      <HudPanel className="hud-auth-copy">
        <SectionTitle
          eyebrow="Account"
          title={mode === 'signup' ? 'Sign Up' : 'Log In'}
          subtitle="Mock authentication only. A successful sign-in flips the shell into authenticated workspace mode."
        />
        <RuleNote>Route guard redirects gated lifecycle routes here while signed out. No real tokens, backend calls, or OAuth handoffs occur in this UI pass.</RuleNote>
      </HudPanel>

      <HudPanel className="hud-auth-card">
        <form onSubmit={(event) => submit(event)} className="hud-form">
          {mode === 'signup' && <TextInput label="Company / Workspace name" value={companyName} onChange={setCompanyName} />}
          <TextInput label="Email" value={email} onChange={setEmail} type="email" />
          <TextInput label="Password" value={password} onChange={setPassword} type="password" />
          <HudButton type="submit">{mode === 'signup' ? <UserPlus size={16} /> : <LogIn size={16} />} {mode === 'signup' ? 'Create mock account' : 'Log in'}</HudButton>
          <HudButton variant="ghost" onClick={() => submit({ preventDefault: () => undefined } as FormEvent, 'google')}>
            <Sparkles size={16} /> Continue with Google
          </HudButton>
        </form>
      </HudPanel>
    </div>
  );
}

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

function ObjectivesPage({ tenant, ai }: { tenant: TenantData; ai: AiActions }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 1 · Strategy" title="Strategic Objectives" subtitle="Executive intent and strategic value. Forecast only; actuals roll up from implementation." />
      <RuleNote>Cardinality: objectives {tenant.objectives.length} / {cardinalityLimits.strategicObjectivesPerWorkspace}. Active requires name, executive objective, value category, problem/opportunity statement, and value hypothesis.</RuleNote>
      <div className="hud-primary-list-mobile">
        {tenant.objectives.map((objective) => {
          const pending = ai.pending.objectives[objective.id];
          const saved = ai.saved.objectives[objective.id];
          const displayObjective = { ...objective, ...saved, ...pending };
          const rollup = calculateObjectiveFinancialRollup(objective.id, tenant.cases, tenant.implementations, tenant.implementationValueStreams);

          return (
            <MobileRecordCard
              key={objective.id}
              title={displayObjective.strategicInitiativeName}
              summary={displayObjective.executiveObjective}
              badge={<StatusBadge status={displayObjective.status} />}
              rows={[
                { label: 'Category', value: displayObjective.strategicValueCategory },
                { label: 'Target dates', value: `${displayObjective.targetImplementationStartDate} to ${displayObjective.targetImplementationEndDate}` },
                { label: 'Forecast cost', value: formatCurrency(rollup.forecastCost) },
                { label: 'Computed actual value', value: formatCurrency(rollup.actualValue) },
              ]}
              action={<HudButton variant="ghost" onClick={() => ai.draftObjective(tenant.workspace.name, objective)}><Sparkles size={16} /> Draft with AI</HudButton>}
            />
          );
        })}
      </div>
      <div className="hud-primary-list-desktop">
      {tenant.objectives.map((objective) => {
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
              <div><h2>{displayObjective.strategicInitiativeName}</h2><p>{displayObjective.executiveObjective}</p></div>
              <div className="hud-badge-stack">
                <HudButton variant="ghost" onClick={() => ai.draftObjective(tenant.workspace.name, objective)}><Sparkles size={16} /> Draft with AI</HudButton>
                <StatusBadge status={displayObjective.status} />
              </div>
            </div>
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
              { label: 'Target dates', value: `${displayObjective.targetImplementationStartDate} to ${displayObjective.targetImplementationEndDate}` },
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

function ArchitecturePage({ tenant }: { tenant: TenantData }) {
  const architecture = tenant.architecture;
  if (!architecture) {
    return <EmptyPage title="Business Architecture" message="No company-level business architecture exists for this workspace." />;
  }
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 1 · Strategy" title="Business Architecture" subtitle="The company's architecture: one record, reused across every objective and case." />
      <RuleNote>One Business Architecture per workspace. Once it exists, the action is Open, not Create.</RuleNote>
      <HudPanel>
        <div className="hud-record-head">
          <div><h2>{architecture.name}</h2><p>{architecture.description}</p></div>
          <div className="hud-badge-stack"><OriginBadge origin={architecture.origin} /><StatusBadge status={architecture.status} /></div>
        </div>
        <FieldGrid rows={[
          { label: 'Current state summary', value: architecture.currentStateSummary },
          { label: 'Future state summary', value: architecture.futureStateSummary },
          { label: 'Value streams', value: `${tenant.valueStreams.length} / ${cardinalityLimits.valueStreamsPerBusinessArchitecture}` },
          { label: 'Capabilities', value: tenant.capabilities.length },
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

function ValueStreamsPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 1 · Strategy"
      title="Value Streams"
      subtitle="How value flows through the business. Lives under the company architecture."
      rule={`Max ${cardinalityLimits.valueStreamsPerBusinessArchitecture} per architecture. Capabilities link here; origin never restricts reuse.`}
      rows={tenant.valueStreams.map((stream) => ({
        id: stream.id,
        title: stream.name,
        meta: stream.description,
        badges: [<OriginBadge origin={stream.origin} key="origin" />, <StatusBadge status={stream.status} key="status" />],
        fields: [
          { label: 'Type', value: stream.valueStreamType },
          { label: 'Strategic alignment', value: stream.strategicAlignment },
          { label: 'Triggering stakeholder', value: stream.triggeringStakeholder },
          { label: 'Value recipient', value: stream.valueRecipient },
          { label: 'Linked department', value: tenant.departments.find((department) => department.id === stream.linkedDepartmentId)?.name },
        ],
        references: <ReferenceOrCreate label="Capabilities linked to this value stream" items={state.valueStreamCapabilities.filter((link) => link.valueStreamId === stream.id).map((link) => tenant.capabilities.find((capability) => capability.id === link.capabilityId)).filter(Boolean).map((capability) => ({ id: capability!.id, name: capability!.capabilityName, origin: capability!.origin }))} />,
      }))}
    />
  );
}

function KeyActivitiesPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 1 · Strategy"
      title="Key Activities"
      subtitle="The ordered stages of a value stream where value is created, delayed, or transferred."
      rule={`Max ${cardinalityLimits.keyActivitiesPerValueStream} per value stream. Sequence is ordering only.`}
      rows={tenant.keyActivities.map((activity) => ({
        id: activity.id,
        title: activity.activityName,
        meta: tenant.valueStreams.find((stream) => stream.id === activity.valueStreamId)?.name || 'Unknown value stream',
        badges: [<OriginBadge origin={activity.origin} key="origin" />, <StatusBadge status={activity.status} key="status" />],
        fields: [
          { label: 'Description', value: activity.activityDescription },
          { label: 'Sequence', value: activity.sequenceOrder },
          { label: 'Current issue', value: activity.currentStateIssue },
          { label: 'Future change', value: activity.futureStateChange },
          { label: 'Business impact', value: activity.businessImpact },
        ],
        references: <ReferenceOrCreate label="Capabilities linked to this activity" items={state.keyActivityCapabilities.filter((link) => link.keyActivityId === activity.id).map((link) => tenant.capabilities.find((capability) => capability.id === link.capabilityId)).filter(Boolean).map((capability) => ({ id: capability!.id, name: capability!.capabilityName, origin: capability!.origin }))} />,
      }))}
    />
  );
}

function CapabilitiesPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 1 · Strategy"
      title="Business Capabilities"
      subtitle="What the business does. Stable building blocks with current and target maturity."
      rule="Capabilities are company-level and reusable by value streams, key activities, objectives, cases, and features."
      rows={tenant.capabilities.map((capability) => ({
        id: capability.id,
        title: capability.capabilityName,
        meta: capability.capabilityDescription,
        badges: [<OriginBadge origin={capability.origin} key="origin" />, <StatusBadge status={capability.status} key="status" />],
        fields: [
          { label: 'Current maturity', value: capability.currentMaturity },
          { label: 'Target maturity', value: capability.targetMaturity },
          { label: 'Gap', value: capability.capabilityGap },
          { label: 'Owning department', value: tenant.departments.find((department) => department.id === capability.owningDepartmentId)?.name },
        ],
      }))}
    />
  );
}

function ProcessesPage({ tenant }: { tenant: TenantData }) {
  return <SupportingComponentPage tenant={tenant} type="processes" title="Business Processes" subtitle="Current- and future-state process detail supporting the architecture." />;
}

function PersonasPage({ tenant }: { tenant: TenantData }) {
  return <SupportingComponentPage tenant={tenant} type="personas" title="Stakeholders & Personas" subtitle="The people the value streams serve or depend on." />;
}

function InformationPage({ tenant }: { tenant: TenantData }) {
  return <SupportingComponentPage tenant={tenant} type="information" title="Information Concepts" subtitle="The key data objects the architecture produces and consumes." />;
}

function SupportingComponentPage({ tenant, type, title, subtitle }: { tenant: TenantData; type: 'processes' | 'personas' | 'information'; title: string; subtitle: string }) {
  const records = type === 'processes' ? tenant.processes : type === 'personas' ? tenant.personas : tenant.informationConcepts;
  return (
    <ListPage
      eyebrow="Phase 1 · Strategy"
      title={title}
      subtitle={subtitle}
      rule="Supporting components use reference-or-create: reference links an existing workspace record and never copies it."
      rows={records.map((record) => {
        const common = record as BusinessProcess | StakeholderPersona | InformationConcept;
        const name = 'processName' in record ? record.processName : 'conceptName' in record ? record.conceptName : record.name;
        const linkedValueStream = tenant.valueStreams.find((stream) => stream.id === common.linkedValueStreamId);
        return {
          id: common.id,
          title: name,
          meta: linkedValueStream?.name || 'No linked value stream',
          badges: [<OriginBadge origin={common.origin} key="origin" />, <StatusBadge status={common.status} key="status" />],
          fields: Object.entries(record)
            .filter(([key]) => !['id', 'workspaceId', 'businessArchitectureId', 'createdByUserId', 'createdAt', 'updatedAt', 'origin', 'status', 'linkedValueStreamId'].includes(key))
            .map(([key, value]) => ({ label: key.replace(/([A-Z])/g, ' $1'), value: String(value || 'Not entered') })),
          references: <ReferenceOrCreate label="Workspace supporting component picker" items={records.map((item) => {
            const typed = item as BusinessProcess | StakeholderPersona | InformationConcept;
            const itemName = 'processName' in item ? item.processName : 'conceptName' in item ? item.conceptName : item.name;
            return { id: typed.id, name: itemName, origin: typed.origin };
          })} />,
        };
      })}
    />
  );
}

function ImpactsPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 1 · Strategy"
      title="Business Impacts"
      subtitle="Effects that later justify lean business cases and discovery priorities."
      rule="Impacts carry optional value-stream and lean-case links. Origin is provenance only."
      rows={tenant.impacts.map((impact: BusinessImpact) => ({
        id: impact.id,
        title: impact.impactedArea,
        meta: impact.impactDescription,
        badges: [<OriginBadge origin={impact.origin} key="origin" />, <StatusBadge status={impact.status} key="status" />],
        fields: [
          { label: 'Impact type', value: impact.impactType },
          { label: 'Severity', value: impact.severity },
          { label: 'Mitigation notes', value: impact.mitigationNotes },
          { label: 'Expected value', value: impact.expectedValue },
          { label: 'Linked value stream', value: tenant.valueStreams.find((stream) => stream.id === impact.linkedValueStreamId)?.name },
          { label: 'Linked lean business case', value: tenant.cases.find((businessCase) => businessCase.id === impact.linkedLeanBusinessCaseId)?.title },
        ],
      }))}
    />
  );
}

function CasesPage({ tenant, ai }: { tenant: TenantData; ai: AiActions }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 2 · Delivery" title="Lean Business Cases" subtitle="Granular sub-initiatives of one objective. Each carries its own forecast." />
      <RuleNote>Cardinality: max {cardinalityLimits.leanBusinessCasesPerObjective} lean business cases per strategic objective. Active requires title, summary, problem/opportunity statement, value hypothesis, and priority.</RuleNote>
      <div className="hud-primary-list-mobile">
        {tenant.cases.map((businessCase: LeanBusinessCase) => {
          const pending = ai.pending.cases[businessCase.id];
          const saved = ai.saved.cases[businessCase.id];
          const displayCase = { ...businessCase, ...saved, ...pending };
          const objective = tenant.objectives.find((candidate) => candidate.id === businessCase.strategicObjectiveId);
          const implementation = tenant.implementations.find((candidate) => candidate.leanBusinessCaseId === businessCase.id);

          return (
            <MobileRecordCard
              key={businessCase.id}
              title={displayCase.title}
              summary={displayCase.summary}
              badge={<StatusBadge status={displayCase.status} />}
              rows={[
                { label: 'Strategic objective', value: objective?.strategicInitiativeName },
                { label: 'Priority', value: displayCase.priority },
                { label: 'Forecast cost', value: formatCurrency(displayCase.forecastCost) },
                { label: 'Implementation', value: implementation ? `1:1 · ${implementation.implementationStatus}` : 'Not created' },
              ]}
              action={<HudButton variant="ghost" onClick={() => ai.draftCase(tenant.workspace.name, businessCase)}><Sparkles size={16} /> Draft with AI</HudButton>}
            />
          );
        })}
      </div>
      <div className="hud-primary-list-desktop">
      {tenant.cases.map((businessCase: LeanBusinessCase) => {
        const pending = ai.pending.cases[businessCase.id];
        const saved = ai.saved.cases[businessCase.id];
        const displayCase = { ...businessCase, ...saved, ...pending };
        const objective = tenant.objectives.find((candidate) => candidate.id === businessCase.strategicObjectiveId);
        const missing = getMissingLeanBusinessCaseActiveFields(displayCase);
        const linkedValueStreams = state.leanBusinessCaseValueStreams
          .filter((link) => link.leanBusinessCaseId === businessCase.id)
          .map((link) => tenant.valueStreams.find((stream) => stream.id === link.valueStreamId))
          .filter(Boolean) as ValueStream[];
        const linkedKeyActivities = state.leanBusinessCaseKeyActivities
          .filter((link) => link.leanBusinessCaseId === businessCase.id)
          .map((link) => tenant.keyActivities.find((activity) => activity.id === link.keyActivityId))
          .filter(Boolean);
        const linkedCapabilities = state.leanBusinessCaseCapabilities
          .filter((link) => link.leanBusinessCaseId === businessCase.id)
          .map((link) => tenant.capabilities.find((capability) => capability.id === link.capabilityId))
          .filter(Boolean) as BusinessCapability[];
        const discovery = tenant.discoveries.find((candidate) => candidate.leanBusinessCaseId === businessCase.id);
        const implementation = tenant.implementations.find((candidate) => candidate.leanBusinessCaseId === businessCase.id);

        return (
          <HudPanel key={businessCase.id}>
            <div className="hud-record-head">
              <div><h2>{displayCase.title}</h2><p>{displayCase.summary}</p></div>
              <div className="hud-badge-stack">
                <HudButton variant="ghost" onClick={() => ai.draftCase(tenant.workspace.name, businessCase)}><Sparkles size={16} /> Draft with AI</HudButton>
                <StatusBadge status={displayCase.status} />
              </div>
            </div>
            {pending && (
              <div className="hud-ai-edit-panel">
                <AiBanner />
                <div className="hud-ai-edit-grid">
                  <AiTextArea label="Summary" value={String(displayCase.summary || '')} onChange={(value) => ai.updateCase(businessCase.id, 'summary', value)} onRefine={() => ai.refineCase(businessCase.id, 'summary', String(displayCase.summary || ''))} />
                  <AiTextArea label="Problem / opportunity" value={String(displayCase.problemOpportunityStatement || '')} onChange={(value) => ai.updateCase(businessCase.id, 'problemOpportunityStatement', value)} onRefine={() => ai.refineCase(businessCase.id, 'problemOpportunityStatement', String(displayCase.problemOpportunityStatement || ''))} />
                  <AiTextArea label="Value hypothesis" value={String(displayCase.valueHypothesis || '')} onChange={(value) => ai.updateCase(businessCase.id, 'valueHypothesis', value)} onRefine={() => ai.refineCase(businessCase.id, 'valueHypothesis', String(displayCase.valueHypothesis || ''))} />
                  <AiTextArea label="Priority" value={String(displayCase.priority || '')} onChange={(value) => ai.updateCase(businessCase.id, 'priority', value)} onRefine={() => ai.refineCase(businessCase.id, 'priority', String(displayCase.priority || ''))} />
                </div>
                <div className="hud-actions">
                  <HudButton onClick={() => ai.saveCase(businessCase.id)}>Save</HudButton>
                  <HudButton variant="ghost" onClick={() => ai.discardCase(businessCase.id)}>Clear / discard</HudButton>
                </div>
              </div>
            )}
            <FieldGrid rows={[
              { label: 'Strategic objective', value: objective?.strategicInitiativeName },
              { label: 'Problem / opportunity', value: displayCase.problemOpportunityStatement },
              { label: 'Value hypothesis', value: displayCase.valueHypothesis },
              { label: 'Priority', value: displayCase.priority },
              { label: 'Forecast cost', value: formatCurrency(displayCase.forecastCost) },
              { label: 'Forecast value', value: formatCurrency(displayCase.forecastValue) },
              { label: 'Value type', value: displayCase.valueType },
              { label: 'Discovery', value: discovery ? `1:1 · ${discovery.status}` : 'Not created' },
              { label: 'Implementation', value: implementation ? `1:1 · ${implementation.implementationStatus}` : 'Not created' },
            ]} />
            <ReferenceOrCreate label="Case value streams" items={linkedValueStreams.map((stream) => ({ id: stream.id, name: stream.name, origin: stream.origin }))} />
            <ReferenceOrCreate label="Case capabilities" items={linkedCapabilities.map((capability) => ({ id: capability.id, name: capability.capabilityName, origin: capability.origin }))} />
            <ReferenceOrCreate label="Case key activities" items={linkedKeyActivities.map((activity) => ({ id: activity!.id, name: activity!.activityName, origin: activity!.origin }))} />
            {missing.length > 0 && <RuleNote>Cannot mark active. Missing: {missing.join(', ')}.</RuleNote>}
          </HudPanel>
        );
      })}
      </div>
    </div>
  );
}

function DiscoveryPage({ tenant, ai }: { tenant: TenantData; ai: AiActions }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 2 · Delivery" title="Discovery" subtitle="Product discovery for a single business case, including the guided roll-down builder." />
      <RuleNote>Discovery is 1:1 with a lean business case. Architecture created during discovery is tagged origin: discovery, but remains reusable by any objective or case.</RuleNote>
      {tenant.discoveries.map((discovery) => {
        const pending = ai.pending.discoveries[discovery.id];
        const saved = ai.saved.discoveries[discovery.id];
        const displayDiscovery = { ...discovery, ...saved, ...pending };
        const businessCase = tenant.cases.find((candidate) => candidate.id === discovery.leanBusinessCaseId);
        const linkedPersonas = state.discoveryStakeholderPersonas
          .filter((link) => link.discoveryId === discovery.id)
          .map((link) => tenant.personas.find((persona) => persona.id === link.stakeholderPersonaId))
          .filter(Boolean) as StakeholderPersona[];
        const linkedProcesses = state.discoveryBusinessProcesses
          .filter((link) => link.discoveryId === discovery.id)
          .map((link) => tenant.processes.find((process) => process.id === link.businessProcessId))
          .filter(Boolean) as BusinessProcess[];
        const linkedConcepts = state.discoveryInformationConcepts
          .filter((link) => link.discoveryId === discovery.id)
          .map((link) => tenant.informationConcepts.find((concept) => concept.id === link.informationConceptId))
          .filter(Boolean) as InformationConcept[];

        return (
          <HudPanel key={discovery.id}>
            <div className="hud-record-head">
              <div><h2>{businessCase?.title || 'Discovery'}</h2><p>{displayDiscovery.problemStatement}</p></div>
              <div className="hud-badge-stack">
                <HudButton variant="ghost" onClick={() => ai.draftDiscovery(tenant.workspace.name, discovery)}><Sparkles size={16} /> Draft findings with AI</HudButton>
                <StatusBadge status={displayDiscovery.status} />
              </div>
            </div>
            {pending && (
              <div className="hud-ai-edit-panel">
                <AiBanner discovery />
                <div className="hud-ai-edit-grid">
                  {([
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
                  ] as [keyof Discovery, string][]).map(([field, label]) => (
                    <AiTextArea
                      key={field}
                      label={label}
                      value={String(displayDiscovery[field] || '')}
                      onChange={(value) => ai.updateDiscovery(discovery.id, field, value)}
                      onRefine={() => ai.refineDiscovery(discovery.id, field, String(displayDiscovery[field] || ''))}
                    />
                  ))}
                </div>
                <div className="hud-actions">
                  <HudButton onClick={() => ai.saveDiscovery(discovery.id)}>Save</HudButton>
                  <HudButton variant="ghost" onClick={() => ai.discardDiscovery(discovery.id)}>Clear / discard</HudButton>
                </div>
              </div>
            )}
            <FieldGrid rows={[
              { label: 'Persona findings', value: displayDiscovery.personaFindings },
              { label: 'Journey map', value: displayDiscovery.journeyMap },
              { label: 'Current process map', value: displayDiscovery.currentStateProcessMap },
              { label: 'Bottleneck analysis', value: displayDiscovery.bottleneckAnalysis },
              { label: 'Data findings', value: displayDiscovery.dataFindings },
              { label: 'Legacy constraints', value: displayDiscovery.legacyConstraints },
              { label: 'Future-state needs', value: displayDiscovery.futureStateNeeds },
              { label: 'Discovery metrics', value: displayDiscovery.discoveryMetrics },
              { label: 'Governance findings', value: displayDiscovery.governanceFindings },
            ]} />
            <RollDownBuilder tenant={tenant} />
            <ReferenceOrCreate label="Discovery personas" items={linkedPersonas.map((persona) => ({ id: persona.id, name: persona.name, origin: persona.origin }))} />
            <ReferenceOrCreate label="Discovery processes" items={linkedProcesses.map((process) => ({ id: process.id, name: process.processName, origin: process.origin }))} />
            <ReferenceOrCreate label="Discovery information concepts" items={linkedConcepts.map((concept) => ({ id: concept.id, name: concept.conceptName, origin: concept.origin }))} />
          </HudPanel>
        );
      })}
    </div>
  );
}

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

function FeaturesPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 2 · Delivery"
      title="Features"
      subtitle="Solution pieces that enable a capability and belong to a business case."
      rule="A feature optionally enables one capability, which is how features connect back to value streams."
      rows={tenant.features.map((feature: Feature) => {
        const businessCase = tenant.cases.find((candidate) => candidate.id === feature.leanBusinessCaseId);
        const capability = tenant.capabilities.find((candidate) => candidate.id === feature.capabilityId);
        const requirements = tenant.requirements.filter((requirement) => requirement.featureId === feature.id);
        return {
          id: feature.id,
          title: feature.featureName,
          meta: feature.description,
          badges: [<StatusBadge status={feature.status} key="status" />],
          fields: [
            { label: 'Business case', value: businessCase?.title },
            { label: 'Capability', value: capability?.capabilityName },
            { label: 'Feature type', value: feature.featureType },
            { label: 'Priority', value: feature.priority },
            { label: 'Requirements', value: requirements.length },
          ],
          references: capability ? <ReferenceOrCreate label="Enabled capability" items={[{ id: capability.id, name: capability.capabilityName, origin: capability.origin }]} /> : undefined,
        };
      })}
    />
  );
}

function RequirementsPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 2 · Delivery"
      title="Requirements"
      subtitle="Detailed specifications under a feature."
      rule="Requirements remain scoped under features; they do not link directly to value streams."
      rows={tenant.requirements.map((requirement: Requirement) => {
        const feature = tenant.features.find((candidate) => candidate.id === requirement.featureId);
        return {
          id: requirement.id,
          title: requirement.requirementName,
          meta: requirement.description,
          badges: [<StatusBadge status={requirement.status} key="status" />],
          fields: [
            { label: 'Feature', value: feature?.featureName },
            { label: 'Requirement type', value: requirement.requirementType },
            { label: 'Acceptance criteria', value: requirement.acceptanceCriteria },
            { label: 'Priority', value: requirement.priority },
          ],
        };
      })}
    />
  );
}

function DeliverablesPage({ tenant }: { tenant: TenantData }) {
  return (
    <ListPage
      eyebrow="Phase 2 · Delivery"
      title="Conceptual Deliverables"
      subtitle="The 12 outputs for a business case. Generated from traceability data, edited, then saved as final."
      rule="Deliverables are suggestions. No auto-regeneration overwrites finalized content."
      rows={tenant.conceptualDeliverables.map((deliverable: ConceptualDeliverable) => {
        const businessCase = tenant.cases.find((candidate) => candidate.id === deliverable.leanBusinessCaseId);
        return {
          id: deliverable.id,
          title: deliverable.title,
          meta: deliverable.content,
          badges: [<HudBadge tone={deliverable.source === 'user_finalized' ? 'green' : 'amber'} key="source">{deliverable.source.replaceAll('_', ' ')}</HudBadge>, <StatusBadge status={deliverable.status} key="status" />],
          fields: [
            { label: 'Business case', value: businessCase?.title },
            { label: 'Deliverable type', value: deliverable.deliverableType },
            { label: 'Source', value: deliverable.source },
            { label: 'Content', value: deliverable.content },
          ],
        };
      })}
    />
  );
}

function ImplementationPage({ tenant }: { tenant: TenantData }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Phase 2 · Delivery" title="Implementation" subtitle="Where work ships and actual numbers are recorded once, per value stream." />
      <RuleNote>Actuals are entered once at Implementation, per value stream. Objective actuals are computed from these allocations and remain read-only upstream.</RuleNote>
      {tenant.implementations.map((implementation) => {
        const businessCase = tenant.cases.find((candidate) => candidate.id === implementation.leanBusinessCaseId);
        const allocations = tenant.implementationValueStreams.filter((allocation) => allocation.implementationId === implementation.id);
        const totalCost = allocations.reduce((sum, allocation) => sum + (allocation.allocatedCost || 0), 0);
        const totalValue = allocations.reduce((sum, allocation) => sum + (allocation.allocatedValue || 0), 0);

        return (
          <HudPanel key={implementation.id}>
            <div className="hud-record-head">
              <div><h2>{businessCase?.title || 'Implementation'}</h2><p>{implementation.outcomeNotes}</p></div>
              <StatusBadge status={implementation.implementationStatus} />
            </div>
            <FieldGrid rows={[
              { label: 'Business case', value: businessCase?.title },
              { label: 'Value type', value: implementation.valueType },
              { label: 'Start date', value: implementation.startDate },
              { label: 'Completion date', value: implementation.completionDate },
              { label: 'Implementation actual cost field', value: implementation.actualCost === null ? 'Not directly edited' : formatCurrency(implementation.actualCost) },
              { label: 'Implementation actual value field', value: implementation.actualValue === null ? 'Not directly edited' : formatCurrency(implementation.actualValue) },
              { label: 'Allocated actual cost', value: formatCurrency(totalCost) },
              { label: 'Allocated actual value', value: formatCurrency(totalValue) },
            ]} />
            <DataTable
              headers={['Value stream', 'Allocated cost', 'Allocated value']}
              rows={allocations.map((allocation) => [
                tenant.valueStreams.find((stream) => stream.id === allocation.valueStreamId)?.name || allocation.valueStreamId,
                formatCurrency(allocation.allocatedCost),
                formatCurrency(allocation.allocatedValue),
              ])}
            />
          </HudPanel>
        );
      })}
    </div>
  );
}

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

function EmptyPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="hud-page">
      <SectionTitle eyebrow="Empty state" title={title} />
      <HudPanel><p>{message}</p></HudPanel>
    </div>
  );
}

function ImplementedPage({ route, tenant, ai }: { route: RouteId; tenant: TenantData; ai: AiActions }) {
  if (route === 'dashboard') return <DashboardPage tenant={tenant} />;
  if (route === 'company') return <CompanyPage tenant={tenant} />;
  if (route === 'departments') return <DepartmentsPage tenant={tenant} />;
  if (route === 'objectives') return <ObjectivesPage tenant={tenant} ai={ai} />;
  if (route === 'architecture') return <ArchitecturePage tenant={tenant} />;
  if (route === 'value-streams') return <ValueStreamsPage tenant={tenant} />;
  if (route === 'key-activities') return <KeyActivitiesPage tenant={tenant} />;
  if (route === 'capabilities') return <CapabilitiesPage tenant={tenant} />;
  if (route === 'processes') return <ProcessesPage tenant={tenant} />;
  if (route === 'personas') return <PersonasPage tenant={tenant} />;
  if (route === 'information') return <InformationPage tenant={tenant} />;
  if (route === 'impacts') return <ImpactsPage tenant={tenant} />;
  if (route === 'cases') return <CasesPage tenant={tenant} ai={ai} />;
  if (route === 'discovery') return <DiscoveryPage tenant={tenant} ai={ai} />;
  if (route === 'features') return <FeaturesPage tenant={tenant} />;
  if (route === 'requirements') return <RequirementsPage tenant={tenant} />;
  if (route === 'deliverables') return <DeliverablesPage tenant={tenant} />;
  if (route === 'implementation') return <ImplementationPage tenant={tenant} />;
  if (route === 'ai') return <AiAssistancePage tenant={tenant} />;
  return <StageLaterPage route={route} />;
}

export default function WireframeApp() {
  const [route, setRoute] = useState<RouteId>(getRoute);
  const [session, setSession] = useState<AuthSession | null>(loadSession);
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

  useEffect(() => {
    if (!session && gatedRoutes.has(route)) navigateTo('login');
    if (session && (route === 'login' || route === 'signup')) navigateTo('dashboard');
  }, [route, session]);

  const handleWorkspaceChange = (workspaceId: string) => {
    localStorage.setItem(activeWorkspaceStorageKey, workspaceId);
    setActiveWorkspaceId(workspaceId);
  };

  const content = useMemo(() => {
    if (route === 'landing') return <LandingPage />;
    if (route === 'signup') return <AuthPage mode="signup" onSignIn={setSession} />;
    if (route === 'login') return <AuthPage mode="login" onSignIn={setSession} />;
    return implementedRoutes.has(route) ? <ImplementedPage route={route} tenant={tenant} ai={aiActions} /> : <StageLaterPage route={route} />;
  }, [route, tenant, aiActions]);

  const signOut = () => {
    localStorage.removeItem(authStorageKey);
    setSession(null);
    navigateTo('landing');
  };

  return (
    <Shell session={session} route={route} activeWorkspaceId={activeWorkspaceId} onWorkspaceChange={handleWorkspaceChange} onSignOut={signOut}>
      {content}
    </Shell>
  );
}
