// Panelning barcha javoblariga qo'shiladigan xavfsizlik sarlavhalari (next.config.ts `headers()`).
// `script-src`/`default-src` ATAYLAB yo'q: Next.js inline script'lar chiqaradi, nonce asosidagi CSP alohida ish (TASKS.md E-13).
export const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
] as const;
