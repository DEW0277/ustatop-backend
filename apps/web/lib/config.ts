// Faqat server tomonda ishlatiladi (route handler, server component, proxy.ts).
export const BACKEND_URL = (process.env.BACKEND_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '');

export const TOKEN_COOKIE = 'ustatop_admin_token';

// JWT backend'da 30 kun yashaydi, panel cookie'si esa qisqaroq: admin sessiyasi 7 kundan oshmasin.
export const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function tokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    // Production'da Secure; HTTPS'siz staging uchun COOKIE_SECURE=false bilan o'chiriladi.
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    path: '/',
    maxAge: TOKEN_COOKIE_MAX_AGE,
  };
}
