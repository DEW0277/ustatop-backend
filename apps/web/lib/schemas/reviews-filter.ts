import { z } from 'zod';

export const RATING_FILTER_VALUES = ['ALL', '5', '4', '3', '2', '1'] as const;

export const reviewsFilterSchema = z.object({
  masterId: z.string().trim().max(100),
  rating: z.enum(RATING_FILTER_VALUES),
});

export type ReviewsFilterValues = z.infer<typeof reviewsFilterSchema>;

export const DEFAULT_REVIEWS_FILTERS: ReviewsFilterValues = {
  masterId: '',
  rating: 'ALL',
};

export function reviewsFiltersFromSearchParams(params: URLSearchParams): ReviewsFilterValues {
  const masterId = params.get('masterId') ?? DEFAULT_REVIEWS_FILTERS.masterId;
  const rating = params.get('rating') ?? DEFAULT_REVIEWS_FILTERS.rating;

  const parsed = reviewsFilterSchema.safeParse({
    masterId,
    rating,
  });

  return parsed.success ? parsed.data : DEFAULT_REVIEWS_FILTERS;
}

export function reviewsFiltersToApiQuery(
  filters: ReviewsFilterValues,
  page: number,
): Record<string, string | number> {
  const query: Record<string, string | number> = { page, limit: 20 };
  const trimmedMasterId = filters.masterId.trim();
  if (trimmedMasterId) {
    query.masterId = trimmedMasterId;
  }
  if (filters.rating !== 'ALL') {
    query.rating = Number(filters.rating);
  }
  return query;
}
