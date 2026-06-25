import { FormEvent, ReactNode, useEffect, useState } from 'react';
import LegacyApp from './App';
import { ArrowLeft, Building2, Check, KeyRound, LayoutDashboard, LogIn, LogOut, Plus, Save, Trash2, UserPlus, Workflow } from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';

type PrototypeRoute = '/login' | '/signup' | '/forgot-password' | '/dashboard' | '/workspace-onboarding' | '/business-architecture';

type AuthSession = { email: string; provider: 'email' | 'google'; signedInAt: string };

type Workspace = {
  id: string;
  companyName: string;
  legalName: string;
  description: string;
  businessUnit: string;
  industry: string;
  operatingModel: string;
  businessModel: string;
  primaryCustomers: string;
  primaryProductsServices: string;
  strategicContext: string;
  defaultAdminEmail: string;
  createdAt: string;
  updatedAt: string;
};

type BusinessArchitecture = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  currentStateSummary: string;
  futureStateSummary: string;
  organizationUnits: string;
  businessCapabilities: string;
  businessProcesses: string;
  stakeholdersPersonas: string;
  informationConcepts: string;
  businessImpacts: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type ValueStream = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  name: string;
  description: string;
  valueStreamType: string;
  strategicAlignment: string;
  triggeringStakeholder: string;
  valueRecipient: string;
  expectedOutcome: string;
  currentStateNotes: string;
  futureStateNotes: string;
  status: string;
  keyActivityCount: number;
  createdAt: string;
  updatedAt: string;
};

type StoredWorkspace = Partial<Workspace> & { name?: string };
type StoredBusinessArchitecture = Partial<BusinessArchitecture>;
type StoredValueStream = Partial<ValueStream>;

type ValueStreamForm = Omit<ValueStream, 'id' | 'workspaceId' | 'businessArchitectureId' | 'keyActivityCount' | 'createdAt' | 'updatedAt'>;

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const businessArchitectureStorageKey = 'slaf.prototype.businessArchitecture';
const valueStreamsStorageKey = 'slaf.prototype.valueStreams';

const prototypeRoutes: PrototypeRoute[] = ['/login', '/signup', '/forgot-password', '/dashboard', '/workspace-onboarding', '/business-architecture'];
const setupFlow = ['Sign in or sign up', 'Create company workspace', 'Capture business architecture details', 'Strategic objectives next'];
const lifecycleFlow = ['Strategic Objectives', 'Business Architecture / Organization Structure', 'Lean Business Case', 'Product Discovery', 'Conceptual Architecture', 'Requirements / Features / Epics'];

const defaultValueStreamForm: ValueStreamForm = {
  name: '',
  description: '',
  valueStreamType: 'current_state',
  strategicAlignment: '',
  triggeringStakeholder: '',
  valueRecipient: '',
  expectedOutcome: '',
  currentStateNotes: '',
  futureStateNotes: '',
  status: 'draft',
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const navigateTo = (route: PrototypeRoute | '/') => { window.location.hash = route; };
const getRoute = (): string => window.location.hash.replace(/^#/, '').split('?')[0] || '/';
const isPrototypeRoute = (route: string): route is PrototypeRoute => prototypeRoutes.includes(route as PrototypeRoute);
const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || 'Workspace setup in progress';

const loadAuthSession = (): AuthSession | null => {
  try { const raw = localStorage.getItem(authStorageKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

const normalizeWorkspace = (workspace: StoredWorkspace): Workspace => {
  const now = new Date().toISOString();
  return {
    id: workspace.id || createId('workspace'),
    companyName: workspace.companyName || workspace.name || '',
    legalName: workspace.legalName || '',
    description: workspace.description || '',
    businessUnit: workspace.businessUnit || '',
    industry: workspace.industry || '',
    operatingModel: workspace.operatingModel || '',
    businessModel: workspace.businessModel || '',
    primaryCustomers: workspace.primaryCustomers || '',
    primaryProductsServices: workspace.primaryProductsServices || '',
    strategicContext: workspace.strategicContext || '',
    defaultAdminEmail: workspace.defaultAdminEmail || '',
    createdAt: workspace.createdAt || now,
    updatedAt: workspace.updatedAt || now,
  };
};

const loadWorkspace = (): Workspace | null => {
  try { const raw = localStorage.getItem(workspaceStorageKey); return raw ? normalizeWorkspace(JSON.parse(raw)) : null; } catch { return null; }
};

const normalizeBusinessArchitecture = (architecture: StoredBusinessArchitecture, workspaceId: string): BusinessArchitecture => {
  const now = new Date().toISOString();
  return {
    id: architecture.id || createId('business-architecture'),
    workspaceId: architecture.workspaceId || workspaceId,
    name: architecture.name || '',
    description: architecture.description || '',
    currentStateSummary: architecture.currentStateSummary || '',
    futureStateSummary: architecture.futureStateSummary || '',
    organizationUnits: architecture.organizationUnits || '',
    businessCapabilities: architecture.businessCapabilities || '',
    businessProcesses: architecture.businessProcesses || '',
    stakeholdersPersonas: architecture.stakeholdersPersonas || '',
    informationConcepts: architecture.informationConcepts || '',
    businessImpacts: architecture.businessImpacts || '',
    status: architecture.status || 'draft',
    createdAt: architecture.createdAt || now,
    updatedAt: architecture.updatedAt || now,
  };
};

const loadBusinessArchitecture = (workspaceId?: string): BusinessArchitecture | null => {
  if (!workspaceId) return null;
  try {
    const raw = localStorage.getItem(businessArchitectureStorageKey);
    if (!raw) return null;
    const architecture = normalizeBusinessArchitecture(JSON.parse(raw), workspaceId);
    return architecture.workspaceId === workspaceId ? architecture : null;
  } catch { return null; }
};

const normalizeValueStream = (stream: StoredValueStream, workspaceId: string, businessArchitectureId: string): ValueStream => {
  const now = new Date().toISOString();
  return {
    id: stream.id || createId('value-stream'),
    workspaceId: stream.workspaceId || workspaceId,
    businessArchitectureId: stream.businessArchitectureId || businessArchitectureId,
    name: stream.name || '',
    description: stream.description || '',
    valueStreamType: stream.valueStreamType || 'current_state',
    strategicAlignment: stream.strategicAlignment || '',
    triggeringStakeholder: stream.triggeringStakeholder || '',
    valueRecipient: stream.valueRecipient || '',
    expectedOutcome: stream.expectedOutcome || '',
    currentStateNotes: stream.currentStateNotes || '',
    futureStateNotes: stream.futureStateNotes || '',
    status: stream.status || 'draft',
    keyActivityCount: stream.keyActivityCount || 0,
    createdAt: stream.createdAt || now,
    updatedAt: stream.updatedAt || now,
  };
};

const loadValueStreams = (workspaceId?: string, businessArchitectureId?: string): ValueStream[] => {
  if (!workspaceId || !businessArchitectureId) return [];
  try {
    const raw = localStorage.getItem(valueStreamsStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredValueStream[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((stream) => normalizeValueStream(stream, workspaceId, businessArchitectureId))
      .filter((stream) => stream.workspaceId === workspaceId && stream.businessArchitectureId === businessArchitectureId);
  } catch { return []; }
};

const persistValueStreams = (streams: ValueStream[]) => localStorage.setItem(valueStreamsStorageKey, JSON.stringify(streams));

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function PrototypeNotice() {
  return <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">Frontend-only prototype: these screens store mock data in browser local storage. No backend API calls, account creation, OAuth, or password reset emails are active yet.</div>;
}

function PrototypeHeader({ session, workspace, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div><div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div><p className="text-sm text-slate-300">{getWorkspaceName(workspace)}</p></div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Project Site</Button>
          {session && <><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/workspace-onboarding')}>Workspace</Button>{workspace && <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button>}<Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button></>}
        </nav>
      </div>
    </header>
  );
}

function PrototypeShell({ session, workspace, onSignOut, children }: { session: AuthSession | null; workspace: Workspace | null; onSignOut: () => void; children: ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-slate-100"><PrototypeHeader session={session} workspace={workspace} onSignOut={onSignOut} /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main></div>;
}

function AuthScreen({ mode, session, workspace, onSignIn, onSignOut }: { mode: 'login' | 'signup'; session: AuthSession | null; workspace: Workspace | null; onSignIn: (session: AuthSession) => void; onSignOut: () => void }) {
  const [email, setEmail] = useState(session?.email || '');
  const [password, setPassword] = useState('');
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const continueAfterAuth = (provider: AuthSession['provider']) => {
    const nextSession = { email: email.trim() || 'prototype.user@example.com', provider, signedInAt: new Date().toISOString() };
    localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
    onSignIn(nextSession);
    navigateTo('/dashboard');
  };
  const submitAuth = (event: FormEvent) => { event.preventDefault(); continueAfterAuth('email'); };

  if (showGooglePrompt) {
    return <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}><section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center"><div className="space-y-5"><Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Mock Google sign-in</Badge><h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">Continue with Google</h1><p className="max-w-2xl text-lg leading-relaxed text-slate-300">This screen represents the expected provider handoff before entering the workspace flow.</p><PrototypeNotice /></div><Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle>Select account</CardTitle><CardDescription className="text-slate-300">Mock provider state for frontend validation.</CardDescription></CardHeader><CardContent className="space-y-4"><button type="button" onClick={() => continueAfterAuth('google')} className="flex w-full items-center gap-4 rounded-md border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/10"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-900">G</div><div><div className="font-medium text-slate-100">{email || 'prototype.user@example.com'}</div><div className="text-sm text-slate-400">Continue with this account</div></div></button><Button onClick={() => continueAfterAuth('google')} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">Continue to Dashboard</Button><Button type="button" variant="outline" onClick={() => setShowGooglePrompt(false)} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back</Button></CardContent></Card></section></PrototypeShell>;
  }

  return (
    <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="space-y-5"><Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend prototype</Badge><h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">{mode === 'login' ? 'Sign In / Login' : 'Create Prototype Account'}</h1><p className="max-w-2xl text-lg leading-relaxed text-slate-300">Sign in to access the company workspace and begin capturing business architecture context for the lifecycle framework.</p><div className="grid gap-3 sm:grid-cols-2">{['Email and password entry', 'Mock provider sign-in', 'Forgot password flow', 'Sign out when signed in'].map((item) => <div key={item} className="flex items-center gap-3 border border-cyan-500/30 bg-slate-900 p-3 text-sm text-slate-200"><Check className="h-4 w-4 flex-shrink-0 text-lime-400" />{item}</div>)}</div><PrototypeNotice /></div>
        <Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">{mode === 'login' ? 'Access Prototype' : 'Set Up Access'}</CardTitle><CardDescription className="text-slate-300">Use mock credentials to enter the frontend workflow.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={submitAuth}><Field id="email" label="Email"><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="password" label="Password"><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Prototype password" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Button type="submit" className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">{mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}{mode === 'login' ? 'Sign In' : 'Create Account'}</Button><Button type="button" variant="outline" onClick={() => setShowGooglePrompt(true)} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">Continue with Provider</Button><div className="flex flex-wrap items-center justify-between gap-3 text-sm"><button type="button" className="text-cyan-300 hover:text-cyan-100" onClick={() => navigateTo(mode === 'login' ? '/signup' : '/login')}>{mode === 'login' ? 'Create Account / Sign Up' : 'Already have an account? Sign In'}</button><button type="button" className="text-slate-400 hover:text-slate-200" onClick={() => navigateTo('/forgot-password')}>Forgot password?</button></div></form></CardContent></Card>
      </section>
    </PrototypeShell>
  );
}

function ForgotPasswordScreen({ session, workspace, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; onSignOut: () => void }) {
  const [email, setEmail] = useState(session?.email || '');
  const [submitted, setSubmitted] = useState(false);
  return <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}><section className="mx-auto max-w-3xl space-y-6"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Password recovery</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Recover Password</h1><p className="mt-3 text-slate-300">Enter the email address that would receive a reset link once backend auth is connected.</p></div><PrototypeNotice /><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardContent className="pt-6"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><Field id="recovery-email" label="Email"><Input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>{submitted && <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">Mock recovery submitted. A real reset email will be implemented when backend authentication is added.</div>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => navigateTo('/login')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Sign In</Button><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><KeyRound className="mr-2 h-4 w-4" />Send Recovery Link</Button></div></form></CardContent></Card></section></PrototypeShell>;
}

function WorkspaceScreen({ session, workspace, setWorkspace, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; setWorkspace: (workspace: Workspace) => void; onSignOut: () => void }) {
  const [form, setForm] = useState({ companyName: workspace?.companyName || '', legalName: workspace?.legalName || '', description: workspace?.description || '', businessUnit: workspace?.businessUnit || '', industry: workspace?.industry || '', operatingModel: workspace?.operatingModel || '', businessModel: workspace?.businessModel || '', primaryCustomers: workspace?.primaryCustomers || '', primaryProductsServices: workspace?.primaryProductsServices || '', strategicContext: workspace?.strategicContext || '', defaultAdminEmail: workspace?.defaultAdminEmail || session?.email || '' });
  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submitWorkspace = (event: FormEvent) => {
    event.preventDefault(); const now = new Date().toISOString();
    const nextWorkspace: Workspace = { id: workspace?.id || createId('workspace'), companyName: form.companyName.trim() || 'Prototype Company Workspace', legalName: form.legalName, description: form.description, businessUnit: form.businessUnit, industry: form.industry, operatingModel: form.operatingModel, businessModel: form.businessModel, primaryCustomers: form.primaryCustomers, primaryProductsServices: form.primaryProductsServices, strategicContext: form.strategicContext, defaultAdminEmail: form.defaultAdminEmail, createdAt: workspace?.createdAt || now, updatedAt: now };
    localStorage.setItem(workspaceStorageKey, JSON.stringify(nextWorkspace)); setWorkspace(nextWorkspace); navigateTo('/dashboard');
  };
  return <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}><section className="mx-auto max-w-5xl space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Company profile workspace</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Workspace Onboarding</h1><p className="mt-3 max-w-3xl text-slate-300">Create or update the company profile that anchors the lifecycle artifacts. Workspace setup is not a lifecycle stage.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button></div><PrototypeNotice /><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardContent className="pt-6"><form className="grid gap-5" onSubmit={submitWorkspace}><div className="grid gap-5 md:grid-cols-2"><Field id="company-name" label="Company / Workspace Name"><Input id="company-name" value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="legal-name" label="Legal Name"><Input id="legal-name" value={form.legalName} onChange={(event) => updateField('legalName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="description" label="Company Profile Description"><Textarea id="description" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="grid gap-5 md:grid-cols-2"><Field id="business-unit" label="Company or Business Unit"><Input id="business-unit" value={form.businessUnit} onChange={(event) => updateField('businessUnit', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="industry" label="Primary Industry"><Input id="industry" value={form.industry} onChange={(event) => updateField('industry', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="operating-model" label="Operating Model"><Input id="operating-model" value={form.operatingModel} onChange={(event) => updateField('operatingModel', event.target.value)} placeholder="Centralized, federated, product-led" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="business-model" label="Business Model"><Input id="business-model" value={form.businessModel} onChange={(event) => updateField('businessModel', event.target.value)} placeholder="B2B, B2C, marketplace, platform" className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><div className="grid gap-5 md:grid-cols-2"><Field id="customers" label="Primary Customers / Users"><Textarea id="customers" value={form.primaryCustomers} onChange={(event) => updateField('primaryCustomers', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="products-services" label="Primary Products / Services"><Textarea id="products-services" value={form.primaryProductsServices} onChange={(event) => updateField('primaryProductsServices', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="strategic-context" label="Strategic Context"><Textarea id="strategic-context" value={form.strategicContext} onChange={(event) => updateField('strategicContext', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="admin-email" label="Default Admin Email"><Input id="admin-email" type="email" value={form.defaultAdminEmail} onChange={(event) => updateField('defaultAdminEmail', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="flex justify-end"><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />{workspace ? 'Save Workspace' : 'Create Workspace'}</Button></div></form></CardContent></Card></section></PrototypeShell>;
}

function LifecycleFlowPanel() {
  return <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Lifecycle Flow Being Modeled</CardTitle><CardDescription className="text-slate-300">Workspace setup is company context. The lifecycle starts with Strategic Objectives, so Business Architecture is the second lifecycle stage.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-6">{lifecycleFlow.map((step, index) => <div key={step} className={`rounded-md border p-3 text-center text-xs ${index === 0 ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}><div className="mb-1 font-semibold">{index + 1}</div>{step}</div>)}</div><div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">{'Correct lifecycle: Strategic Objectives -> Business Architecture / Organization Structure -> Lean Business Case -> Product Discovery -> Conceptual Architecture -> Requirements / Features / Epics.'}</div></CardContent></Card>;
}

function DashboardScreen({ session, workspace, architecture, valueStreams, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; architecture: BusinessArchitecture | null; valueStreams: ValueStream[]; onSignOut: () => void }) {
  return <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}><section className="space-y-8"><div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend-only prototype</Badge><CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Welcome to AI Augmented Lifecycle framework</CardTitle><CardDescription className="text-slate-300">Create the company workspace first. Business architecture capture is available as frontend preparation, while Strategic Objectives remain the first true lifecycle stage.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-4">{setupFlow.map((step, index) => <div key={step} className={`rounded-md border p-3 text-center text-xs ${index <= (workspace ? architecture ? 2 : 1 : 0) ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}><div className="mb-1 font-semibold">Setup {index + 1}</div>{step}</div>)}</div><PrototypeNotice /></CardContent></Card><Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Signed In</CardTitle><CardDescription className="text-slate-300">{session?.email || 'No active session'}</CardDescription></CardHeader><CardContent className="space-y-3 text-sm text-slate-300"><p>Provider: {session?.provider || 'not signed in'}</p><Button variant="outline" onClick={onSignOut} className="w-full rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white"><LogOut className="mr-2 h-4 w-4" />Sign Out</Button></CardContent></Card></div><div className="grid gap-5 lg:grid-cols-2"><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Workspace / Company Profile</CardTitle><CardDescription className="text-slate-300">{workspace ? getWorkspaceName(workspace) : 'No workspace created yet'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300">{workspace ? <><p>{workspace.description || 'No company description entered.'}</p><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs uppercase text-slate-500">Business Unit</dt><dd className="text-slate-100">{workspace.businessUnit || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Industry</dt><dd className="text-slate-100">{workspace.industry || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Operating Model</dt><dd className="text-slate-100">{workspace.operatingModel || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Business Model</dt><dd className="text-slate-100">{workspace.businessModel || 'Not set'}</dd></div></dl></> : <p>Create the company profile workspace before entering business architecture details.</p>}<Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'View / Edit Workspace' : 'Create Workspace'}</Button></CardContent></Card><Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Workflow className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Business Architecture Capture</CardTitle><CardDescription className="text-slate-300">{architecture ? `${valueStreams.length} structured value stream${valueStreams.length === 1 ? '' : 's'} captured` : 'Available after workspace setup'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Use the Business Architecture screen to capture value streams with the same fields defined in the frontend API contract.</p>{architecture && <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs uppercase text-slate-500">Status</dt><dd className="text-slate-100">{architecture.status}</dd></div><div><dt className="text-xs uppercase text-slate-500">Value Streams</dt><dd className="text-slate-100">{valueStreams.length}</dd></div><div><dt className="text-xs uppercase text-slate-500">Capabilities</dt><dd className="text-slate-100">{architecture.businessCapabilities ? 'Captured' : 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Impacts</dt><dd className="text-slate-100">{architecture.businessImpacts ? 'Captured' : 'Not set'}</dd></div></dl>}<Button disabled={!workspace} onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">{architecture ? 'View / Edit Business Architecture' : 'Capture Business Architecture Details'}</Button></CardContent></Card></div><LifecycleFlowPanel /></section></PrototypeShell>;
}

function ValueStreamSection({ workspace, architecture, valueStreams, setValueStreams }: { workspace: Workspace; architecture: BusinessArchitecture; valueStreams: ValueStream[]; setValueStreams: (streams: ValueStream[]) => void }) {
  const [form, setForm] = useState<ValueStreamForm>(defaultValueStreamForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const updateField = (field: keyof ValueStreamForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => { setForm(defaultValueStreamForm); setEditingId(null); };
  const saveValueStream = (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const nextStream: ValueStream = { ...form, id: editingId || createId('value-stream'), workspaceId: workspace.id, businessArchitectureId: architecture.id, name: form.name.trim() || 'Untitled Value Stream', keyActivityCount: valueStreams.find((stream) => stream.id === editingId)?.keyActivityCount || 0, createdAt: valueStreams.find((stream) => stream.id === editingId)?.createdAt || now, updatedAt: now };
    const nextStreams = editingId ? valueStreams.map((stream) => stream.id === editingId ? nextStream : stream) : [...valueStreams, nextStream];
    persistValueStreams(nextStreams);
    setValueStreams(nextStreams);
    resetForm();
  };
  const editValueStream = (stream: ValueStream) => {
    setEditingId(stream.id);
    setForm({ name: stream.name, description: stream.description, valueStreamType: stream.valueStreamType, strategicAlignment: stream.strategicAlignment, triggeringStakeholder: stream.triggeringStakeholder, valueRecipient: stream.valueRecipient, expectedOutcome: stream.expectedOutcome, currentStateNotes: stream.currentStateNotes, futureStateNotes: stream.futureStateNotes, status: stream.status });
  };
  const deleteValueStream = (streamId: string) => {
    const nextStreams = valueStreams.filter((stream) => stream.id !== streamId);
    persistValueStreams(nextStreams);
    setValueStreams(nextStreams);
    if (editingId === streamId) resetForm();
  };

  return (
    <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="retro-heading text-lime-300">Existing Value Streams</CardTitle>
        <CardDescription className="text-slate-300">Structured frontend model for POST /workspaces/:workspaceId/business-architecture/:businessArchitectureId/value-streams.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-5" onSubmit={saveValueStream}>
          <div className="grid gap-5 md:grid-cols-3">
            <Field id="vs-name" label="Name"><Input id="vs-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
            <Field id="vs-type" label="Value Stream Type"><Input id="vs-type" value={form.valueStreamType} onChange={(event) => updateField('valueStreamType', event.target.value)} placeholder="current_state, future_state, modified_existing" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
            <Field id="vs-status" label="Status"><Input id="vs-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} placeholder="draft, active, archived" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
          </div>
          <Field id="vs-description" label="Description"><Textarea id="vs-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
          <Field id="vs-strategic-alignment" label="Strategic Alignment"><Textarea id="vs-strategic-alignment" value={form.strategicAlignment} onChange={(event) => updateField('strategicAlignment', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field>
          <div className="grid gap-5 md:grid-cols-3">
            <Field id="vs-triggering-stakeholder" label="Triggering Stakeholder"><Input id="vs-triggering-stakeholder" value={form.triggeringStakeholder} onChange={(event) => updateField('triggeringStakeholder', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
            <Field id="vs-value-recipient" label="Value Recipient"><Input id="vs-value-recipient" value={form.valueRecipient} onChange={(event) => updateField('valueRecipient', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
            <Field id="vs-expected-outcome" label="Expected Outcome"><Input id="vs-expected-outcome" value={form.expectedOutcome} onChange={(event) => updateField('expectedOutcome', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="vs-current-state" label="Current State Notes"><Textarea id="vs-current-state" value={form.currentStateNotes} onChange={(event) => updateField('currentStateNotes', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
            <Field id="vs-future-state" label="Future State Notes"><Textarea id="vs-future-state" value={form.futureStateNotes} onChange={(event) => updateField('futureStateNotes', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
          </div>
          <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">Stored shape includes id, workspaceId, businessArchitectureId, keyActivityCount, createdAt, and updatedAt so it mirrors the API contract response model.</div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Plus className="mr-2 h-4 w-4" />{editingId ? 'Update Value Stream' : 'Add Value Stream'}</Button></div>
        </form>
        <div className="grid gap-4">
          {valueStreams.length === 0 && <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No value streams captured yet. Add existing or future-state value streams using the structured contract fields above.</div>}
          {valueStreams.map((stream) => <div key={stream.id} className="rounded-md border border-slate-700 bg-slate-950 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{stream.name}</h3><Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{stream.valueStreamType}</Badge><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{stream.status}</Badge></div><p className="mt-2 text-sm text-slate-300">{stream.description || 'No description entered.'}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editValueStream(stream)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button><Button type="button" variant="outline" onClick={() => deleteValueStream(stream.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs uppercase text-slate-500">Trigger</dt><dd className="text-slate-100">{stream.triggeringStakeholder || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Recipient</dt><dd className="text-slate-100">{stream.valueRecipient || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Expected Outcome</dt><dd className="text-slate-100">{stream.expectedOutcome || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Strategic Alignment</dt><dd className="text-slate-100">{stream.strategicAlignment || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Current State</dt><dd className="text-slate-100">{stream.currentStateNotes || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Future State</dt><dd className="text-slate-100">{stream.futureStateNotes || 'Not set'}</dd></div></dl></div>)}
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessArchitectureScreen({ session, workspace, architecture, valueStreams, setArchitecture, setValueStreams, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; architecture: BusinessArchitecture | null; valueStreams: ValueStream[]; setArchitecture: (architecture: BusinessArchitecture) => void; setValueStreams: (streams: ValueStream[]) => void; onSignOut: () => void }) {
  const [form, setForm] = useState({ name: architecture?.name || (workspace ? `Business Architecture for ${getWorkspaceName(workspace)}` : ''), description: architecture?.description || '', currentStateSummary: architecture?.currentStateSummary || '', futureStateSummary: architecture?.futureStateSummary || '', organizationUnits: architecture?.organizationUnits || '', businessCapabilities: architecture?.businessCapabilities || '', businessProcesses: architecture?.businessProcesses || '', stakeholdersPersonas: architecture?.stakeholdersPersonas || '', informationConcepts: architecture?.informationConcepts || '', businessImpacts: architecture?.businessImpacts || '', status: architecture?.status || 'draft' });
  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submitArchitecture = (event: FormEvent) => {
    event.preventDefault(); if (!workspace) return; const now = new Date().toISOString();
    const nextArchitecture: BusinessArchitecture = { id: architecture?.id || createId('business-architecture'), workspaceId: workspace.id, name: form.name.trim() || `Business Architecture for ${getWorkspaceName(workspace)}`, description: form.description, currentStateSummary: form.currentStateSummary, futureStateSummary: form.futureStateSummary, organizationUnits: form.organizationUnits, businessCapabilities: form.businessCapabilities, businessProcesses: form.businessProcesses, stakeholdersPersonas: form.stakeholdersPersonas, informationConcepts: form.informationConcepts, businessImpacts: form.businessImpacts, status: form.status || 'draft', createdAt: architecture?.createdAt || now, updatedAt: now };
    localStorage.setItem(businessArchitectureStorageKey, JSON.stringify(nextArchitecture)); setArchitecture(nextArchitecture);
  };
  if (!workspace) return <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle><CardDescription className="text-slate-300">Create the company profile workspace before entering business architecture details.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent></Card></section></PrototypeShell>;
  const activeArchitecture = architecture || normalizeBusinessArchitecture({}, workspace.id);
  return <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}><section className="mx-auto max-w-6xl space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Business architecture capture</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Business Architecture / Organization Structure</h1><p className="mt-3 max-w-3xl text-slate-300">Capture organization components and structured value streams that map to the API contract.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button></div><PrototypeNotice /><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Business Architecture Summary</CardTitle><CardDescription className="text-slate-300">This corresponds to POST /workspaces/:workspaceId/strategic-objectives/:objectiveId/business-architecture later.</CardDescription></CardHeader><CardContent className="pt-2"><form className="grid gap-5" onSubmit={submitArchitecture}><div className="grid gap-5 md:grid-cols-[1fr_220px]"><Field id="ba-name" label="Business Architecture Name"><Input id="ba-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="ba-status" label="Status"><Input id="ba-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} placeholder="draft, active, archived" className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="ba-description" label="Description"><Textarea id="ba-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="grid gap-5 md:grid-cols-2"><Field id="current-state" label="Current State Summary"><Textarea id="current-state" value={form.currentStateSummary} onChange={(event) => updateField('currentStateSummary', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="future-state" label="Future State Summary"><Textarea id="future-state" value={form.futureStateSummary} onChange={(event) => updateField('futureStateSummary', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="org-units" label="Organization Units / Teams"><Textarea id="org-units" value={form.organizationUnits} onChange={(event) => updateField('organizationUnits', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="capabilities" label="Business Capabilities"><Textarea id="capabilities" value={form.businessCapabilities} onChange={(event) => updateField('businessCapabilities', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="processes" label="Business Processes"><Textarea id="processes" value={form.businessProcesses} onChange={(event) => updateField('businessProcesses', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="stakeholders" label="Stakeholders / Personas"><Textarea id="stakeholders" value={form.stakeholdersPersonas} onChange={(event) => updateField('stakeholdersPersonas', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="information-concepts" label="Information / Data Concepts"><Textarea id="information-concepts" value={form.informationConcepts} onChange={(event) => updateField('informationConcepts', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="business-impacts" label="Business Impacts / Gaps"><Textarea id="business-impacts" value={form.businessImpacts} onChange={(event) => updateField('businessImpacts', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field></div><div className="flex justify-end"><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />Save Business Architecture Summary</Button></div></form></CardContent></Card><ValueStreamSection workspace={workspace} architecture={activeArchitecture} valueStreams={valueStreams} setValueStreams={setValueStreams} /></section></PrototypeShell>;
}

export default function PrototypeRoutesValueStreams() {
  const [route, setRoute] = useState<string>(() => getRoute());
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [architecture, setArchitecture] = useState<BusinessArchitecture | null>(() => loadBusinessArchitecture(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState<ValueStream[]>(() => loadValueStreams(loadWorkspace()?.id, loadBusinessArchitecture(loadWorkspace()?.id)?.id));
  useEffect(() => { const handleHashChange = () => setRoute(getRoute()); window.addEventListener('hashchange', handleHashChange); return () => window.removeEventListener('hashchange', handleHashChange); }, []);
  useEffect(() => { const nextArchitecture = loadBusinessArchitecture(workspace?.id); setArchitecture(nextArchitecture); setValueStreams(loadValueStreams(workspace?.id, nextArchitecture?.id)); }, [workspace?.id]);
  useEffect(() => { setValueStreams(loadValueStreams(workspace?.id, architecture?.id)); }, [workspace?.id, architecture?.id]);
  const signOut = () => { localStorage.removeItem(authStorageKey); setSession(null); navigateTo('/login'); };
  if (!isPrototypeRoute(route)) return <LegacyApp />;
  if ((route === '/dashboard' || route === '/workspace-onboarding' || route === '/business-architecture') && !session) { navigateTo('/login'); return null; }
  if (route === '/login') return <AuthScreen mode="login" session={session} workspace={workspace} onSignIn={setSession} onSignOut={signOut} />;
  if (route === '/signup') return <AuthScreen mode="signup" session={session} workspace={workspace} onSignIn={setSession} onSignOut={signOut} />;
  if (route === '/forgot-password') return <ForgotPasswordScreen session={session} workspace={workspace} onSignOut={signOut} />;
  if (route === '/workspace-onboarding') return <WorkspaceScreen session={session} workspace={workspace} setWorkspace={setWorkspace} onSignOut={signOut} />;
  if (route === '/business-architecture') return <BusinessArchitectureScreen session={session} workspace={workspace} architecture={architecture} valueStreams={valueStreams} setArchitecture={(nextArchitecture) => { localStorage.setItem(businessArchitectureStorageKey, JSON.stringify(nextArchitecture)); setArchitecture(nextArchitecture); setValueStreams(loadValueStreams(nextArchitecture.workspaceId, nextArchitecture.id)); }} setValueStreams={setValueStreams} onSignOut={signOut} />;
  return <DashboardScreen session={session} workspace={workspace} architecture={architecture} valueStreams={valueStreams} onSignOut={signOut} />;
}
