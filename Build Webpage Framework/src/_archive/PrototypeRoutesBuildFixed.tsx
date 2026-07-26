import { FormEvent, ReactNode, useEffect, useState } from 'react';
import LegacyApp from './App';
import { ArrowLeft, Building2, Check, KeyRound, LayoutDashboard, LogIn, LogOut, Save, UserPlus, Workflow } from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';

type PrototypeRoute = '/login' | '/signup' | '/forgot-password' | '/dashboard' | '/workspace-onboarding' | '/business-architecture';

type AuthSession = {
  email: string;
  provider: 'email' | 'google';
  signedInAt: string;
};

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

type StoredWorkspace = Partial<Workspace> & { name?: string };

type BusinessArchitecture = {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  currentStateSummary: string;
  futureStateSummary: string;
  organizationUnits: string;
  existingValueStreams: string;
  businessCapabilities: string;
  businessProcesses: string;
  stakeholdersPersonas: string;
  informationConcepts: string;
  businessImpacts: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type StoredBusinessArchitecture = Partial<BusinessArchitecture>;

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const businessArchitectureStorageKey = 'slaf.prototype.businessArchitecture';

const prototypeRoutes: PrototypeRoute[] = ['/login', '/signup', '/forgot-password', '/dashboard', '/workspace-onboarding', '/business-architecture'];

const setupFlow = ['Sign in or sign up', 'Create company workspace', 'Capture business architecture details', 'Strategic objectives next'];

const lifecycleFlow = [
  'Strategic Objectives',
  'Business Architecture / Organization Structure',
  'Lean Business Case',
  'Product Discovery',
  'Conceptual Architecture',
  'Requirements / Features / Epics',
];

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const navigateTo = (route: PrototypeRoute | '/') => { window.location.hash = route; };
const getRoute = (): string => window.location.hash.replace(/^#/, '').split('?')[0] || '/';
const isPrototypeRoute = (route: string): route is PrototypeRoute => prototypeRoutes.includes(route as PrototypeRoute);
const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || 'Workspace setup in progress';

const loadAuthSession = (): AuthSession | null => {
  try {
    const rawSession = localStorage.getItem(authStorageKey);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
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
  try {
    const rawWorkspace = localStorage.getItem(workspaceStorageKey);
    return rawWorkspace ? normalizeWorkspace(JSON.parse(rawWorkspace)) : null;
  } catch {
    return null;
  }
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
    existingValueStreams: architecture.existingValueStreams || '',
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
    const rawArchitecture = localStorage.getItem(businessArchitectureStorageKey);
    if (!rawArchitecture) return null;
    const architecture = normalizeBusinessArchitecture(JSON.parse(rawArchitecture), workspaceId);
    return architecture.workspaceId === workspaceId ? architecture : null;
  } catch {
    return null;
  }
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
      Frontend-only prototype: these screens store mock data in browser local storage. No backend API calls, account creation, OAuth, or password reset emails are active yet.
    </div>
  );
}

function PrototypeHeader({ session, workspace, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; onSignOut: () => void }) {
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
              {workspace && <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button>}
              <Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={onSignOut}>
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

function PrototypeShell({ session, workspace, onSignOut, children }: { session: AuthSession | null; workspace: Workspace | null; onSignOut: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PrototypeHeader session={session} workspace={workspace} onSignOut={onSignOut} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
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

  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    continueAfterAuth('email');
  };

  if (showGooglePrompt) {
    return (
      <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
        <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Mock Google sign-in</Badge>
            <h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">Continue with Google</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">This screen represents the expected Google handoff before entering the workspace flow.</p>
            <PrototypeNotice />
          </div>
          <Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
            <CardHeader>
              <CardTitle className="text-xl text-slate-100">Select Google account</CardTitle>
              <CardDescription className="text-slate-300">Mock provider state for frontend validation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button type="button" onClick={() => continueAfterAuth('google')} className="flex w-full items-center gap-4 rounded-md border border-slate-700 bg-slate-950 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-semibold text-slate-900">G</div>
                <div>
                  <div className="font-medium text-slate-100">{email || 'prototype.user@example.com'}</div>
                  <div className="text-sm text-slate-400">Continue with this Google account</div>
                </div>
              </button>
              <Button onClick={() => continueAfterAuth('google')} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">Continue to Dashboard</Button>
              <Button type="button" variant="outline" onClick={() => setShowGooglePrompt(false)} className="w-full rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Back</Button>
            </CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

  return (
    <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend prototype</Badge>
          <h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">{mode === 'login' ? 'Sign In / Login' : 'Create Prototype Account'}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">Sign in to access the company workspace and begin capturing business architecture context for the lifecycle framework.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Email and password entry', 'Mock Google sign-in', 'Forgot password flow', 'Sign out when signed in'].map((item) => (
              <div key={item} className="flex items-center gap-3 border border-cyan-500/30 bg-slate-900 p-3 text-sm text-slate-200">
                <Check className="h-4 w-4 flex-shrink-0 text-lime-400" />
                {item}
              </div>
            ))}
          </div>
          <PrototypeNotice />
        </div>
        <Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">{mode === 'login' ? 'Access Prototype' : 'Set Up Access'}</CardTitle>
            <CardDescription className="text-slate-300">Use mock credentials to enter the frontend workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitAuth}>
              <Field id="email" label="Email"><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <Field id="password" label="Password"><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Prototype password" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <Button type="submit" className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                {mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowGooglePrompt(true)} className="w-full rounded-sm border-cyan-500 bg-slate-950 text-cyan-200 hover:bg-cyan-500 hover:text-black">Continue with Google</Button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" className="text-cyan-300 hover:text-cyan-100" onClick={() => navigateTo(mode === 'login' ? '/signup' : '/login')}>{mode === 'login' ? 'Create Account / Sign Up' : 'Already have an account? Sign In'}</button>
                <button type="button" className="text-slate-400 hover:text-slate-200" onClick={() => navigateTo('/forgot-password')}>Forgot password?</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function ForgotPasswordScreen({ session, workspace, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; onSignOut: () => void }) {
  const [email, setEmail] = useState(session?.email || '');
  const [submitted, setSubmitted] = useState(false);

  return (
    <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <Badge className="rounded-sm bg-fuchsia-500 text-white hover:bg-fuchsia-400">Password recovery</Badge>
          <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Recover Password</h1>
          <p className="mt-3 text-slate-300">Enter the email address that would receive a reset link once backend auth is connected.</p>
        </div>
        <PrototypeNotice />
        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
              <Field id="recovery-email" label="Email"><Input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              {submitted && <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">Mock recovery submitted. A real reset email will be implemented when backend authentication is added.</div>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => navigateTo('/login')} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Back to Sign In</Button>
                <Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><KeyRound className="mr-2 h-4 w-4" />Send Recovery Link</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function WorkspaceScreen({ session, workspace, setWorkspace, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; setWorkspace: (workspace: Workspace) => void; onSignOut: () => void }) {
  const [form, setForm] = useState({
    companyName: workspace?.companyName || '',
    legalName: workspace?.legalName || '',
    description: workspace?.description || '',
    businessUnit: workspace?.businessUnit || '',
    industry: workspace?.industry || '',
    operatingModel: workspace?.operatingModel || '',
    businessModel: workspace?.businessModel || '',
    primaryCustomers: workspace?.primaryCustomers || '',
    primaryProductsServices: workspace?.primaryProductsServices || '',
    strategicContext: workspace?.strategicContext || '',
    defaultAdminEmail: workspace?.defaultAdminEmail || session?.email || '',
  });

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submitWorkspace = (event: FormEvent) => {
    event.preventDefault();
    const now = new Date().toISOString();
    const nextWorkspace: Workspace = {
      id: workspace?.id || createId('workspace'),
      companyName: form.companyName.trim() || 'Prototype Company Workspace',
      legalName: form.legalName,
      description: form.description,
      businessUnit: form.businessUnit,
      industry: form.industry,
      operatingModel: form.operatingModel,
      businessModel: form.businessModel,
      primaryCustomers: form.primaryCustomers,
      primaryProductsServices: form.primaryProductsServices,
      strategicContext: form.strategicContext,
      defaultAdminEmail: form.defaultAdminEmail,
      createdAt: workspace?.createdAt || now,
      updatedAt: now,
    };
    localStorage.setItem(workspaceStorageKey, JSON.stringify(nextWorkspace));
    setWorkspace(nextWorkspace);
    navigateTo('/dashboard');
  };

  return (
    <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Company profile workspace</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Workspace Onboarding</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Create or update the company profile that anchors the lifecycle artifacts. Workspace setup is not a lifecycle stage.</p>
          </div>
          <Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button>
        </div>
        <PrototypeNotice />
        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="grid gap-5" onSubmit={submitWorkspace}>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="company-name" label="Company / Workspace Name"><Input id="company-name" value={form.companyName} onChange={(event) => updateField('companyName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="legal-name" label="Legal Name"><Input id="legal-name" value={form.legalName} onChange={(event) => updateField('legalName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              </div>
              <Field id="description" label="Company Profile Description"><Textarea id="description" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="business-unit" label="Company or Business Unit"><Input id="business-unit" value={form.businessUnit} onChange={(event) => updateField('businessUnit', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="industry" label="Primary Industry"><Input id="industry" value={form.industry} onChange={(event) => updateField('industry', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="operating-model" label="Operating Model"><Input id="operating-model" value={form.operatingModel} onChange={(event) => updateField('operatingModel', event.target.value)} placeholder="Centralized, federated, product-led" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="business-model" label="Business Model"><Input id="business-model" value={form.businessModel} onChange={(event) => updateField('businessModel', event.target.value)} placeholder="B2B, B2C, marketplace, platform" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="customers" label="Primary Customers / Users"><Textarea id="customers" value={form.primaryCustomers} onChange={(event) => updateField('primaryCustomers', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="products-services" label="Primary Products / Services"><Textarea id="products-services" value={form.primaryProductsServices} onChange={(event) => updateField('primaryProductsServices', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              </div>
              <Field id="strategic-context" label="Strategic Context"><Textarea id="strategic-context" value={form.strategicContext} onChange={(event) => updateField('strategicContext', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <Field id="admin-email" label="Default Admin Email"><Input id="admin-email" type="email" value={form.defaultAdminEmail} onChange={(event) => updateField('defaultAdminEmail', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <div className="flex justify-end"><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />{workspace ? 'Save Workspace' : 'Create Workspace'}</Button></div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

function LifecycleFlowPanel() {
  return (
    <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="retro-heading text-cyan-300">Lifecycle Flow Being Modeled</CardTitle>
        <CardDescription className="text-slate-300">Workspace setup is company context. The lifecycle starts with Strategic Objectives, so Business Architecture is the second lifecycle stage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-6">
          {lifecycleFlow.map((step, index) => (
            <div key={step} className={`rounded-md border p-3 text-center text-xs ${index === 0 ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
              <div className="mb-1 font-semibold">{index + 1}</div>
              {step}
            </div>
          ))}
        </div>
        <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">
          {'Correct lifecycle: Strategic Objectives -> Business Architecture / Organization Structure -> Lean Business Case -> Product Discovery -> Conceptual Architecture -> Requirements / Features / Epics.'}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardScreen({ session, workspace, architecture, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; architecture: BusinessArchitecture | null; onSignOut: () => void }) {
  return (
    <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend-only prototype</Badge>
              <CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Welcome to AI Augmented Lifecycle framework</CardTitle>
              <CardDescription className="text-slate-300">Create the company workspace first. Business architecture capture is available as frontend preparation, while Strategic Objectives remain the first true lifecycle stage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                {setupFlow.map((step, index) => (
                  <div key={step} className={`rounded-md border p-3 text-center text-xs ${index <= (workspace ? architecture ? 2 : 1 : 0) ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>
                    <div className="mb-1 font-semibold">Setup {index + 1}</div>
                    {step}
                  </div>
                ))}
              </div>
              <PrototypeNotice />
            </CardContent>
          </Card>
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-fuchsia-300">Signed In</CardTitle>
              <CardDescription className="text-slate-300">{session?.email || 'No active session'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>Provider: {session?.provider || 'not signed in'}</p>
              <Button variant="outline" onClick={onSignOut} className="w-full rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white"><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Workspace / Company Profile</CardTitle><CardDescription className="text-slate-300">{workspace ? getWorkspaceName(workspace) : 'No workspace created yet'}</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              {workspace ? <><p>{workspace.description || 'No company description entered.'}</p><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs uppercase text-slate-500">Business Unit</dt><dd className="text-slate-100">{workspace.businessUnit || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Industry</dt><dd className="text-slate-100">{workspace.industry || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Operating Model</dt><dd className="text-slate-100">{workspace.operatingModel || 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Business Model</dt><dd className="text-slate-100">{workspace.businessModel || 'Not set'}</dd></div></dl></> : <p>Create the company profile workspace before entering business architecture details.</p>}
              <Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'View / Edit Workspace' : 'Create Workspace'}</Button>
            </CardContent>
          </Card>
          <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <div className="flex items-start gap-3"><Workflow className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Business Architecture Capture</CardTitle><CardDescription className="text-slate-300">{architecture ? architecture.name || 'Business architecture draft' : 'Available after workspace setup'}</CardDescription></div></div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <p>Use this frontend-only area to prepare existing organization structure, value streams, capabilities, processes, stakeholders, and business impacts. In the full lifecycle, this becomes active after a Strategic Objective exists.</p>
              {architecture && <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs uppercase text-slate-500">Status</dt><dd className="text-slate-100">{architecture.status}</dd></div><div><dt className="text-xs uppercase text-slate-500">Value Streams</dt><dd className="text-slate-100">{architecture.existingValueStreams ? 'Captured' : 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Capabilities</dt><dd className="text-slate-100">{architecture.businessCapabilities ? 'Captured' : 'Not set'}</dd></div><div><dt className="text-xs uppercase text-slate-500">Impacts</dt><dd className="text-slate-100">{architecture.businessImpacts ? 'Captured' : 'Not set'}</dd></div></dl>}
              <Button disabled={!workspace} onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">{architecture ? 'View / Edit Business Architecture' : 'Capture Business Architecture Details'}</Button>
            </CardContent>
          </Card>
        </div>

        <LifecycleFlowPanel />
      </section>
    </PrototypeShell>
  );
}

function BusinessArchitectureScreen({ session, workspace, architecture, setArchitecture, onSignOut }: { session: AuthSession | null; workspace: Workspace | null; architecture: BusinessArchitecture | null; setArchitecture: (architecture: BusinessArchitecture) => void; onSignOut: () => void }) {
  const [form, setForm] = useState({
    name: architecture?.name || (workspace ? `Business Architecture for ${getWorkspaceName(workspace)}` : ''),
    description: architecture?.description || '',
    currentStateSummary: architecture?.currentStateSummary || '',
    futureStateSummary: architecture?.futureStateSummary || '',
    organizationUnits: architecture?.organizationUnits || '',
    existingValueStreams: architecture?.existingValueStreams || '',
    businessCapabilities: architecture?.businessCapabilities || '',
    businessProcesses: architecture?.businessProcesses || '',
    stakeholdersPersonas: architecture?.stakeholdersPersonas || '',
    informationConcepts: architecture?.informationConcepts || '',
    businessImpacts: architecture?.businessImpacts || '',
    status: architecture?.status || 'draft',
  });

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submitArchitecture = (event: FormEvent) => {
    event.preventDefault();
    if (!workspace) return;
    const now = new Date().toISOString();
    const nextArchitecture: BusinessArchitecture = {
      id: architecture?.id || createId('business-architecture'),
      workspaceId: workspace.id,
      name: form.name.trim() || `Business Architecture for ${getWorkspaceName(workspace)}`,
      description: form.description,
      currentStateSummary: form.currentStateSummary,
      futureStateSummary: form.futureStateSummary,
      organizationUnits: form.organizationUnits,
      existingValueStreams: form.existingValueStreams,
      businessCapabilities: form.businessCapabilities,
      businessProcesses: form.businessProcesses,
      stakeholdersPersonas: form.stakeholdersPersonas,
      informationConcepts: form.informationConcepts,
      businessImpacts: form.businessImpacts,
      status: form.status || 'draft',
      createdAt: architecture?.createdAt || now,
      updatedAt: now,
    };
    localStorage.setItem(businessArchitectureStorageKey, JSON.stringify(nextArchitecture));
    setArchitecture(nextArchitecture);
    navigateTo('/dashboard');
  };

  if (!workspace) {
    return (
      <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
        <section className="mx-auto max-w-3xl space-y-6">
          <Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle>
              <CardDescription className="text-slate-300">Create the company profile workspace before entering business architecture details.</CardDescription>
            </CardHeader>
            <CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent>
          </Card>
        </section>
      </PrototypeShell>
    );
  }

  return (
    <PrototypeShell session={session} workspace={workspace} onSignOut={onSignOut}>
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Business architecture capture</Badge>
            <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Business Architecture / Organization Structure</h1>
            <p className="mt-3 max-w-3xl text-slate-300">Capture existing organization components for later lifecycle use. The displayed lifecycle still starts with Strategic Objectives.</p>
          </div>
          <Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button>
        </div>
        <PrototypeNotice />
        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="grid gap-5" onSubmit={submitArchitecture}>
              <div className="grid gap-5 md:grid-cols-[1fr_220px]">
                <Field id="ba-name" label="Business Architecture Name"><Input id="ba-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="ba-status" label="Status"><Input id="ba-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} placeholder="draft, active, archived" className="border-slate-700 bg-slate-950 text-slate-100" /></Field>
              </div>
              <Field id="ba-description" label="Description"><Textarea id="ba-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="current-state" label="Current State Summary"><Textarea id="current-state" value={form.currentStateSummary} onChange={(event) => updateField('currentStateSummary', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="future-state" label="Future State Summary"><Textarea id="future-state" value={form.futureStateSummary} onChange={(event) => updateField('futureStateSummary', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field id="org-units" label="Organization Units / Teams"><Textarea id="org-units" value={form.organizationUnits} onChange={(event) => updateField('organizationUnits', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="value-streams" label="Existing Value Streams"><Textarea id="value-streams" value={form.existingValueStreams} onChange={(event) => updateField('existingValueStreams', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="capabilities" label="Business Capabilities"><Textarea id="capabilities" value={form.businessCapabilities} onChange={(event) => updateField('businessCapabilities', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="processes" label="Business Processes"><Textarea id="processes" value={form.businessProcesses} onChange={(event) => updateField('businessProcesses', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="stakeholders" label="Stakeholders / Personas"><Textarea id="stakeholders" value={form.stakeholdersPersonas} onChange={(event) => updateField('stakeholdersPersonas', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <Field id="information-concepts" label="Information / Data Concepts"><Textarea id="information-concepts" value={form.informationConcepts} onChange={(event) => updateField('informationConcepts', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              </div>
              <Field id="business-impacts" label="Business Impacts / Gaps"><Textarea id="business-impacts" value={form.businessImpacts} onChange={(event) => updateField('businessImpacts', event.target.value)} className="min-h-28 border-slate-700 bg-slate-950 text-slate-100" /></Field>
              <div className="rounded-md border border-fuchsia-500/40 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-100">This screen captures frontend-only business architecture context. The lifecycle sequence still requires Strategic Objectives before this becomes the official second stage.</div>
              <div className="flex justify-end"><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />Save Business Architecture</Button></div>
            </form>
          </CardContent>
        </Card>
      </section>
    </PrototypeShell>
  );
}

export default function PrototypeRoutesBuildFixed() {
  const [route, setRoute] = useState<string>(() => getRoute());
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [architecture, setArchitecture] = useState<BusinessArchitecture | null>(() => loadBusinessArchitecture(loadWorkspace()?.id));

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => { setArchitecture(loadBusinessArchitecture(workspace?.id)); }, [workspace?.id]);

  const signOut = () => {
    localStorage.removeItem(authStorageKey);
    setSession(null);
    navigateTo('/login');
  };

  if (!isPrototypeRoute(route)) return <LegacyApp />;

  if ((route === '/dashboard' || route === '/workspace-onboarding' || route === '/business-architecture') && !session) {
    navigateTo('/login');
    return null;
  }

  if (route === '/login') return <AuthScreen mode="login" session={session} workspace={workspace} onSignIn={setSession} onSignOut={signOut} />;
  if (route === '/signup') return <AuthScreen mode="signup" session={session} workspace={workspace} onSignIn={setSession} onSignOut={signOut} />;
  if (route === '/forgot-password') return <ForgotPasswordScreen session={session} workspace={workspace} onSignOut={signOut} />;
  if (route === '/workspace-onboarding') return <WorkspaceScreen session={session} workspace={workspace} setWorkspace={setWorkspace} onSignOut={signOut} />;
  if (route === '/business-architecture') return <BusinessArchitectureScreen session={session} workspace={workspace} architecture={architecture} setArchitecture={setArchitecture} onSignOut={signOut} />;

  return <DashboardScreen session={session} workspace={workspace} architecture={architecture} onSignOut={signOut} />;
}
