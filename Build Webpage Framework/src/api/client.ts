// Thin fetch wrapper for the SLAF backend.
//
// Contract (see backend/app/schemas): API JSON is camelCase, list endpoints return
// { items, total, limit, offset }, and errors use the envelope { error: { code, message, details? } }.
//
// This module owns auth tokens: the access token lives in memory only, the refresh
// token in localStorage under `slaf.auth.refresh`. It never touches `slaf.wireframe.*`.

const REFRESH_STORAGE_KEY = 'slaf.auth.refresh';

const BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
).replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(args: { code: string; message: string; details?: unknown; status: number }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.details = args.details;
    this.status = args.status;
    // Restore the prototype chain (needed when targeting ES5-ish output).
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  try {
    localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
  } catch {
    // localStorage may be unavailable (private mode, etc.) — access token still works.
  }
}

export function clearTokens(): void {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core request pipeline
// ---------------------------------------------------------------------------

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function buildUrl(path: string): string {
  return BASE_URL + (path.startsWith('/') ? path : `/${path}`);
}

function rawFetch(method: HttpMethod, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  const hasBody = body !== undefined;
  if (hasBody) headers['Content-Type'] = 'application/json';

  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(buildUrl(path), {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
}

async function toApiError(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON or empty error body.
  }
  const envelope =
    payload && typeof payload === 'object' && 'error' in payload
      ? (payload as { error: { code?: string; message?: string; details?: unknown } }).error
      : {};

  return new ApiError({
    code: envelope.code ?? 'unknown_error',
    message: envelope.message ?? res.statusText ?? 'Request failed',
    details: envelope.details,
    status: res.status,
  });
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

// A single shared refresh so concurrent 401s trigger only one /auth/refresh call.
let refreshInFlight: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  let res: Response;
  try {
    // Deliberately bypasses rawFetch/request: no access token attached, no retry.
    res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return false;
  }

  if (!res.ok) return false;

  const data = (await res.json().catch(() => null)) as
    | { accessToken?: string; refreshToken?: string }
    | null;
  if (!data?.accessToken || !data?.refreshToken) return false;

  setTokens(data.accessToken, data.refreshToken);
  return true;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const res = await rawFetch(method, path, body);

  if (res.status === 401 && !retried) {
    // Try to refresh exactly once, then replay the original request.
    const refreshed = await refreshTokens();
    if (!refreshed) {
      clearTokens();
      throw await toApiError(res);
    }
    return request<T>(method, path, body, true);
  }

  if (res.status === 401 && retried) {
    // Refresh succeeded but we're still unauthorized — give up rather than loop.
    clearTokens();
    throw await toApiError(res);
  }

  return parse<T>(res);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const api = {
  get: <T = unknown>(path: string): Promise<T> => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch: <T = unknown>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  del: <T = unknown>(path: string): Promise<T> => request<T>('DELETE', path),
};

export interface ListResult<T> {
  items: T[];
  total: number;
}

// Unwraps the { items, total, limit, offset } envelope so callers never see pagination internals.
export async function getList<T = unknown>(path: string): Promise<ListResult<T>> {
  const data = await api.get<{ items: T[]; total: number }>(path);
  return { items: data.items, total: data.total };
}
