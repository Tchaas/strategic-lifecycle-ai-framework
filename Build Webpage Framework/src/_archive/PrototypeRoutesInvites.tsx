import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, LayoutDashboard, LogOut, Mail, Plus, UserCheck, Users } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesValueStreams';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

type AuthSession = {
  email: string;
  provider: 'email' | 'google';
  signedInAt: string;
};

type Workspace = {
  id: string;
  companyName: string;
  name?: string;
  defaultAdminEmail?: string;
};

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
const invitesStorageKey = 'slaf.prototype.invites';
const inviteLimit = 5;
const inviteDurationMs = 5 * 24 * 60 * 60 * 1000;

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

const normalizeInvite = (invite: Partial<WorkspaceInvite>): WorkspaceInvite => {
  const now = new Date().toISOString();
  const status = invite.status || 'pending';
  const expiresAt = invite.expiresAt || new Date(Date.now() + inviteDurationMs).toISOString();
  return {
    id: invite.id || createId('invite'),
    token: invite.token || createId('token'),
    workspaceId: invite.workspaceId || '',
    invitedEmail: invite.invitedEmail || '',
    status: status === 'pending' && new Date(expiresAt).getTime() < Date.now() ? 'Expired' : status,
    expiresAt,
    createdAt: invite.createdAt || now,
    acceptedAt: invite.acceptedAt,
  };
};

const loadInvites = (workspaceId?: string): WorkspaceInvite[] => {
  if (!workspaceId) return [];
  try {
    const raw = localStorage.getItem(invitesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<WorkspaceInvite>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeInvite).filter((invite) => invite.workspaceId === workspaceId);
  } catch {
    return [];
  }
};

const persistInvites = (invites: WorkspaceInvite[]) => {
  localStorage.setItem(invitesStorageKey, JSON.stringify(invites));
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
      Frontend-only prototype: invites are stored in browser local storage and model POST /workspaces/:workspaceId/invites, GET /workspaces/:workspaceId/invites, and POST /invites/:token/accept. No email is sent yet.
    </div>
  );
}

function InviteStatusBadge({ status }: { status: InviteStatus }) {
  const className = status === 'Active'
    ? 'bg-lime-500 text-black hover:bg-lime-400'
    : status === 'Expired'
      ? 'bg-red-500 text-white hover:bg-red-400'
      : 'bg-yellow-400 text-black hover:bg-yellow-300';
  return <Badge className={`rounded-sm ${className}`}>{status}</Badge>;
}

function InviteShell({ session, workspace, children }: { session: AuthSession | null; workspace: Workspace | null; children: ReactNode }) {
  const signOut = () => {
    localStorage.removeItem(authStorageKey);
    navigateTo('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-cyan-500/40 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="retro-heading text-sm text-cyan-300">Strategic Lifecycle Prototype</div>
            <p className="text-sm text-slate-300">Sign-in / Invites</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Button variant="ghost" className="rounded-sm text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100" onClick={() => navigateTo('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project Site
            </Button>
            <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            {workspace && <Button variant="ghost" className="rounded-sm text-slate-200 hover:bg-slate-800 hover:text-white" onClick={() => navigateTo('/business-architecture')}>Business Architecture</Button>}
            {session && <Button variant="outline" className="rounded-sm border-fuchsia-500 bg-slate-950 text-fuchsia-200 hover:bg-fuchsia-500 hover:text-white" onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function InvitesScreen() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuthSession());
  const [workspace, setWorkspace] = useState<Workspace | null>(() => loadWorkspace());
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [invites, setInvites] = useState<WorkspaceInvite[]>(() => loadInvites(loadWorkspace()?.id));

  useEffect(() => {
    const reload = () => {
      const nextSession = loadAuthSession();
      const nextWorkspace = loadWorkspace();
      setSession(nextSession);
      setWorkspace(nextWorkspace);
      setInvites(loadInvites(nextWorkspace?.id));
    };
    window.addEventListener('storage', reload);
    return () => window.removeEventListener('storage', reload);
  }, []);

  const normalizedInvites = useMemo(() => invites.map(normalizeInvite), [invites]);
  const activeWorkspaceName = workspace?.companyName || workspace?.name || 'Workspace';
  const hasReachedLimit = normalizedInvites.length >= inviteLimit;

  const saveInvites = (nextInvites: WorkspaceInvite[]) => {
    persistInvites(nextInvites);
    setInvites(nextInvites);
  };

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!workspace?.id) {
      setError('Create a workspace before inviting users.');
      return;
    }

    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail) {
      setError('Invite email is required.');
      return;
    }

    if (hasReachedLimit) {
      setError('Prototype invite limit reached. You can invite up to five users.');
      return;
    }

    if (normalizedInvites.some((invite) => invite.invitedEmail.toLowerCase() === invitedEmail)) {
      setError('This email already has an invite for the workspace.');
      return;
    }

    const now = new Date();
    const invite: WorkspaceInvite = {
      id: createId('invite'),
      token: createId('token'),
      workspaceId: workspace.id,
      invitedEmail,
      status: 'pending',
      expiresAt: new Date(now.getTime() + inviteDurationMs).toISOString(),
      createdAt: now.toISOString(),
    };

    saveInvites([...normalizedInvites, invite]);
    setEmail('');
  };

  const acceptInvite = (token: string) => {
    const now = new Date().toISOString();
    saveInvites(normalizedInvites.map((invite) => {
      if (invite.token !== token || invite.status !== 'pending') return invite;
      return { ...invite, status: 'Active', acceptedAt: now };
    }));
  };

  const pendingCount = normalizedInvites.filter((invite) => invite.status === 'pending').length;
  const activeCount = normalizedInvites.filter((invite) => invite.status === 'Active').length;
  const expiredCount = normalizedInvites.filter((invite) => invite.status === 'Expired').length;

  if (!session) {
    navigateTo('/login');
    return null;
  }

  return (
    <InviteShell session={session} workspace={workspace}>
      <section className="space-y-8">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <Badge className="w-fit rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Sign-in / Invites</Badge>
              <CardTitle className="retro-heading pt-3 text-2xl text-cyan-300">Workspace User Invites</CardTitle>
              <CardDescription className="text-slate-300">
                Invite up to five prototype users. Invited users follow the sign-up flow and are assigned to the invited workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <PrototypeNotice />
              <form className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={submitInvite}>
                <Field id="invite-email" label="Invite Email">
                  <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
                <Button type="submit" disabled={hasReachedLimit || !workspace} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              </form>
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
              {hasReachedLimit && <div className="rounded-md border border-yellow-400/50 bg-yellow-400/10 p-4 text-sm text-yellow-100">Prototype limit reached: five invited users for this workspace.</div>}
            </CardContent>
          </Card>

          <Card className="rounded-md border-fuchsia-500/50 bg-slate-900 text-slate-100">
            <CardHeader>
              <CardTitle className="retro-heading text-fuchsia-300">Invite Summary</CardTitle>
              <CardDescription className="text-slate-300">{activeWorkspaceName}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Pending</div><div className="text-2xl font-semibold text-yellow-300">{pendingCount}</div></div>
              <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Active</div><div className="text-2xl font-semibold text-lime-300">{activeCount}</div></div>
              <div className="rounded-md border border-slate-700 bg-slate-950 p-4"><div className="text-xs uppercase text-slate-500">Expired</div><div className="text-2xl font-semibold text-red-300">{expiredCount}</div></div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="retro-heading text-cyan-300">Invitees</CardTitle>
                <CardDescription className="text-slate-300">GET /workspaces/:workspaceId/invites</CardDescription>
              </div>
              <Badge className="w-fit rounded-sm bg-slate-800 text-slate-200 hover:bg-slate-800">{normalizedInvites.length} / {inviteLimit}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {normalizedInvites.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-600 bg-slate-950 p-5 text-sm text-slate-300">No invitees yet.</div>
            ) : (
              <div className="grid gap-4">
                {normalizedInvites.map((invite) => (
                  <div key={invite.id} className="rounded-md border border-slate-700 bg-slate-950 p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Mail className="h-4 w-4 text-cyan-300" />
                          <h3 className="font-semibold text-slate-100">{invite.invitedEmail}</h3>
                          <InviteStatusBadge status={invite.status} />
                        </div>
                        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                          <div><dt className="text-xs uppercase text-slate-500">Invite ID</dt><dd className="text-slate-100">{invite.id}</dd></div>
                          <div><dt className="text-xs uppercase text-slate-500">Workspace ID</dt><dd className="text-slate-100">{invite.workspaceId}</dd></div>
                          <div><dt className="text-xs uppercase text-slate-500">Expires At</dt><dd className="text-slate-100">{new Date(invite.expiresAt).toLocaleString()}</dd></div>
                          <div><dt className="text-xs uppercase text-slate-500">Token</dt><dd className="text-slate-100">{invite.token}</dd></div>
                        </dl>
                      </div>
                      <Button type="button" disabled={invite.status !== 'pending'} onClick={() => acceptInvite(invite.token)} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400 disabled:opacity-50">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Accept Invite
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </InviteShell>
  );
}

function InviteShortcut() {
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

  if (!session || !workspace || route === '/' || route === '/invites') return null;

  return (
    <Button onClick={() => navigateTo('/invites')} className="fixed bottom-5 right-5 z-[70] rounded-sm border border-cyan-400 bg-slate-950 text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.25)] hover:bg-cyan-500 hover:text-black">
      <Users className="mr-2 h-4 w-4" />
      Sign-in / Invites
    </Button>
  );
}

export default function PrototypeRoutesInvites() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '/invites') {
    return <InvitesScreen />;
  }

  return (
    <>
      <BasePrototypeRoutes />
      <InviteShortcut />
    </>
  );
}
