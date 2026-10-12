import { z } from 'zod';

export const VERIFIED_FILTER_VALUES = ['ALL', 'verified', 'unverified'] as const;

export const mastersFilterSchema = z.object({
  query: z.string().trim().max(100, 'Qidiruv 100 belgidan oshmasin'),
  isVerified: z.enum(VERIFIED_FILTER_VALUES),
  regionId: z.string(),
});

export type MastersFilterValues = z.infer<typeof mastersFilterSchema>;

export const DEFAULT_MASTERS_FILTERS: MastersFilterValues = {
  query: '',
  isVerified: 'ALL',
  regionId: 'ALL',
};

export function mastersFiltersFromSearchParams(params: URLSearchParams): MastersFilterValues {
  const parsed = mastersFilterSchema.safeParse({
    query: params.get('query') ?? DEFAULT_MASTERS_FILTERS.query,
    isVerified: params.get('isVerified') ?? DEFAULT_MASTERS_FILTERS.isVerified,
    regionId: params.get('regionId') ?? DEFAULT_MASTERS_FILTERS.regionId,
  });

  return parsed.success ? parsed.data : DEFAULT_MASTERS_FILTERS;
}

export function mastersFiltersToApiQuery(filters: MastersFilterValues, page: number, limit = 20) {
  return {
    query: filters.query || undefined,
    isVerified:
      filters.isVerified === 'ALL'
        ? undefined
        : filters.isVerified === 'verified',
    regionId: filters.regionId === 'ALL' ? undefined : filters.regionId,
    page,
    limit,
  };
}
