import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { TOKEN_COOKIE } from './lib/config';

// Yengil birinchi to'siq: cookie yo'q bo'lsa login'ga yo'naltiradi. Bu HIMOYA EMAS — token yaroqliligi va ADMIN roli
// `getAdminUser()` (app/(admin)/layout.tsx) va backend'ning RolesGuard'ida tekshiriladi.
export function proxy(request: NextRequest) {
  if (request.cookies.has(TOKEN_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== '/') loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // /login, ommaviy huquqiy sahifalar (/privacy, /terms — mobil ilova va do'konlar havola qiladi), /api/*
  // (route handler'lar o'zi tekshiradi), statik fayllar va ikonkalar chetlab o'tiladi.
  matcher: ['/((?!login(?:/|$)|privacy(?:/|$)|terms(?:/|$)|api(?:/|$)|_next/|favicon\\.ico$).*)'],
};
