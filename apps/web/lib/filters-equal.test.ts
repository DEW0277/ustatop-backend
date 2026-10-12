import { describe, expect, it } from 'vitest';
import { areFiltersEqual } from './filters-equal';

describe('areFiltersEqual', () => {
  it('bir xil qiymatli obyektlar uchun true qaytaradi', () => {
    const a = { query: '', role: 'ALL', isBlocked: 'ALL' };
    const b = { query: '', role: 'ALL', isBlocked: 'ALL' };
    expect(areFiltersEqual(a, b)).toBe(true);
  });

  it('bitta maydoni farqli bo‘lsa false qaytaradi', () => {
    const a = { query: 'test', role: 'ALL' };
    const b = { query: 'other', role: 'ALL' };
    expect(areFiltersEqual(a, b)).toBe(false);
  });

  it('turli kalitlar soniga ega obyektlar uchun false qaytaradi', () => {
    const a = { query: '' };
    const b = { query: '', role: 'ALL' };
    expect(areFiltersEqual(a, b as { query: string })).toBe(false);
  });

  it('bir xil referensdagi obyekt uchun true qaytaradi', () => {
    const a = { query: 'abc' };
    expect(areFiltersEqual(a, a)).toBe(true);
  });

  it('bo‘sh obyektlar uchun true qaytaradi', () => {
    expect(areFiltersEqual({}, {})).toBe(true);
  });
});
