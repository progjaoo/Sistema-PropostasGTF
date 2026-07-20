import { useAuthStore } from '@/store/auth';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

const AUTH_PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register-commercial',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
];

let installed = false;
let originalFetch: typeof fetch | null = null;
let refreshPromise: Promise<boolean> | null = null;

function clearLegacyAuthStorage(): void {
  try {
    window.sessionStorage.removeItem('proposta-auth-storage');
    window.localStorage.removeItem('proposta-auth-storage');
  } catch {
    // Storage access can fail in restricted browser modes.
  }
}

function getUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isApiRequest(url: string): boolean {
  if (url.startsWith('/api/')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

function isAuthPublicRequest(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return AUTH_PUBLIC_PATHS.includes(parsed.pathname);
  } catch {
    return AUTH_PUBLIC_PATHS.some((path) => url.startsWith(path));
  }
}

function mergeAuthHeader(init?: FetchInit): FetchInit {
  const token = useAuthStore.getState().accessToken;
  if (!token) return init ?? {};

  const headers = new Headers(init?.headers);
  if (!headers.has('authorization')) {
    headers.set('authorization', `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
  };
}

async function refreshSession(): Promise<boolean> {
  if (!originalFetch) return false;

  if (!refreshPromise) {
    refreshPromise = originalFetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          useAuthStore.getState().clearAuth();
          return false;
        }

        const payload = await response.json().catch(() => null);
        if (!payload?.user || !payload?.accessToken) {
          useAuthStore.getState().clearAuth();
          return false;
        }

        useAuthStore.getState().setAuth(payload.user, payload.accessToken);
        return true;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function bootstrapAuthSession(): Promise<void> {
  try {
    await refreshSession();
  } finally {
    useAuthStore.getState().markBootstrapped();
  }
}

function withRetryHeader(init?: FetchInit): FetchInit {
  const headers = new Headers(init?.headers);
  headers.set('x-auth-retry', '1');
  return {
    ...init,
    headers,
  };
}

function hasAlreadyRetried(init?: FetchInit): boolean {
  return new Headers(init?.headers).get('x-auth-retry') === '1';
}

export function installAuthenticatedFetch(): void {
  if (installed || typeof window === 'undefined') return;

  clearLegacyAuthStorage();
  originalFetch = window.fetch.bind(window);
  installed = true;

  window.fetch = async (input: FetchInput, init?: FetchInit) => {
    const url = getUrl(input);
    const shouldAuthenticate = isApiRequest(url) && !isAuthPublicRequest(url);
    const firstInit = shouldAuthenticate ? mergeAuthHeader(init) : init;

    let response = await originalFetch!(input, firstInit);

    if (!shouldAuthenticate || response.status !== 401 || hasAlreadyRetried(firstInit)) {
      return response;
    }

    const refreshed = await refreshSession();
    if (!refreshed) return response;

    const retryInit = mergeAuthHeader(withRetryHeader(init));
    response = await originalFetch!(input, retryInit);
    return response;
  };
}
