// Brauzerdan chaqiriladigan yordamchi. Token brauzerga hech qachon chiqmaydi: so'rov `/api/backend/*` proksisiga
// (cookie avtomatik yuboriladi), u esa backend'ga Authorization qo'shib uzatadi.
import type { ApiFailure, ApiSuccess } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError("Serverga ulanib bo'lmadi", 0);
  }

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || payload.success !== true) {
    // Sessiya tugagan yoki bloklangan: login sahifasiga qaytaramiz (proksi cookie'ni allaqachon o'chirgan).
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      // To'liq qayta yuklash ataylab: klient holati (cache) tozalansin.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }

    const failure = payload && payload.success === false ? payload : undefined;
    throw new ApiError(failure?.message ?? 'Kutilmagan xatolik', response.status, failure?.errors);
  }

  return payload.data;
}

// Admin endpointlari: `api('/admin/users', { query: { page: 2 } })`.
export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.size > 0 ? `?${params.toString()}` : '';
  return request<T>(`/api/backend${path}${search}`, options);
}

// Auth route handler'lari (`/api/auth/*`).
export function authApi<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(`/api/auth${path}`, { method: 'POST', body: body ?? {} });
}
