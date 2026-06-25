import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, LayoutDashboard, LogOut, Plus, Save, Target, Trash2, Workflow } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesEnterpriseFlow';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';

type AuthSession = { email: string; provider: string; signedInAt: string };
type Workspace = { id: string; companyName?: string; name?: string; description?: string };
type StrategicObjective = { id: string; workspaceId: string; status: string };
type BusinessArchitecture = { id: string; workspaceId: string; status: string };

type ValueStream = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  name: string;
  description?: string;
  valueStreamType?: string;
  status?: string;
};

type KeyActivity = {
  id: string;
  workspaceId: string;
  valueStreamId: string;
  activityName: string;
  activityDescription: string;
  sequenceOrder: number;
  currentStateIssue: string;
  futureStateChange: string;
  businessImpact: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type KeyActivityForm = Omit<KeyActivity, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;

type StoredKeyActivity = Partial<KeyActivity>;
type StoredValueStream = Partial<ValueStream>;

type StoredBusinessArchitecture = Partial<BusinessArchitecture>;
type StoredStrategicObjective = Partial<StrategicObjective>;

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const strategicObjectivesStorageKey = 'slaf.prototype.strategicObjectives';
const businessArchitectureStorageKey = 'slaf.prototype.businessArchitecture';
const valueStreamsStorageKey = 'slaf.prototype.valueStreams';
const keyActivitiesStorageKey = 'slaf.prototype.keyActivities';
const objectiveLimit = 3;

const emptyActivityForm: KeyActivityForm = {
  valueStreamId: '',
  activityName: '',
  activityDescription: '',
  sequenceOrder: 1,
  currentStateIssue: '',
  futureStateChange: '',
  businessImpact: '',
  status: 'draft',
};

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

const loadObjectives = (workspaceId?: string) => {
  if (!workspaceId) return [];
  return loadJson<StoredStrategicObjective[]>(strategicObjectivesStorageKey, [])
    .filter((objective) => objective.workspaceId === workspaceId);
};

const loadBusinessArchitecture = (workspaceId?: string) => {
  if (!workspaceId) return null;
  const architecture = loadJson<StoredBusinessArchitecture | null>(businessArchitectureStorageKey, null);
  return architecture?.workspaceId === workspaceId ? architecture : null;
};

const normalizeValueStream = (stream: StoredValueStream, workspaceId: string): ValueStream => ({
  id: stream.id || createId('value-stream'),
  workspaceId: stream.workspaceId || workspaceId,
  businessArchitectureId: stream.businessArchitectureId || '',
  name: stream.name || 'Untitled Value Stream',
  description: stream.description || '',
  valueStreamType: stream.valueStreamType || 'current_state',
  status: stream.status || 'draft',
});

const loadValueStreams = (workspaceId?: string): ValueStream[] => {
  if (!workspaceId) return [];
  return loadJson<StoredValueStream[]>(valueStreamsStorageKey, [])
    .map((stream) => normalizeValueStream(stream, workspaceId))
    .filter((stream) => stream.workspaceId === workspaceId);
};

const normalizeKeyActivity = (activity: StoredKeyActivity, workspaceId: string): KeyActivity => {
  const now = new Date().toISOString();
  return {
    id: activity.id || createId('ka'),
    workspaceId: activity.workspaceId || workspaceId,
    valueStreamId: activity.valueStreamId || '',
    activityName: activity.activityName || '',
    activityDescription: activity.activityDescription || '',
    sequenceOrder: Number(activity.sequenceOrder || 1),
    currentStateIssue: activity.currentStateIssue || '',
    futureStateChange: activity.futureStateChange || '',
    businessImpact: activity.businessImpact || '',
    status: activity.status || 'draft',
    createdAt: activity.createdAt || now,
    updatedAt: activity.updatedAt || now,
  };
};

const loadKeyActivities = (workspaceId?: string): KeyActivity[] => {
  if (!workspaceId) return [];
  return loadJson<StoredKeyActivity[]>(keyActivitiesStorageKey, [])
    .map((activity) => normalizeKeyActivity(activity, workspaceId))
    .filter((activity) => activity.workspaceId === workspaceId);
};

const persistKeyActivities = (workspaceId: string, workspaceActivities: KeyActivity[]) => {
  const otherActivities = loadJson<StoredKeyActivity[]>(keyActivitiesStorageKey, [])
    .filter((activity) => activity.workspaceId !== workspaceId);
  localStorage.setItem(keyActivitiesStorageKey, JSON.stringify([...otherActivities, ...workspaceActivities]));
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === 'active';
  return <Badge className={`rounded-sm ${isActive ? 'bg-lime-500 text-black hover:bg-lime-400' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}>{status || 'draft'}</Badge>;
}

function PrototypeNotice() {
  return <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">Frontend-only prototype: key activities are stored in browser local storage and scoped to the signed-in prototype user.</div>;
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

function DashboardScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [objectives, setObjectives] = useState(() => loadObjectives(loadWorkspace()?.id));
  const [architecture, setArchitecture] = useState(() => loadBusinessArchitecture(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState(() => loadValueStreams(loadWorkspace()?.id));
  const [keyActivities, setKeyActivities] = useState(() => loadKeyActivities(loadWorkspace()?.id));

  useEffect(() => {
    const reload = () => {
      const nextWorkspace = loadWorkspace();
      setSession(loadAuthSession());
      setWorkspace(nextWorkspace);
      setObjectives(loadObjectives(nextWorkspace?.id));
      setArchitecture(loadBusinessArchitecture(nextWorkspace?.id));
      setValueStreams(loadValueStreams(nextWorkspace?.id));
      setKeyActivities(loadKeyActivities(nextWorkspace?.id));
    };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  if (!session) { navigateTo('/login'); return null; }

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardHeader><Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend-only prototype</Badge><CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Welcome to AI Augmented Lifecycle framework</CardTitle><CardDescription className="text-slate-300">Create the company workspace, define strategic objectives, capture business architecture, then define key activities for value streams.</CardDescription></CardHeader>
          <CardContent className="space-y-5"><PrototypeNotice /><div className="grid gap-3 sm:grid-cols-4"><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Workspace</div><div className="mt-1 text-sm text-slate-100">{workspace ? getWorkspaceName(workspace) : 'Not created'}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Strategic Objectives</div><div className="mt-1 text-2xl font-semibold text-lime-300">{objectives.length} / {objectiveLimit}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Value Streams</div><div className="mt-1 text-2xl font-semibold text-cyan-300">{valueStreams.length}</div></div><div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Key Activities</div><div className="mt-1 text-2xl font-semibold text-fuchsia-300">{keyActivities.length}</div></div></div></CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-4">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Building2 className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Workspace / Company Profile</CardTitle><CardDescription className="text-slate-300">{workspace ? 'Company context exists' : 'Required first'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>{workspace?.description || 'Create the company profile workspace before defining lifecycle artifacts.'}</p><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">{workspace ? 'View / Edit Workspace' : 'Create Workspace'}</Button></CardContent></Card>
          <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Target className="mt-1 h-5 w-5 text-lime-300" /><div><CardTitle className="retro-heading text-lime-300">Strategic Objectives</CardTitle><CardDescription className="text-slate-300">{objectives.length} captured</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Define executive intent and strategic value before moving into Business Architecture.</p><Button disabled={!workspace} onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">{objectives.length > 0 ? 'View / Edit Objectives' : 'Create Strategic Objective'}</Button></CardContent></Card>
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><div className="flex items-start gap-3"><Workflow className="mt-1 h-5 w-5 text-cyan-300" /><div><CardTitle className="retro-heading text-cyan-300">Business Architecture</CardTitle><CardDescription className="text-slate-300">{architecture ? `${valueStreams.length} value stream${valueStreams.length === 1 ? '' : 's'}` : 'Built after objectives'}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Capture value streams that key activities will support.</p><Button disabled={!workspace || objectives.length === 0} onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Build Business Architecture</Button></CardContent></Card>
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Key Activities</CardTitle><CardDescription className="text-slate-300">{keyActivities.length} linked to value streams</CardDescription></CardHeader><CardContent className="space-y-4 text-sm text-slate-300"><p>Define the major activities where value is created, delayed, blocked, transferred, or improved.</p><Button disabled={!workspace || valueStreams.length === 0} onClick={() => navigateTo('/key-activities')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">Manage Key Activities</Button></CardContent></Card>
        </div>
      </section>
    </PrototypeShell>
  );
}

function KeyActivitiesScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [valueStreams, setValueStreams] = useState<ValueStream[]>(() => loadValueStreams(loadWorkspace()?.id));
  const [keyActivities, setKeyActivities] = useState<KeyActivity[]>(() => loadKeyActivities(loadWorkspace()?.id));
  const [form, setForm] = useState<KeyActivityForm>(emptyActivityForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const reload = () => {
      const nextWorkspace = loadWorkspace();
      setSession(loadAuthSession());
      setWorkspace(nextWorkspace);
      setValueStreams(loadValueStreams(nextWorkspace?.id));
      setKeyActivities(loadKeyActivities(nextWorkspace?.id));
    };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  useEffect(() => {
    if (!form.valueStreamId && valueStreams.length > 0) setForm((current) => ({ ...current, valueStreamId: valueStreams[0].id }));
  }, [form.valueStreamId, valueStreams]);

  const activitiesByValueStream = useMemo(() => keyActivities.reduce<Record<string, number>>((counts, activity) => {
    counts[activity.valueStreamId] = (counts[activity.valueStreamId] || 0) + 1;
    return counts;
  }, {}), [keyActivities]);

  const updateField = (field: keyof KeyActivityForm, value: string | number) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => { setForm({ ...emptyActivityForm, valueStreamId: valueStreams[0]?.id || '' }); setEditingId(null); setError(''); };

  const saveActivity = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving key activities.'); return; }
    if (!form.valueStreamId) { setError('Select a value stream before saving a key activity.'); return; }
    if (!form.activityName.trim()) { setError('Activity Name is required.'); return; }

    const now = new Date().toISOString();
    const existing = editingId ? keyActivities.find((activity) => activity.id === editingId) : undefined;
    const nextActivity: KeyActivity = {
      id: existing?.id || createId('ka'),
      workspaceId: workspace.id,
      valueStreamId: form.valueStreamId,
      activityName: form.activityName.trim(),
      activityDescription: form.activityDescription,
      sequenceOrder: Number(form.sequenceOrder || 1),
      currentStateIssue: form.currentStateIssue,
      futureStateChange: form.futureStateChange,
      businessImpact: form.businessImpact,
      status: form.status || 'draft',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const nextActivities = existing ? keyActivities.map((activity) => activity.id === existing.id ? nextActivity : activity) : [...keyActivities, nextActivity];
    persistKeyActivities(workspace.id, nextActivities);
    setKeyActivities(nextActivities);
    resetForm();
  };

  const editActivity = (activity: KeyActivity) => {
    setEditingId(activity.id);
    setForm({
      valueStreamId: activity.valueStreamId,
      activityName: activity.activityName,
      activityDescription: activity.activityDescription,
      sequenceOrder: activity.sequenceOrder,
      currentStateIssue: activity.currentStateIssue,
      futureStateChange: activity.futureStateChange,
      businessImpact: activity.businessImpact,
      status: activity.status,
    });
    setError('');
  };

  const deleteActivity = (activityId: string) => {
    if (!workspace?.id) return;
    const nextActivities = keyActivities.filter((activity) => activity.id !== activityId);
    persistKeyActivities(workspace.id, nextActivities);
    setKeyActivities(nextActivities);
    if (editingId === activityId) resetForm();
  };

  if (!session) { navigateTo('/login'); return null; }
  if (!workspace) return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle><CardDescription className="text-slate-300">Create the company profile workspace before defining key activities.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent></Card></section></PrototypeShell>;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-fuchsia-500 text-white hover:bg-fuchsia-400">Value stream detail</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Key Activities</h1><p className="mt-3 max-w-3xl text-slate-300">Key Activities belong to Value Streams and describe where value is created, transferred, delayed, blocked, or improved.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Back to Dashboard</Button></div>
        {valueStreams.length === 0 ? <Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Value Stream Required</CardTitle><CardDescription className="text-slate-300">Create value streams in Business Architecture before adding Key Activities.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Go to Business Architecture</Button></CardContent></Card> : null}
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader><CardTitle className="retro-heading text-cyan-300">Create Key Activity</CardTitle><CardDescription className="text-slate-300">POST /workspaces/:workspaceId/value-streams/:valueStreamId/key-activities</CardDescription></CardHeader>
            <CardContent className="space-y-5">
              <PrototypeNotice />
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
              <form className="grid gap-5" onSubmit={saveActivity}>
                <Field id="value-stream" label="Value Stream"><select id="value-stream" value={form.valueStreamId} onChange={(event) => updateField('valueStreamId', event.target.value)} disabled={valueStreams.length === 0} className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50">{valueStreams.map((stream) => <option key={stream.id} value={stream.id}>{stream.name}</option>)}</select></Field>
                <div className="grid gap-5 md:grid-cols-[1fr_140px_160px]"><Field id="activity-name" label="Activity Name"><Input id="activity-name" value={form.activityName} onChange={(event) => updateField('activityName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="sequence-order" label="Sequence Order"><Input id="sequence-order" type="number" min="1" value={form.sequenceOrder} onChange={(event) => updateField('sequenceOrder', Number(event.target.value))} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="activity-status" label="Status"><Input id="activity-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} placeholder="draft" className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div>
                <Field id="activity-description" label="Activity Description"><Textarea id="activity-description" value={form.activityDescription} onChange={(event) => updateField('activityDescription', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <div className="grid gap-5 md:grid-cols-2"><Field id="current-state-issue" label="Current State Issue"><Textarea id="current-state-issue" value={form.currentStateIssue} onChange={(event) => updateField('currentStateIssue', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="future-state-change" label="Future State Change"><Textarea id="future-state-change" value={form.futureStateChange} onChange={(event) => updateField('futureStateChange', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field></div>
                <Field id="business-impact" label="Business Impact"><Textarea id="business-impact" value={form.businessImpact} onChange={(event) => updateField('businessImpact', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetForm} className="rounded-sm border-slate-600 bg-slate-950 text-slate-200 hover:bg-slate-800">Clear</Button><Button type="submit" disabled={valueStreams.length === 0} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Save className="mr-2 h-4 w-4" />{editingId ? 'Update Key Activity' : 'Save Key Activity'}</Button></div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Value Stream Activity Counts</CardTitle><CardDescription className="text-slate-300">GET /workspaces/:workspaceId/value-streams/:valueStreamId/key-activities</CardDescription></CardHeader><CardContent className="space-y-3">{valueStreams.map((stream) => <div key={stream.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-medium text-slate-100">{stream.name}</div><div className="text-xs text-slate-500">{stream.valueStreamType || 'current_state'}</div></div><Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{activitiesByValueStream[stream.id] || 0}</Badge></div></div>)}</CardContent></Card>
            <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Saved Key Activities</CardTitle><CardDescription className="text-slate-300">{keyActivities.length} total</CardDescription></CardHeader><CardContent className="space-y-4">{keyActivities.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No key activities captured yet.</div> : keyActivities.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((activity) => { const stream = valueStreams.find((candidate) => candidate.id === activity.valueStreamId); return <div key={activity.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{activity.sequenceOrder}. {activity.activityName}</h3><StatusBadge status={activity.status} /></div><p className="text-sm text-slate-300">{activity.activityDescription || 'No description entered.'}</p><dl className="grid gap-2 text-xs sm:grid-cols-2"><div><dt className="uppercase text-slate-500">Value Stream</dt><dd className="text-slate-100">{stream?.name || activity.valueStreamId}</dd></div><div><dt className="uppercase text-slate-500">Business Impact</dt><dd className="text-slate-100">{activity.businessImpact || 'Not set'}</dd></div></dl></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editActivity(activity)} className="rounded-sm border-cyan-500 bg-slate-950 text-cyan-200 hover:bg-cyan-500 hover:text-black">Edit</Button><Button type="button" variant="outline" onClick={() => deleteActivity(activity.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>; })}</CardContent></Card>
          </div>
        </div>
      </section>
    </PrototypeShell>
  );
}

export default function PrototypeRoutesKeyActivities() {
  const [route, setRoute] = useState(() => getRoute());
  useEffect(() => { const handleHashChange = () => setRoute(getRoute()); window.addEventListener('hashchange', handleHashChange); return () => window.removeEventListener('hashchange', handleHashChange); }, []);
  if (route === '/dashboard') return <DashboardScreen />;
  if (route === '/key-activities') return <KeyActivitiesScreen />;
  return <BasePrototypeRoutes />;
}
