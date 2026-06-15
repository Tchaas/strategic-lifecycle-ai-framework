import PrototypeRoutesAuthGuard from './PrototypeRoutesAuthGuard';

const authStorageKey = 'slaf.prototype.authSession';
const usersStorageKey = 'slaf.prototype.users';
const scopedStorageKeys = new Set([
  'slaf.prototype.workspace',
  'slaf.prototype.businessArchitecture',
  'slaf.prototype.valueStreams',
  'slaf.prototype.strategicObjectives',
]);

type AuthSession = {
  email?: string;
};

type PrototypeUser = {
  email: string;
};

type ScopedStorage = Storage & {
  __slafScopedPatchApplied?: boolean;
  __slafOriginalGetItem?: Storage['getItem'];
  __slafOriginalSetItem?: Storage['setItem'];
  __slafOriginalRemoveItem?: Storage['removeItem'];
};

const parseJson = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const encodeScope = (email: string) => encodeURIComponent(email.trim().toLowerCase());

const getScopedKey = (key: string, email: string) => `slaf.prototype.account.${encodeScope(email)}.${key.replace('slaf.prototype.', '')}`;

const getActiveRegisteredEmail = (storage: ScopedStorage) => {
  const originalGetItem = storage.__slafOriginalGetItem || storage.getItem.bind(storage);
  const session = parseJson<AuthSession>(originalGetItem.call(storage, authStorageKey));
  if (!session?.email) return null;

  const users = parseJson<PrototypeUser[]>(originalGetItem.call(storage, usersStorageKey));
  if (!Array.isArray(users)) return null;

  const normalizedEmail = session.email.trim().toLowerCase();
  return users.some((user) => user.email?.trim().toLowerCase() === normalizedEmail) ? normalizedEmail : null;
};

const applyScopedStoragePatch = () => {
  if (typeof window === 'undefined') return;

  const storage = window.localStorage as ScopedStorage;
  if (storage.__slafScopedPatchApplied) return;

  const originalGetItem = storage.getItem.bind(storage);
  const originalSetItem = storage.setItem.bind(storage);
  const originalRemoveItem = storage.removeItem.bind(storage);

  storage.__slafOriginalGetItem = originalGetItem;
  storage.__slafOriginalSetItem = originalSetItem;
  storage.__slafOriginalRemoveItem = originalRemoveItem;

  storage.getItem = (key: string) => {
    if (!scopedStorageKeys.has(key)) return originalGetItem(key);
    const email = getActiveRegisteredEmail(storage);
    if (!email) return null;
    return originalGetItem(getScopedKey(key, email));
  };

  storage.setItem = (key: string, value: string) => {
    if (!scopedStorageKeys.has(key)) {
      originalSetItem(key, value);
      return;
    }

    const email = getActiveRegisteredEmail(storage);
    if (!email) return;
    originalSetItem(getScopedKey(key, email), value);
  };

  storage.removeItem = (key: string) => {
    if (!scopedStorageKeys.has(key)) {
      originalRemoveItem(key);
      return;
    }

    const email = getActiveRegisteredEmail(storage);
    if (email) originalRemoveItem(getScopedKey(key, email));
    originalRemoveItem(key);
  };

  storage.__slafScopedPatchApplied = true;
};

export default function PrototypeRoutesScopedStorage() {
  applyScopedStoragePatch();
  return <PrototypeRoutesAuthGuard />;
}
