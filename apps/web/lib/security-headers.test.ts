import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('panel security headers (next.config headers())', () => {
  it("barcha yo'llarga 4 ta xavfsizlik sarlavhasini aynan shu qiymatlar bilan qo'shadi", async () => {
    const rules = await nextConfig.headers?.();
    const rule = rules?.find((r) => r.source === '/:path*');

    expect(rule).toBeDefined();

    const byKey = Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]));

    expect(byKey).toEqual({
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
  });

  it("CSP'da script-src va default-src yo'q (Next inline script'larini sindirmaslik uchun)", async () => {
    const rules = await nextConfig.headers?.();
    const csp = rules?.flatMap((r) => r.headers).find((h) => h.key === 'Content-Security-Policy')?.value ?? '';

    expect(csp).not.toBe('');
    expect(csp).not.toContain('script-src');
    expect(csp).not.toContain('default-src');
  });
});
