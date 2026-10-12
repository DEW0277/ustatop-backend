'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
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
import { formatDate } from '@/lib/format';
import type { Paginated, PendingMaster } from '@/lib/types';
import { PENDING_MASTERS_QUERY_KEY } from './masters-query';
import { VerifyMasterAction } from './verify-master-action';

const SKELETON_ROWS = 5;

export function PendingMastersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [page, pathname, router]);

  const query = useQuery({
    queryKey: [...PENDING_MASTERS_QUERY_KEY, page],
    queryFn: () =>
      api<Paginated<PendingMaster>>('/admin/masters/pending', {
        query: { page, limit: 20 },
      }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showBackToFirstPage = !query.isLoading && !query.isError && items.length === 0 && page > 1;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usta</TableHead>
                <TableHead>Hudud</TableHead>
                <TableHead>Kategoriyalar</TableHead>
                <TableHead>Tajriba</TableHead>
                <TableHead>Ariza sanasi</TableHead>
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
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <span className="font-medium text-foreground">
                        Tasdiqlash kutilayotgan ustalar mavjud emas
                      </span>
                      <span className="text-xs">
                        Barcha usta arizalari ko&apos;rib chiqilgan yoki yangi ariza kelmagan.
                      </span>
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
                      <div className="text-xs text-muted-foreground">{master.district.nameUz}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {master.categories.map((cat) => (
                          <Badge key={cat.id} variant="secondary" className="text-xs">
                            {cat.nameUz}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{master.experienceYears} yil</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
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
        <span>Jami: {total} ta tasdiqlanmagan usta</span>
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
