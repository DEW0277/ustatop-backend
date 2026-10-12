import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MASTERS_FILTERS,
  mastersFiltersFromSearchParams,
  mastersFiltersToApiQuery,
  mastersFilterSchema,
} from './masters-filter';

describe('mastersFilterSchema', () => {
  it('to‘g‘ri qiymatlarni qabul qiladi', () => {
    const res = mastersFilterSchema.safeParse({
      query: ' Ali ',
      isVerified: 'verified',
      regionId: 'reg-1',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.query).toBe('Ali');
    }
  });

  it('noto‘g‘ri isVerified bo‘lsa xatolik beradi', () => {
    const res = mastersFilterSchema.safeParse({
      query: '',
      isVerified: 'invalid',
      regionId: 'ALL',
    });
    expect(res.success).toBe(false);
  });
});

describe('mastersFiltersFromSearchParams', () => {
  it('bo‘sh parametrlarda standart qiymatlarni qaytaradi', () => {
    const params = new URLSearchParams();
    expect(mastersFiltersFromSearchParams(params)).toEqual(DEFAULT_MASTERS_FILTERS);
  });

  it('URL parametrlarini to‘g‘ri o‘qiydi', () => {
    const params = new URLSearchParams({
      query: 'Vali',
      isVerified: 'unverified',
      regionId: 'region-uuid',
    });
    expect(mastersFiltersFromSearchParams(params)).toEqual({
      query: 'Vali',
      isVerified: 'unverified',
      regionId: 'region-uuid',
    });
  });

  it('noto‘g‘ri parametrlar berilganda standart qiymatga qaytadi', () => {
    const params = new URLSearchParams({
      isVerified: 'unknown-status',
    });
    expect(mastersFiltersFromSearchParams(params)).toEqual(DEFAULT_MASTERS_FILTERS);
  });
});

describe('mastersFiltersToApiQuery', () => {
  it('ALL qiymatlarini backend uchun undefined ga aylantiradi', () => {
    expect(mastersFiltersToApiQuery(DEFAULT_MASTERS_FILTERS, 1, 20)).toEqual({
      query: undefined,
      isVerified: undefined,
      regionId: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('aniq filtrlarni to‘g‘ri shakllantiradi', () => {
    expect(
      mastersFiltersToApiQuery(
        { query: 'Ali', isVerified: 'verified', regionId: 'uuid-123' },
        2,
        10,
      ),
    ).toEqual({
      query: 'Ali',
      isVerified: true,
      regionId: 'uuid-123',
      page: 2,
      limit: 10,
    });

    expect(
      mastersFiltersToApiQuery(
        { query: '', isVerified: 'unverified', regionId: 'ALL' },
        1,
      ),
    ).toEqual({
      query: undefined,
      isVerified: false,
      regionId: undefined,
      page: 1,
      limit: 20,
    });
  });
});
