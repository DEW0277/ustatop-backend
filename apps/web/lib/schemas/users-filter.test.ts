import { describe, expect, it } from 'vitest';
import { filtersFromSearchParams, filtersToApiQuery } from './users-filter';

describe('filtersFromSearchParams', () => {
  it("bo'sh parametrlar uchun standart qiymatlarni qaytaradi", () => {
    expect(filtersFromSearchParams(new URLSearchParams())).toEqual({ query: '', role: 'ALL', isBlocked: 'ALL' });
  });

  it("yaroqli parametrlarni o'qiydi", () => {
    const params = new URLSearchParams({ query: ' Ali ', role: 'MASTER', isBlocked: 'blocked' });
    expect(filtersFromSearchParams(params)).toEqual({ query: 'Ali', role: 'MASTER', isBlocked: 'blocked' });
  });

  it("yaroqsiz qiymatlarda standartga qaytadi (buzuq URL bilan qulamaydi)", () => {
    const params = new URLSearchParams({ role: 'HACKER', query: 'a'.repeat(200) });
    expect(filtersFromSearchParams(params)).toEqual({ query: '', role: 'ALL', isBlocked: 'ALL' });
  });
});

describe('filtersToApiQuery', () => {
  it("'ALL' qiymatlarni backend'ga yubormaydi", () => {
    expect(filtersToApiQuery({ query: '', role: 'ALL', isBlocked: 'ALL' }, 1)).toEqual({
      query: undefined,
      role: undefined,
      isBlocked: undefined,
      page: 1,
    });
  });

  it("'blocked'/'active' ni boolean'ga aylantiradi", () => {
    expect(filtersToApiQuery({ query: 'Ali', role: 'CLIENT', isBlocked: 'blocked' }, 2).isBlocked).toBe(true);
    expect(filtersToApiQuery({ query: '', role: 'ALL', isBlocked: 'active' }, 1).isBlocked).toBe(false);
  });
});
