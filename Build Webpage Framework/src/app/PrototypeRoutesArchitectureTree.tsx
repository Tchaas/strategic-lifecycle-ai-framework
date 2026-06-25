import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LayoutDashboard, LogOut, Plus, Save, Target, Trash2 } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesKeyActivitiesDashboard';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';

type AuthSession = { email: string; provider: string; signedInAt: string };
type Workspace = { id: string; companyName?: string; name?: string };

type StrategicObjective = {
  id: string;
  workspaceId: string;
  strategicInitiativeName?: string;
  status?: string;
};

type BusinessArchitecture = {
  id: string;
  workspaceId: string;
  strategicObjectiveId: string;
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

type BusinessArchitectureForm = Omit<BusinessArchitecture, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;

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

type ValueStreamForm = Omit<ValueStream, 'id' | 'workspaceId' | 'businessArchitectureId' | 'keyActivityCount' | 'createdAt' | 'updatedAt'>;

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

type StoredBusinessArchitecture = Partial<BusinessArchitecture> & { strategicObjectiveId?: string };
type StoredValueStream = Partial<ValueStream>;
type StoredKeyActivity = Partial<KeyActivity>;

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const strategicObjectivesStorageKey = 'slaf.prototype.strategicObjectives';
const businessArchitectureStorageKey = 'slaf.prototype.businessArchitecture';
const valueStreamsStorageKey = 'slaf.prototype.valueStreams';
const keyActivitiesStorageKey = 'slaf.prototype.keyActivities';

const architectureLimit = 5;
const valueStreamLimit = 6;
const keyActivityLimit = 6;

const emptyArchitectureForm: BusinessArchitectureForm = {
  strategicObjectiveId: '',
  name: '',
  description: '',
  currentStateSummary: '',
  futureStateSummary: '',
  organizationUnits: '',
  businessCapabilities: '',
  businessProcesses: '',
  stakeholdersPersonas: '',
  informationConcepts: '',
  businessImpacts: '',
  status: 'draft',
};

const emptyValueStreamForm: ValueStreamForm = {
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

const saveJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const loadAuthSession = () => loadJson<AuthSession | null>(authStorageKey, null);
const loadWorkspace = () => loadJson<Workspace | null>(workspaceStorageKey, null);
const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || workspace?.name || 'Workspace setup in progress';

const loadObjectives = (workspaceId?: string): StrategicObjective[] => {
  if (!workspaceId) return [];
  return loadJson<Partial<StrategicObjective>[]>(strategicObjectivesStorageKey, [])
    .filter((objective) => objective.workspaceId === workspaceId && !!objective.id)
    .map((objective) => ({ id: objective.id || '', workspaceId, strategicInitiativeName: objective.strategicInitiativeName || 'Untitled Strategic Objective', status: objective.status || 'draft' }));
};

const normalizeArchitecture = (item: StoredBusinessArchitecture, workspaceId: string): BusinessArchitecture => {
  const now = new Date().toISOString();
  return {
    id: item.id || createId('business-architecture'),
    workspaceId: item.workspaceId || workspaceId,
    strategicObjectiveId: item.strategicObjectiveId || '',
    name: item.name || '',
    description: item.description || '',
    currentStateSummary: item.currentStateSummary || '',
    futureStateSummary: item.futureStateSummary || '',
    organizationUnits: item.organizationUnits || '',
    businessCapabilities: item.businessCapabilities || '',
    businessProcesses: item.businessProcesses || '',
    stakeholdersPersonas: item.stakeholdersPersonas || '',
    informationConcepts: item.informationConcepts || '',
    businessImpacts: item.businessImpacts || '',
    status: item.status || 'draft',
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
  };
};

const loadArchitectures = (workspaceId?: string): BusinessArchitecture[] => {
  if (!workspaceId) return [];
  const raw = loadJson<StoredBusinessArchitecture[] | StoredBusinessArchitecture | null>(businessArchitectureStorageKey, []);
  const records = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return records.map((item) => normalizeArchitecture(item, workspaceId)).filter((item) => item.workspaceId === workspaceId);
};

const persistArchitectures = (workspaceId: string, workspaceArchitectures: BusinessArchitecture[]) => {
  const raw = loadJson<StoredBusinessArchitecture[] | StoredBusinessArchitecture | null>(businessArchitectureStorageKey, []);
  const records = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const other = records.filter((item) => item.workspaceId !== workspaceId);
  saveJson(businessArchitectureStorageKey, [...other, ...workspaceArchitectures]);
};

const normalizeValueStream = (stream: StoredValueStream, workspaceId: string): ValueStream => {
  const now = new Date().toISOString();
  return {
    id: stream.id || createId('value-stream'),
    workspaceId: stream.workspaceId || workspaceId,
    businessArchitectureId: stream.businessArchitectureId || '',
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

const loadValueStreams = (workspaceId?: string): ValueStream[] => {
  if (!workspaceId) return [];
  return loadJson<StoredValueStream[]>(valueStreamsStorageKey, []).map((stream) => normalizeValueStream(stream, workspaceId)).filter((stream) => stream.workspaceId === workspaceId);
};

const persistValueStreams = (workspaceId: string, workspaceStreams: ValueStream[]) => {
  const other = loadJson<StoredValueStream[]>(valueStreamsStorageKey, []).filter((stream) => stream.workspaceId !== workspaceId);
  saveJson(valueStreamsStorageKey, [...other, ...workspaceStreams]);
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
  return loadJson<StoredKeyActivity[]>(keyActivitiesStorageKey, []).map((activity) => normalizeKeyActivity(activity, workspaceId)).filter((activity) => activity.workspaceId === workspaceId);
};

const persistKeyActivities = (workspaceId: string, workspaceActivities: KeyActivity[]) => {
  const other = loadJson<StoredKeyActivity[]>(keyActivitiesStorageKey, []).filter((activity) => activity.workspaceId !== workspaceId);
  saveJson(keyActivitiesStorageKey, [...other, ...workspaceActivities]);
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === 'active';
  return <Badge className={`rounded-sm ${isActive ? 'bg-lime-500 text-black hover:bg-lime-400' : 'bg-cyan-500 text-black hover:bg-cyan-400'}`}>{status || 'draft'}</Badge>;
}

function PrototypeShell({ session, workspace, children }: { session: AuthSession | null; workspace: Workspace | null; children: ReactNode }) {
  const signOut = () => { localStorage.removeItem(authStorageKey); navigateTo('/login'); };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div><p className="text-sm text-slate-300">{getWorkspaceName(workspace)}</p></div>
          <nav className="flex flex-wrap items-center gap-2 text-sm"><Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Project Site</Button>{session && <><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/strategic-objectives')}>Strategic Objectives</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/key-activities')}>Key Activities</Button><Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button></>}</nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function PrototypeNotice({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">{children}</div>;
}

function BusinessArchitectureScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [objectives, setObjectives] = useState<StrategicObjective[]>(() => loadObjectives(loadWorkspace()?.id));
  const [architectures, setArchitectures] = useState<BusinessArchitecture[]>(() => loadArchitectures(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState<ValueStream[]>(() => loadValueStreams(loadWorkspace()?.id));
  const [architectureForm, setArchitectureForm] = useState<BusinessArchitectureForm>(emptyArchitectureForm);
  const [valueStreamForm, setValueStreamForm] = useState<ValueStreamForm>(emptyValueStreamForm);
  const [selectedArchitectureId, setSelectedArchitectureId] = useState('');
  const [editingArchitectureId, setEditingArchitectureId] = useState<string | null>(null);
  const [editingValueStreamId, setEditingValueStreamId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reload = () => {
    const nextWorkspace = loadWorkspace();
    setSession(loadAuthSession());
    setWorkspace(nextWorkspace);
    setObjectives(loadObjectives(nextWorkspace?.id));
    setArchitectures(loadArchitectures(nextWorkspace?.id));
    setValueStreams(loadValueStreams(nextWorkspace?.id));
  };

  useEffect(() => { window.addEventListener('storage', reload); return () => window.removeEventListener('storage', reload); }, []);
  useEffect(() => { if (!architectureForm.strategicObjectiveId && objectives[0]?.id) setArchitectureForm((current) => ({ ...current, strategicObjectiveId: objectives[0].id })); }, [architectureForm.strategicObjectiveId, objectives]);
  useEffect(() => { if (!selectedArchitectureId && architectures[0]?.id) setSelectedArchitectureId(architectures[0].id); }, [architectures, selectedArchitectureId]);

  const selectedArchitecture = architectures.find((item) => item.id === selectedArchitectureId) || null;
  const architecturesForSelectedObjective = architectures.filter((item) => item.strategicObjectiveId === architectureForm.strategicObjectiveId);
  const selectedArchitectureStreams = valueStreams.filter((stream) => stream.businessArchitectureId === selectedArchitectureId);

  const updateArchitectureField = (field: keyof BusinessArchitectureForm, value: string) => setArchitectureForm((current) => ({ ...current, [field]: value }));
  const updateValueStreamField = (field: keyof ValueStreamForm, value: string) => setValueStreamForm((current) => ({ ...current, [field]: value }));
  const resetArchitectureForm = () => { setArchitectureForm({ ...emptyArchitectureForm, strategicObjectiveId: objectives[0]?.id || '' }); setEditingArchitectureId(null); setError(''); };
  const resetValueStreamForm = () => { setValueStreamForm(emptyValueStreamForm); setEditingValueStreamId(null); setError(''); };

  const saveArchitecture = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving Business Architecture.'); return; }
    if (!architectureForm.strategicObjectiveId) { setError('Select a Strategic Objective before saving Business Architecture.'); return; }
    if (!architectureForm.name.trim()) { setError('Business Architecture Name is required.'); return; }
    if (!editingArchitectureId && architecturesForSelectedObjective.length >= architectureLimit) { setError('Limit reached: 5 Business Architecture / Organization Structures per Strategic Objective.'); return; }

    const now = new Date().toISOString();
    const existing = editingArchitectureId ? architectures.find((item) => item.id === editingArchitectureId) : undefined;
    const nextArchitecture: BusinessArchitecture = { ...architectureForm, id: existing?.id || createId('business-architecture'), workspaceId: workspace.id, name: architectureForm.name.trim(), createdAt: existing?.createdAt || now, updatedAt: now };
    const nextArchitectures = existing ? architectures.map((item) => item.id === existing.id ? nextArchitecture : item) : [...architectures, nextArchitecture];
    persistArchitectures(workspace.id, nextArchitectures);
    setArchitectures(nextArchitectures);
    setSelectedArchitectureId(nextArchitecture.id);
    resetArchitectureForm();
  };

  const editArchitecture = (architecture: BusinessArchitecture) => {
    setEditingArchitectureId(architecture.id);
    setArchitectureForm({ strategicObjectiveId: architecture.strategicObjectiveId, name: architecture.name, description: architecture.description, currentStateSummary: architecture.currentStateSummary, futureStateSummary: architecture.futureStateSummary, organizationUnits: architecture.organizationUnits, businessCapabilities: architecture.businessCapabilities, businessProcesses: architecture.businessProcesses, stakeholdersPersonas: architecture.stakeholdersPersonas, informationConcepts: architecture.informationConcepts, businessImpacts: architecture.businessImpacts, status: architecture.status });
    setError('');
  };

  const deleteArchitecture = (architectureId: string) => {
    if (!workspace?.id) return;
    const nextArchitectures = architectures.filter((item) => item.id !== architectureId);
    const nextStreams = valueStreams.filter((stream) => stream.businessArchitectureId !== architectureId);
    persistArchitectures(workspace.id, nextArchitectures);
    persistValueStreams(workspace.id, nextStreams);
    setArchitectures(nextArchitectures);
    setValueStreams(nextStreams);
    if (selectedArchitectureId === architectureId) setSelectedArchitectureId(nextArchitectures[0]?.id || '');
    if (editingArchitectureId === architectureId) resetArchitectureForm();
  };

  const saveValueStream = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving Value Streams.'); return; }
    if (!selectedArchitectureId) { setError('Select a Business Architecture structure before saving a Value Stream.'); return; }
    if (!valueStreamForm.name.trim()) { setError('Value Stream Name is required.'); return; }
    if (!editingValueStreamId && selectedArchitectureStreams.length >= valueStreamLimit) { setError('Limit reached: 6 Value Streams per Business Architecture Structure.'); return; }

    const now = new Date().toISOString();
    const existing = editingValueStreamId ? valueStreams.find((stream) => stream.id === editingValueStreamId) : undefined;
    const nextStream: ValueStream = { ...valueStreamForm, id: existing?.id || createId('value-stream'), workspaceId: workspace.id, businessArchitectureId: selectedArchitectureId, name: valueStreamForm.name.trim(), keyActivityCount: existing?.keyActivityCount || 0, createdAt: existing?.createdAt || now, updatedAt: now };
    const nextStreams = existing ? valueStreams.map((stream) => stream.id === existing.id ? nextStream : stream) : [...valueStreams, nextStream];
    persistValueStreams(workspace.id, nextStreams);
    setValueStreams(nextStreams);
    resetValueStreamForm();
  };

  const editValueStream = (stream: ValueStream) => {
    setSelectedArchitectureId(stream.businessArchitectureId);
    setEditingValueStreamId(stream.id);
    setValueStreamForm({ name: stream.name, description: stream.description, valueStreamType: stream.valueStreamType, strategicAlignment: stream.strategicAlignment, triggeringStakeholder: stream.triggeringStakeholder, valueRecipient: stream.valueRecipient, expectedOutcome: stream.expectedOutcome, currentStateNotes: stream.currentStateNotes, futureStateNotes: stream.futureStateNotes, status: stream.status });
    setError('');
  };

  const deleteValueStream = (streamId: string) => {
    if (!workspace?.id) return;
    const nextStreams = valueStreams.filter((stream) => stream.id !== streamId);
    persistValueStreams(workspace.id, nextStreams);
    setValueStreams(nextStreams);
    if (editingValueStreamId === streamId) resetValueStreamForm();
  };

  if (!session) { navigateTo('/login'); return null; }
  if (!workspace) return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle><CardDescription className="text-slate-300">Create the company profile workspace before entering Business Architecture.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent></Card></section></PrototypeShell>;
  if (objectives.length === 0) return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Strategic Objective Required</CardTitle><CardDescription className="text-slate-300">Business Architecture belongs to Strategic Objectives.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/strategic-objectives')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Strategic Objective</Button></CardContent></Card></section></PrototypeShell>;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Organization structure</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Business Architecture / Organization Structure</h1><p className="mt-3 max-w-3xl text-slate-300">Create up to 5 Business Architecture structures per Strategic Objective. Each structure can contain up to 6 Value Streams.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button></div>
        {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Create Business Architecture Structure</CardTitle><CardDescription className="text-slate-300">5 structures per Strategic Objective.</CardDescription></CardHeader><CardContent><form className="grid gap-5" onSubmit={saveArchitecture}><Field id="objective" label="Strategic Objective"><select id="objective" value={architectureForm.strategicObjectiveId} onChange={(event) => updateArchitectureField('strategicObjectiveId', event.target.value)} className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">{objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.strategicInitiativeName || 'Untitled Strategic Objective'}</option>)}</select></Field><div className="grid gap-5 md:grid-cols-[1fr_160px]"><Field id="ba-name" label="Name"><Input id="ba-name" value={architectureForm.name} onChange={(event) => updateArchitectureField('name', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="ba-status" label="Status"><Input id="ba-status" value={architectureForm.status} onChange={(event) => updateArchitectureField('status', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="ba-description" label="Description"><Textarea id="ba-description" value={architectureForm.description} onChange={(event) => updateArchitectureField('description', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="grid gap-5 md:grid-cols-2"><Field id="current-state" label="Current State Summary"><Textarea id="current-state" value={architectureForm.currentStateSummary} onChange={(event) => updateArchitectureField('currentStateSummary', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="future-state" label="Future State Summary"><Textarea id="future-state" value={architectureForm.futureStateSummary} onChange={(event) => updateArchitectureField('futureStateSummary', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="org-units" label="Organization Units / Teams"><Textarea id="org-units" value={architectureForm.organizationUnits} onChange={(event) => updateArchitectureField('organizationUnits', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="capabilities" label="Business Capabilities"><Textarea id="capabilities" value={architectureForm.businessCapabilities} onChange={(event) => updateArchitectureField('businessCapabilities', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="processes" label="Business Processes"><Textarea id="processes" value={architectureForm.businessProcesses} onChange={(event) => updateArchitectureField('businessProcesses', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="stakeholders" label="Stakeholders / Personas"><Textarea id="stakeholders" value={architectureForm.stakeholdersPersonas} onChange={(event) => updateArchitectureField('stakeholdersPersonas', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="information" label="Information / Data Concepts"><Textarea id="information" value={architectureForm.informationConcepts} onChange={(event) => updateArchitectureField('informationConcepts', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="impacts" label="Business Impacts / Gaps"><Textarea id="impacts" value={architectureForm.businessImpacts} onChange={(event) => updateArchitectureField('businessImpacts', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field></div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetArchitectureForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />{editingArchitectureId ? 'Update Structure' : 'Save Structure'}</Button></div></form></CardContent></Card>
          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Business Architecture Structures</CardTitle><CardDescription className="text-slate-300">{architectures.length} total</CardDescription></CardHeader><CardContent className="space-y-4">{objectives.map((objective) => { const items = architectures.filter((item) => item.strategicObjectiveId === objective.id); return <div key={objective.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div className="font-medium text-slate-100">{objective.strategicInitiativeName || 'Untitled Strategic Objective'}</div><Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{items.length} / {architectureLimit}</Badge></div><div className="space-y-3">{items.length === 0 ? <div className="text-sm text-slate-500">No structures yet.</div> : items.map((item) => <div key={item.id} className={`rounded-md border p-3 ${selectedArchitectureId === item.id ? 'border-lime-400 bg-lime-400/10' : 'border-slate-700 bg-slate-900'}`}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><button type="button" className="text-left font-medium text-slate-100 hover:text-cyan-200" onClick={() => setSelectedArchitectureId(item.id)}>{item.name}</button><div className="mt-1 text-xs text-slate-500">{valueStreams.filter((stream) => stream.businessArchitectureId === item.id).length} / {valueStreamLimit} value streams</div></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editArchitecture(item)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button><Button type="button" variant="outline" onClick={() => deleteArchitecture(item.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</div></div>; })}</CardContent></Card>
        </div>
        <Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-lime-300">Value Streams</CardTitle><CardDescription className="text-slate-300">6 value streams per selected Business Architecture structure.</CardDescription></CardHeader><CardContent className="space-y-6">{selectedArchitecture ? <PrototypeNotice>Selected structure: {selectedArchitecture.name}</PrototypeNotice> : <PrototypeNotice>Select or create a Business Architecture structure before adding value streams.</PrototypeNotice>}<form className="grid gap-5" onSubmit={saveValueStream}><div className="grid gap-5 md:grid-cols-3"><Field id="vs-name" label="Name"><Input id="vs-name" value={valueStreamForm.name} onChange={(event) => updateValueStreamField('name', event.target.value)} disabled={!selectedArchitecture} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Field id="vs-type" label="Value Stream Type"><Input id="vs-type" value={valueStreamForm.valueStreamType} onChange={(event) => updateValueStreamField('valueStreamType', event.target.value)} disabled={!selectedArchitecture} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Field id="vs-status" label="Status"><Input id="vs-status" value={valueStreamForm.status} onChange={(event) => updateValueStreamField('status', event.target.value)} disabled={!selectedArchitecture} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field></div><Field id="vs-description" label="Description"><Textarea id="vs-description" value={valueStreamForm.description} onChange={(event) => updateValueStreamField('description', event.target.value)} disabled={!selectedArchitecture} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Field id="vs-alignment" label="Strategic Alignment"><Textarea id="vs-alignment" value={valueStreamForm.strategicAlignment} onChange={(event) => updateValueStreamField('strategicAlignment', event.target.value)} disabled={!selectedArchitecture} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><div className="grid gap-5 md:grid-cols-3"><Field id="vs-trigger" label="Triggering Stakeholder"><Input id="vs-trigger" value={valueStreamForm.triggeringStakeholder} onChange={(event) => updateValueStreamField('triggeringStakeholder', event.target.value)} disabled={!selectedArchitecture} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Field id="vs-recipient" label="Value Recipient"><Input id="vs-recipient" value={valueStreamForm.valueRecipient} onChange={(event) => updateValueStreamField('valueRecipient', event.target.value)} disabled={!selectedArchitecture} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Field id="vs-outcome" label="Expected Outcome"><Input id="vs-outcome" value={valueStreamForm.expectedOutcome} onChange={(event) => updateValueStreamField('expectedOutcome', event.target.value)} disabled={!selectedArchitecture} className="border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field></div><div className="grid gap-5 md:grid-cols-2"><Field id="vs-current" label="Current State Notes"><Textarea id="vs-current" value={valueStreamForm.currentStateNotes} onChange={(event) => updateValueStreamField('currentStateNotes', event.target.value)} disabled={!selectedArchitecture} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field><Field id="vs-future" label="Future State Notes"><Textarea id="vs-future" value={valueStreamForm.futureStateNotes} onChange={(event) => updateValueStreamField('futureStateNotes', event.target.value)} disabled={!selectedArchitecture} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100 disabled:opacity-50" /></Field></div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetValueStreamForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button><Button type="submit" disabled={!selectedArchitecture} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Plus className="mr-2 h-4 w-4" />{editingValueStreamId ? 'Update Value Stream' : 'Add Value Stream'}</Button></div></form><div className="grid gap-4 md:grid-cols-2">{selectedArchitectureStreams.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No value streams for the selected structure.</div> : selectedArchitectureStreams.map((stream) => <div key={stream.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{stream.name}</h3><StatusBadge status={stream.status} /></div><p className="mt-2 text-sm text-slate-300">{stream.description || 'No description entered.'}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editValueStream(stream)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button><Button type="button" variant="outline" onClick={() => deleteValueStream(stream.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</div></CardContent></Card>
      </section>
    </PrototypeShell>
  );
}

function KeyActivitiesScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [architectures, setArchitectures] = useState<BusinessArchitecture[]>(() => loadArchitectures(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState<ValueStream[]>(() => loadValueStreams(loadWorkspace()?.id));
  const [keyActivities, setKeyActivities] = useState<KeyActivity[]>(() => loadKeyActivities(loadWorkspace()?.id));
  const [form, setForm] = useState<KeyActivityForm>(emptyActivityForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reload = () => {
    const nextWorkspace = loadWorkspace();
    setSession(loadAuthSession());
    setWorkspace(nextWorkspace);
    setArchitectures(loadArchitectures(nextWorkspace?.id));
    setValueStreams(loadValueStreams(nextWorkspace?.id));
    setKeyActivities(loadKeyActivities(nextWorkspace?.id));
  };

  useEffect(() => { window.addEventListener('storage', reload); return () => window.removeEventListener('storage', reload); }, []);
  useEffect(() => { if (!form.valueStreamId && valueStreams[0]?.id) setForm((current) => ({ ...current, valueStreamId: valueStreams[0].id })); }, [form.valueStreamId, valueStreams]);

  const selectedStream = valueStreams.find((stream) => stream.id === form.valueStreamId) || null;
  const selectedStreamActivities = keyActivities.filter((activity) => activity.valueStreamId === form.valueStreamId);
  const activitiesByValueStream = useMemo(() => keyActivities.reduce<Record<string, number>>((counts, activity) => { counts[activity.valueStreamId] = (counts[activity.valueStreamId] || 0) + 1; return counts; }, {}), [keyActivities]);
  const updateField = (field: keyof KeyActivityForm, value: string | number) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => { setForm({ ...emptyActivityForm, valueStreamId: valueStreams[0]?.id || '' }); setEditingId(null); setError(''); };

  const saveActivity = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving key activities.'); return; }
    if (!form.valueStreamId) { setError('Select a value stream before saving a key activity.'); return; }
    if (!form.activityName.trim()) { setError('Activity Name is required.'); return; }
    if (!editingId && selectedStreamActivities.length >= keyActivityLimit) { setError('Limit reached: 6 Key Activities per Value Stream.'); return; }

    const now = new Date().toISOString();
    const existing = editingId ? keyActivities.find((activity) => activity.id === editingId) : undefined;
    const nextActivity: KeyActivity = { id: existing?.id || createId('ka'), workspaceId: workspace.id, valueStreamId: form.valueStreamId, activityName: form.activityName.trim(), activityDescription: form.activityDescription, sequenceOrder: Number(form.sequenceOrder || 1), currentStateIssue: form.currentStateIssue, futureStateChange: form.futureStateChange, businessImpact: form.businessImpact, status: form.status || 'draft', createdAt: existing?.createdAt || now, updatedAt: now };
    const nextActivities = existing ? keyActivities.map((activity) => activity.id === existing.id ? nextActivity : activity) : [...keyActivities, nextActivity];
    persistKeyActivities(workspace.id, nextActivities);
    setKeyActivities(nextActivities);
    resetForm();
  };

  const editActivity = (activity: KeyActivity) => { setEditingId(activity.id); setForm({ valueStreamId: activity.valueStreamId, activityName: activity.activityName, activityDescription: activity.activityDescription, sequenceOrder: activity.sequenceOrder, currentStateIssue: activity.currentStateIssue, futureStateChange: activity.futureStateChange, businessImpact: activity.businessImpact, status: activity.status }); setError(''); };
  const deleteActivity = (activityId: string) => { if (!workspace?.id) return; const nextActivities = keyActivities.filter((activity) => activity.id !== activityId); persistKeyActivities(workspace.id, nextActivities); setKeyActivities(nextActivities); if (editingId === activityId) resetForm(); };

  if (!session) { navigateTo('/login'); return null; }
  if (!workspace) return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Workspace Required</CardTitle><CardDescription className="text-slate-300">Create the company profile workspace before defining key activities.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/workspace-onboarding')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Create Workspace</Button></CardContent></Card></section></PrototypeShell>;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Value stream detail</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Key Activities</h1><p className="mt-3 max-w-3xl text-slate-300">Create up to 6 Key Activities per Value Stream.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button></div>{error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}{valueStreams.length === 0 ? <Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Value Stream Required</CardTitle><CardDescription className="text-slate-300">Create value streams in Business Architecture before adding Key Activities.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Go to Business Architecture</Button></CardContent></Card> : null}<div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Create Key Activity</CardTitle><CardDescription className="text-slate-300">POST /workspaces/:workspaceId/value-streams/:valueStreamId/key-activities</CardDescription></CardHeader><CardContent><form className="grid gap-5" onSubmit={saveActivity}><Field id="value-stream" label="Value Stream"><select id="value-stream" value={form.valueStreamId} onChange={(event) => updateField('valueStreamId', event.target.value)} disabled={valueStreams.length === 0} className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-50">{valueStreams.map((stream) => { const architecture = architectures.find((item) => item.id === stream.businessArchitectureId); return <option key={stream.id} value={stream.id}>{architecture?.name ? `${architecture.name} / ` : ''}{stream.name}</option>; })}</select></Field>{selectedStream && <PrototypeNotice>{selectedStreamActivities.length} / {keyActivityLimit} key activities for selected value stream.</PrototypeNotice>}<div className="grid gap-5 md:grid-cols-[1fr_140px_160px]"><Field id="activity-name" label="Activity Name"><Input id="activity-name" value={form.activityName} onChange={(event) => updateField('activityName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="sequence-order" label="Sequence Order"><Input id="sequence-order" type="number" min="1" value={form.sequenceOrder} onChange={(event) => updateField('sequenceOrder', Number(event.target.value))} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="activity-status" label="Status"><Input id="activity-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="activity-description" label="Activity Description"><Textarea id="activity-description" value={form.activityDescription} onChange={(event) => updateField('activityDescription', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="grid gap-5 md:grid-cols-2"><Field id="current-state-issue" label="Current State Issue"><Textarea id="current-state-issue" value={form.currentStateIssue} onChange={(event) => updateField('currentStateIssue', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="future-state-change" label="Future State Change"><Textarea id="future-state-change" value={form.futureStateChange} onChange={(event) => updateField('futureStateChange', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="business-impact" label="Business Impact"><Textarea id="business-impact" value={form.businessImpact} onChange={(event) => updateField('businessImpact', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button><Button type="submit" disabled={valueStreams.length === 0} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50"><Save className="mr-2 h-4 w-4" />{editingId ? 'Update Key Activity' : 'Save Key Activity'}</Button></div></form></CardContent></Card><div className="space-y-5"><Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Value Stream Activity Counts</CardTitle><CardDescription className="text-slate-300">6 key activities per value stream.</CardDescription></CardHeader><CardContent className="space-y-3">{valueStreams.map((stream) => <div key={stream.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex items-center justify-between gap-3"><div className="font-medium text-slate-100">{stream.name}</div><Badge className="rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{activitiesByValueStream[stream.id] || 0} / {keyActivityLimit}</Badge></div></div>)}</CardContent></Card><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Saved Key Activities</CardTitle><CardDescription className="text-slate-300">{keyActivities.length} total</CardDescription></CardHeader><CardContent className="space-y-4">{keyActivities.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No key activities captured yet.</div> : keyActivities.sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((activity) => { const stream = valueStreams.find((candidate) => candidate.id === activity.valueStreamId); return <div key={activity.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{activity.sequenceOrder}. {activity.activityName}</h3><StatusBadge status={activity.status} /></div><p className="mt-2 text-sm text-slate-300">{stream?.name || activity.valueStreamId}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editActivity(activity)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button><Button type="button" variant="outline" onClick={() => deleteActivity(activity.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>; })}</CardContent></Card></div></div></section>
    </PrototypeShell>
  );
}

export default function PrototypeRoutesArchitectureTree() {
  const [route, setRoute] = useState(() => getRoute());
  useEffect(() => { const handleHashChange = () => setRoute(getRoute()); window.addEventListener('hashchange', handleHashChange); return () => window.removeEventListener('hashchange', handleHashChange); }, []);
  if (route === '/business-architecture') return <BusinessArchitectureScreen />;
  if (route === '/key-activities') return <KeyActivitiesScreen />;
  return <BasePrototypeRoutes />;
}
