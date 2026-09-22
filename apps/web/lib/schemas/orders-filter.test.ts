import { describe, expect, it } from 'vitest';
import {
  ordersFiltersFromSearchParams,
  ordersFiltersToApiQuery,
} from './orders-filter';

describe('ordersFiltersFromSearchParams', () => {
  it("bo'sh parametrlar uchun standart qiymatlarni qaytaradi", () => {
    expect(ordersFiltersFromSearchParams(new URLSearchParams())).toEqual({
      status: 'ALL',
      regionId: 'ALL',
      from: '',
      to: '',
    });
  });

  it("yaroqli parametrlarni o'qiydi", () => {
    const params = new URLSearchParams({
      status: 'completed',
      regionId: 'reg-1',
      from: '2026-09-01',
      to: '2026-09-20',
    });
    expect(ordersFiltersFromSearchParams(params)).toEqual({
      status: 'completed',
      regionId: 'reg-1',
      from: '2026-09-01',
      to: '2026-09-20',
    });
  });

  it("yaroqsiz status bo'lganda 'ALL' ga qaytadi", () => {
    const params = new URLSearchParams({ status: 'INVALID_STATUS' });
    expect(ordersFiltersFromSearchParams(params).status).toBe('ALL');
  });
});

describe('ordersFiltersToApiQuery', () => {
  it("'ALL' qiymatlarni backend querysiga qo'shmaydi", () => {
    expect(
      ordersFiltersToApiQuery(
        { status: 'ALL', regionId: 'ALL', from: '', to: '' },
        1,
      ),
    ).toEqual({ page: 1, limit: 20 });
  });

  it("berilgan filtrlarni query parametrlariga o'tkazadi", () => {
    expect(
      ordersFiltersToApiQuery(
        {
          status: 'in_progress',
          regionId: 'reg-1',
          from: '2026-09-01',
          to: '2026-09-15',
        },
        2,
      ),
    ).toEqual({
      page: 2,
      limit: 20,
      status: 'in_progress',
      regionId: 'reg-1',
      from: '2026-09-01',
      to: '2026-09-15',
    });
  });
});
