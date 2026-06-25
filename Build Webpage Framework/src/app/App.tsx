import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, Github, LayoutDashboard, LogIn, Menu, Pencil, Plus, X, Check, AlertCircle, Lightbulb, Users, Target, TrendingUp, Database, GitBranch, Shield, BookOpen, FileCode, Activity, Layers, Gauge, PanelTop, ListChecks, Trash2, DollarSign } from 'lucide-react';
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
import type {
  Workspace,
  StrategicObjective,
  StrategicObjectiveMetric,
  LeanBusinessCase,
  WorkspaceMember,
  WorkspaceInvite,
  StrategicValueCategory,
  ProblemType,
  ExpectedValueType,
  ObjectiveStatus,
  MetricCategory,
  Priority,
  CaseValueType,
  CaseStatus,
  InviteStatus,
} from './types';

type PrototypeRoute =
  | '/'
  | '/login'
  | '/signup'
  | '/workspace-onboarding'
  | '/dashboard'
  | '/workspace-settings'
  | '/strategic-objectives'
  | '/lean-business-case';

type StoredWorkspace = Workspace & Record<string, unknown>;
type StoredStrategicObjective = StrategicObjective & Record<string, string | undefined>;

const workspaceStorageKey = 'slaf.prototype.workspace';
const objectivesStorageKey = 'slaf.prototype.strategicObjectives';
const metricsStorageKey = 'slaf.prototype.metrics';
const lbcStorageKey = 'slaf.prototype.leanBusinessCases';
const membersStorageKey = 'slaf.prototype.workspaceMembers';
const invitesStorageKey = 'slaf.prototype.workspaceInvites';

const strategicValueCategoryOptions: { value: StrategicValueCategory; label: string; description: string }[] = [
  { value: 'revenue_growth', label: 'Revenue Growth', description: 'Increase customer conversion or purchase frequency' },
  { value: 'cost_reduction', label: 'Cost Reduction', description: 'Reduce operating cost or duplicated work' },
  { value: 'operational_efficiency', label: 'Operational Efficiency', description: 'Improve speed, throughput, or productivity' },
  { value: 'customer_experience', label: 'Customer Experience', description: 'Improve convenience, reliability, or satisfaction' },
  { value: 'risk_reduction', label: 'Risk Reduction', description: 'Reduce compliance, security, or operational risk' },
  { value: 'scalability', label: 'Scalability', description: 'Support growth without proportional cost increase' },
  { value: 'competitive_advantage', label: 'Competitive Advantage', description: 'Differentiate through speed, intelligence, or service quality' },
];

const objectiveStatusOptions: { value: ObjectiveStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
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

const metricCategoryOptions: { value: MetricCategory; label: string }[] = [
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'customer', label: 'Customer' },
  { value: 'risk', label: 'Risk' },
];

const companySizeOptions = ['1-50', '51-200', '201-1000', '1000+'];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const caseValueTypeOptions: { value: CaseValueType; label: string }[] = [
  { value: 'cost_savings', label: 'Cost Savings' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'risk_reduction', label: 'Risk Reduction' },
  { value: 'efficiency', label: 'Efficiency' },
];

const caseStatusOptions: { value: CaseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const inviteStatusOptions: { value: InviteStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
];

const getLabel = <T extends string>(value: T | '', options: { value: T; label: string }[]): string =>
  options.find(o => o.value === value)?.label || '';

const migrateValueCategory = (old: string): StrategicValueCategory | '' => {
  const map: Record<string, StrategicValueCategory> = {
    'Revenue Growth': 'revenue_growth', 'Cost Reduction': 'cost_reduction',
    'Operational Efficiency': 'operational_efficiency', 'Customer Experience': 'customer_experience',
    'Risk Reduction': 'risk_reduction', 'Scalability': 'scalability', 'Competitive Advantage': 'competitive_advantage',
  };
  return map[old] || (strategicValueCategoryOptions.some(o => o.value === old) ? old as StrategicValueCategory : '');
};

const migrateProblemType = (old: string): ProblemType | '' => {
  const map: Record<string, ProblemType> = {
    'Customer Problem': 'customer', 'Internal Business Problem': 'internal',
    'Both Customer and Internal Business Problem': 'both',
  };
  return map[old] || (problemTypeOptions.some(o => o.value === old) ? old as ProblemType : '');
};

const migrateExpectedValueType = (old: string): ExpectedValueType | '' => {
  const map: Record<string, ExpectedValueType> = {
    'Financial': 'financial', 'Operational': 'operational', 'Mixed': 'mixed',
    'Customer-Focused': 'mixed', 'Risk-Focused': 'financial', 'Technical': 'operational',
  };
  return map[old] || (expectedValueTypeOptions.some(o => o.value === old) ? old as ExpectedValueType : '');
};

const migrateStatus = (old: string): ObjectiveStatus => {
  const map: Record<string, ObjectiveStatus> = {
    'Draft': 'draft', 'Active': 'active', 'Completed': 'completed', 'Archived': 'archived',
  };
  return map[old] || (objectiveStatusOptions.some(o => o.value === old) ? old as ObjectiveStatus : 'draft');
};

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
  if (route === '/lean-business-case-placeholder' as string) return '/lean-business-case';
  const knownRoutes: PrototypeRoute[] = ['/', '/login', '/signup', '/workspace-onboarding', '/dashboard', '/workspace-settings', '/strategic-objectives', '/lean-business-case'];
  return knownRoutes.includes(route) ? route : '/';
};

const getRouteParams = () => new URLSearchParams(window.location.hash.replace(/^#[^?]*\??/, ''));

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeObjective = (objective: StoredStrategicObjective): StrategicObjective => {
  const legacyYearKey = 'time' + 'Horizon';
  const targetImplementationYear = objective.targetImplementationYear || objective[legacyYearKey] || '';
  const expectedBusinessOutcome = objective.expectedBusinessOutcome || objective.companyGoal || objective.targetOutcome || '';

  return {
    id: objective.id || createId('objective'),
    workspaceId: objective.workspaceId || '',
    strategicInitiativeName: objective.strategicInitiativeName || objective.title || '',
    executiveObjective: objective.executiveObjective || objective.objectiveStatement || '',
    strategicValueCategory: migrateValueCategory(objective.strategicValueCategory || objective.strategicValueType || ''),
    expectedBusinessOutcome,
    financialImpact: objective.financialImpact || '',
    urgencyRationale: objective.urgencyRationale || objective.strategicRationale || '',
    targetImplementationYear,
    targetImplementationStartDate: objective.targetImplementationStartDate || '',
    targetImplementationEndDate: objective.targetImplementationEndDate || '',
    problemOpportunityStatement: objective.problemOpportunityStatement || objective.businessProblem || '',
    costOfInaction: objective.costOfInaction || '',
    currentLimitation: objective.currentLimitation || '',
    impactedTeams: objective.impactedTeams || '',
    problemType: migrateProblemType(objective.problemType || ''),
    valueHypothesis: objective.valueHypothesis || '',
    valueMeasurementApproach: objective.valueMeasurementApproach || '',
    expectedValueType: migrateExpectedValueType(objective.expectedValueType || ''),
    valueRealizationTimeframe: objective.valueRealizationTimeframe || '',
    status: migrateStatus(objective.status || 'Draft'),
    createdAt: objective.createdAt || new Date().toISOString(),
    updatedAt: objective.updatedAt || new Date().toISOString(),
  };
};

const loadWorkspace = (): Workspace | null => {
  try {
    const raw = localStorage.getItem(workspaceStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWorkspace;
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
      annualRevenue: (parsed.annualRevenue as number) ?? null,
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

const loadMetrics = (): StrategicObjectiveMetric[] => {
  try {
    const raw = localStorage.getItem(metricsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadLeanBusinessCases = (): LeanBusinessCase[] => {
  try {
    const raw = localStorage.getItem(lbcStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadMembers = (): WorkspaceMember[] => {
  try {
    const raw = localStorage.getItem(membersStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadInvites = (): WorkspaceInvite[] => {
  try {
    const raw = localStorage.getItem(invitesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
              <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/workspace-settings')}>
                <Users className="mr-2 h-4 w-4" />
                Members
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
  const [password, setPassword] = useState('');
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);

  const continueAfterAuth = () => {
    navigateTo(workspace ? '/dashboard' : '/workspace-onboarding');
  };

  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    continueAfterAuth();
  };

  if (showGooglePrompt) {
    return (
      <PrototypeShell workspace={workspace}>
        <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Mock Google sign-in</Badge>
            <h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">Continue to Sign In with Google</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
              This prototype shows the expected Google account handoff before entering the workspace flow. No real Google OAuth connection is made yet.
            </p>
          </div>

          <Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100">Sign in with Google</CardTitle>
              <CardDescription className="text-slate-300">Choose how to continue into the Strategic Lifecycle Prototype.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                type="button"
                onClick={continueAfterAuth}
                className="flex w-full items-center gap-4 rounded-md border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/10"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-900">G</div>
                <div>
                  <div className="font-medium text-slate-100">{email || 'prototype.user@example.com'}</div>
                  <div className="text-sm text-slate-400">Continue with this Google account</div>
                </div>
              </button>
              <Button onClick={continueAfterAuth} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                Continue to Prototype
              </Button>
              <Button type="button" onClick={() => setShowGooglePrompt(false)} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

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
            {['Strategy to execution traceability', 'Mock workspace onboarding', 'Three strategic objective slots', 'Lean Business Case next step'].map((item) => (
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
            <CardDescription className="text-slate-300">Mock authentication only. No account is created yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitAuth}>
              <Field id="email" label="Email">
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <Field id="password" label="Password">
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Prototype password" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <Button type="submit" className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                <LogIn className="mr-2 h-4 w-4" />
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowGooglePrompt(true)} className="w-full rounded-sm border-cyan-500 bg-slate-950 text-cyan-200 hover:bg-cyan-500 hover:text-black">
                Continue with Google
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
    const now = new Date().toISOString();
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
      annualRevenue: form.annualRevenue ? parseFloat(form.annualRevenue) : null,
      createdAt: workspace?.createdAt || now,
      updatedAt: now,
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
  leanBusinessCases,
  members,
  invites,
}: {
  workspace: Workspace | null;
  objectives: StrategicObjective[];
  leanBusinessCases: LeanBusinessCase[];
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}) {
  const hasReachedLimit = objectives.length >= 3;

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
                Strategic objectives represent the company's primary goals and provide the foundation for Lean Business Cases, initiatives, value streams, product discovery, and conceptual architecture.
              </p>
              <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">
                Prototype version: each workspace can define up to three strategic objectives that represent the company's primary goals.
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
              <Separator className="bg-slate-700" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-fuchsia-400" />
                  <span className="text-slate-200">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                  {invites.filter(i => i.status === 'pending').length > 0 && (
                    <Badge className="rounded-sm bg-fuchsia-500/20 text-fuchsia-300 text-[10px] hover:bg-fuchsia-500/20">
                      {invites.filter(i => i.status === 'pending').length} pending
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" onClick={() => navigateTo('/workspace-settings')} className="h-7 rounded-sm px-2 text-xs text-fuchsia-300 hover:bg-fuchsia-500/20 hover:text-fuchsia-200">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">Strategy to Implementation Flow</CardTitle>
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

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="retro-heading text-2xl text-cyan-300">Strategic Objectives</h2>
              <p className="text-sm text-slate-300">{objectives.length} of 3 strategic objectives created.</p>
            </div>
            <Button disabled={hasReachedLimit} onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">
              <Plus className="mr-2 h-4 w-4" />
              Create Strategic Objective
            </Button>
          </div>
          {hasReachedLimit && (
            <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">
              You have reached the prototype limit of three strategic objectives.
            </div>
          )}
          <div className="grid gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((slotIndex) => (
              <ObjectiveSlot key={slotIndex} slotIndex={slotIndex} objective={objectives[slotIndex]} leanBusinessCases={objectives[slotIndex] ? leanBusinessCases.filter(c => c.strategicObjectiveId === objectives[slotIndex].id) : []} />
            ))}
          </div>
        </section>
      </section>
    </PrototypeShell>
  );
}

function ObjectiveSlot({ slotIndex, objective, leanBusinessCases }: { slotIndex: number; objective?: StrategicObjective; leanBusinessCases: LeanBusinessCase[] }) {
  if (!objective) {
    return (
      <Card className="rounded-md border-dashed border-slate-600 bg-slate-900/70 text-slate-100">
        <CardHeader>
          <CardTitle className="retro-heading text-slate-300">Strategic Objective {slotIndex + 1}</CardTitle>
          <CardDescription className="text-slate-400">No strategic objective created yet</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigateTo('/strategic-objectives')} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
            Create Objective
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasReachedCaseLimit = leanBusinessCases.length >= 10;

  return (
    <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="retro-heading text-cyan-300">{objective.strategicInitiativeName}</CardTitle>
            <CardDescription className="mt-1 text-slate-300">Strategic Objective {slotIndex + 1}</CardDescription>
          </div>
          <Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{getLabel(objective.status, objectiveStatusOptions) || objective.status}</Badge>
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
            <dd className="text-slate-100">{getLabel(objective.strategicValueCategory, strategicValueCategoryOptions) || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Expected Business Outcome</dt>
            <dd className="text-slate-100">{objective.expectedBusinessOutcome || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Target Implementation Year</dt>
            <dd className="text-slate-100">{objective.targetImplementationYear || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Lean Business Cases</dt>
            <dd className="text-slate-100">{leanBusinessCases.length} of 10</dd>
          </div>
        </dl>
        {leanBusinessCases.length > 0 && (
          <div className="space-y-1">
            {leanBusinessCases.map(lbc => (
              <button key={lbc.id} onClick={() => navigateTo('/lean-business-case', { id: lbc.id, objectiveId: objective.id })} className="flex w-full items-center justify-between rounded border border-slate-700 bg-slate-950 p-2 text-left text-xs hover:border-fuchsia-400 transition">
                <span className="text-slate-200 truncate">{lbc.title}</span>
                <Badge className="ml-2 rounded-sm bg-slate-800 text-slate-300 text-[10px] hover:bg-slate-800">{getLabel(lbc.status, caseStatusOptions)}</Badge>
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-2">
          <Button onClick={() => navigateTo('/strategic-objectives', { id: objective.id })} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button disabled={hasReachedCaseLimit} onClick={() => navigateTo('/lean-business-case', { objectiveId: objective.id })} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">
            <Plus className="mr-2 h-4 w-4" />
            {hasReachedCaseLimit ? 'Case Limit Reached' : 'Build Lean Business Case'}
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
  const [metrics, setMetrics] = useState<StrategicObjectiveMetric[]>(
    editId ? allMetrics.filter(m => m.strategicObjectiveId === editId) : []
  );
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const isEditing = Boolean(existingObjective);
  const hasReachedLimit = objectives.length >= 3 && !isEditing;
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
  const draftWarnings = form.status === 'draft' && missingActiveFields.length > 0
    ? `Draft can be saved now. Complete these fields before marking Active: ${missingActiveFields.join(', ')}.`
    : '';

  const updateField = (field: keyof typeof defaultObjectiveForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addMetric = () => {
    const now = new Date().toISOString();
    setMetrics(prev => [...prev, {
      id: createId('metric'),
      strategicObjectiveId: editId || '',
      workspaceId: '',
      name: '',
      metricCategory: '',
      baselineValue: null,
      targetValue: null,
      unit: '',
      timeframe: '',
      createdAt: now,
      updatedAt: now,
    }]);
  };

  const updateMetric = (metricId: string, field: keyof StrategicObjectiveMetric, value: string | number | null) => {
    setMetrics(prev => prev.map(m => m.id === metricId ? { ...m, [field]: value, updatedAt: new Date().toISOString() } : m));
  };

  const removeMetric = (metricId: string) => {
    setMetrics(prev => prev.filter(m => m.id !== metricId));
  };

  const submitObjective = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!form.strategicInitiativeName.trim()) {
      setError('Strategic Initiative Name is required before saving a draft.');
      setActiveStep(0);
      return;
    }

    if (form.targetImplementationYear && !/^\d{4}$/.test(form.targetImplementationYear)) {
      setError('Target Implementation Year must be a four-digit year, such as 2026.');
      setActiveStep(0);
      return;
    }

    if (form.status === 'active' && missingActiveFields.length > 0) {
      setError(`Complete these fields before marking the objective Active: ${missingActiveFields.join(', ')}.`);
      return;
    }

    if (hasReachedLimit) {
      setError('You have reached the prototype limit of three strategic objectives.');
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

    const updatedMetrics = metrics.map(m => ({ ...m, strategicObjectiveId: objectiveId }));
    const otherMetrics = allMetrics.filter(m => m.strategicObjectiveId !== objectiveId);
    const nextMetrics = [...otherMetrics, ...updatedMetrics];

    localStorage.setItem(objectivesStorageKey, JSON.stringify(nextObjectives));
    localStorage.setItem(metricsStorageKey, JSON.stringify(nextMetrics));
    setObjectives(nextObjectives);
    setAllMetrics(nextMetrics);
    navigateTo('/dashboard');
  };

  const valueCategoryDescription = strategicValueCategoryOptions.find(o => o.value === form.strategicValueCategory)?.description;

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Step 1</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">{isEditing ? 'Edit Strategic Objective' : 'Create Strategic Objective'}</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Complete a guided strategic objective intake before building a Lean Business Case.</p>
          </div>
          <Button onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button>
        </div>

        {hasReachedLimit && (
          <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            You have reached the prototype limit of three strategic objectives.
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        )}
        {draftWarnings && !error && (
          <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">{draftWarnings}</div>
        )}

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="grid gap-5" onSubmit={submitObjective}>
              <div className="grid gap-3 md:grid-cols-3">
                {['Define Strategic Objectives', 'Define Business Problem or Opportunity', 'Value Hypothesis & Metrics'].map((step, index) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`rounded-md border p-4 text-left transition ${activeStep === index ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-cyan-500'}`}
                  >
                    <div className="retro-heading mb-2 text-xs">Step {index + 1}</div>
                    <div className="text-sm font-medium">{step}</div>
                  </button>
                ))}
              </div>

              {activeStep === 0 && (
                <section className="grid gap-5">
                  <div>
                    <h2 className="retro-heading text-xl text-cyan-300">Step One: Define Strategic Objectives</h2>
                    <p className="mt-2 text-sm text-slate-300">This section captures leadership intent and defines the strategic initiative identity.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="strategic-initiative-name" label="Strategic Initiative Name" helper="What is the name of the strategic initiative?">
                      <Input id="strategic-initiative-name" value={form.strategicInitiativeName} onChange={(event) => updateField('strategicInitiativeName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="executive-objective" label="Executive Objective" helper="What executive objective is driving this initiative?">
                      <Input id="executive-objective" value={form.executiveObjective} onChange={(event) => updateField('executiveObjective', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="strategic-value-category" label="Strategic Value Category" helper="Which strategic value category does this initiative support?">
                      <Select value={form.strategicValueCategory} onValueChange={(value) => updateField('strategicValueCategory', value)}>
                        <SelectTrigger id="strategic-value-category" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue placeholder="Select a value category" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {strategicValueCategoryOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {valueCategoryDescription && (
                        <p className="rounded-md border border-cyan-500/30 bg-cyan-400/10 p-3 text-xs text-cyan-100">
                          {valueCategoryDescription}
                        </p>
                      )}
                    </Field>
                    <Field id="expected-business-outcome" label="Expected Business Outcome" helper="What business outcome is leadership expecting?">
                      <Input id="expected-business-outcome" value={form.expectedBusinessOutcome} onChange={(event) => updateField('expectedBusinessOutcome', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="financial-impact" label="Financial Impact" helper="What financial impact is expected or targeted?">
                      <Textarea id="financial-impact" value={form.financialImpact} onChange={(event) => updateField('financialImpact', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="urgency-rationale" label="Urgency / Timing Rationale" helper="Why is this initiative important now?">
                      <Textarea id="urgency-rationale" value={form.urgencyRationale} onChange={(event) => updateField('urgencyRationale', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                  </div>
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field id="target-implementation-year" label="Target Implementation Year">
                      <Input id="target-implementation-year" inputMode="numeric" value={form.targetImplementationYear} onChange={(event) => updateField('targetImplementationYear', event.target.value)} placeholder="Example: 2026" className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="target-implementation-start-date" label="Target Implementation Start Date">
                      <Input id="target-implementation-start-date" type="date" value={form.targetImplementationStartDate} onChange={(event) => updateField('targetImplementationStartDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="target-implementation-end-date" label="Target Implementation End Date">
                      <Input id="target-implementation-end-date" type="date" value={form.targetImplementationEndDate} onChange={(event) => updateField('targetImplementationEndDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                  </div>
                </section>
              )}

              {activeStep === 1 && (
                <section className="grid gap-5">
                  <div>
                    <h2 className="retro-heading text-xl text-cyan-300">Step Two: Define Business Problem or Opportunity</h2>
                    <p className="mt-2 text-sm text-slate-300">This section captures the business need, current-state limitation, stakeholder impact, and value-stream direction.</p>
                  </div>
                  <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                    This step supports traceability between executive intent, current-state limitations, impacted stakeholders, and downstream business architecture.
                  </div>
                  <Field id="problem-opportunity-statement" label="Problem or Opportunity Statement" helper="What problem or opportunity is this initiative trying to address?">
                    <Textarea id="problem-opportunity-statement" value={form.problemOpportunityStatement} onChange={(event) => updateField('problemOpportunityStatement', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="cost-of-inaction" label="Cost of Inaction" helper="What happens if the organization does nothing?">
                      <Textarea id="cost-of-inaction" value={form.costOfInaction} onChange={(event) => updateField('costOfInaction', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="current-limitation" label="Current Process, System, or Operating Model Limitation" helper="What current process, system, or operating model is limiting the business?">
                      <Textarea id="current-limitation" value={form.currentLimitation} onChange={(event) => updateField('currentLimitation', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="impacted-teams" label="Impacted Departments / Business Units / Teams" helper="Which departments, business units, or teams are impacted?">
                      <Textarea id="impacted-teams" value={form.impactedTeams} onChange={(event) => updateField('impactedTeams', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="problem-type" label="Problem Type" helper="Is this initiative solving a customer problem, an internal business problem, or both?">
                      <Select value={form.problemType} onValueChange={(value) => updateField('problemType', value)}>
                        <SelectTrigger id="problem-type" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue placeholder="Select problem type" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {problemTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>
              )}

              {activeStep === 2 && (
                <section className="grid gap-5">
                  <div>
                    <h2 className="retro-heading text-xl text-cyan-300">Step Three: Value Hypothesis & Metrics</h2>
                    <p className="mt-2 text-sm text-slate-300">This section defines the expected value, measurement approach, and measurable success metrics.</p>
                  </div>
                  <Field id="value-hypothesis" label="Value Hypothesis" helper="What value will this initiative create?">
                    <Textarea id="value-hypothesis" value={form.valueHypothesis} onChange={(event) => updateField('valueHypothesis', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="value-measurement-approach" label="Value Measurement Approach" helper="How will the value be measured?">
                      <Textarea id="value-measurement-approach" value={form.valueMeasurementApproach} onChange={(event) => updateField('valueMeasurementApproach', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="expected-value-type" label="Expected Value Type" helper="Is the expected value financial, operational, or mixed?">
                      <Select value={form.expectedValueType} onValueChange={(value) => updateField('expectedValueType', value)}>
                        <SelectTrigger id="expected-value-type" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue placeholder="Select expected value type" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {expectedValueTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="value-realization-timeframe" label="Value Realization Timeframe" helper="What timeframe is expected for value realization?">
                      <Input id="value-realization-timeframe" value={form.valueRealizationTimeframe} onChange={(event) => updateField('valueRealizationTimeframe', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                    </Field>
                    <Field id="status" label="Status">
                      <Select value={form.status} onValueChange={(value) => updateField('status', value)}>
                        <SelectTrigger id="status" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {objectiveStatusOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="retro-heading text-lg text-cyan-300">Strategic Objective Metrics</h3>
                        <p className="mt-1 text-xs text-slate-400">Define measurable goals with baseline and target values (integers).</p>
                      </div>
                      <Button type="button" variant="outline" onClick={addMetric} className="rounded-sm border-lime-500 text-lime-300 hover:bg-lime-500 hover:text-black">
                        <Plus className="mr-1 h-4 w-4" />
                        Add Metric
                      </Button>
                    </div>

                    {metrics.length === 0 && (
                      <div className="mt-4 rounded-md border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400">
                        No metrics defined yet. Add a metric to track measurable success goals.
                      </div>
                    )}

                    <div className="mt-4 space-y-4">
                      {metrics.map((metric, index) => (
                        <div key={metric.id} className="rounded-md border border-slate-700 bg-slate-950 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="retro-heading text-xs text-cyan-400">Metric {index + 1}</span>
                            <Button type="button" variant="ghost" onClick={() => removeMetric(metric.id)} className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/20 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Field id={`metric-name-${metric.id}`} label="Metric Name">
                                <Input id={`metric-name-${metric.id}`} value={metric.name} onChange={(e) => updateMetric(metric.id, 'name', e.target.value)} placeholder='e.g. "Structural cost savings"' className="border-slate-700 bg-slate-900 text-slate-100" />
                              </Field>
                              <Field id={`metric-category-${metric.id}`} label="Category">
                                <Select value={metric.metricCategory} onValueChange={(value) => updateMetric(metric.id, 'metricCategory', value)}>
                                  <SelectTrigger id={`metric-category-${metric.id}`} className="border-slate-700 bg-slate-900 text-slate-100">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                                    {metricCategoryOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </Field>
                            </div>
                            <div className="grid gap-4 md:grid-cols-4">
                              <Field id={`metric-baseline-${metric.id}`} label="Baseline Value">
                                <Input id={`metric-baseline-${metric.id}`} type="number" value={metric.baselineValue?.toString() ?? ''} onChange={(e) => updateMetric(metric.id, 'baselineValue', e.target.value ? parseInt(e.target.value) : null)} placeholder="Integer" className="border-slate-700 bg-slate-900 text-slate-100" />
                              </Field>
                              <Field id={`metric-target-${metric.id}`} label="Target Value">
                                <Input id={`metric-target-${metric.id}`} type="number" value={metric.targetValue?.toString() ?? ''} onChange={(e) => updateMetric(metric.id, 'targetValue', e.target.value ? parseInt(e.target.value) : null)} placeholder="Integer" className="border-slate-700 bg-slate-900 text-slate-100" />
                              </Field>
                              <Field id={`metric-unit-${metric.id}`} label="Unit">
                                <Input id={`metric-unit-${metric.id}`} value={metric.unit} onChange={(e) => updateMetric(metric.id, 'unit', e.target.value)} placeholder="USD | % | days" className="border-slate-700 bg-slate-900 text-slate-100" />
                              </Field>
                              <Field id={`metric-timeframe-${metric.id}`} label="Timeframe">
                                <Input id={`metric-timeframe-${metric.id}`} value={metric.timeframe} onChange={(e) => updateMetric(metric.id, 'timeframe', e.target.value)} placeholder="By FY2025" className="border-slate-700 bg-slate-900 text-slate-100" />
                              </Field>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-700 pt-5 sm:flex-row sm:justify-between">
                <Button type="button" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Cancel</Button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button type="button" disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(step - 1, 0))} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Back</Button>
                  {activeStep < 2 ? (
                    <Button type="button" onClick={() => setActiveStep((step) => Math.min(step + 1, 2))} className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Next</Button>
                  ) : (
                    <Button type="submit" disabled={hasReachedLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Save Objective</Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function WorkspaceSettingsScreen({
  workspace,
  members,
  setMembers,
  invites,
  setInvites,
}: {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  setMembers: (members: WorkspaceMember[]) => void;
  invites: WorkspaceInvite[];
  setInvites: (invites: WorkspaceInvite[]) => void;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const pendingInvites = invites.filter(i => i.status === 'pending');
  const acceptedInvites = invites.filter(i => i.status === 'accepted');

  const sendInvite = (event: FormEvent) => {
    event.preventDefault();
    setInviteError('');
    setInviteSuccess('');

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    if (invites.some(i => i.invitedEmail === email && i.status === 'pending')) {
      setInviteError('An invite is already pending for this email.');
      return;
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const newInvite: WorkspaceInvite = {
      id: createId('invite'),
      workspaceId: workspace?.id || '',
      invitedEmail: email,
      invitedByUserId: '',
      inviteToken: createId('token'),
      status: 'pending',
      expiresAt,
      acceptedAt: null,
    };

    const nextInvites = [...invites, newInvite];
    localStorage.setItem(invitesStorageKey, JSON.stringify(nextInvites));
    setInvites(nextInvites);
    setInviteEmail('');
    setInviteSuccess(`Invite sent to ${email}`);
  };

  const acceptInvite = (inviteId: string) => {
    const now = new Date().toISOString();
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;

    const updatedInvites = invites.map(i =>
      i.id === inviteId ? { ...i, status: 'accepted' as InviteStatus, acceptedAt: now } : i
    );
    localStorage.setItem(invitesStorageKey, JSON.stringify(updatedInvites));
    setInvites(updatedInvites);

    const newMember: WorkspaceMember = {
      id: createId('member'),
      workspaceId: workspace?.id || '',
      userId: createId('user'),
      isAdmin: false,
      joinedAt: now,
    };
    const nextMembers = [...members, newMember];
    localStorage.setItem(membersStorageKey, JSON.stringify(nextMembers));
    setMembers(nextMembers);
  };

  const revokeInvite = (inviteId: string) => {
    const nextInvites = invites.filter(i => i.id !== inviteId);
    localStorage.setItem(invitesStorageKey, JSON.stringify(nextInvites));
    setInvites(nextInvites);
  };

  const removeMember = (memberId: string) => {
    const nextMembers = members.filter(m => m.id !== memberId);
    localStorage.setItem(membersStorageKey, JSON.stringify(nextMembers));
    setMembers(nextMembers);
  };

  const toggleAdmin = (memberId: string) => {
    const nextMembers = members.map(m =>
      m.id === memberId ? { ...m, isAdmin: !m.isAdmin } : m
    );
    localStorage.setItem(membersStorageKey, JSON.stringify(nextMembers));
    setMembers(nextMembers);
  };

  return (
    <PrototypeShell workspace={workspace}>
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Workspace</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Members & Invites</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Invite team members to collaborate in {workspace?.name || 'this workspace'}.</p>
          </div>
          <Button onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button>
        </div>

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">Invite Members</CardTitle>
            <CardDescription className="text-slate-300">Send an invite by email. Invites expire after 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex gap-3" onSubmit={sendInvite}>
              <div className="flex-1">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                <Plus className="mr-2 h-4 w-4" />
                Send Invite
              </Button>
            </form>
            {inviteError && (
              <div className="mt-3 rounded-md border border-red-400/60 bg-red-500/10 p-3 text-sm text-red-100">{inviteError}</div>
            )}
            {inviteSuccess && (
              <div className="mt-3 rounded-md border border-lime-400/60 bg-lime-500/10 p-3 text-sm text-lime-100">{inviteSuccess}</div>
            )}
          </CardContent>
        </Card>

        {pendingInvites.length > 0 && (
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-fuchsia-300">Pending Invites</CardTitle>
              <CardDescription className="text-slate-300">{pendingInvites.length} invite{pendingInvites.length !== 1 ? 's' : ''} awaiting response</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingInvites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-950 p-3">
                    <div>
                      <p className="text-sm text-slate-200">{invite.invitedEmail}</p>
                      <p className="text-xs text-slate-400">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => acceptInvite(invite.id)} className="h-7 rounded-sm bg-lime-500 px-3 text-xs text-black hover:bg-lime-400">
                        <Check className="mr-1 h-3 w-3" />
                        Accept
                      </Button>
                      <Button variant="ghost" onClick={() => revokeInvite(invite.id)} className="h-7 rounded-sm px-2 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">Workspace Members</CardTitle>
            <CardDescription className="text-slate-300">
              {members.length === 0
                ? 'No members yet. The workspace owner is the default admin.'
                : `${members.length} member${members.length !== 1 ? 's' : ''} in this workspace`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between rounded border border-lime-500/30 bg-lime-400/10 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-500 text-sm font-semibold text-black">O</div>
                <div>
                  <p className="text-sm text-slate-200">Workspace Owner (You)</p>
                  <p className="text-xs text-slate-400">Default admin</p>
                </div>
              </div>
              <Badge className="rounded-sm bg-lime-500/20 text-lime-300 hover:bg-lime-500/20">Admin</Badge>
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between rounded border border-slate-700 bg-slate-950 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/30 text-sm text-fuchsia-300">M</div>
                      <div>
                        <p className="text-sm text-slate-200">Member</p>
                        <p className="text-xs text-slate-400">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" onClick={() => toggleAdmin(member.id)} className="h-7 rounded-sm px-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100">
                        {member.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      {member.isAdmin && <Badge className="rounded-sm bg-lime-500/20 text-lime-300 hover:bg-lime-500/20">Admin</Badge>}
                      <Button variant="ghost" onClick={() => removeMember(member.id)} className="h-7 rounded-sm px-2 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {acceptedInvites.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase text-slate-500">Accepted Invites</p>
                <div className="space-y-1">
                  {acceptedInvites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between rounded border border-slate-700/50 bg-slate-950/50 p-2 text-xs">
                      <span className="text-slate-300">{invite.invitedEmail}</span>
                      <Badge className="rounded-sm bg-slate-800 text-slate-400 text-[10px] hover:bg-slate-800">Accepted</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
  setLeanBusinessCases: (cases: LeanBusinessCase[]) => void;
}) {
  const params = getRouteParams();
  const editId = params.get('id');
  const objectiveId = params.get('objectiveId');
  const existingCase = leanBusinessCases.find((c) => c.id === editId);
  const resolvedObjectiveId = existingCase?.strategicObjectiveId || objectiveId || '';
  const selectedObjective = objectives.find((o) => o.id === resolvedObjectiveId);

  const [form, setForm] = useState({ ...defaultLbcForm, ...existingCase });
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const isEditing = Boolean(existingCase);
  const casesForObjective = leanBusinessCases.filter(c => c.strategicObjectiveId === resolvedObjectiveId);
  const hasReachedLimit = casesForObjective.length >= 10 && !isEditing;

  const activeRequiredFields = [
    ['title', 'Title'],
    ['summary', 'Summary'],
    ['problemOpportunityStatement', 'Problem or Opportunity Statement'],
    ['valueHypothesis', 'Value Hypothesis'],
    ['priority', 'Priority'],
  ] as const;
  const missingActiveFields = activeRequiredFields
    .filter(([field]) => !String(form[field as keyof typeof form] || '').toString().trim())
    .map(([, label]) => label);
  const draftWarnings = form.status === 'draft' && missingActiveFields.length > 0
    ? `Draft can be saved now. Complete these fields before marking Active: ${missingActiveFields.join(', ')}.`
    : '';

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
      setActiveStep(0);
      return;
    }

    if (form.status === 'active' && missingActiveFields.length > 0) {
      setError(`Complete these fields before marking Active: ${missingActiveFields.join(', ')}.`);
      return;
    }

    if (hasReachedLimit) {
      setError('This objective has reached the limit of 10 lean business cases.');
      return;
    }

    const now = new Date().toISOString();
    const savedCase: LeanBusinessCase = {
      id: existingCase?.id || createId('lbc'),
      workspaceId: workspace?.id || '',
      strategicObjectiveId: resolvedObjectiveId,
      ownerUserId: '',
      title: form.title.trim(),
      summary: form.summary,
      problemOpportunityStatement: form.problemOpportunityStatement,
      valueHypothesis: form.valueHypothesis,
      priority: form.priority,
      forecastCost: form.forecastCost,
      forecastValue: form.forecastValue,
      valueType: form.valueType,
      status: form.status,
      createdAt: existingCase?.createdAt || now,
      updatedAt: now,
    };

    const nextCases = isEditing
      ? leanBusinessCases.map((c) => (c.id === savedCase.id ? savedCase : c))
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
            <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Step 2</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-fuchsia-300">{isEditing ? 'Edit Lean Business Case' : 'Create Lean Business Case'}</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Objective: <span className="text-cyan-300">{selectedObjective.strategicInitiativeName}</span>
            </p>
          </div>
          <Button onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button>
        </div>

        {hasReachedLimit && (
          <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">
            This objective has reached the limit of 10 lean business cases.
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
        )}
        {draftWarnings && !error && (
          <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">{draftWarnings}</div>
        )}

        <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="grid gap-5" onSubmit={submitCase}>
              <div className="grid gap-3 md:grid-cols-2">
                {['Define Business Case', 'Prioritization & Forecast'].map((step, index) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`rounded-md border p-4 text-left transition ${activeStep === index ? 'border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-100' : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-fuchsia-500'}`}
                  >
                    <div className="retro-heading mb-2 text-xs">Step {index + 1}</div>
                    <div className="text-sm font-medium">{step}</div>
                  </button>
                ))}
              </div>

              {activeStep === 0 && (
                <section className="grid gap-5">
                  <div>
                    <h2 className="retro-heading text-xl text-fuchsia-300">Step One: Define Business Case</h2>
                    <p className="mt-2 text-sm text-slate-300">Define the granular sub-initiative, its problem statement, and value hypothesis.</p>
                  </div>
                  <Field id="lbc-title" label="Title" helper="What is the name of this business case?">
                    <Input id="lbc-title" value={form.title} onChange={(e) => updateField('title', e.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                  <Field id="lbc-summary" label="Summary" helper="Summarize the business case in a few sentences.">
                    <Textarea id="lbc-summary" value={form.summary} onChange={(e) => updateField('summary', e.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                  <Field id="lbc-problem" label="Problem or Opportunity Statement" helper="What problem or opportunity does this case address?">
                    <Textarea id="lbc-problem" value={form.problemOpportunityStatement} onChange={(e) => updateField('problemOpportunityStatement', e.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                  <Field id="lbc-value-hypothesis" label="Value Hypothesis" helper="What value will this business case create?">
                    <Textarea id="lbc-value-hypothesis" value={form.valueHypothesis} onChange={(e) => updateField('valueHypothesis', e.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" />
                  </Field>
                </section>
              )}

              {activeStep === 1 && (
                <section className="grid gap-5">
                  <div>
                    <h2 className="retro-heading text-xl text-fuchsia-300">Step Two: Prioritization & Forecast</h2>
                    <p className="mt-2 text-sm text-slate-300">Set priority, forecast cost and value, and determine the status.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="lbc-priority" label="Priority">
                      <Select value={form.priority} onValueChange={(value) => updateField('priority', value as Priority)}>
                        <SelectTrigger id="lbc-priority" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {priorityOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field id="lbc-value-type" label="Value Type">
                      <Select value={form.valueType} onValueChange={(value) => updateField('valueType', value as CaseValueType)}>
                        <SelectTrigger id="lbc-value-type" className="border-slate-700 bg-slate-950 text-slate-100">
                          <SelectValue placeholder="Select value type" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                          {caseValueTypeOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="lbc-forecast-cost" label="Forecast Cost" helper="Case-level cost estimate (optional).">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input id="lbc-forecast-cost" type="number" step="0.01" value={form.forecastCost?.toString() ?? ''} onChange={(e) => updateField('forecastCost', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" className="border-slate-700 bg-slate-950 pl-9 text-slate-100" />
                      </div>
                    </Field>
                    <Field id="lbc-forecast-value" label="Forecast Value" helper="Case-level value estimate (optional).">
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input id="lbc-forecast-value" type="number" step="0.01" value={form.forecastValue?.toString() ?? ''} onChange={(e) => updateField('forecastValue', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" className="border-slate-700 bg-slate-950 pl-9 text-slate-100" />
                      </div>
                    </Field>
                  </div>
                  <Field id="lbc-status" label="Status">
                    <Select value={form.status} onValueChange={(value) => updateField('status', value as CaseStatus)}>
                      <SelectTrigger id="lbc-status" className="border-slate-700 bg-slate-950 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                        {caseStatusOptions.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                    Architecture links (value streams, key activities, capabilities) can be added in a future update once the Business Architecture screens are built.
                  </div>
                </section>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-700 pt-5 sm:flex-row sm:justify-between">
                <Button type="button" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Cancel</Button>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <Button type="button" disabled={activeStep === 0} onClick={() => setActiveStep((step) => Math.max(step - 1, 0))} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Back</Button>
                  {activeStep < 1 ? (
                    <Button type="button" onClick={() => setActiveStep(1)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Next</Button>
                  ) : (
                    <Button type="submit" disabled={hasReachedLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Save Business Case</Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

export default function App() {
  const [route, setRoute] = useState<PrototypeRoute>(() => normalizeRoute(window.location.hash));
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>(() => loadObjectives());
  const [allMetrics, setAllMetrics] = useState<StrategicObjectiveMetric[]>(() => loadMetrics());
  const [leanBusinessCases, setLeanBusinessCases] = useState<LeanBusinessCase[]>(() => loadLeanBusinessCases());
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(() => loadMembers());
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInvite[]>(() => loadInvites());
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
    return <DashboardScreen workspace={workspace} objectives={strategicObjectives} leanBusinessCases={leanBusinessCases} members={workspaceMembers} invites={workspaceInvites} />;
  }

  if (route === '/workspace-settings') {
    return <WorkspaceSettingsScreen workspace={workspace} members={workspaceMembers} setMembers={setWorkspaceMembers} invites={workspaceInvites} setInvites={setWorkspaceInvites} />;
  }

  if (route === '/strategic-objectives') {
    return <StrategicObjectiveFormScreen workspace={workspace} objectives={strategicObjectives} setObjectives={setStrategicObjectives} allMetrics={allMetrics} setAllMetrics={setAllMetrics} />;
  }

  if (route === '/lean-business-case') {
    return <LeanBusinessCaseFormScreen workspace={workspace} objectives={strategicObjectives} leanBusinessCases={leanBusinessCases} setLeanBusinessCases={setLeanBusinessCases} />;
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
