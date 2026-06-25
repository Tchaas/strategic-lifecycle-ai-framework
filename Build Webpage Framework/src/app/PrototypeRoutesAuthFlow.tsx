import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, LogIn, UserPlus } from 'lucide-react';
import BasePrototypeRoutes from './PrototypeRoutesIntegratedFlow';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';

type AuthSession = {
  email: string;
  provider: 'email';
  signedInAt: string;
};

type PrototypeUser = {
  email: string;
  password: string;
  createdAt: string;
};

type Workspace = {
  id: string;
  companyName?: string;
  name?: string;
};

type WorkspaceInvite = {
  id: string;
  token: string;
  workspaceId: string;
  invitedEmail: string;
  status: 'pending' | 'Active' | 'Expired';
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
};

const authStorageKey = 'slaf.prototype.authSession';
const usersStorageKey = 'slaf.prototype.users';
const workspaceStorageKey = 'slaf.prototype.workspace';
const invitesStorageKey = 'slaf.prototype.invites';

const getRoute = () => window.location.hash.replace(/^#/, '').split('?')[0] || '/';
const navigateTo = (route: string) => { window.location.hash = route; };

const loadWorkspace = (): Workspace | null => {
  try {
    const raw = localStorage.getItem(workspaceStorageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getWorkspaceName = (workspace: Workspace | null) => workspace?.companyName || workspace?.name || 'Workspace setup in progress';

const loadUsers = (): PrototypeUser[] => {
  try {
    const raw = localStorage.getItem(usersStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrototypeUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveUsers = (users: PrototypeUser[]) => {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
};

const loadInvites = (): WorkspaceInvite[] => {
  try {
    const raw = localStorage.getItem(invitesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkspaceInvite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveInvites = (invites: WorkspaceInvite[]) => {
  localStorage.setItem(invitesStorageKey, JSON.stringify(invites));
};

const createSession = (email: string): AuthSession => ({
  email,
  provider: 'email',
  signedInAt: new Date().toISOString(),
});

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-slate-200">{label}</Label>{children}</div>;
}

function PrototypeNotice() {
  return (
    <div className="rounded-md border border-cyan-500/40 bg-cyan-400/10 p-4 text-sm text-cyan-100">
      Frontend-only prototype: account records are stored in browser local storage for UI validation until backend authentication is connected.
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  const workspace = loadWorkspace();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
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
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const signInUser = (normalizedEmail: string) => {
    const session = createSession(normalizedEmail);
    localStorage.setItem(authStorageKey, JSON.stringify(session));
    navigateTo('/dashboard');
  };

  const activateInviteForEmail = (normalizedEmail: string) => {
    const now = new Date().toISOString();
    const invites = loadInvites();
    let changed = false;
    const nextInvites = invites.map((invite) => {
      const isExpired = new Date(invite.expiresAt).getTime() < Date.now();
      if (invite.invitedEmail.toLowerCase() !== normalizedEmail || invite.status !== 'pending') {
        return isExpired && invite.status === 'pending' ? { ...invite, status: 'Expired' as const } : invite;
      }
      changed = true;
      return { ...invite, status: 'Active' as const, acceptedAt: now };
    });
    if (changed) saveInvites(nextInvites);
  };

  const submitAuth = (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Email or password is incorrect.');
      return;
    }

    const users = loadUsers();

    if (mode === 'signup') {
      if (!confirmPassword || password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
        setError('Email or password is incorrect.');
        return;
      }
      saveUsers([...users, { email: normalizedEmail, password, createdAt: new Date().toISOString() }]);
      activateInviteForEmail(normalizedEmail);
      signInUser(normalizedEmail);
      return;
    }

    const existingUser = users.find((user) => user.email.toLowerCase() === normalizedEmail && user.password === password);
    if (!existingUser) {
      setError('Email or password is incorrect.');
      return;
    }

    activateInviteForEmail(normalizedEmail);
    signInUser(normalizedEmail);
  };

  return (
    <AuthShell>
      <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <div className="space-y-5">
          <Badge className="rounded-sm bg-cyan-500 text-black hover:bg-cyan-400">Frontend prototype</Badge>
          <h1 className="retro-heading text-3xl text-cyan-300 md:text-4xl">{mode === 'login' ? 'Sign In / Login' : 'Create Prototype Account'}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">Enter an email and password to access the company workspace and lifecycle prototype.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {['Email is required', 'Password is required', 'Sign-up confirms password twice', 'Dashboard requires a signed-in user'].map((item) => <div key={item} className="border border-cyan-500/30 bg-slate-900 p-3 text-sm text-slate-200">{item}</div>)}
          </div>
          <PrototypeNotice />
        </div>

        <Card className="rounded-md border-cyan-500/60 bg-slate-900 text-slate-100">
          <CardHeader>
            <CardTitle className="retro-heading text-cyan-300">{mode === 'login' ? 'Access Prototype' : 'Set Up Access'}</CardTitle>
            <CardDescription className="text-slate-300">No hardcoded user session is created. Required fields must be entered.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitAuth}>
              <Field id="email" label="Email">
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              <Field id="password" label="Password">
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              {mode === 'signup' && (
                <Field id="confirm-password" label="Confirm Password">
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter password" className="border-slate-700 bg-slate-950 text-slate-100" />
                </Field>
              )}
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
              <Button type="submit" className="w-full rounded-sm bg-lime-500 text-black hover:bg-lime-400">
                {mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" className="text-cyan-300 hover:text-cyan-100" onClick={() => navigateTo(mode === 'login' ? '/signup' : '/login')}>
                  {mode === 'login' ? 'Create Account / Sign Up' : 'Already have an account? Sign In'}
                </button>
                <button type="button" className="text-slate-400 hover:text-slate-200" onClick={() => navigateTo('/forgot-password')}>Forgot password?</button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </AuthShell>
  );
}

function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submitRecovery = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required to recover password.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <AuthShell>
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <Badge className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Password recovery</Badge>
          <h1 className="retro-heading mt-4 text-3xl text-cyan-300">Recover Password</h1>
          <p className="mt-3 text-slate-300">Enter the email address that would receive a reset link once backend auth is connected.</p>
        </div>
        <PrototypeNotice />
        <Card className="rounded-md border-cyan-500/50 bg-slate-900 text-slate-100">
          <CardContent className="pt-6">
            <form className="space-y-4" onSubmit={submitRecovery}>
              <Field id="recovery-email" label="Email">
                <Input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" className="border-slate-700 bg-slate-950 text-slate-100" />
              </Field>
              {error && <div className="rounded-md border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
              {submitted && <div className="rounded-md border border-lime-500/40 bg-lime-400/10 p-4 text-sm text-lime-100">Mock recovery submitted. A real reset email will be implemented when backend authentication is added.</div>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => navigateTo('/login')} className="rounded-sm bg-lime-500 text-black hover:bg-lime-400">Back to Sign In</Button>
                <Button type="submit" className="rounded-sm bg-lime-500 text-black hover:bg-lime-400"><KeyRound className="mr-2 h-4 w-4" />Send Recovery Link</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </AuthShell>
  );
}

export default function PrototypeRoutesAuthFlow() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '/login') return <AuthScreen mode="login" />;
  if (route === '/signup') return <AuthScreen mode="signup" />;
  if (route === '/forgot-password') return <ForgotPasswordScreen />;
  return <BasePrototypeRoutes />;
}
