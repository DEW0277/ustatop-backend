import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendRequest } from '@/lib/backend';
import { clientIpFromHeaders } from '@/lib/client-ip';
import { TOKEN_COOKIE } from '@/lib/config';
import { isAllowedProxyPath } from '@/lib/request-guard';
import { clearTokenCookie, csrfError, failure } from '@/lib/route-utils';

// Brauzer -> panel -> backend proksisi: cookie'dagi JWT `Authorization` sarlavhasiga aylantiriladi.
// Faqat `admin/*` va ochiq ma'lumotnomalar (GET) uzatiladi (lib/request-guard.ts).
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const method = request.method;

  if (!isAllowedProxyPath(method, path)) {
    return failure('Yo\'l topilmadi', 404);
  }

  let body: string | undefined;

  if (method !== 'GET') {
    const blocked = csrfError(request);
    if (blocked) return blocked;

    // Cross-site forma JSON content-type yubora olmaydi (preflight kerak) — qo'shimcha CSRF to'siq.
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') && method !== 'DELETE') {
      return failure("Content-Type application/json bo'lishi kerak", 415);
    }

    body = method === 'DELETE' ? undefined : await request.text();
  }

  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  if (!token) {
    return failure('Avtorizatsiyadan o\'ting', 401);
  }

  const { status, body: payload } = await backendRequest(`/${path.join('/')}`, {
    method,
    token,
    search: request.nextUrl.search,
    body,
    clientIp: clientIpFromHeaders(request.headers),
  });

  const response = NextResponse.json(payload, { status });

  // Token eskirgan/bloklangan: yaroqsiz cookie qolib ketmasin.
  return status === 401 ? clearTokenCookie(response) : response;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
