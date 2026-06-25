import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Check, ClipboardList, LayoutDashboard, LogOut, Plus, Save, Target, Trash2, Workflow } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesInvites';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Separator } from './components/ui/separator';
import { Textarea } from './components/ui/textarea';
import type { StrategicValueCategory, ProblemType, ExpectedValueType, ObjectiveStatus, MetricCategory } from './types';

type AuthSession = {
  email: string;
  provider: 'email' | 'google';
  signedInAt: string;
};

type Workspace = {
  id: string;
  companyName?: string;
  name?: string;
  description?: string;
  businessUnit?: string;
  industry?: string;
  operatingModel?: string;
  businessModel?: string;
};

type StrategicObjective = {
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

type StrategicObjectiveMetric = {
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

type StrategicObjectiveForm = Omit<StrategicObjective, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;

type StoredStrategicObjective = Partial<StrategicObjective> & Record<string, unknown>;

const strategicValueCategoryOptions: { value: StrategicValueCategory; label: string }[] = [
  { value: 'revenue_growth', label: 'Revenue Growth' },
  { value: 'cost_reduction', label: 'Cost Reduction' },
  { value: 'operational_efficiency', label: 'Operational Efficiency' },
  { value: 'customer_experience', label: 'Customer Experience' },
  { value: 'risk_reduction', label: 'Risk Reduction' },
  { value: 'scalability', label: 'Scalability' },
  { value: 'competitive_advantage', label: 'Competitive Advantage' },
];

const problemTypeOptions: { value: ProblemType; label: string }[] = [
  { value: 'customer', label: 'Customer Problem' },
  { value: 'internal', label: 'Internal Business Problem' },
  { value: 'both', label: 'Both Customer and Internal' },
];

const expectedValueTypeOptions: { value: ExpectedValueType; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'mixed', label: 'Mixed' },
];

const objectiveStatusOptions: { value: ObjectiveStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const metricCategoryOptions: { value: MetricCategory; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'customer', label: 'Customer' },
  { value: 'risk', label: 'Risk' },
];

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const strategicObjectivesStorageKey = 'slaf.prototype.strategicObjectives';
const metricsStorageKey = 'slaf.prototype.metrics';
const objectiveLimit = 3;

const getLabel = <T extends string>(value: T | '', options: { value: T; label: string }[]): string =>
  options.find(o => o.value === value)?.label || value || '';

const lifecycleFlow = ['Sign in / Login', 'Workspace / Company Profile', 'Strategic Objectives', 'Business Architecture'];
const downstreamFlow = ['Lean Business Case', 'Product Discovery', 'Conceptual Architecture', 'Requirements / Features / Epics'];

const emptyObjectiveForm: StrategicObjectiveForm = {
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

const exampleObjectiveForm: StrategicObjectiveForm = {
  strategicInitiativeName: 'Improve Enterprise Delivery Efficiency',
  executiveObjective: 'Reduce operational friction and improve the speed at which strategic initiatives become implementation-ready solutions.',
  strategicValueCategory: 'operational_efficiency',
  expectedBusinessOutcome: 'Reduce strategy-to-implementation cycle time.',
  financialImpact: 'Reduce rework, duplicate discovery activities, and planning delays across enterprise transformation efforts.',
  urgencyRationale: 'The organization needs a faster and more traceable process for converting executive strategy into implementation-ready work.',
  targetImplementationYear: 'FY2026',
  targetImplementationStartDate: '2026-01-01',
  targetImplementationEndDate: '2026-12-31',
  problemOpportunityStatement: 'Teams lack a consistent structure for translating executive objectives into implementation-ready work.',
  costOfInaction: 'Continued delays, fragmented documentation, duplicated discovery work, and weak traceability between strategy and delivery.',
  currentLimitation: 'Strategic initiatives move through disconnected planning, discovery, architecture, and implementation processes.',
  impactedTeams: 'Business Architecture, Product Management, Solution Architecture, Delivery Teams, Executive Sponsors',
  problemType: 'both',
  valueHypothesis: 'If strategic objectives are translated through Lean Business Cases, initiatives, and business architecture artifacts, then teams can reduce planning friction and increase implementation readiness.',
  valueMeasurementApproach: 'Measure reduced discovery cycle time, improved traceability, and faster architecture planning readiness.',
  expectedValueType: 'mixed',
  valueRealizationTimeframe: 'Within FY2026',
  status: 'draft',
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const getRoute = () => window.location.hash.replace(/^#/, '').split('?')[0] || '/';
const navigateTo = (route: string) => { window.location.hash = route; };

const loadAuthSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(authStorageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const loadWorkspace = (): Workspace | null => {
  try {
    const raw = localStorage.getItem(workspaceStorageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || workspace?.name || 'Workspace setup in progress';

const migrateEnum = <T extends string>(value: unknown, map: Record<string, T>, options: { value: T }[]): T | '' => {
  const str = String(value || '');
  if (map[str]) return map[str];
  if (options.some(o => o.value === str)) return str as T;
  return '';
};

const normalizeObjective = (objective: StoredStrategicObjective, workspaceId: string): StrategicObjective => {
  const now = new Date().toISOString();
  return {
    id: (objective.id as string) || createId('obj'),
    workspaceId: (objective.workspaceId as string) || workspaceId,
    strategicInitiativeName: (objective.strategicInitiativeName as string) || '',
    executiveObjective: (objective.executiveObjective as string) || '',
    strategicValueCategory: migrateEnum(objective.strategicValueCategory, { 'Revenue Growth': 'revenue_growth', 'Cost Reduction': 'cost_reduction', 'Operational Efficiency': 'operational_efficiency', 'Customer Experience': 'customer_experience', 'Risk Reduction': 'risk_reduction', 'Scalability': 'scalability', 'Competitive Advantage': 'competitive_advantage' }, strategicValueCategoryOptions),
    expectedBusinessOutcome: (objective.expectedBusinessOutcome as string) || '',
    financialImpact: (objective.financialImpact as string) || '',
    urgencyRationale: (objective.urgencyRationale as string) || '',
    targetImplementationYear: (objective.targetImplementationYear as string) || '',
    targetImplementationStartDate: (objective.targetImplementationStartDate as string) || '',
    targetImplementationEndDate: (objective.targetImplementationEndDate as string) || '',
    problemOpportunityStatement: (objective.problemOpportunityStatement as string) || '',
    costOfInaction: (objective.costOfInaction as string) || '',
    currentLimitation: (objective.currentLimitation as string) || '',
    impactedTeams: (objective.impactedTeams as string) || '',
    problemType: migrateEnum(objective.problemType, { 'Customer Problem': 'customer', 'Internal Business Problem': 'internal', 'Both Customer and Internal Business Problem': 'both', 'both_customer_and_internal': 'both' }, problemTypeOptions),
    valueHypothesis: (objective.valueHypothesis as string) || '',
    valueMeasurementApproach: (objective.valueMeasurementApproach as string) || '',
    expectedValueType: migrateEnum(objective.expectedValueType, { 'Financial': 'financial', 'Operational': 'operational', 'Mixed': 'mixed' }, expectedValueTypeOptions),
    valueRealizationTimeframe: (objective.valueRealizationTimeframe as string) || '',
    status: migrateEnum(objective.status, { 'Draft': 'draft', 'Active': 'active', 'Completed': 'completed', 'Archived': 'archived' }, objectiveStatusOptions) as ObjectiveStatus || 'draft',
    createdAt: (objective.createdAt as string) || now,
    updatedAt: (objective.updatedAt as string) || now,
  };
};

const loadAllMetrics = (): StrategicObjectiveMetric[] => {
  try {
    const raw = localStorage.getItem(metricsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadMetrics = (objectiveId: string): StrategicObjectiveMetric[] =>
  loadAllMetrics().filter(m => m.strategicObjectiveId === objectiveId);

const persistMetrics = (objectiveId: string, metrics: StrategicObjectiveMetric[]) => {
  const others = loadAllMetrics().filter(m => m.strategicObjectiveId !== objectiveId);
  localStorage.setItem(metricsStorageKey, JSON.stringify([...others, ...metrics]));
};

const loadAllObjectives = (): StoredStrategicObjective[] => {
  try {
    const raw = localStorage.getItem(strategicObjectivesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredStrategicObjective[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadObjectives = (workspaceId?: string): StrategicObjective[] => {
  if (!workspaceId) return [];
  return loadAllObjectives()
    .map((objective) => normalizeObjective(objective, workspaceId))
    .filter((objective) => objective.workspaceId === workspaceId);
};

const persistWorkspaceObjectives = (workspaceId: string, workspaceObjectives: StrategicObjective[]) => {
  const otherObjectives = loadAllObjectives().filter((objective) => objective.workspaceId !== workspaceId);
  localStorage.setItem(strategicObjectivesStorageKey, JSON.stringify([...otherObjectives, ...workspaceObjectives]));
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-slate-200">{label}</Label>
      {children}
    </div>
  );
}

function PrototypeNotice() {
  return (
    <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
      Frontend-only prototype: strategic objectives are stored in browser local storage and model POST, GET, and PATCH for /workspaces/:workspaceId/strategic-objectives. No backend persistence is active yet.
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className = normalized === 'active'
    ? 'bg-lime-500 text-black hover:bg-lime-400'
    : normalized === 'archived'
      ? 'bg-slate-700 text-slate-100 hover:bg-slate-700'
      : 'bg-cyan-500 text-black hover:bg-cyan-400';
  return <Badge className={`rounded-sm ${className}`}>{status || 'draft'}</Badge>;
}

function PrototypeHeader({ session, workspace }: { session: AuthSession | null; workspace: Workspace | null }) {
  const signOut = () => {
    localStorage.removeItem(authStorageKey);
    navigateTo('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div>
          <p className="text-sm text-slate-300">{getWorkspaceName(workspace)}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project Site
          </Button>
          {session && (
            <>
              <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/workspace-onboarding')}>Workspace</Button>
              <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/strategic-objectives')}>Strategic Objectives</Button>
              {workspace && <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button>}
              {workspace && <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/invites')}>Invites</Button>}
              <Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function PrototypeShell({ session, workspace, children }: { session: AuthSession | null; workspace: Workspace | null; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PrototypeHeader session={session} workspace={workspace} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function LifecycleFlowPanel({ workspace, objectives }: { workspace: Workspace | null; objectives: StrategicObjective[] }) {
  const completedIndex = !workspace ? 0 : objectives.length > 0 ? 2 : 1;
  return (
    <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="retro-heading text-cyan-300">Prototype Flow</CardTitle>
        <CardDescription className="text-slate-300">Workspace setup comes before lifecycle modeling. Strategic Objectives are the first lifecycle artifact, then Business Architecture is built to support those objectives.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          {lifecycleFlow.map((step, index) => (
            <div key={step} className={`rounded-md border p-4 text-center text-xs ${index <= completedIndex ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
              <div className="mb-1 font-semibold">{index + 1}</div>
              {step}
            </div>
          ))}
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
          Downstream lifecycle after Business Architecture: {downstreamFlow.join(' -> ')}.
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [objectives, setObjectives] = useState<StrategicObjective[]>(() => loadObjectives(loadWorkspace()?.id));

  useEffect(() => {
    const reload = () => {
      const nextSession = loadAuthSession();
      const nextWorkspace = loadWorkspace();
      setSession(nextSession);
      setWorkspace(nextWorkspace);
      setObjectives(loadObjectives(nextWorkspace?.id));
    };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  if (!session) {
    navigateTo('/login');
    return null;
  }

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend-only prototype</Badge>
              <CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Welcome to AI Augmented Lifecycle framework</CardTitle>
              <CardDescription className="text-slate-300">Create the company workspace, define up to three strategic objectives, then build business architecture to support those objectives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <PrototypeNotice />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Workspace</div><div className="mt-1 text-sm text-slate-100">{workspace ? getWorkspaceName(workspace) : 'Not created'}</div></div>
                <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Strategic Objectives</div><div className="mt-1 text-2xl font-semibold text-lime-300">{objectives.length} / {objectiveLimit}</div></div>
                <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Next Artifact</div><div className="mt-1 text-sm text-slate-100">{objectives.length > 0 ? 'Business Architecture' : 'Strategic Objectives'}</div></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-fuchsia-300">Current Session</CardTitle>
              <CardDescription className="text-slate-300">{session.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <Button variant="outline" onClick={() => navigateTo('/invites')} disabled={!workspace} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Manage Invites</Button>
              <Button variant="outline" onClick={() => { localStorage.removeItem(authStorageKey); navigateTo('/login'); }} className="w-full rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white"><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Workspace / Company Profile</CardTitle><CardDescription className="text-slate-300">{workspace ? 'Company context exists' : 'Required first'}</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>{workspace?.description || 'Create the company profile workspace before defining strategic objectives.'}</p>
              <Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'View / Edit Workspace' : 'Create Workspace'}</Button>
            </CardContent>
          </Card>

          <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <div className="flex items-start gap-3"><Target className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Strategic Objectives</CardTitle><CardDescription className="text-slate-300">{objectives.length} captured</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Define executive intent, value hypothesis, problem statement, target timeline, and validation status before moving into Business Architecture.</p>
              <Button disabled={!workspace} onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">{objectives.length > 0 ? 'View / Edit Objectives' : 'Create Strategic Objective'}</Button>
            </CardContent>
          </Card>

          <Card className="rounded-md border-slate-700 bg-slate-900 text-slate-100">
            <CardHeader>
              <div className="flex items-start gap-3"><Workflow className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Business Architecture</CardTitle><CardDescription className="text-slate-300">Built after objectives</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Business Architecture should outline organization structure, existing value streams, capabilities, and impacts that support the defined strategic objectives.</p>
              <Button disabled={!workspace || objectives.length === 0} onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Build Business Architecture</Button>
            </CardContent>
          </Card>
        </div>

        <LifecycleFlowPanel workspace={workspace} objectives={objectives} />
      </section>
    </PrototypeShell>
  );
}

const formToObjective = (form: StrategicObjectiveForm, workspaceId: string, existing?: StrategicObjective): StrategicObjective => {
  const now = new Date().toISOString();
  return {
    ...form,
    id: existing?.id || createId('obj'),
    workspaceId,
    strategicInitiativeName: form.strategicInitiativeName.trim(),
    status: form.status || 'draft',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
};

const objectiveToForm = (objective: StrategicObjective): StrategicObjectiveForm => ({
  strategicInitiativeName: objective.strategicInitiativeName,
  executiveObjective: objective.executiveObjective,
  strategicValueCategory: objective.strategicValueCategory,
  expectedBusinessOutcome: objective.expectedBusinessOutcome,
  financialImpact: objective.financialImpact,
  urgencyRationale: objective.urgencyRationale,
  targetImplementationYear: objective.targetImplementationYear,
  targetImplementationStartDate: objective.targetImplementationStartDate,
  targetImplementationEndDate: objective.targetImplementationEndDate,
  problemOpportunityStatement: objective.problemOpportunityStatement,
  costOfInaction: objective.costOfInaction,
  currentLimitation: objective.currentLimitation,
  impactedTeams: objective.impactedTeams,
  problemType: objective.problemType,
  valueHypothesis: objective.valueHypothesis,
  valueMeasurementApproach: objective.valueMeasurementApproach,
  expectedValueType: objective.expectedValueType,
  valueRealizationTimeframe: objective.valueRealizationTimeframe,
  status: objective.status,
});

const getMissingFields = (form: StrategicObjectiveForm) => {
  if (!form.strategicInitiativeName.trim()) return ['strategicInitiativeName'];
  if (form.status.toLowerCase() !== 'active') return [];
  return [
    ['executiveObjective', form.executiveObjective],
    ['strategicValueCategory', form.strategicValueCategory],
    ['problemOpportunityStatement', form.problemOpportunityStatement],
    ['valueHypothesis', form.valueHypothesis],
    ['status', form.status],
  ].filter(([, value]) => !String(value).trim()).map(([field]) => field);
};

function StrategicObjectivesScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [objectives, setObjectives] = useState<StrategicObjective[]>(() => loadObjectives(loadWorkspace()?.id));
  const [form, setForm] = useState<StrategicObjectiveForm>(emptyObjectiveForm);
  const [metrics, setMetrics] = useState<StrategicObjectiveMetric[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const reload = () => {
      const nextSession = loadAuthSession();
      const nextWorkspace = loadWorkspace();
      setSession(nextSession);
      setWorkspace(nextWorkspace);
      setObjectives(loadObjectives(nextWorkspace?.id));
    };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  const remainingSlots = Math.max(0, objectiveLimit - objectives.length);
  const hasReachedLimit = objectives.length >= objectiveLimit && !editingId;
  const activeCount = useMemo(() => objectives.filter((objective) => objective.status.toLowerCase() === 'active').length, [objectives]);

  const updateField = (field: keyof StrategicObjectiveForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyObjectiveForm);
    setMetrics([]);
    setEditingId(null);
    setError('');
  };

  const addMetric = () => {
    const now = new Date().toISOString();
    setMetrics(prev => [...prev, { id: createId('metric'), strategicObjectiveId: editingId || '', workspaceId: workspace?.id || '', name: '', metricCategory: '', baselineValue: null, targetValue: null, unit: '', timeframe: '', createdAt: now, updatedAt: now }]);
  };

  const updateMetric = (metricId: string, field: keyof StrategicObjectiveMetric, value: string | number | null) => {
    setMetrics(prev => prev.map(m => m.id === metricId ? { ...m, [field]: value, updatedAt: new Date().toISOString() } : m));
  };

  const removeMetric = (metricId: string) => {
    setMetrics(prev => prev.filter(m => m.id !== metricId));
  };

  const saveObjective = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!workspace?.id) {
      setError('Create a workspace before saving strategic objectives.');
      return;
    }

    if (hasReachedLimit) {
      setError('Prototype limit reached. You can create up to three strategic objectives per workspace.');
      return;
    }

    const missingFields = getMissingFields(form);
    if (missingFields.length > 0) {
      const message = form.status.toLowerCase() === 'active'
        ? 'Strategic Objective cannot be marked Active until all required fields are completed.'
        : 'Strategic Initiative Name is required to save a draft.';
      setError(`${message} Missing fields: ${missingFields.join(', ')}.`);
      return;
    }

    const existing = editingId ? objectives.find((objective) => objective.id === editingId) : undefined;
    const nextObjective = formToObjective(form, workspace.id, existing);
    const nextObjectives = existing
      ? objectives.map((objective) => objective.id === existing.id ? nextObjective : objective)
      : [...objectives, nextObjective];

    const updatedMetrics = metrics.map(m => ({ ...m, strategicObjectiveId: nextObjective.id, workspaceId: workspace.id }));
    persistMetrics(nextObjective.id, updatedMetrics);
    persistWorkspaceObjectives(workspace.id, nextObjectives);
    setObjectives(nextObjectives);
    resetForm();
  };

  const editObjective = (objective: StrategicObjective) => {
    setEditingId(objective.id);
    setForm(objectiveToForm(objective));
    setMetrics(loadMetrics(objective.id));
    setError('');
  };

  const deleteObjective = (objectiveId: string) => {
    if (!workspace?.id) return;
    const nextObjectives = objectives.filter((objective) => objective.id !== objectiveId);
    persistWorkspaceObjectives(workspace.id, nextObjectives);
    setObjectives(nextObjectives);
    if (editingId === objectiveId) resetForm();
  };

  if (!session) {
    navigateTo('/login');
    return null;
  }

  if (!workspace) {
    return (
      <PrototypeShell session={session} workspace={workspace}>
        <section className="mx-auto max-w-3xl">
          <Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle>
              <CardDescription className="text-slate-300">Create the company profile workspace before defining strategic objectives.</CardDescription>
            </CardHeader>
            <CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">First lifecycle artifact</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Strategic Objectives</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Define executive intent and measurable strategic value before outlining Business Architecture support.</p>
          </div>
          <Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="retro-heading text-cyan-300">Create Strategic Objective</CardTitle>
                  <CardDescription className="text-slate-300">POST /workspaces/:workspaceId/strategic-objectives</CardDescription>
                </div>
                <Badge className="w-fit rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{objectives.length} / {objectiveLimit}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <PrototypeNotice />
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
              {hasReachedLimit && <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">Prototype limit reached: three strategic objectives per workspace.</div>}
              <form className="grid gap-5" onSubmit={saveObjective}>
                <div className="grid gap-5 md:grid-cols-[1fr_180px_180px]">
                  <Field id="objective-name" label="Strategic Initiative Name"><Input id="objective-name" value={form.strategicInitiativeName} onChange={(event) => updateField('strategicInitiativeName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="objective-status" label="Status"><Select value={form.status} onValueChange={(value) => updateField('status', value)}><SelectTrigger id="objective-status" className="border-slate-700 bg-slate-950 text-slate-100"><SelectValue /></SelectTrigger><SelectContent className="border-slate-700 bg-slate-950 text-slate-100">{objectiveStatusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></Field>
                  <Field id="objective-year" label="Target Year"><Input id="objective-year" value={form.targetImplementationYear} onChange={(event) => updateField('targetImplementationYear', event.target.value)} placeholder="FY2026" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field id="executive-objective" label="Executive Objective"><Textarea id="executive-objective" value={form.executiveObjective} onChange={(event) => updateField('executiveObjective', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="expected-outcome" label="Expected Business Outcome"><Textarea id="expected-outcome" value={form.expectedBusinessOutcome} onChange={(event) => updateField('expectedBusinessOutcome', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="value-category" label="Strategic Value Category"><Select value={form.strategicValueCategory} onValueChange={(value) => updateField('strategicValueCategory', value)}><SelectTrigger id="value-category" className="border-slate-700 bg-slate-950 text-slate-100"><SelectValue placeholder="Select a value category" /></SelectTrigger><SelectContent className="border-slate-700 bg-slate-950 text-slate-100">{strategicValueCategoryOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></Field>
                  <Field id="problem-type" label="Problem Type"><Select value={form.problemType} onValueChange={(value) => updateField('problemType', value)}><SelectTrigger id="problem-type" className="border-slate-700 bg-slate-950 text-slate-100"><SelectValue placeholder="Select problem type" /></SelectTrigger><SelectContent className="border-slate-700 bg-slate-950 text-slate-100">{problemTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></Field>
                  <Field id="start-date" label="Target Start Date"><Input id="start-date" type="date" value={form.targetImplementationStartDate} onChange={(event) => updateField('targetImplementationStartDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="end-date" label="Target End Date"><Input id="end-date" type="date" value={form.targetImplementationEndDate} onChange={(event) => updateField('targetImplementationEndDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                </div>

                <Field id="financial-impact" label="Financial Impact"><Textarea id="financial-impact" value={form.financialImpact} onChange={(event) => updateField('financialImpact', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="urgency" label="Urgency Rationale"><Textarea id="urgency" value={form.urgencyRationale} onChange={(event) => updateField('urgencyRationale', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field id="problem-opportunity" label="Problem / Opportunity Statement"><Textarea id="problem-opportunity" value={form.problemOpportunityStatement} onChange={(event) => updateField('problemOpportunityStatement', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="cost-inaction" label="Cost of Inaction"><Textarea id="cost-inaction" value={form.costOfInaction} onChange={(event) => updateField('costOfInaction', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="current-limitation" label="Current Limitation"><Textarea id="current-limitation" value={form.currentLimitation} onChange={(event) => updateField('currentLimitation', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="impacted-teams" label="Impacted Teams"><Textarea id="impacted-teams" value={form.impactedTeams} onChange={(event) => updateField('impactedTeams', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                </div>

                <Field id="value-hypothesis" label="Value Hypothesis"><Textarea id="value-hypothesis" value={form.valueHypothesis} onChange={(event) => updateField('valueHypothesis', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <div className="grid gap-5 md:grid-cols-2">
                  <Field id="measurement" label="Value Measurement Approach"><Textarea id="measurement" value={form.valueMeasurementApproach} onChange={(event) => updateField('valueMeasurementApproach', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                  <Field id="value-type" label="Expected Value Type"><Select value={form.expectedValueType} onValueChange={(value) => updateField('expectedValueType', value)}><SelectTrigger id="value-type" className="border-slate-700 bg-slate-950 text-slate-100"><SelectValue placeholder="Select value type" /></SelectTrigger><SelectContent className="border-slate-700 bg-slate-950 text-slate-100">{expectedValueTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></Field>
                  <Field id="value-timeframe" label="Value Realization Timeframe"><Input id="value-timeframe" value={form.valueRealizationTimeframe} onChange={(event) => updateField('valueRealizationTimeframe', event.target.value)} placeholder="Within FY2026" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                </div>

                <Separator className="bg-slate-700" />

                <div>
                  <div className="flex items-center justify-between">
                    <div><h3 className="retro-heading text-lg text-cyan-300">Strategic Objective Metrics</h3><p className="mt-1 text-xs text-slate-400">Define measurable goals with baseline and target values (integers).</p></div>
                    <Button type="button" onClick={addMetric} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Plus className="mr-1 h-4 w-4" />Add Metric</Button>
                  </div>
                  {metrics.length === 0 && <div className="mt-4 rounded-md border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400">No metrics defined yet. Add a metric to track measurable success goals.</div>}
                  <div className="mt-4 space-y-4">
                    {metrics.map((metric, index) => (
                      <div key={metric.id} className="rounded-md border border-slate-700 bg-slate-950 p-4">
                        <div className="mb-3 flex items-center justify-between"><span className="retro-heading text-xs text-cyan-400">Metric {index + 1}</span><Button type="button" variant="ghost" onClick={() => removeMetric(metric.id)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20 hover:text-red-300"><Trash2 className="h-4 w-4" /></Button></div>
                        <div className="grid gap-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field id={`mn-${metric.id}`} label="Metric Name"><Input id={`mn-${metric.id}`} value={metric.name} onChange={(e) => updateMetric(metric.id, 'name', e.target.value)} placeholder='e.g. "Structural cost savings"' className="border-slate-700 bg-slate-900 text-slate-100" /></Field>
                            <Field id={`mc-${metric.id}`} label="Category"><Select value={metric.metricCategory} onValueChange={(v) => updateMetric(metric.id, 'metricCategory', v)}><SelectTrigger id={`mc-${metric.id}`} className="border-slate-700 bg-slate-900 text-slate-100"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent className="border-slate-700 bg-slate-950 text-slate-100">{metricCategoryOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></Field>
                          </div>
                          <div className="grid gap-4 md:grid-cols-4">
                            <Field id={`mb-${metric.id}`} label="Baseline"><Input id={`mb-${metric.id}`} type="number" value={metric.baselineValue?.toString() ?? ''} onChange={(e) => updateMetric(metric.id, 'baselineValue', e.target.value ? parseInt(e.target.value) : null)} placeholder="Integer" className="border-slate-700 bg-slate-900 text-slate-100" /></Field>
                            <Field id={`mt-${metric.id}`} label="Target"><Input id={`mt-${metric.id}`} type="number" value={metric.targetValue?.toString() ?? ''} onChange={(e) => updateMetric(metric.id, 'targetValue', e.target.value ? parseInt(e.target.value) : null)} placeholder="Integer" className="border-slate-700 bg-slate-900 text-slate-100" /></Field>
                            <Field id={`mu-${metric.id}`} label="Unit"><Input id={`mu-${metric.id}`} value={metric.unit} onChange={(e) => updateMetric(metric.id, 'unit', e.target.value)} placeholder="USD | % | days" className="border-slate-700 bg-slate-900 text-slate-100" /></Field>
                            <Field id={`mf-${metric.id}`} label="Timeframe"><Input id={`mf-${metric.id}`} value={metric.timeframe} onChange={(e) => updateMetric(metric.id, 'timeframe', e.target.value)} placeholder="By FY2025" className="border-slate-700 bg-slate-900 text-slate-100" /></Field>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">
                  Draft requires strategicInitiativeName. Active requires strategicInitiativeName, executiveObjective, strategicValueCategory, problemOpportunityStatement, valueHypothesis, and status.
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setForm(exampleObjectiveForm)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Use API Example</Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button>
                  <Button type="submit" disabled={hasReachedLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Save className="mr-2 h-4 w-4" />{editingId ? 'Update Objective' : 'Save Objective'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
              <CardHeader>
                <CardTitle className="retro-heading text-fuchsia-300">Objective Summary</CardTitle>
                <CardDescription className="text-slate-300">GET /workspaces/:workspaceId/strategic-objectives</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Created</div><div className="text-2xl font-semibold text-cyan-300">{objectives.length}</div></div>
                <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Active</div><div className="text-2xl font-semibold text-lime-300">{activeCount}</div></div>
                <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Remaining Slots</div><div className="text-2xl font-semibold text-yellow-300">{remainingSlots}</div></div>
              </CardContent>
            </Card>

            <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
              <CardHeader>
                <CardTitle className="retro-heading text-cyan-300">Saved Objectives</CardTitle>
                <CardDescription className="text-slate-300">Limit: three per workspace for the prototype.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {objectives.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No strategic objectives saved yet.</div>
                ) : objectives.map((objective) => (
                  <div key={objective.id} className="rounded-md border border-slate-700 bg-slate-950 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-100">{objective.strategicInitiativeName || 'Untitled Strategic Objective'}</h3>
                          <StatusBadge status={objective.status} />
                        </div>
                        <p className="text-sm text-slate-300">{objective.expectedBusinessOutcome || objective.executiveObjective || 'No outcome entered.'}</p>
                        <dl className="grid gap-2 text-xs sm:grid-cols-2">
                          <div><dt className="uppercase text-slate-500">Value Category</dt><dd className="text-slate-100">{getLabel(objective.strategicValueCategory, strategicValueCategoryOptions) || 'Not set'}</dd></div>
                          <div><dt className="uppercase text-slate-500">Target Year</dt><dd className="text-slate-100">{objective.targetImplementationYear || 'Not set'}</dd></div>
                          <div><dt className="uppercase text-slate-500">Problem Type</dt><dd className="text-slate-100">{getLabel(objective.problemType, problemTypeOptions) || 'Not set'}</dd></div>
                          <div><dt className="uppercase text-slate-500">Value Type</dt><dd className="text-slate-100">{getLabel(objective.expectedValueType, expectedValueTypeOptions) || 'Not set'}</dd></div>
                        </dl>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => editObjective(objective)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button>
                        <Button type="button" variant="outline" onClick={() => deleteObjective(objective.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button disabled={objectives.length === 0} onClick={() => navigateTo('/business-architecture')} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Continue to Business Architecture</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PrototypeShell>
  );
}

function BusinessArchitectureGate() {
  const session = loadAuthSession();
  const workspace = loadWorkspace();
  const objectives = loadObjectives(workspace?.id);

  if (!session) {
    navigateTo('/login');
    return null;
  }

  if (!workspace) {
    navigateTo('/workspace-onboarding');
    return null;
  }

  if (objectives.length === 0) {
    return (
      <PrototypeShell session={session} workspace={workspace}>
        <section className="mx-auto max-w-3xl">
          <Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-yellow-300">Strategic Objective Required</CardTitle>
              <CardDescription className="text-slate-300">Business Architecture should be built or outlined to support defined Strategic Objectives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Create at least one Strategic Objective before entering Business Architecture details.</p>
              <Button onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Target className="mr-2 h-4 w-4" />Create Strategic Objective</Button>
            </CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

  return <BasePrototypeRoutes />;
}

function StrategicObjectiveShortcut() {
  const [route, setRoute] = useState(() => getRoute());
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());

  useEffect(() => {
    const reload = () => {
      setRoute(getRoute());
      setSession(loadAuthSession());
      setWorkspace(loadWorkspace());
    };
    window.addEventListener('hashchange', reload);
    window.addEventListener('storage', reload);
    return () => {
      window.removeEventListener('hashchange', reload);
      window.removeEventListener('storage', reload);
    };
  }, []);

  if (!session || !workspace || route === '/' || route === '/dashboard' || route === '/strategic-objectives') return null;

  return (
    <Button onClick={() => navigateTo('/strategic-objectives')} className="fixed bottom-20 right-5 z-[70] rounded-sm border border-lime-400 bg-slate-950 text-lime-200 shadow-[0_0_18px_rgba(132,204,22,0.25)] hover:bg-lime-500 hover:text-black">
      <Target className="mr-2 h-4 w-4" />
      Strategic Objectives
    </Button>
  );
}

export default function PrototypeRoutesStrategicObjectives() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '/dashboard') return <DashboardScreen />;
  if (route === '/strategic-objectives') return <StrategicObjectivesScreen />;
  if (route === '/business-architecture') return <BusinessArchitectureGate />;

  return (
    <>
      <BasePrototypeRoutes />
      <StrategicObjectiveShortcut />
    </>
  );
}
