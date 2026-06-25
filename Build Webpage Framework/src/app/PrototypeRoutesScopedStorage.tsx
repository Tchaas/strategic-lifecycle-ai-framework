import PrototypeRoutesAuthGuard from './PrototypeRoutesAuthGuard';

const authStorageKey = 'slaf.prototype.authSession';
const usersStorageKey = 'slaf.prototype.users';
const scopedStorageKeys = new Set([
  'slaf.prototype.workspace',
  'slaf.prototype.businessArchitecture',
  'slaf.prototype.valueStreams',
  'slaf.prototype.strategicObjectives',
  'slaf.prototype.keyActivities',
  'slaf.prototype.businessCapabilities',
  'slaf.prototype.businessImpacts',
  'slaf.prototype.metrics',
  'slaf.prototype.leanBusinessCases',
  'slaf.prototype.invites',
]);

type AuthSession = {
  email?: string;
};

type PrototypeUser = {
  email: string;
};

let patchApplied = false;
let originalGetItem: Storage['getItem'] | null = null;
let originalSetItem: Storage['setItem'] | null = null;
let originalRemoveItem: Storage['removeItem'] | null = null;

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

const getActiveRegisteredEmail = (storage: Storage) => {
  if (!originalGetItem) return null;

  const session = parseJson<AuthSession>(originalGetItem.call(storage, authStorageKey));
  if (!session?.email) return null;

  const users = parseJson<PrototypeUser[]>(originalGetItem.call(storage, usersStorageKey));
  if (!Array.isArray(users)) return null;

  const normalizedEmail = session.email.trim().toLowerCase();
  return users.some((user) => user.email?.trim().toLowerCase() === normalizedEmail) ? normalizedEmail : null;
};

const applyScopedStoragePatch = () => {
  if (typeof window === 'undefined' || patchApplied) return;

  originalGetItem = Storage.prototype.getItem;
  originalSetItem = Storage.prototype.setItem;
  originalRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.getItem = function getScopedItem(key: string) {
    if (!scopedStorageKeys.has(key)) return originalGetItem?.call(this, key) ?? null;
    const email = getActiveRegisteredEmail(this);
    if (!email) return null;
    return originalGetItem?.call(this, getScopedKey(key, email)) ?? null;
  };

  Storage.prototype.setItem = function setScopedItem(key: string, value: string) {
    if (!scopedStorageKeys.has(key)) {
      originalSetItem?.call(this, key, value);
      return;
    }

    const email = getActiveRegisteredEmail(this);
    if (!email) return;
    originalSetItem?.call(this, getScopedKey(key, email), value);
  };

  Storage.prototype.removeItem = function removeScopedItem(key: string) {
    if (!scopedStorageKeys.has(key)) {
      originalRemoveItem?.call(this, key);
      return;
    }

    const email = getActiveRegisteredEmail(this);
    if (email) originalRemoveItem?.call(this, getScopedKey(key, email));
    originalRemoveItem?.call(this, key);
  };

  patchApplied = true;
};

export default function PrototypeRoutesScopedStorage() {
  applyScopedStoragePatch();
  return <PrototypeRoutesAuthGuard />;
}
