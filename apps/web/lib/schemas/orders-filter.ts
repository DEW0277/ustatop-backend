import { z } from 'zod';
import type { OrderStatus } from '../types';

export const ordersFilterSchema = z.object({
  status: z.enum(['ALL', 'pending', 'in_progress', 'completed', 'cancelled']),
  regionId: z.string(),
  from: z.string(),
  to: z.string(),
});

export type OrdersFilterValues = z.infer<typeof ordersFilterSchema>;

export const DEFAULT_ORDERS_FILTERS: OrdersFilterValues = {
  status: 'ALL',
  regionId: 'ALL',
  from: '',
  to: '',
};

export function ordersFiltersFromSearchParams(params: { get: (key: string) => string | null }): OrdersFilterValues {
  const status = params.get('status');
  const regionId = params.get('regionId') || 'ALL';
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const validStatus =
    status && ['pending', 'in_progress', 'completed', 'cancelled'].includes(status)
      ? (status as OrderStatus)
      : 'ALL';

  return { status: validStatus, regionId, from, to };
}

export function ordersFiltersToApiQuery(
  filters: OrdersFilterValues,
  page: number,
): Record<string, string | number> {
  const query: Record<string, string | number> = { page, limit: 20 };
  if (filters.status !== 'ALL') query.status = filters.status;
  if (filters.regionId !== 'ALL' && filters.regionId) query.regionId = filters.regionId;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  return query;
}
