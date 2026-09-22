import { z } from 'zod';

export const ROLE_FILTER_VALUES = ['ALL', 'CLIENT', 'MASTER', 'ADMIN'] as const;
export const BLOCKED_FILTER_VALUES = ['ALL', 'blocked', 'active'] as const;

// `.default()` ataylab ishlatilmagan: RHF + zod v4 rezolveri bilan input/output tipi mos kelmay qoladi.
// Standart qiymatlar `DEFAULT_FILTERS` va `filtersFromSearchParams` orqali beriladi.
export const usersFilterSchema = z.object({
  query: z.string().trim().max(100, "Qidiruv 100 belgidan oshmasin"),
  role: z.enum(ROLE_FILTER_VALUES),
  isBlocked: z.enum(BLOCKED_FILTER_VALUES),
});

export type UsersFilterValues = z.infer<typeof usersFilterSchema>;

const DEFAULT_FILTERS: UsersFilterValues = { query: '', role: 'ALL', isBlocked: 'ALL' };

// URL query-parametrlaridan filtr holatini tiklaydi (sahifa yangilansa ham yo'qolmasin).
export function filtersFromSearchParams(params: URLSearchParams): UsersFilterValues {
  const parsed = usersFilterSchema.safeParse({
    query: params.get('query') ?? DEFAULT_FILTERS.query,
    role: params.get('role') ?? DEFAULT_FILTERS.role,
    isBlocked: params.get('isBlocked') ?? DEFAULT_FILTERS.isBlocked,
  });

  return parsed.success ? parsed.data : DEFAULT_FILTERS;
}

// Backend so'rovi uchun: 'ALL' -> yubormaslik, 'blocked'/'active' -> true/false.
export function filtersToApiQuery(filters: UsersFilterValues, page: number) {
  return {
    query: filters.query || undefined,
    role: filters.role === 'ALL' ? undefined : filters.role,
    isBlocked: filters.isBlocked === 'ALL' ? undefined : filters.isBlocked === 'blocked',
    page,
  };
}
