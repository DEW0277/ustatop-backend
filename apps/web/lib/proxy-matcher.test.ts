import { describe, expect, it } from 'vitest';
import { config } from '../proxy';

// `proxy.ts` matcher'i login'ga yo'naltiriladigan yo'llarni belgilaydi. Next uni path-to-regexp sifatida o'qiydi;
// bu yerdagi ifoda oddiy JS regex sifatida ham bir xil ishlaydi.
const matches = (path: string) => config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(path));

describe('proxy matcher', () => {
  it("admin sahifalarini cookie'siz login'ga yo'naltiradi", () => {
    for (const path of ['/', '/users', '/masters', '/orders/123', '/privacy-settings', '/terms2']) {
      expect(matches(path)).toBe(true);
    }
  });

  it("login, ommaviy huquqiy sahifalar, API va statik fayllarni chetlab o'tadi", () => {
    for (const path of ['/login', '/privacy', '/privacy/', '/terms', '/api/auth/login', '/_next/static/x.js', '/favicon.ico']) {
      expect(matches(path)).toBe(false);
    }
  });
});
