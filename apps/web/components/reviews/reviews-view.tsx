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
  reviewsFiltersFromSearchParams,
  reviewsFiltersToApiQuery,
  type ReviewsFilterValues,
} from '@/lib/schemas/reviews-filter';
import type { AdminReview, Paginated } from '@/lib/types';
import { DeleteReviewAction } from './delete-review-action';
import { ReviewFilters } from './review-filters';
import { REVIEWS_QUERY_KEY } from './reviews-query';

const SKELETON_ROWS = 6;

export function ReviewsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ReviewsFilterValues>(() =>
    reviewsFiltersFromSearchParams(searchParams),
  );
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));
  // Filtr jadvaldan ("Faqat shu usta") o'rnatilganda forma yangi qiymat bilan qayta yaratiladi.
  const [filtersFormKey, setFiltersFormKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.masterId) params.set('masterId', filters.masterId);
    if (filters.rating !== 'ALL') params.set('rating', filters.rating);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [filters, page, pathname, router]);

  const query = useQuery({
    queryKey: [...REVIEWS_QUERY_KEY, filters, page],
    queryFn: () =>
      api<Paginated<AdminReview>>('/admin/reviews', {
        query: reviewsFiltersToApiQuery(filters, page),
      }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showBackToFirstPage = !query.isLoading && !query.isError && items.length === 0 && page > 1;

  // Forma mount bo'lganda ham `onChange` chaqiradi — qiymat o'zgarmagan bo'lsa, URL'dagi sahifa saqlanadi.
  function handleFiltersChange(next: ReviewsFilterValues) {
    if (areFiltersEqual(filters, next)) return;
    setFilters(next);
    setPage(1);
  }

  function handleFilterByMaster(masterId: string) {
    setFilters((prev) => ({ ...prev, masterId }));
    setPage(1);
    setFiltersFormKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <ReviewFilters key={filtersFormKey} initial={filters} onChange={handleFiltersChange} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usta</TableHead>
                <TableHead>Mijoz</TableHead>
                <TableHead>Reyting</TableHead>
                <TableHead className="max-w-md">Sharh</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="text-right">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 6 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full max-w-36" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {query.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-destructive">
                    {query.error instanceof ApiError ? query.error.message : 'Kutilmagan xatolik'}
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading && !query.isError && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span>Hech narsa topilmadi</span>
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
                items.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="font-medium">{review.masterName}</div>
                      <div className="text-xs text-muted-foreground">{review.masterPhone}</div>
                      {filters.masterId !== review.masterId && (
                        <button
                          type="button"
                          onClick={() => handleFilterByMaster(review.masterId)}
                          className="mt-0.5 text-xs text-primary hover:underline"
                        >
                          Faqat shu usta
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{review.userName}</div>
                      <div className="text-xs text-muted-foreground">{review.userPhone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="gap-1 font-semibold text-amber-600 dark:text-amber-400"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        {review.rating}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-3 text-sm text-foreground break-words">
                        {review.comment}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(review.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteReviewAction review={review} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Jami: {total} ta sharh</span>
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
