import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, LayoutDashboard, LogOut, Mail, Plus, Save, Target, Trash2, UserCheck, Workflow } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesValueStreams';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';

type AuthSession = { email: string; provider: 'email' | 'google'; signedInAt: string };

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
  strategicValueCategory: string;
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
  problemType: string;
  valueHypothesis: string;
  valueMeasurementApproach: string;
  expectedValueType: string;
  successMetric: string;
  currentBaseline: string;
  targetFutureState: string;
  valueRealizationTimeframe: string;
  strategicValueHypothesisSummary: string;
  status: string;
  linkedLeanBusinessCaseCount: number;
  createdAt: string;
  updatedAt: string;
};

type StrategicObjectiveForm = Omit<StrategicObjective, 'id' | 'workspaceId' | 'linkedLeanBusinessCaseCount' | 'createdAt' | 'updatedAt'>;
type StoredStrategicObjective = Partial<StrategicObjective>;
type InviteStatus = 'pending' | 'Active' | 'Expired';

type WorkspaceInvite = {
  id: string;
  token: string;
  workspaceId: string;
  invitedEmail: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const strategicObjectivesStorageKey = 'slaf.prototype.strategicObjectives';
const invitesStorageKey = 'slaf.prototype.invites';
const objectiveLimit = 3;
const inviteLimit = 5;
const inviteDurationMs = 5 * 24 * 60 * 60 * 1000;

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
  successMetric: '',
  currentBaseline: '',
  targetFutureState: '',
  valueRealizationTimeframe: '',
  strategicValueHypothesisSummary: '',
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
  problemType: 'both_customer_and_internal',
  valueHypothesis: 'If strategic objectives are translated through Lean Business Cases, initiatives, and business architecture artifacts, then teams can reduce planning friction and increase implementation readiness.',
  valueMeasurementApproach: 'Measure reduced discovery cycle time, improved traceability, and faster architecture planning readiness.',
  expectedValueType: 'mixed',
  successMetric: 'Reduce discovery and architecture planning cycle time by 30%.',
  currentBaseline: 'Strategic initiatives currently move through disconnected planning and documentation processes.',
  targetFutureState: 'Strategic objectives are translated into Lean Business Cases, initiatives, value streams, business architecture artifacts, product discovery outputs, and conceptual architecture outputs.',
  valueRealizationTimeframe: 'Within FY2026',
  strategicValueHypothesisSummary: 'This initiative is expected to improve enterprise delivery efficiency by reducing the gap between executive strategy, business architecture, product discovery, and implementation readiness.',
  status: 'draft',
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const getRoute = () => window.location.hash.replace(/^#/, '').split('?')[0] || '/';
const navigateTo = (route: string) => { window.location.hash = route; };

const loadAuthSession = (): AuthSession | null => {
  try { const raw = localStorage.getItem(authStorageKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

const loadWorkspace = (): Workspace | null => {
  try { const raw = localStorage.getItem(workspaceStorageKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
};

const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || workspace?.name || 'Workspace setup in progress';

const normalizeObjective = (objective: StoredStrategicObjective, workspaceId: string): StrategicObjective => {
  const now = new Date().toISOString();
  return {
    id: objective.id || createId('obj'),
    workspaceId: objective.workspaceId || workspaceId,
    strategicInitiativeName: objective.strategicInitiativeName || '',
    executiveObjective: objective.executiveObjective || '',
    strategicValueCategory: objective.strategicValueCategory || '',
    expectedBusinessOutcome: objective.expectedBusinessOutcome || '',
    financialImpact: objective.financialImpact || '',
    urgencyRationale: objective.urgencyRationale || '',
    targetImplementationYear: objective.targetImplementationYear || '',
    targetImplementationStartDate: objective.targetImplementationStartDate || '',
    targetImplementationEndDate: objective.targetImplementationEndDate || '',
    problemOpportunityStatement: objective.problemOpportunityStatement || '',
    costOfInaction: objective.costOfInaction || '',
    currentLimitation: objective.currentLimitation || '',
    impactedTeams: objective.impactedTeams || '',
    problemType: objective.problemType || '',
    valueHypothesis: objective.valueHypothesis || '',
    valueMeasurementApproach: objective.valueMeasurementApproach || '',
    expectedValueType: objective.expectedValueType || '',
    successMetric: objective.successMetric || '',
    currentBaseline: objective.currentBaseline || '',
    targetFutureState: objective.targetFutureState || '',
    valueRealizationTimeframe: objective.valueRealizationTimeframe || '',
    strategicValueHypothesisSummary: objective.strategicValueHypothesisSummary || '',
    status: objective.status || 'draft',
    linkedLeanBusinessCaseCount: objective.linkedLeanBusinessCaseCount || 0,
    createdAt: objective.createdAt || now,
    updatedAt: objective.updatedAt || now,
  };
};

const loadAllObjectives = (): StoredStrategicObjective[] => {
  try {
    const raw = localStorage.getItem(strategicObjectivesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredStrategicObjective[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const loadObjectives = (workspaceId?: string): StrategicObjective[] => {
  if (!workspaceId) return [];
  return loadAllObjectives().map((objective) => normalizeObjective(objective, workspaceId)).filter((objective) => objective.workspaceId === workspaceId);
};

const persistWorkspaceObjectives = (workspaceId: string, workspaceObjectives: StrategicObjective[]) => {
  const otherObjectives = loadAllObjectives().filter((objective) => objective.workspaceId !== workspaceId);
  localStorage.setItem(strategicObjectivesStorageKey, JSON.stringify([...otherObjectives, ...workspaceObjectives]));
};

const normalizeInvite = (invite: Partial<WorkspaceInvite>): WorkspaceInvite => {
  const now = new Date().toISOString();
  const expiresAt = invite.expiresAt || new Date(Date.now() + inviteDurationMs).toISOString();
  const status = invite.status === 'pending' && new Date(expiresAt).getTime() < Date.now() ? 'Expired' : invite.status || 'pending';
  return {
    id: invite.id || createId('invite'),
    token: invite.token || createId('token'),
    workspaceId: invite.workspaceId || '',
    invitedEmail: invite.invitedEmail || '',
    status,
    expiresAt,
    createdAt: invite.createdAt || now,
    acceptedAt: invite.acceptedAt,
  };
};

const loadAllInvites = (): Partial<WorkspaceInvite>[] => {
  try {
    const raw = localStorage.getItem(invitesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<WorkspaceInvite>[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const loadInvites = (workspaceId?: string): WorkspaceInvite[] => {
  if (!workspaceId) return [];
  return loadAllInvites().map(normalizeInvite).filter((invite) => invite.workspaceId === workspaceId);
};

const persistWorkspaceInvites = (workspaceId: string, workspaceInvites: WorkspaceInvite[]) => {
  const otherInvites = loadAllInvites().filter((invite) => invite.workspaceId !== workspaceId);
  localStorage.setItem(invitesStorageKey, JSON.stringify([...otherInvites, ...workspaceInvites]));
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function PrototypeNotice() {
  return <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">Frontend-only prototype: data is stored in browser local storage and mirrors the API contracts for later backend integration.</div>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className = normalized === 'active' ? 'bg-lime-500 text-black hover:bg-lime-400' : normalized === 'expired' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-cyan-500 text-black hover:bg-cyan-400';
  return <Badge className={`rounded-sm ${className}`}>{status || 'draft'}</Badge>;
}

function PrototypeHeader({ session, workspace }: { session: AuthSession | null; workspace: Workspace | null }) {
  const signOut = () => { localStorage.removeItem(authStorageKey); navigateTo('/login'); };
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div><div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div><p className="text-sm text-slate-300">{getWorkspaceName(workspace)}</p></div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Project Site</Button>
          {session && <><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/workspace-onboarding')}>Workspace</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/strategic-objectives')}>Strategic Objectives</Button>{workspace && <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button>}<Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button></>}
        </nav>
      </div>
    </header>
  );
}

function PrototypeShell({ session, workspace, children }: { session: AuthSession | null; workspace: Workspace | null; children: ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-slate-100"><PrototypeHeader session={session} workspace={workspace} /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main></div>;
}

function InviteStatusBadge({ status }: { status: InviteStatus }) {
  return <StatusBadge status={status} />;
}

function SessionInvitePanel({ session, workspace }: { session: AuthSession; workspace: Workspace | null }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [invites, setInvites] = useState<WorkspaceInvite[]>(() => loadInvites(workspace?.id));

  useEffect(() => { setInvites(loadInvites(workspace?.id)); }, [workspace?.id]);

  const saveInvites = (nextInvites: WorkspaceInvite[]) => {
    if (!workspace?.id) return;
    persistWorkspaceInvites(workspace.id, nextInvites);
    setInvites(nextInvites);
  };

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before inviting users.'); return; }
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail) { setError('Invite email is required.'); return; }
    if (invites.length >= inviteLimit) { setError('Prototype invite limit reached. You can invite up to five users.'); return; }
    if (invites.some((invite) => invite.invitedEmail.toLowerCase() === invitedEmail)) { setError('This email already has an invite for the workspace.'); return; }
    const now = new Date();
    const nextInvite: WorkspaceInvite = {
      id: createId('invite'),
      token: createId('token'),
      workspaceId: workspace.id,
      invitedEmail,
      status: 'pending',
      expiresAt: new Date(now.getTime() + inviteDurationMs).toISOString(),
      createdAt: now.toISOString(),
    };
    saveInvites([...invites, nextInvite]);
    setEmail('');
  };

  const acceptInvite = (token: string) => {
    const now = new Date().toISOString();
    saveInvites(invites.map((invite) => invite.token === token && invite.status === 'pending' ? { ...invite, status: 'Active', acceptedAt: now } : invite));
  };

  return (
    <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
      <CardHeader>
        <CardTitle className="retro-heading text-fuchsia-300">Signed In</CardTitle>
        <CardDescription className="text-slate-300">{session.email}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-slate-300">
        <div className="rounded-md border border-cyan-500/30 bg-cyan-400/10 p-3 text-cyan-100">Invite up to five prototype users. Invited users follow sign-up and are assigned to this workspace.</div>
        <form className="grid gap-3" onSubmit={submitInvite}>
          <Field id="dashboard-invite-email" label="Invite User Email"><Input id="dashboard-invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" disabled={!workspace || invites.length >= inviteLimit} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field>
          <Button type="submit" disabled={!workspace || invites.length >= inviteLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Plus className="mr-2 h-4 w-4" />Invite User</Button>
        </form>
        {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-3 text-red-100">{error}</div>}
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-xs uppercase text-slate-500">Invitees</span><Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{invites.length} / {inviteLimit}</Badge></div>
          {invites.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-3 text-slate-400">No invitees yet.</div> : invites.map((invite) => (
            <div key={invite.id} className="rounded-md border border-slate-700 bg-slate-950 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2"><Mail className="h-4 w-4 text-cyan-300" /><span className="break-all text-slate-100">{invite.invitedEmail}</span><InviteStatusBadge status={invite.status} /></div>
                  <div className="text-xs text-slate-500">Expires {new Date(invite.expiresAt).toLocaleDateString()}</div>
                </div>
                <Button type="button" size="sm" disabled={invite.status !== 'pending'} onClick={() => acceptInvite(invite.token)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><UserCheck className="mr-2 h-4 w-4" />Accept</Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={() => { localStorage.removeItem(authStorageKey); navigateTo('/login'); }} className="w-full rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white"><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
      </CardContent>
    </Card>
  );
}

function LifecycleFlowPanel({ workspace, objectives }: { workspace: Workspace | null; objectives: StrategicObjective[] }) {
  const completedIndex = !workspace ? 0 : objectives.length > 0 ? 2 : 1;
  return <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Prototype Flow</CardTitle><CardDescription className="text-slate-300">Workspace setup comes before lifecycle modeling. Strategic Objectives are the first lifecycle artifact, then Business Architecture is built to support those objectives.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 md:grid-cols-4">{lifecycleFlow.map((step, index) => <div key={step} className={`rounded-md border p-4 text-center text-xs ${index <= completedIndex ? 'border-lime-400 bg-lime-400/15 text-lime-100' : 'border-slate-700 bg-slate-950 text-slate-300'}`}><div className="mb-1 font-semibold">{index + 1}</div>{step}</div>)}</div><div className="rounded-md border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">Downstream lifecycle after Business Architecture: {downstreamFlow.join(' -> ')}.</div></CardContent></Card>;
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

  if (!session) { navigateTo('/login'); return null; }

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader><Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend-only prototype</Badge><CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Welcome to AI Augmented Lifecycle framework</CardTitle><CardDescription className="text-slate-300">Create the company workspace, define up to three strategic objectives, then build business architecture to support those objectives.</CardDescription></CardHeader>
            <CardContent className="space-y-5"><PrototypeNotice /><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Workspace</div><div className="mt-1 text-sm text-slate-100">{workspace ? getWorkspaceName(workspace) : 'Not created'}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Strategic Objectives</div><div className="mt-1 text-2xl font-semibold text-lime-300">{objectives.length} / {objectiveLimit}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Next Artifact</div><div className="mt-1 text-sm text-slate-100">{objectives.length > 0 ? 'Business Architecture' : 'Strategic Objectives'}</div></div></div></CardContent>
          </Card>
          <SessionInvitePanel session={session} workspace={workspace} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Workspace / Company Profile</CardTitle><CardDescription className="text-slate-300">{workspace ? 'Company context exists' : 'Required first'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>{workspace?.description || 'Create the company profile workspace before defining strategic objectives.'}</p><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'View / Edit Workspace' : 'Create Workspace'}</Button></CardContent></Card>
          <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Target className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Strategic Objectives</CardTitle><CardDescription className="text-slate-300">{objectives.length} captured</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Define executive intent, value hypothesis, problem statement, target timeline, and validation status before moving into Business Architecture.</p><Button disabled={!workspace} onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">{objectives.length > 0 ? 'View / Edit Objectives' : 'Create Strategic Objective'}</Button></CardContent></Card>
          <Card className="rounded-md border-slate-700 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Workflow className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Business Architecture</CardTitle><CardDescription className="text-slate-300">Built after objectives</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Business Architecture should outline organization structure, existing value streams, capabilities, and impacts that support the defined strategic objectives.</p><Button disabled={!workspace || objectives.length === 0} onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Build Business Architecture</Button></CardContent></Card>
        </div>
        <LifecycleFlowPanel workspace={workspace} objectives={objectives} />
      </section>
    </PrototypeShell>
  );
}

const formToObjective = (form: StrategicObjectiveForm, workspaceId: string, existing?: StrategicObjective): StrategicObjective => {
  const now = new Date().toISOString();
  return { ...form, id: existing?.id || createId('obj'), workspaceId, strategicInitiativeName: form.strategicInitiativeName.trim(), status: form.status || 'draft', linkedLeanBusinessCaseCount: existing?.linkedLeanBusinessCaseCount || 0, createdAt: existing?.createdAt || now, updatedAt: now };
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
  successMetric: objective.successMetric,
  currentBaseline: objective.currentBaseline,
  targetFutureState: objective.targetFutureState,
  valueRealizationTimeframe: objective.valueRealizationTimeframe,
  strategicValueHypothesisSummary: objective.strategicValueHypothesisSummary,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const reload = () => { const nextSession = loadAuthSession(); const nextWorkspace = loadWorkspace(); setSession(nextSession); setWorkspace(nextWorkspace); setObjectives(loadObjectives(nextWorkspace?.id)); };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  const remainingSlots = Math.max(0, objectiveLimit - objectives.length);
  const hasReachedLimit = objectives.length >= objectiveLimit && !editingId;
  const activeCount = useMemo(() => objectives.filter((objective) => objective.status.toLowerCase() === 'active').length, [objectives]);
  const updateField = (field: keyof StrategicObjectiveForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => { setForm(emptyObjectiveForm); setEditingId(null); setError(''); };

  const saveObjective = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving strategic objectives.'); return; }
    if (hasReachedLimit) { setError('Prototype limit reached. You can create up to three strategic objectives per workspace.'); return; }
    const missingFields = getMissingFields(form);
    if (missingFields.length > 0) {
      const message = form.status.toLowerCase() === 'active' ? 'Strategic Objective cannot be marked Active until all required fields are completed.' : 'Strategic Initiative Name is required to save a draft.';
      setError(`${message} Missing fields: ${missingFields.join(', ')}.`);
      return;
    }
    const existing = editingId ? objectives.find((objective) => objective.id === editingId) : undefined;
    const nextObjective = formToObjective(form, workspace.id, existing);
    const nextObjectives = existing ? objectives.map((objective) => objective.id === existing.id ? nextObjective : objective) : [...objectives, nextObjective];
    persistWorkspaceObjectives(workspace.id, nextObjectives);
    setObjectives(nextObjectives);
    resetForm();
  };

  const editObjective = (objective: StrategicObjective) => { setEditingId(objective.id); setForm(objectiveToForm(objective)); setError(''); };
  const deleteObjective = (objectiveId: string) => { if (!workspace?.id) return; const nextObjectives = objectives.filter((objective) => objective.id !== objectiveId); persistWorkspaceObjectives(workspace.id, nextObjectives); setObjectives(nextObjectives); if (editingId === objectiveId) resetForm(); };

  if (!session) { navigateTo('/login'); return null; }
  if (!workspace) return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle><CardDescription className="text-slate-300">Create the company profile workspace before defining strategic objectives.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent></Card></section></PrototypeShell>;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">First lifecycle artifact</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Strategic Objectives</h1><p className="mt-3 max-w-3xl text-slate-300">Define executive intent and measurable strategic value before outlining Business Architecture support.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button></div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><CardTitle className="retro-heading text-cyan-300">Create Strategic Objective</CardTitle><CardDescription className="text-slate-300">POST /workspaces/:workspaceId/strategic-objectives</CardDescription></div><Badge className="w-fit rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{objectives.length} / {objectiveLimit}</Badge></div></CardHeader>
            <CardContent className="space-y-5">
              <PrototypeNotice />
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
              {hasReachedLimit && <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">Prototype limit reached: three strategic objectives per workspace.</div>}
              <form className="grid gap-5" onSubmit={saveObjective}>
                <div className="grid gap-5 md:grid-cols-[1fr_180px_180px]"><Field id="objective-name" label="Strategic Initiative Name"><Input id="objective-name" value={form.strategicInitiativeName} onChange={(event) => updateField('strategicInitiativeName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="objective-status" label="Status"><Input id="objective-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} placeholder="draft, active" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="objective-year" label="Target Year"><Input id="objective-year" value={form.targetImplementationYear} onChange={(event) => updateField('targetImplementationYear', event.target.value)} placeholder="FY2026" className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div>
                <div className="grid gap-5 md:grid-cols-2"><Field id="executive-objective" label="Executive Objective"><Textarea id="executive-objective" value={form.executiveObjective} onChange={(event) => updateField('executiveObjective', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="expected-outcome" label="Expected Business Outcome"><Textarea id="expected-outcome" value={form.expectedBusinessOutcome} onChange={(event) => updateField('expectedBusinessOutcome', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="value-category" label="Strategic Value Category"><Input id="value-category" value={form.strategicValueCategory} onChange={(event) => updateField('strategicValueCategory', event.target.value)} placeholder="operational_efficiency" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="problem-type" label="Problem Type"><Input id="problem-type" value={form.problemType} onChange={(event) => updateField('problemType', event.target.value)} placeholder="both_customer_and_internal" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="start-date" label="Target Start Date"><Input id="start-date" type="date" value={form.targetImplementationStartDate} onChange={(event) => updateField('targetImplementationStartDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="end-date" label="Target End Date"><Input id="end-date" type="date" value={form.targetImplementationEndDate} onChange={(event) => updateField('targetImplementationEndDate', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div>
                <Field id="financial-impact" label="Financial Impact"><Textarea id="financial-impact" value={form.financialImpact} onChange={(event) => updateField('financialImpact', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="urgency" label="Urgency Rationale"><Textarea id="urgency" value={form.urgencyRationale} onChange={(event) => updateField('urgencyRationale', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <div className="grid gap-5 md:grid-cols-2"><Field id="problem-opportunity" label="Problem / Opportunity Statement"><Textarea id="problem-opportunity" value={form.problemOpportunityStatement} onChange={(event) => updateField('problemOpportunityStatement', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="cost-inaction" label="Cost of Inaction"><Textarea id="cost-inaction" value={form.costOfInaction} onChange={(event) => updateField('costOfInaction', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="current-limitation" label="Current Limitation"><Textarea id="current-limitation" value={form.currentLimitation} onChange={(event) => updateField('currentLimitation', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="impacted-teams" label="Impacted Teams"><Textarea id="impacted-teams" value={form.impactedTeams} onChange={(event) => updateField('impactedTeams', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field></div>
                <Field id="value-hypothesis" label="Value Hypothesis"><Textarea id="value-hypothesis" value={form.valueHypothesis} onChange={(event) => updateField('valueHypothesis', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <div className="grid gap-5 md:grid-cols-2"><Field id="measurement" label="Value Measurement Approach"><Textarea id="measurement" value={form.valueMeasurementApproach} onChange={(event) => updateField('valueMeasurementApproach', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="success-metric" label="Success Metric"><Textarea id="success-metric" value={form.successMetric} onChange={(event) => updateField('successMetric', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="value-type" label="Expected Value Type"><Input id="value-type" value={form.expectedValueType} onChange={(event) => updateField('expectedValueType', event.target.value)} placeholder="mixed" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="value-timeframe" label="Value Realization Timeframe"><Input id="value-timeframe" value={form.valueRealizationTimeframe} onChange={(event) => updateField('valueRealizationTimeframe', event.target.value)} placeholder="Within FY2026" className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="baseline" label="Current Baseline"><Textarea id="baseline" value={form.currentBaseline} onChange={(event) => updateField('currentBaseline', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="future-state" label="Target Future State"><Textarea id="future-state" value={form.targetFutureState} onChange={(event) => updateField('targetFutureState', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field></div>
                <Field id="summary" label="Strategic Value Hypothesis Summary"><Textarea id="summary" value={form.strategicValueHypothesisSummary} onChange={(event) => updateField('strategicValueHypothesisSummary', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">Draft requires strategicInitiativeName. Active requires strategicInitiativeName, executiveObjective, strategicValueCategory, problemOpportunityStatement, valueHypothesis, and status.</div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setForm(exampleObjectiveForm)} className="rounded-sm border-cyan-500 bg-slate-950 text-cyan-200 hover:bg-cyan-500 hover:text-black">Use API Example</Button><Button type="button" variant="outline" onClick={resetForm} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Clear</Button><Button type="submit" disabled={hasReachedLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Save className="mr-2 h-4 w-4" />{editingId ? 'Update Objective' : 'Save Objective'}</Button></div>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-5"><Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Objective Summary</CardTitle><CardDescription className="text-slate-300">GET /workspaces/:workspaceId/strategic-objectives</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 lg:grid-cols-1"><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Created</div><div className="text-2xl font-semibold text-cyan-300">{objectives.length}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Active</div><div className="text-2xl font-semibold text-lime-300">{activeCount}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Remaining Slots</div><div className="text-2xl font-semibold text-yellow-300">{remainingSlots}</div></div></CardContent></Card><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Saved Objectives</CardTitle><CardDescription className="text-slate-300">Limit: three per workspace for the prototype.</CardDescription></CardHeader><CardContent className="space-y-4">{objectives.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No strategic objectives saved yet.</div> : objectives.map((objective) => <div key={objective.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{objective.strategicInitiativeName || 'Untitled Strategic Objective'}</h3><StatusBadge status={objective.status} /></div><p className="text-sm text-slate-300">{objective.expectedBusinessOutcome || objective.executiveObjective || 'No outcome entered.'}</p><dl className="grid gap-2 text-xs sm:grid-cols-2"><div><dt className="uppercase text-slate-500">Objective ID</dt><dd className="text-slate-100">{objective.id}</dd></div><div><dt className="uppercase text-slate-500">Target Year</dt><dd className="text-slate-100">{objective.targetImplementationYear || 'Not set'}</dd></div><div><dt className="uppercase text-slate-500">Success Metric</dt><dd className="text-slate-100">{objective.successMetric || 'Not set'}</dd></div><div><dt className="uppercase text-slate-500">Lean Business Cases</dt><dd className="text-slate-100">{objective.linkedLeanBusinessCaseCount}</dd></div></dl></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editObjective(objective)} className="rounded-sm border-cyan-500 bg-slate-950 text-cyan-200 hover:bg-cyan-500 hover:text-black">Edit</Button><Button type="button" variant="outline" onClick={() => deleteObjective(objective.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>)}<Button disabled={objectives.length === 0} onClick={() => navigateTo('/business-architecture')} className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Continue to Business Architecture</Button></CardContent></Card></div>
        </div>
      </section>
    </PrototypeShell>
  );
}

function BusinessArchitectureGate() {
  const session = loadAuthSession();
  const workspace = loadWorkspace();
  const objectives = loadObjectives(workspace?.id);
  if (!session) { navigateTo('/login'); return null; }
  if (!workspace) { navigateTo('/workspace-onboarding'); return null; }
  if (objectives.length === 0) return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Strategic Objective Required</CardTitle><CardDescription className="text-slate-300">Business Architecture should be built or outlined to support defined Strategic Objectives.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Create at least one Strategic Objective before entering Business Architecture details.</p><Button onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Target className="mr-2 h-4 w-4" />Create Strategic Objective</Button></CardContent></Card></section></PrototypeShell>;
  return <BasePrototypeRoutes />;
}

export default function PrototypeRoutesIntegratedFlow() {
  const [route, setRoute] = useState(() => getRoute());
  useEffect(() => { const handleHashChange = () => setRoute(getRoute()); window.addEventListener('hashchange', handleHashChange); return () => window.removeEventListener('hashchange', handleHashChange); }, []);
  if (route === '/dashboard') return <DashboardScreen />;
  if (route === '/strategic-objectives') return <StrategicObjectivesScreen />;
  if (route === '/business-architecture') return <BusinessArchitectureGate />;
  return <BasePrototypeRoutes />;
}
