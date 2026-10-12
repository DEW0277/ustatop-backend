'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
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
import { areFiltersEqual } from '@/lib/filters-equal';
import { formatDate } from '@/lib/format';
import {
  mastersFiltersFromSearchParams,
  mastersFiltersToApiQuery,
  type MastersFilterValues,
} from '@/lib/schemas/masters-filter';
import type { AdminMaster, Paginated } from '@/lib/types';
import { MasterFilters } from './master-filters';
import { MASTERS_QUERY_KEY } from './masters-query';
import { VerifyMasterAction } from './verify-master-action';

const SKELETON_ROWS = 6;

export function AllMastersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<MastersFilterValues>(() =>
    mastersFiltersFromSearchParams(searchParams),
  );
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', 'all');
    if (filters.query) params.set('query', filters.query);
    if (filters.isVerified !== 'ALL') params.set('isVerified', filters.isVerified);
    if (filters.regionId !== 'ALL') params.set('regionId', filters.regionId);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    router.replace(`${pathname}?${search}`, { scroll: false });
  }, [filters, page, pathname, router]);

  const query = useQuery({
    queryKey: [...MASTERS_QUERY_KEY, filters, page],
    queryFn: () =>
      api<Paginated<AdminMaster>>('/admin/masters', {
        query: mastersFiltersToApiQuery(filters, page),
      }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showBackToFirstPage = !query.isLoading && !query.isError && items.length === 0 && page > 1;

  function handleFiltersChange(next: MastersFilterValues) {
    if (areFiltersEqual(filters, next)) return;
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <MasterFilters initial={filters} onChange={handleFiltersChange} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usta</TableHead>
                <TableHead>Hudud</TableHead>
                <TableHead>Kategoriyalar</TableHead>
                <TableHead>Reyting</TableHead>
                <TableHead>Buyurtmalar</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Ro&apos;yxatdan o&apos;tgan</TableHead>
                <TableHead className="text-right">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 8 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {query.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-destructive">
                    {query.error instanceof ApiError ? query.error.message : 'Kutilmagan xatolik'}
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading && !query.isError && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span>Hech qanday usta topilmadi</span>
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
                items.map((master) => (
                  <TableRow key={master.id}>
                    <TableCell>
                      <div className="font-medium">{master.fullName}</div>
                      <div className="text-sm text-muted-foreground">{master.phone}</div>
                      {master.telegram && (
                        <div className="text-xs text-muted-foreground">
                          TG: @{master.telegram.replace(/^@/, '')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{master.region.nameUz}</div>
                      <div className="text-xs text-muted-foreground">
                        {master.district.nameUz}
                        {master.address ? `, ${master.address}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {master.categories.map((cat) => (
                          <Badge key={cat.id} variant="secondary" className="text-xs">
                            {cat.nameUz}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="gap-1 font-semibold text-amber-600 dark:text-amber-400"
                        >
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                          {master.rating.toFixed(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({master.reviewCount})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {master.completedOrdersCount} ta
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {master.isVerified ? (
                          <Badge
                            variant="outline"
                            className="w-fit border-emerald-500 text-emerald-700"
                          >
                            Tasdiqlangan
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="w-fit bg-amber-100 text-amber-800"
                          >
                            Kutilmoqda
                          </Badge>
                        )}
                        {master.isBlocked && (
                          <Badge variant="destructive" className="w-fit">
                            Bloklangan
                          </Badge>
                        )}
                        {!master.isAvailable && (
                          <Badge variant="outline" className="w-fit text-muted-foreground">
                            Band
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(master.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <VerifyMasterAction master={master} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Jami: {total} ta usta</span>
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
