import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { TOKEN_COOKIE } from './config';
import { isSameOrigin } from './request-guard';
import type { ApiFailure } from './types';

export function failure(message: string, status: number) {
  const body: ApiFailure = { success: false, message, statusCode: status };
  return NextResponse.json(body, { status });
}

// Holatni o'zgartiruvchi so'rovlar uchun CSRF tekshiruvi (SameSite=Lax'ga qo'shimcha qatlam).
export function csrfError(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  return isSameOrigin(request.headers.get('origin'), host) ? null : failure('Ruxsat etilmagan so\'rov manbai', 403);
}

export function clearTokenCookie(response: NextResponse) {
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}
