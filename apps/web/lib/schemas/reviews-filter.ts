import { z } from 'zod';

export const RATING_FILTER_VALUES = ['ALL', '5', '4', '3', '2', '1'] as const;

// Backend `masterId`ni `@IsUUID()` bilan tekshiradi — UUID bo'lmagan qiymat 400 qaytaradi,
// shuning uchun to'liq UUID kiritilmaguncha filtr umuman yuborilmaydi.
const UUID_REGEX = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function isMasterId(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export const reviewsFilterSchema = z.object({
  masterId: z
    .string()
    .trim()
    .refine((value) => value === '' || isMasterId(value), {
      message: "Usta ID to'liq UUID formatida bo'lishi kerak",
    }),
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

  // Har bir maydon alohida tekshiriladi — bittasi yaroqsiz bo'lsa, ikkinchisi yo'qolmaydi.
  const shape = reviewsFilterSchema.shape;
  const parsedMasterId = shape.masterId.safeParse(masterId);
  const parsedRating = shape.rating.safeParse(rating);

  return {
    masterId: parsedMasterId.success ? parsedMasterId.data : DEFAULT_REVIEWS_FILTERS.masterId,
    rating: parsedRating.success ? parsedRating.data : DEFAULT_REVIEWS_FILTERS.rating,
  };
}

export function reviewsFiltersToApiQuery(
  filters: ReviewsFilterValues,
  page: number,
): Record<string, string | number> {
  const query: Record<string, string | number> = { page, limit: 20 };
  const trimmedMasterId = filters.masterId.trim();
  if (isMasterId(trimmedMasterId)) {
    query.masterId = trimmedMasterId;
  }
  if (filters.rating !== 'ALL') {
    query.rating = Number(filters.rating);
  }
  return query;
}
