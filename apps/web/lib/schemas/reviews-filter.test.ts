import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REVIEWS_FILTERS,
  reviewsFiltersFromSearchParams,
  reviewsFiltersToApiQuery,
} from './reviews-filter';

describe('reviewsFiltersFromSearchParams', () => {
  it("bo'sh parametrlar uchun standart qiymatlarni qaytaradi", () => {
    expect(reviewsFiltersFromSearchParams(new URLSearchParams())).toEqual(DEFAULT_REVIEWS_FILTERS);
  });

  it("to'g'ri parametrlarni o'qiydi", () => {
    const params = new URLSearchParams({ masterId: 'm-123', rating: '5' });
    expect(reviewsFiltersFromSearchParams(params)).toEqual({
      masterId: 'm-123',
      rating: '5',
    });
  });

  it("yaroqsiz reyting bo'lganda standartga qaytadi", () => {
    const params = new URLSearchParams({ masterId: 'm-123', rating: '99' });
    expect(reviewsFiltersFromSearchParams(params)).toEqual({
      masterId: '',
      rating: 'ALL',
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
      reviewsFiltersToApiQuery({ masterId: '00000000-0000-0000-0000-000000000001', rating: '4' }, 2),
    ).toEqual({
      masterId: '00000000-0000-0000-0000-000000000001',
      rating: 4,
      page: 2,
      limit: 20,
    });
  });
});
