import { isIP } from 'node:net';

// Sof modul (`server-only`siz) — unit test qilinadi. `backend.ts` shu yerdan foydalanadi.

// Mijoz IP'si faqat nginx yozgan `X-Real-IP` dan olinadi (nginx uni har doim `$remote_addr` bilan ustidan yozadi,
// web konteyneri esa host'ga port ochmaydi). `X-Forwarded-For` ga hech qachon ishonilmaydi — mijoz uni soxtalashtira oladi.
export function clientIpFromHeaders(headers: { get(name: string): string | null }): string | undefined {
  const value = headers.get('x-real-ip')?.trim();

  return value && isIP(value) !== 0 ? value : undefined;
}

// Panel -> backend sarlavhalari. `clientIp` bo'lsa backend (TRUST_PROXY=1) uni `req.ip` sifatida ko'radi,
// shunda rate limit va admin-login bloki har bir mijoz uchun alohida hisoblanadi.
export function buildBackendHeaders(opts: { token?: string; hasBody: boolean; clientIp?: string }): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (opts.hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  if (opts.clientIp) {
    headers['X-Forwarded-For'] = opts.clientIp;
  }

  return headers;
}
