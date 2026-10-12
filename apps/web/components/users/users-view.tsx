'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BlockUserAction } from '@/components/users/block-user-action';
import { UserFilters } from '@/components/users/user-filters';
import { USERS_QUERY_KEY } from '@/components/users/users-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, api } from '@/lib/api-client';
import { areFiltersEqual } from '@/lib/filters-equal';
import { formatDate } from '@/lib/format';
import { filtersFromSearchParams, filtersToApiQuery, type UsersFilterValues } from '@/lib/schemas/users-filter';
import type { ManagedUser, Paginated } from '@/lib/types';

const ROLE_LABELS: Record<ManagedUser['role'], string> = { CLIENT: 'Mijoz', MASTER: 'Usta', ADMIN: 'Administrator' };
const SKELETON_ROWS = 6;

export function UsersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<UsersFilterValues>(() => filtersFromSearchParams(searchParams));
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));

  // Filtr/sahifa holati URL'ga yoziladi — sahifani yangilash yoki havolani ulashish holatni saqlaydi.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('query', filters.query);
    if (filters.role !== 'ALL') params.set('role', filters.role);
    if (filters.isBlocked !== 'ALL') params.set('isBlocked', filters.isBlocked);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [filters, page, pathname, router]);

  const query = useQuery({
    queryKey: [...USERS_QUERY_KEY, filters, page],
    queryFn: () => api<Paginated<ManagedUser>>('/admin/users', { query: filtersToApiQuery(filters, page) }),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Filtr qo'llanganda joriy sahifa endi mavjud bo'lmasligi mumkin. Avtomatik sakramaymiz
  // (effekt ichida setState — React Compiler qoidasiga zid); o'rniga bo'sh holatda tugma ko'rsatamiz.
  const showBackToFirstPage = !query.isLoading && !query.isError && items.length === 0 && page > 1;

  function handleFiltersChange(next: UsersFilterValues) {
    if (areFiltersEqual(filters, next)) return;
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <UserFilters initial={filters} onChange={handleFiltersChange} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Ro&apos;yxatdan o&apos;tgan</TableHead>
                <TableHead className="text-right">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((__, cell) => (
                      <TableCell key={cell}><Skeleton className="h-5 w-full max-w-40" /></TableCell>
                    ))}
                  </TableRow>
                ))}

              {query.isError && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-destructive">
                    {query.error instanceof ApiError ? query.error.message : 'Kutilmagan xatolik'}
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading && !query.isError && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
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
                items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isBlocked ? 'destructive' : 'outline'}>
                        {user.isBlocked ? 'Bloklangan' : 'Faol'}
                      </Badge>
                      {!user.isPhoneVerified && (
                        <Badge variant="ghost" className="ml-1">Tasdiqlanmagan</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right"><BlockUserAction user={user} /></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Jami: {total} ta foydalanuvchi</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || query.isFetching} onClick={() => setPage((p) => p - 1)}>
            Oldingi
          </Button>
          <span>{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || query.isFetching} onClick={() => setPage((p) => p + 1)}>
            Keyingi
          </Button>
        </div>
      </div>
    </div>
  );
}
