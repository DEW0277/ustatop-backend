import 'server-only';
import { buildBackendHeaders } from './client-ip';
import { BACKEND_URL } from './config';

export interface BackendResult {
  status: number;
  body: unknown;
}

interface BackendRequest {
  method?: string;
  token?: string;
  search?: string;
  body?: string;
  clientIp?: string;
}

const REQUEST_TIMEOUT_MS = 10_000;

function errorBody(message: string, statusCode: number) {
  return { success: false, message, statusCode };
}

// Backend bilan server-to-server aloqa. Tarmoq xatosi va JSON bo'lmagan javoblar ham bir xil xato shakliga aylanadi.
export async function backendRequest(path: string, options: BackendRequest = {}): Promise<BackendResult> {
  const headers = buildBackendHeaders({
    token: options.token,
    hasBody: options.body !== undefined,
    clientIp: options.clientIp,
  });

  try {
    const response = await fetch(`${BACKEND_URL}${path}${options.search ?? ''}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();

    try {
      return { status: response.status, body: text ? JSON.parse(text) : null };
    } catch {
      return { status: 502, body: errorBody('Backend noto\'g\'ri javob qaytardi', 502) };
    }
  } catch {
    return { status: 502, body: errorBody('Backend bilan bog\'lanib bo\'lmadi', 502) };
  }
}
