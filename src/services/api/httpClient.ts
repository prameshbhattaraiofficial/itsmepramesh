import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const ACCESS_TOKEN_KEY = 'pb_admin_access_token';
const REFRESH_TOKEN_KEY = 'pb_admin_refresh_token';
const CSRF_COOKIE_NAME = 'pb_csrf_token';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const target = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      try {
        return decodeURIComponent(trimmed.slice(target.length));
      } catch {
        return trimmed.slice(target.length);
      }
    }
  }
  return null;
}

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export const httpClient = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function unwrapData<T>(envelope: { data: T }): T {
  return envelope.data;
}

let csrfBootstrapPromise: Promise<string | null> | null = null;
let cachedCsrfToken: string | null = null;

async function ensureCsrfHeaderToken(): Promise<string | null> {
  const fromCookie = readCookie(CSRF_COOKIE_NAME);
  if (fromCookie) {
    cachedCsrfToken = fromCookie;
    return fromCookie;
  }
  if (cachedCsrfToken) return cachedCsrfToken;
  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = axios
      .get('/api/v1/security/csrf-token', { withCredentials: true, timeout: 5000 })
      .then((res) => {
        const token = res.data?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME) || null;
        cachedCsrfToken = token;
        return token;
      })
      .catch(() => null)
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }
  return csrfBootstrapPromise;
}

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { accessToken } = getStoredTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const method = (config.method || 'get').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = readCookie(CSRF_COOKIE_NAME) || (await ensureCsrfHeaderToken());
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const { refreshToken } = getStoredTokens();
      if (!refreshToken) {
        clearStoredTokens();
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        refreshPromise = axios
          .post('/api/v1/auth/refresh', { refreshToken }, { withCredentials: true })
          .then((res) => {
            const payload = res.data?.data;
            if (payload?.accessToken && payload?.refreshToken) {
              setStoredTokens(payload.accessToken, payload.refreshToken);
              return payload.accessToken as string;
            }
            clearStoredTokens();
            return null;
          })
          .catch(() => {
            clearStoredTokens();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return httpClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);
