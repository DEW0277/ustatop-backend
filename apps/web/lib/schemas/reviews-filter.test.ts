import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REVIEWS_FILTERS,
  reviewsFiltersFromSearchParams,
  reviewsFiltersToApiQuery,
} from './reviews-filter';

const MASTER_ID = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('reviewsFiltersFromSearchParams', () => {
  it("bo'sh parametrlar uchun standart qiymatlarni qaytaradi", () => {
    expect(reviewsFiltersFromSearchParams(new URLSearchParams())).toEqual(DEFAULT_REVIEWS_FILTERS);
  });

  it("to'g'ri parametrlarni o'qiydi", () => {
    const params = new URLSearchParams({ masterId: MASTER_ID, rating: '5' });
    expect(reviewsFiltersFromSearchParams(params)).toEqual({
      masterId: MASTER_ID,
      rating: '5',
    });
  });

  it("yaroqsiz reyting bo'lganda faqat reyting standartga qaytadi", () => {
    const params = new URLSearchParams({ masterId: MASTER_ID, rating: '99' });
    expect(reviewsFiltersFromSearchParams(params)).toEqual({
      masterId: MASTER_ID,
      rating: 'ALL',
    });
  });

  it("UUID bo'lmagan masterId tashlab yuboriladi, reyting saqlanadi", () => {
    const params = new URLSearchParams({ masterId: 'm-123', rating: '2' });
    expect(reviewsFiltersFromSearchParams(params)).toEqual({
      masterId: '',
      rating: '2',
    });
  });
});

describe('reviewsFiltersToApiQuery', () => {
  it("standart filtrlarda faqat page va limit beradi", () => {
    expect(reviewsFiltersToApiQuery(DEFAULT_REVIEWS_FILTERS, 1)).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it("masterId va rating filtrlarini to'g'ri shakllantiradi", () => {
    expect(
      reviewsFiltersToApiQuery({ masterId: ` ${MASTER_ID} `, rating: '4' }, 2),
    ).toEqual({
      masterId: MASTER_ID,
      rating: 4,
      page: 2,
      limit: 20,
    });
  });

  it("chala kiritilgan (UUID bo'lmagan) masterId backendga yuborilmaydi", () => {
    expect(reviewsFiltersToApiQuery({ masterId: '3f2b8c1e-5a4d', rating: 'ALL' }, 1)).toEqual({
      page: 1,
      limit: 20,
    });
  });
});
