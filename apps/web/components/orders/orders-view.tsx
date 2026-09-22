'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, api } from '@/lib/api-client';
import {
  ordersFiltersFromSearchParams,
  ordersFiltersToApiQuery,
  type OrdersFilterValues,
} from '@/lib/schemas/orders-filter';
import type { AdminOrder, OrderStatus, Paginated } from '@/lib/types';
import { OrderFilters } from './order-filters';
import { ORDERS_QUERY_KEY } from './orders-query';

const SKELETON_ROWS = 6;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(amount: number) {
  return `${amount.toLocaleString('uz-UZ')} so'm`;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          Kutilmoqda
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Jarayonda
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="border-emerald-500 text-emerald-700">
          Bajarildi
        </Badge>
      );
    case 'cancelled':
      return <Badge variant="destructive">Bekor qilingan</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function OrdersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<OrdersFilterValues>(() =>
    ordersFiltersFromSearchParams(searchParams),
  );
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status !== 'ALL') params.set('status', filters.status);
    if (filters.regionId !== 'ALL') params.set('regionId', filters.regionId);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [filters, page, pathname, router]);

  const query = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, filters, page],
    queryFn: () =>
      api<Paginated<AdminOrder>>('/admin/orders', {
        query: ordersFiltersToApiQuery(filters, page),
      }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showBackToFirstPage = !query.isLoading && !query.isError && items.length === 0 && page > 1;

  function handleFiltersChange(next: OrdersFilterValues) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <OrderFilters initial={filters} onChange={handleFiltersChange} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raqam</TableHead>
                <TableHead>Mijoz</TableHead>
                <TableHead>Usta</TableHead>
                <TableHead>Xizmat va Narx</TableHead>
                <TableHead>Manzil</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Sana</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {query.isError && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    {query.error instanceof ApiError ? query.error.message : 'Kutilmagan xatolik'}
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading && !query.isError && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span>Hech qanday buyurtma topilmadi</span>
                      {showBackToFirstPage && (
                        <Button variant="outline" size="sm" onClick={() => setPage(1)}>
                          Birinchi sahifaga qaytish
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading &&
                items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      #{order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.clientName}</div>
                      <div className="text-xs text-muted-foreground">{order.clientPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.masterName}</div>
                      <div className="text-xs text-muted-foreground">{order.masterPhone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.serviceTitle}</div>
                      <div className="text-xs font-semibold text-emerald-600">
                        {formatPrice(order.price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{order.region.nameUz}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.districtName}, {order.address}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Jami: {total} ta buyurtma</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            Oldingi
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || query.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </Button>
        </div>
      </div>
    </div>
  );
}
