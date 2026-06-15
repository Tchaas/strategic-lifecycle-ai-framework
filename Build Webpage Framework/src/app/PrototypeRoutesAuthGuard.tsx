import { useEffect, useState } from 'react';
import PrototypeRoutesEnterpriseAuthFlow from './PrototypeRoutesEnterpriseAuthFlow';

type AuthSession = {
  email: string;
  provider: string;
  signedInAt: string;
};

type PrototypeUser = {
  email: string;
  password: string;
  createdAt: string;
};

const authStorageKey = 'slaf.prototype.authSession';
const usersStorageKey = 'slaf.prototype.users';
const publicRoutes = ['/', '/login', '/signup', '/forgot-password'];

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

const hasRegisteredSession = () => {
  const session = loadAuthSession();
  if (!session?.email) return false;
  return loadUsers().some((user) => user.email.toLowerCase() === session.email.toLowerCase());
};

export default function PrototypeRoutesAuthGuard() {
  const [route, setRoute] = useState(() => getRoute());

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!publicRoutes.includes(route) && !hasRegisteredSession()) {
    localStorage.removeItem(authStorageKey);
    navigateTo('/login');
    return null;
  }

  return <PrototypeRoutesEnterpriseAuthFlow />;
}
