'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { District, Region } from '@/lib/types';
import { DeleteDistrictAction } from './delete-district-action';
import { DistrictDialog } from './district-dialog';

const SKELETON_ROWS = 8;

export function DistrictsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRegionId, setSelectedRegionId] = useState<string>(
    () => searchParams.get('regionId') || 'ALL',
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedRegionId !== 'ALL') params.set('regionId', selectedRegionId);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [selectedRegionId, pathname, router]);

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api<Region[]>('/regions'),
  });

  const districtsQuery = useQuery({
    queryKey: ['districts', selectedRegionId],
    queryFn: () =>
      api<District[]>('/districts', {
        query:
          selectedRegionId && selectedRegionId !== 'ALL'
            ? { regionId: selectedRegionId }
            : undefined,
      }),
  });

  const regions = useMemo(() => regionsQuery.data ?? [], [regionsQuery.data]);
  const districts = districtsQuery.data ?? [];

  const regionItems = useMemo(
    () => ({
      ALL: 'Barcha viloyatlar',
      ...Object.fromEntries(regions.map((reg) => [reg.id, reg.nameUz])),
    }),
    [regions],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field className="w-64">
          <FieldLabel>Viloyat bo&apos;yicha filtrlash</FieldLabel>
          <Select
            items={regionItems}
            value={selectedRegionId}
            onValueChange={(val) => setSelectedRegionId(val ?? 'ALL')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Barcha viloyatlar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha viloyatlar</SelectItem>
              {regions.map((reg) => (
                <SelectItem key={reg.id} value={reg.id}>
                  {reg.nameUz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <DistrictDialog defaultRegionId={selectedRegionId} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi (O&apos;zbekcha)</TableHead>
                <TableHead>Nomi (Ruscha)</TableHead>
                <TableHead>Tegishli viloyat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {districtsQuery.isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 4 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full max-w-36" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {districtsQuery.isError && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-destructive">
                    {districtsQuery.error instanceof ApiError
                      ? districtsQuery.error.message
                      : 'Kutilmagan xatolik'}
                  </TableCell>
                </TableRow>
              )}

              {!districtsQuery.isLoading &&
                !districtsQuery.isError &&
                districts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Tumanlar topilmadi
                    </TableCell>
                  </TableRow>
                )}

              {!districtsQuery.isLoading &&
                districts.map((district) => (
                  <TableRow key={district.id}>
                    <TableCell className="font-medium">{district.nameUz}</TableCell>
                    <TableCell className="text-muted-foreground">{district.nameRu}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {district.region?.nameUz ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DistrictDialog district={district} />
                        <DeleteDistrictAction district={district} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Jami: {districts.length} ta tuman
      </div>
    </div>
  );
}
