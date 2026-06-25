import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, LayoutDashboard, LogOut, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesArchitectureTree';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';

type AuthSession = { email: string; provider: string; signedInAt: string };
type Workspace = { id: string; companyName?: string; name?: string };
type BusinessArchitecture = { id: string; workspaceId: string; name: string; strategicObjectiveId?: string; status?: string };
type ValueStream = { id: string; workspaceId: string; businessArchitectureId: string; name: string; status?: string };
type KeyActivity = { id: string; workspaceId: string; valueStreamId: string; activityName: string; status?: string };

type BusinessCapability = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  capabilityName: string;
  capabilityDescription: string;
  currentMaturity: string;
  targetMaturity: string;
  capabilityGap: string;
  linkedValueStreamIds: string[];
  linkedKeyActivityIds: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type BusinessImpact = {
  id: string;
  workspaceId: string;
  businessArchitectureId: string;
  impactedArea: string;
  impactDescription: string;
  impactType: string;
  severity: string;
  linkedValueStreamIds: string[];
  linkedKeyActivityIds: string[];
  linkedCapabilityIds: string[];
  linkedProcesses: string;
  linkedTeams: string;
  linkedSystems: string;
  linkedDataConcepts: string;
  mitigationNotes: string;
  expectedValue: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CapabilityForm = Omit<BusinessCapability, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;
type ImpactForm = Omit<BusinessImpact, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>;

const authStorageKey = 'slaf.prototype.authSession';
const workspaceStorageKey = 'slaf.prototype.workspace';
const businessArchitectureStorageKey = 'slaf.prototype.businessArchitecture';
const valueStreamsStorageKey = 'slaf.prototype.valueStreams';
const keyActivitiesStorageKey = 'slaf.prototype.keyActivities';
const capabilitiesStorageKey = 'slaf.prototype.businessCapabilities';
const impactsStorageKey = 'slaf.prototype.businessImpacts';

const emptyCapabilityForm: CapabilityForm = {
  businessArchitectureId: '',
  capabilityName: '',
  capabilityDescription: '',
  currentMaturity: 'ad_hoc',
  targetMaturity: 'managed',
  capabilityGap: '',
  linkedValueStreamIds: [],
  linkedKeyActivityIds: [],
  status: 'draft',
};

const emptyImpactForm: ImpactForm = {
  businessArchitectureId: '',
  impactedArea: '',
  impactDescription: '',
  impactType: 'process',
  severity: 'medium',
  linkedValueStreamIds: [],
  linkedKeyActivityIds: [],
  linkedCapabilityIds: [],
  linkedProcesses: '',
  linkedTeams: '',
  linkedSystems: '',
  linkedDataConcepts: '',
  mitigationNotes: '',
  expectedValue: '',
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

const normalizeArchitecture = (item: Partial<BusinessArchitecture>, workspaceId: string): BusinessArchitecture => ({
  id: item.id || createId('business-architecture'),
  workspaceId: item.workspaceId || workspaceId,
  name: item.name || 'Untitled Business Architecture',
  strategicObjectiveId: item.strategicObjectiveId,
  status: item.status || 'draft',
});

const loadArchitectures = (workspaceId?: string): BusinessArchitecture[] => {
  if (!workspaceId) return [];
  const raw = loadJson<Partial<BusinessArchitecture>[] | Partial<BusinessArchitecture> | null>(businessArchitectureStorageKey, []);
  const records = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return records.map((item) => normalizeArchitecture(item, workspaceId)).filter((item) => item.workspaceId === workspaceId);
};

const loadValueStreams = (workspaceId?: string): ValueStream[] => {
  if (!workspaceId) return [];
  return loadJson<Partial<ValueStream>[]>(valueStreamsStorageKey, [])
    .filter((stream) => stream.workspaceId === workspaceId && !!stream.id)
    .map((stream) => ({ id: stream.id || '', workspaceId, businessArchitectureId: stream.businessArchitectureId || '', name: stream.name || 'Untitled Value Stream', status: stream.status || 'draft' }));
};

const loadKeyActivities = (workspaceId?: string): KeyActivity[] => {
  if (!workspaceId) return [];
  return loadJson<Partial<KeyActivity>[]>(keyActivitiesStorageKey, [])
    .filter((activity) => activity.workspaceId === workspaceId && !!activity.id)
    .map((activity) => ({ id: activity.id || '', workspaceId, valueStreamId: activity.valueStreamId || '', activityName: activity.activityName || 'Untitled Key Activity', status: activity.status || 'draft' }));
};

const loadCapabilities = (workspaceId?: string): BusinessCapability[] => {
  if (!workspaceId) return [];
  return loadJson<Partial<BusinessCapability>[]>(capabilitiesStorageKey, [])
    .filter((capability) => capability.workspaceId === workspaceId && !!capability.id)
    .map((capability) => ({
      id: capability.id || '',
      workspaceId,
      businessArchitectureId: capability.businessArchitectureId || '',
      capabilityName: capability.capabilityName || '',
      capabilityDescription: capability.capabilityDescription || '',
      currentMaturity: capability.currentMaturity || 'ad_hoc',
      targetMaturity: capability.targetMaturity || 'managed',
      capabilityGap: capability.capabilityGap || '',
      linkedValueStreamIds: capability.linkedValueStreamIds || [],
      linkedKeyActivityIds: capability.linkedKeyActivityIds || [],
      status: capability.status || 'draft',
      createdAt: capability.createdAt || new Date().toISOString(),
      updatedAt: capability.updatedAt || new Date().toISOString(),
    }));
};

const loadImpacts = (workspaceId?: string): BusinessImpact[] => {
  if (!workspaceId) return [];
  return loadJson<Partial<BusinessImpact>[]>(impactsStorageKey, [])
    .filter((impact) => impact.workspaceId === workspaceId && !!impact.id)
    .map((impact) => ({
      id: impact.id || '',
      workspaceId,
      businessArchitectureId: impact.businessArchitectureId || '',
      impactedArea: impact.impactedArea || '',
      impactDescription: impact.impactDescription || '',
      impactType: impact.impactType || 'process',
      severity: impact.severity || 'medium',
      linkedValueStreamIds: impact.linkedValueStreamIds || [],
      linkedKeyActivityIds: impact.linkedKeyActivityIds || [],
      linkedCapabilityIds: impact.linkedCapabilityIds || [],
      linkedProcesses: impact.linkedProcesses || '',
      linkedTeams: impact.linkedTeams || '',
      linkedSystems: impact.linkedSystems || '',
      linkedDataConcepts: impact.linkedDataConcepts || '',
      mitigationNotes: impact.mitigationNotes || '',
      expectedValue: impact.expectedValue || '',
      status: impact.status || 'draft',
      createdAt: impact.createdAt || new Date().toISOString(),
      updatedAt: impact.updatedAt || new Date().toISOString(),
    }));
};

const persistWorkspaceRecords = <T extends { workspaceId: string }>(key: string, workspaceId: string, records: T[]) => {
  const otherRecords = loadJson<T[]>(key, []).filter((record) => record.workspaceId !== workspaceId);
  saveJson(key, [...otherRecords, ...records]);
};

const toggleId = (current: string[], id: string) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id];

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const className = status.toLowerCase() === 'active' ? 'bg-lime-500 text-black hover:bg-lime-400' : 'bg-cyan-500 text-black hover:bg-cyan-400';
  return <Badge className={`rounded-sm ${className}`}>{status || 'draft'}</Badge>;
}

function PrototypeShell({ session, workspace, children }: { session: AuthSession | null; workspace: Workspace | null; children: ReactNode }) {
  const signOut = () => { localStorage.removeItem(authStorageKey); navigateTo('/login'); };
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div><p className="text-sm text-slate-300">{getWorkspaceName(workspace)}</p></div>
          <nav className="flex flex-wrap items-center gap-2 text-sm"><Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}><ArrowLeft className="mr-2 h-4 w-4" />Back to Project Site</Button>{session && <><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/key-activities')}>Key Activities</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-capabilities')}>Capabilities</Button><Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-impacts')}>Impacts</Button><Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button></>}</nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function LinkSelector({ title, items, selectedIds, onToggle }: { title: string; items: { id: string; label: string }[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-950 p-4">
      <div className="mb-3 text-sm font-medium text-slate-200">{title}</div>
      {items.length === 0 ? <div className="text-sm text-slate-500">No records available.</div> : <div className="grid gap-2">{items.map((item) => <label key={item.id} className="flex items-start gap-3 rounded-sm border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} className="mt-1" /><span>{item.label}</span></label>)}</div>}
    </div>
  );
}

function RequireArchitecture({ session, workspace }: { session: AuthSession | null; workspace: Workspace | null }) {
  return <PrototypeShell session={session} workspace={workspace}><section className="mx-auto max-w-3xl"><Card className="rounded-md border-yellow-400/60 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-yellow-300">Business Architecture Required</CardTitle><CardDescription className="text-slate-300">Create at least one Business Architecture / Organization Structure before defining capabilities or impacts.</CardDescription></CardHeader><CardContent><Button onClick={() => navigateTo('/business-architecture')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Go to Business Architecture</Button></CardContent></Card></section></PrototypeShell>;
}

function CapabilityScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [architectures, setArchitectures] = useState<BusinessArchitecture[]>(() => loadArchitectures(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState<ValueStream[]>(() => loadValueStreams(loadWorkspace()?.id));
  const [keyActivities, setKeyActivities] = useState<KeyActivity[]>(() => loadKeyActivities(loadWorkspace()?.id));
  const [capabilities, setCapabilities] = useState<BusinessCapability[]>(() => loadCapabilities(loadWorkspace()?.id));
  const [form, setForm] = useState<CapabilityForm>(emptyCapabilityForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reload = () => {
    const nextWorkspace = loadWorkspace();
    setSession(loadAuthSession());
    setWorkspace(nextWorkspace);
    setArchitectures(loadArchitectures(nextWorkspace?.id));
    setValueStreams(loadValueStreams(nextWorkspace?.id));
    setKeyActivities(loadKeyActivities(nextWorkspace?.id));
    setCapabilities(loadCapabilities(nextWorkspace?.id));
  };

  useEffect(() => { window.addEventListener('storage', reload); return () => window.removeEventListener('storage', reload); }, []);
  useEffect(() => { if (!form.businessArchitectureId && architectures[0]?.id) setForm((current) => ({ ...current, businessArchitectureId: architectures[0].id })); }, [architectures, form.businessArchitectureId]);

  const selectedArchitectureStreams = valueStreams.filter((stream) => stream.businessArchitectureId === form.businessArchitectureId);
  const selectedStreamIds = new Set(selectedArchitectureStreams.map((stream) => stream.id));
  const availableActivities = keyActivities.filter((activity) => selectedStreamIds.has(activity.valueStreamId));
  const filteredCapabilities = capabilities.filter((capability) => capability.businessArchitectureId === form.businessArchitectureId);
  const activityLabel = (activity: KeyActivity) => `${valueStreams.find((stream) => stream.id === activity.valueStreamId)?.name || 'Value Stream'} / ${activity.activityName}`;

  const updateField = (field: keyof CapabilityForm, value: string | string[]) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => { setForm({ ...emptyCapabilityForm, businessArchitectureId: architectures[0]?.id || '' }); setEditingId(null); setError(''); };

  const saveCapability = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving capabilities.'); return; }
    if (!form.businessArchitectureId) { setError('Select a Business Architecture structure.'); return; }
    if (!form.capabilityName.trim()) { setError('Capability Name is required.'); return; }
    const now = new Date().toISOString();
    const existing = editingId ? capabilities.find((capability) => capability.id === editingId) : undefined;
    const nextCapability: BusinessCapability = { ...form, id: existing?.id || createId('cap'), workspaceId: workspace.id, capabilityName: form.capabilityName.trim(), createdAt: existing?.createdAt || now, updatedAt: now };
    const nextCapabilities = existing ? capabilities.map((capability) => capability.id === existing.id ? nextCapability : capability) : [...capabilities, nextCapability];
    persistWorkspaceRecords(capabilitiesStorageKey, workspace.id, nextCapabilities);
    setCapabilities(nextCapabilities);
    resetForm();
  };

  const editCapability = (capability: BusinessCapability) => { setEditingId(capability.id); setForm({ businessArchitectureId: capability.businessArchitectureId, capabilityName: capability.capabilityName, capabilityDescription: capability.capabilityDescription, currentMaturity: capability.currentMaturity, targetMaturity: capability.targetMaturity, capabilityGap: capability.capabilityGap, linkedValueStreamIds: capability.linkedValueStreamIds, linkedKeyActivityIds: capability.linkedKeyActivityIds, status: capability.status }); setError(''); };
  const deleteCapability = (capabilityId: string) => { if (!workspace?.id) return; const nextCapabilities = capabilities.filter((capability) => capability.id !== capabilityId); persistWorkspaceRecords(capabilitiesStorageKey, workspace.id, nextCapabilities); setCapabilities(nextCapabilities); if (editingId === capabilityId) resetForm(); };

  if (!session) { navigateTo('/login'); return null; }
  if (architectures.length === 0) return <RequireArchitecture session={session} workspace={workspace} />;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Business Architecture analysis</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Business Capabilities</h1><p className="mt-3 max-w-3xl text-slate-300">Link capabilities to a Business Architecture structure, supporting Value Streams, and related Key Activities.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button></div>{error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}<div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Create Business Capability</CardTitle><CardDescription className="text-slate-300">POST /workspaces/:workspaceId/business-architecture/:businessArchitectureId/capabilities</CardDescription></CardHeader><CardContent><form className="grid gap-5" onSubmit={saveCapability}><Field id="capability-architecture" label="Business Architecture Structure"><select id="capability-architecture" value={form.businessArchitectureId} onChange={(event) => updateField('businessArchitectureId', event.target.value)} className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">{architectures.map((architecture) => <option key={architecture.id} value={architecture.id}>{architecture.name}</option>)}</select></Field><div className="grid gap-5 md:grid-cols-[1fr_150px_150px_140px]"><Field id="capability-name" label="Capability Name"><Input id="capability-name" value={form.capabilityName} onChange={(event) => updateField('capabilityName', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="current-maturity" label="Current Maturity"><Input id="current-maturity" value={form.currentMaturity} onChange={(event) => updateField('currentMaturity', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="target-maturity" label="Target Maturity"><Input id="target-maturity" value={form.targetMaturity} onChange={(event) => updateField('targetMaturity', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="capability-status" label="Status"><Input id="capability-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="capability-description" label="Capability Description"><Textarea id="capability-description" value={form.capabilityDescription} onChange={(event) => updateField('capabilityDescription', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="capability-gap" label="Capability Gap"><Textarea id="capability-gap" value={form.capabilityGap} onChange={(event) => updateField('capabilityGap', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="grid gap-5 md:grid-cols-2"><LinkSelector title="Linked Value Streams" items={selectedArchitectureStreams.map((stream) => ({ id: stream.id, label: stream.name }))} selectedIds={form.linkedValueStreamIds} onToggle={(id) => updateField('linkedValueStreamIds', toggleId(form.linkedValueStreamIds, id))} /><LinkSelector title="Linked Key Activities" items={availableActivities.map((activity) => ({ id: activity.id, label: activityLabel(activity) }))} selectedIds={form.linkedKeyActivityIds} onToggle={(id) => updateField('linkedKeyActivityIds', toggleId(form.linkedKeyActivityIds, id))} /></div><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />{editingId ? 'Update Capability' : 'Save Capability'}</Button></div></form></CardContent></Card><Card className="rounded-md border-lime-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-lime-300">Saved Capabilities</CardTitle><CardDescription className="text-slate-300">{filteredCapabilities.length} for selected structure</CardDescription></CardHeader><CardContent className="space-y-4">{filteredCapabilities.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No capabilities captured for this structure.</div> : filteredCapabilities.map((capability) => <div key={capability.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{capability.capabilityName}</h3><StatusBadge status={capability.status} /></div><p className="mt-2 text-sm text-slate-300">{capability.capabilityGap || capability.capabilityDescription || 'No capability notes entered.'}</p><div className="mt-3 text-xs text-slate-500">{capability.linkedValueStreamIds.length} value streams, {capability.linkedKeyActivityIds.length} key activities</div></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editCapability(capability)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button><Button type="button" variant="outline" onClick={() => deleteCapability(capability.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</CardContent></Card></div></section>
    </PrototypeShell>
  );
}

function ImpactScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [architectures, setArchitectures] = useState<BusinessArchitecture[]>(() => loadArchitectures(loadWorkspace()?.id));
  const [valueStreams, setValueStreams] = useState<ValueStream[]>(() => loadValueStreams(loadWorkspace()?.id));
  const [keyActivities, setKeyActivities] = useState<KeyActivity[]>(() => loadKeyActivities(loadWorkspace()?.id));
  const [capabilities, setCapabilities] = useState<BusinessCapability[]>(() => loadCapabilities(loadWorkspace()?.id));
  const [impacts, setImpacts] = useState<BusinessImpact[]>(() => loadImpacts(loadWorkspace()?.id));
  const [form, setForm] = useState<ImpactForm>(emptyImpactForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const reload = () => {
    const nextWorkspace = loadWorkspace();
    setSession(loadAuthSession());
    setWorkspace(nextWorkspace);
    setArchitectures(loadArchitectures(nextWorkspace?.id));
    setValueStreams(loadValueStreams(nextWorkspace?.id));
    setKeyActivities(loadKeyActivities(nextWorkspace?.id));
    setCapabilities(loadCapabilities(nextWorkspace?.id));
    setImpacts(loadImpacts(nextWorkspace?.id));
  };

  useEffect(() => { window.addEventListener('storage', reload); return () => window.removeEventListener('storage', reload); }, []);
  useEffect(() => { if (!form.businessArchitectureId && architectures[0]?.id) setForm((current) => ({ ...current, businessArchitectureId: architectures[0].id })); }, [architectures, form.businessArchitectureId]);

  const selectedArchitectureStreams = valueStreams.filter((stream) => stream.businessArchitectureId === form.businessArchitectureId);
  const selectedStreamIds = new Set(selectedArchitectureStreams.map((stream) => stream.id));
  const availableActivities = keyActivities.filter((activity) => selectedStreamIds.has(activity.valueStreamId));
  const availableCapabilities = capabilities.filter((capability) => capability.businessArchitectureId === form.businessArchitectureId);
  const filteredImpacts = impacts.filter((impact) => impact.businessArchitectureId === form.businessArchitectureId);
  const activityLabel = (activity: KeyActivity) => `${valueStreams.find((stream) => stream.id === activity.valueStreamId)?.name || 'Value Stream'} / ${activity.activityName}`;
  const updateField = (field: keyof ImpactForm, value: string | string[]) => setForm((current) => ({ ...current, [field]: value }));
  const resetForm = () => { setForm({ ...emptyImpactForm, businessArchitectureId: architectures[0]?.id || '' }); setEditingId(null); setError(''); };

  const saveImpact = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!workspace?.id) { setError('Create a workspace before saving business impacts.'); return; }
    if (!form.businessArchitectureId) { setError('Select a Business Architecture structure.'); return; }
    if (!form.impactedArea.trim()) { setError('Impacted Area is required.'); return; }
    const now = new Date().toISOString();
    const existing = editingId ? impacts.find((impact) => impact.id === editingId) : undefined;
    const nextImpact: BusinessImpact = { ...form, id: existing?.id || createId('impact'), workspaceId: workspace.id, impactedArea: form.impactedArea.trim(), createdAt: existing?.createdAt || now, updatedAt: now };
    const nextImpacts = existing ? impacts.map((impact) => impact.id === existing.id ? nextImpact : impact) : [...impacts, nextImpact];
    persistWorkspaceRecords(impactsStorageKey, workspace.id, nextImpacts);
    setImpacts(nextImpacts);
    resetForm();
  };

  const editImpact = (impact: BusinessImpact) => { setEditingId(impact.id); setForm({ businessArchitectureId: impact.businessArchitectureId, impactedArea: impact.impactedArea, impactDescription: impact.impactDescription, impactType: impact.impactType, severity: impact.severity, linkedValueStreamIds: impact.linkedValueStreamIds, linkedKeyActivityIds: impact.linkedKeyActivityIds, linkedCapabilityIds: impact.linkedCapabilityIds, linkedProcesses: impact.linkedProcesses, linkedTeams: impact.linkedTeams, linkedSystems: impact.linkedSystems, linkedDataConcepts: impact.linkedDataConcepts, mitigationNotes: impact.mitigationNotes, expectedValue: impact.expectedValue, status: impact.status }); setError(''); };
  const deleteImpact = (impactId: string) => { if (!workspace?.id) return; const nextImpacts = impacts.filter((impact) => impact.id !== impactId); persistWorkspaceRecords(impactsStorageKey, workspace.id, nextImpacts); setImpacts(nextImpacts); if (editingId === impactId) resetForm(); };

  const summary = useMemo(() => ({ high: filteredImpacts.filter((impact) => impact.severity.toLowerCase() === 'high').length, total: filteredImpacts.length }), [filteredImpacts]);

  if (!session) { navigateTo('/login'); return null; }
  if (architectures.length === 0) return <RequireArchitecture session={session} workspace={workspace} />;

  return (
    <PrototypeShell session={session} workspace={workspace}>
      <section className="space-y-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Business Architecture analysis</Badge><h1 className="retro-heading mt-4 text-3xl text-cyan-300">Business Impacts</h1><p className="mt-3 max-w-3xl text-slate-300">Identify impacts from architecture analysis and link them to value streams, key activities, capabilities, processes, teams, systems, and data concepts.</p></div><Button variant="outline" onClick={() => navigateTo('/dashboard')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Dashboard</Button></div>{error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}<div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-cyan-300">Create Business Impact</CardTitle><CardDescription className="text-slate-300">POST /workspaces/:workspaceId/business-architecture/:businessArchitectureId/business-impacts</CardDescription></CardHeader><CardContent><form className="grid gap-5" onSubmit={saveImpact}><Field id="impact-architecture" label="Business Architecture Structure"><select id="impact-architecture" value={form.businessArchitectureId} onChange={(event) => updateField('businessArchitectureId', event.target.value)} className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100">{architectures.map((architecture) => <option key={architecture.id} value={architecture.id}>{architecture.name}</option>)}</select></Field><div className="grid gap-5 md:grid-cols-[1fr_150px_150px_140px]"><Field id="impacted-area" label="Impacted Area"><Input id="impacted-area" value={form.impactedArea} onChange={(event) => updateField('impactedArea', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="impact-type" label="Impact Type"><Input id="impact-type" value={form.impactType} onChange={(event) => updateField('impactType', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="severity" label="Severity"><Input id="severity" value={form.severity} onChange={(event) => updateField('severity', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="impact-status" label="Status"><Input id="impact-status" value={form.status} onChange={(event) => updateField('status', event.target.value)} className="border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="impact-description" label="Impact Description"><Textarea id="impact-description" value={form.impactDescription} onChange={(event) => updateField('impactDescription', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="grid gap-5 md:grid-cols-3"><LinkSelector title="Linked Value Streams" items={selectedArchitectureStreams.map((stream) => ({ id: stream.id, label: stream.name }))} selectedIds={form.linkedValueStreamIds} onToggle={(id) => updateField('linkedValueStreamIds', toggleId(form.linkedValueStreamIds, id))} /><LinkSelector title="Linked Key Activities" items={availableActivities.map((activity) => ({ id: activity.id, label: activityLabel(activity) }))} selectedIds={form.linkedKeyActivityIds} onToggle={(id) => updateField('linkedKeyActivityIds', toggleId(form.linkedKeyActivityIds, id))} /><LinkSelector title="Linked Capabilities" items={availableCapabilities.map((capability) => ({ id: capability.id, label: capability.capabilityName }))} selectedIds={form.linkedCapabilityIds} onToggle={(id) => updateField('linkedCapabilityIds', toggleId(form.linkedCapabilityIds, id))} /></div><div className="grid gap-5 md:grid-cols-2"><Field id="linked-processes" label="Processes"><Textarea id="linked-processes" value={form.linkedProcesses} onChange={(event) => updateField('linkedProcesses', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="linked-teams" label="Teams"><Textarea id="linked-teams" value={form.linkedTeams} onChange={(event) => updateField('linkedTeams', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="linked-systems" label="Systems"><Textarea id="linked-systems" value={form.linkedSystems} onChange={(event) => updateField('linkedSystems', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="linked-data" label="Data Concepts"><Textarea id="linked-data" value={form.linkedDataConcepts} onChange={(event) => updateField('linkedDataConcepts', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field></div><Field id="mitigation-notes" label="Mitigation Notes"><Textarea id="mitigation-notes" value={form.mitigationNotes} onChange={(event) => updateField('mitigationNotes', event.target.value)} className="min-h-24 border-slate-700 bg-slate-950 text-slate-100" /></Field><Field id="expected-value" label="Expected Value"><Textarea id="expected-value" value={form.expectedValue} onChange={(event) => updateField('expectedValue', event.target.value)} className="min-h-20 border-slate-700 bg-slate-950 text-slate-100" /></Field><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={resetForm} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Clear</Button><Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><Save className="mr-2 h-4 w-4" />{editingId ? 'Update Impact' : 'Save Impact'}</Button></div></form></CardContent></Card><Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100"><CardHeader><CardTitle className="retro-heading text-fuchsia-300">Saved Impacts</CardTitle><CardDescription className="text-slate-300">{summary.total} for selected structure, {summary.high} high severity</CardDescription></CardHeader><CardContent className="space-y-4">{filteredImpacts.length === 0 ? <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No impacts captured for this structure.</div> : filteredImpacts.map((impact) => <div key={impact.id} className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-100">{impact.impactedArea}</h3><StatusBadge status={impact.status} /><Badge className="rounded-sm bg-yellow-400 text-black hover:bg-yellow-300">{impact.severity}</Badge></div><p className="mt-2 text-sm text-slate-300">{impact.impactDescription || impact.expectedValue || 'No impact notes entered.'}</p><div className="mt-3 text-xs text-slate-500">{impact.linkedValueStreamIds.length} value streams, {impact.linkedKeyActivityIds.length} key activities, {impact.linkedCapabilityIds.length} capabilities</div></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editImpact(impact)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Edit</Button><Button type="button" variant="outline" onClick={() => deleteImpact(impact.id)} className="rounded-sm border-red-400 bg-slate-950 text-red-200 hover:bg-red-500 hover:text-white"><Trash2 className="h-4 w-4" /></Button></div></div></div>)}</CardContent></Card></div></section>
    </PrototypeShell>
  );
}

export default function PrototypeRoutesCapabilityImpact() {
  const [route, setRoute] = useState(() => getRoute());
  useEffect(() => { const handleHashChange = () => setRoute(getRoute()); window.addEventListener('hashchange', handleHashChange); return () => window.removeEventListener('hashchange', handleHashChange); }, []);
  if (route === '/business-capabilities') return <CapabilityScreen />;
  if (route === '/business-impacts') return <ImpactScreen />;
  return <BasePrototypeRoutes />;
}
