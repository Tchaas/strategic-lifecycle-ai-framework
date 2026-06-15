import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, LayoutDashboard, LogOut, Mail, Plus, ShieldCheck, Target, UserCheck, Workflow } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesKeyActivities';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

type AuthSession = { email: string; provider: string; signedInAt: string };
type Workspace = { id: string; companyName?: string; name?: string; description?: string };
type StrategicObjective = { id?: string; workspaceId?: string };
type BusinessArchitecture = { id?: string; workspaceId?: string; name?: string; status?: string };
type ValueStream = { id?: string; workspaceId?: string; businessArchitectureId?: string; name?: string };
type KeyActivity = { id?: string; workspaceId?: string; valueStreamId?: string };
type BusinessCapability = { id?: string; workspaceId?: string; businessArchitectureId?: string };
type BusinessImpact = { id?: string; workspaceId?: string; businessArchitectureId?: string; severity?: string };
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
const businessArchitectureStorageKey = 'slaf.prototype.businessArchitecture';
const valueStreamsStorageKey = 'slaf.prototype.valueStreams';
const keyActivitiesStorageKey = 'slaf.prototype.keyActivities';
const capabilitiesStorageKey = 'slaf.prototype.businessCapabilities';
const impactsStorageKey = 'slaf.prototype.businessImpacts';
const invitesStorageKey = 'slaf.prototype.invites';
const objectiveLimit = 3;
const architectureLimit = 5;
const valueStreamLimit = 6;
const inviteLimit = 5;
const inviteDurationMs = 5 * 24 * 60 * 60 * 1000;

const getRoute = () => window.location.hash.replace(/^#/, '').split('?')[0] || '/';
const navigateTo = (route: string) => { window.location.hash = route; };
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const loadAuthSession = () => loadJson<AuthSession | null>(authStorageKey, null);
const loadWorkspace = () => loadJson<Workspace | null>(workspaceStorageKey, null);
const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || workspace?.name || 'Workspace setup in progress';
const loadObjectives = (workspaceId?: string) => workspaceId ? loadJson<StrategicObjective[]>(strategicObjectivesStorageKey, []).filter((item) => item.workspaceId === workspaceId) : [];
const loadBusinessArchitectures = (workspaceId?: string) => {
  if (!workspaceId) return [];
  const raw = loadJson<BusinessArchitecture[] | BusinessArchitecture | null>(businessArchitectureStorageKey, []);
  const records = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return records.filter((item) => item.workspaceId === workspaceId);
};
const loadValueStreams = (workspaceId?: string) => workspaceId ? loadJson<ValueStream[]>(valueStreamsStorageKey, []).filter((item) => item.workspaceId === workspaceId) : [];
const loadKeyActivities = (workspaceId?: string) => workspaceId ? loadJson<KeyActivity[]>(keyActivitiesStorageKey, []).filter((item) => item.workspaceId === workspaceId) : [];
const loadCapabilities = (workspaceId?: string) => workspaceId ? loadJson<BusinessCapability[]>(capabilitiesStorageKey, []).filter((item) => item.workspaceId === workspaceId) : [];
const loadImpacts = (workspaceId?: string) => workspaceId ? loadJson<BusinessImpact[]>(impactsStorageKey, []).filter((item) => item.workspaceId === workspaceId) : [];
const loadInvites = (workspaceId?: string) => workspaceId ? loadJson<WorkspaceInvite[]>(invitesStorageKey, []).filter((item) => item.workspaceId === workspaceId) : [];
const persistWorkspaceInvites = (workspaceId: string, workspaceInvites: WorkspaceInvite[]) => {
  const otherInvites = loadJson<WorkspaceInvite[]>(invitesStorageKey, []).filter((invite) => invite.workspaceId !== workspaceId);
  localStorage.setItem(invitesStorageKey, JSON.stringify([...otherInvites, ...workspaceInvites]));
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function StatusBadge({ status }: { status: InviteStatus }) {
  const className = status === 'Active' ? 'bg-lime-500 text-black hover:bg-lime-400' : status === 'Expired' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-yellow-400 text-black hover:bg-yellow-300';
  return <Badge className={`rounded-sm ${className}`}>{status}</Badge>;
}

function PrototypeNotice() {
  return <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">Frontend-only prototype: records are scoped to the signed-in prototype user and stored in browser local storage until backend persistence is connected.</div>;
}

function PrototypeShell({ session, workspace, children }: { session: AuthSession | null; workspace: Workspace | null; children: ReactNode }) {
  const signOut = () => { localStorage.removeItem(authStorageKey); navigateTo('/login'); };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div><p className="text-sm text-slate-300">{getWorkspaceName(workspace)}</p></div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Project Site</Button>
            {session && <><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/workspace-onboarding')}>Workspace</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/strategic-objectives')}>Strategic Objectives</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/key-activities')}>Key Activities</Button><Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button></>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
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
    const nextInvite: WorkspaceInvite = { id: createId('invite'), token: createId('token'), workspaceId: workspace.id, invitedEmail, status: 'pending', expiresAt: new Date(now.getTime() + inviteDurationMs).toISOString(), createdAt: now.toISOString() };
    saveInvites([...invites, nextInvite]);
    setEmail('');
  };

  const acceptInvite = (token: string) => {
    const now = new Date().toISOString();
    saveInvites(invites.map((invite) => invite.token === token && invite.status === 'pending' ? { ...invite, status: 'Active', acceptedAt: now } : invite));
  };

  return (
    <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
      <CardHeader><CardTitle className="retro-heading text-fuchsia-300">Signed In</CardTitle><CardDescription className="text-slate-300">{session.email}</CardDescription></CardHeader>
      <CardContent className="space-y-5 text-sm text-slate-300">
        <div className="rounded-md border border-cyan-500/30 bg-cyan-400/10 p-3 text-cyan-100">Invite up to five prototype users. Invited users follow sign-up and are assigned to this workspace.</div>
        <form className="grid gap-3" onSubmit={submitInvite}><Field id="dashboard-invite-email" label="Invite User Email"><Input id="dashboard-invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" disabled={!workspace || invites.length >= inviteLimit} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Button type="submit" disabled={!workspace || invites.length >= inviteLimit} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Plus className="mr-2 h-4 w-4" />Invite User</Button></form>
        {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-3 text-red-100">{error}</div>}
        <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-xs uppercase text-slate-500">Invitees</span><Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{invites.length} / {inviteLimit}</Badge></div>{invites.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-3 text-slate-400">No invitees yet.</div> : invites.map((invite) => <div key={invite.id} className="rounded-md border border-slate-700 bg-slate-950 p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><Mail className="h-4 w-4 text-cyan-300" /><span className="break-all text-slate-100">{invite.invitedEmail}</span><StatusBadge status={invite.status} /></div><div className="text-xs text-slate-500">Expires {new Date(invite.expiresAt).toLocaleDateString()}</div></div><Button type="button" size="sm" disabled={invite.status !== 'pending'} onClick={() => acceptInvite(invite.token)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><UserCheck className="mr-2 h-4 w-4" />Accept</Button></div></div>)}</div>
        <Button variant="outline" onClick={() => { localStorage.removeItem(authStorageKey); navigateTo('/login'); }} className="w-full rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white"><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
      </CardContent>
    </Card>
  );
}

function DashboardScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [objectives, setObjectives] = useState(() => loadObjectives(loadWorkspace()?.id));
  const [architectures, setArchitectures] = useState(() => loadBusinessArchitectures(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState(() => loadValueStreams(loadWorkspace()?.id));
  const [keyActivities, setKeyActivities] = useState(() => loadKeyActivities(loadWorkspace()?.id));
  const [capabilities, setCapabilities] = useState(() => loadCapabilities(loadWorkspace()?.id));
  const [impacts, setImpacts] = useState(() => loadImpacts(loadWorkspace()?.id));

  useEffect(() => {
    const reload = () => {
      const nextWorkspace = loadWorkspace();
      setSession(loadAuthSession());
      setWorkspace(nextWorkspace);
      setObjectives(loadObjectives(nextWorkspace?.id));
      setArchitectures(loadBusinessArchitectures(nextWorkspace?.id));
      setValueStreams(loadValueStreams(nextWorkspace?.id));
      setKeyActivities(loadKeyActivities(nextWorkspace?.id));
      setCapabilities(loadCapabilities(nextWorkspace?.id));
      setImpacts(loadImpacts(nextWorkspace?.id));
    };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  if (!session) { navigateTo('/login'); return null; }

  const highSeverityImpacts = impacts.filter((impact) => impact.severity?.toLowerCase() === 'high').length;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend-only prototype</Badge><CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Welcome to AI Augmented Lifecycle framework</CardTitle><CardDescription className="text-slate-300">Create the company workspace, define strategic objectives, capture business architecture, then define value streams, key activities, capabilities, and business impacts.</CardDescription></CardHeader><CardContent className="space-y-5"><PrototypeNotice /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Workspace</div><div className="mt-1 text-sm text-slate-100">{workspace ? getWorkspaceName(workspace) : 'Not created'}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Objectives</div><div className="mt-1 text-2xl font-semibold text-lime-300">{objectives.length} / {objectiveLimit}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Architecture</div><div className="mt-1 text-2xl font-semibold text-cyan-300">{architectures.length} / {architectureLimit}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Value Streams</div><div className="mt-1 text-2xl font-semibold text-cyan-300">{valueStreams.length}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Capabilities</div><div className="mt-1 text-2xl font-semibold text-lime-300">{capabilities.length}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Impacts</div><div className="mt-1 text-2xl font-semibold text-fuchsia-300">{impacts.length}</div></div></div></CardContent></Card>
          <SessionInvitePanel session={session} workspace={workspace} />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Workspace / Company Profile</CardTitle><CardDescription className="text-slate-300">{workspace ? 'Company context exists' : 'Required first'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>{workspace?.description || 'Create the company profile workspace before defining lifecycle artifacts.'}</p><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'View / Edit Workspace' : 'Create Workspace'}</Button></CardContent></Card>
          <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Target className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Strategic Objectives</CardTitle><CardDescription className="text-slate-300">{objectives.length} captured</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Define executive intent and strategic value before moving into Business Architecture.</p><Button disabled={!workspace} onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">{objectives.length > 0 ? 'View / Edit Objectives' : 'Create Strategic Objective'}</Button></CardContent></Card>
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Workflow className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Business Architecture</CardTitle><CardDescription className="text-slate-300">{architectures.length} structure{architectures.length === 1 ? '' : 's'}, {valueStreams.length} value stream{valueStreams.length === 1 ? '' : 's'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Capture organization structures and value streams that downstream analysis will support.</p><Button disabled={!workspace || objectives.length === 0} onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Build Business Architecture</Button></CardContent></Card>
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Key Activities</CardTitle><CardDescription className="text-slate-300">{keyActivities.length} linked to value streams</CardDescription></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Define the major activities where value is created, delayed, blocked, transferred, or improved.</p><Button disabled={!workspace || valueStreams.length === 0} onClick={() => navigateTo('/key-activities')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Manage Key Activities</Button></CardContent></Card>
          <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Business Capabilities</CardTitle><CardDescription className="text-slate-300">{capabilities.length} capability record{capabilities.length === 1 ? '' : 's'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Show which capabilities exist, need improvement, or must be created to support the objective.</p><Button disabled={!workspace || architectures.length === 0} onClick={() => navigateTo('/business-capabilities')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Manage Capabilities</Button></CardContent></Card>
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><AlertTriangle className="mt-1 h-5 w-5 text-fuchsia-300" /><div><CardTitle className="retro-heading text-fuchsia-300">Business Impacts</CardTitle><CardDescription className="text-slate-300">{impacts.length} impact record{impacts.length === 1 ? '' : 's'}, {highSeverityImpacts} high severity</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Identify business impacts that will later justify Lean Business Cases and Product Discovery priorities.</p><Button disabled={!workspace || architectures.length === 0} onClick={() => navigateTo('/business-impacts')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Manage Impacts</Button></CardContent></Card>
        </div>
      </section>
    </PrototypeShell>
  );
}

export default function PrototypeRoutesKeyActivitiesDashboard() {
  const [route, setRoute] = useState(() => getRoute());
  useEffect(() => { const handleHashChange = () => setRoute(getRoute()); window.addEventListener('hashchange', handleHashChange); return () => window.removeEventListener('hashchange', handleHashChange); }, []);
  if (route === '/dashboard') return <DashboardScreen />;
  return <BasePrototypeRoutes />;
}
