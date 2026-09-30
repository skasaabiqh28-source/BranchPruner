export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, string>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error?.message || 'An API error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.error?.code || 'UNKNOWN_ERROR';
    this.details = payload.error?.details;
  }
}

const BASE_URL = '/api';

let isRefreshing = false;
let refreshSubscribers: Array<(ok: boolean) => void> = [];

function subscribeTokenRefresh(cb: (ok: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(ok: boolean) {
  refreshSubscribers.forEach((cb) => cb(ok));
  refreshSubscribers = [];
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = getCookie('csrf_token');
  if (csrfToken && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' // Send and receive httpOnly cookies
  };

  const response = await fetch(url, config);

  // If 401 Unauthorized and not already refreshing, attempt token rotation
  if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        isRefreshing = false;
        if (refreshRes.ok) {
          onRefreshed(true);
          return apiClient<T>(endpoint, options, true);
        } else {
          onRefreshed(false);
        }
      } catch {
        isRefreshing = false;
        onRefreshed(false);
      }
    } else {
      // Queue requests waiting for refresh
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((ok) => {
          if (ok) {
            resolve(apiClient<T>(endpoint, options, true));
          } else {
            reject(new ApiError(401, { error: { code: 'UNAUTHENTICATED', message: 'Session expired' } }));
          }
        });
      });
    }
  }

  if (!response.ok) {
    let errorPayload: ApiErrorPayload;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = {
        error: {
          code: 'HTTP_ERROR',
          message: `Request failed with status ${response.status}: ${response.statusText}`
        }
      };
    }
    throw new ApiError(response.status, errorPayload);
  }

  // If 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
