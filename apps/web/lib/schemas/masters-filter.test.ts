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
      type: 'ALL',
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
      type: 'ALL',
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
      type: 'ALL',
    });
  });

  it('`type` parametrini o‘qiydi', () => {
    const params = new URLSearchParams({ type: 'PARTS_SHOP' });
    expect(mastersFiltersFromSearchParams(params)).toEqual({ ...DEFAULT_MASTERS_FILTERS, type: 'PARTS_SHOP' });
  });

  it('noto‘g‘ri `type` bo‘lsa standart qiymatga qaytadi', () => {
    const params = new URLSearchParams({ type: 'bogus' });
    expect(mastersFiltersFromSearchParams(params)).toEqual(DEFAULT_MASTERS_FILTERS);
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
      type: undefined,
      page: 1,
      limit: 20,
    });
  });

  it('`type`: ALL → undefined, aniq tur → o‘sha tur', () => {
    expect(mastersFiltersToApiQuery({ ...DEFAULT_MASTERS_FILTERS, type: 'ALL' }, 1).type).toBeUndefined();
    expect(mastersFiltersToApiQuery({ ...DEFAULT_MASTERS_FILTERS, type: 'FUEL_STATION' }, 1).type).toBe(
      'FUEL_STATION',
    );
  });

  it('aniq filtrlarni to‘g‘ri shakllantiradi', () => {
    expect(
      mastersFiltersToApiQuery(
        { query: 'Ali', isVerified: 'verified', regionId: 'uuid-123', type: 'ALL' },
        2,
        10,
      ),
    ).toEqual({
      query: 'Ali',
      isVerified: true,
      regionId: 'uuid-123',
      type: undefined,
      page: 2,
      limit: 10,
    });

    expect(
      mastersFiltersToApiQuery(
        { query: '', isVerified: 'unverified', regionId: 'ALL', type: 'ALL' },
        1,
      ),
    ).toEqual({
      query: undefined,
      isVerified: false,
      regionId: undefined,
      type: undefined,
      page: 1,
      limit: 20,
    });
  });
});
