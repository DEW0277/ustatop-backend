'use client';

import { useQuery } from '@tanstack/react-query';
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
import type { Region } from '@/lib/types';
import { DeleteRegionAction } from './delete-region-action';
import { RegionDialog } from './region-dialog';

const SKELETON_ROWS = 6;

export function RegionsView() {
  const query = useQuery({
    queryKey: ['regions'],
    queryFn: () => api<Region[]>('/regions'),
  });

  const items = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <RegionDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi (O&apos;zbekcha)</TableHead>
                <TableHead>Nomi (Ruscha)</TableHead>
                <TableHead>Kodi</TableHead>
                <TableHead>Tumanlar soni</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading &&
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 5 }).map((__, cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-5 w-full max-w-32" />
                      </TableCell>
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
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Hozircha viloyatlar qo&apos;shilmagan
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading &&
                items.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell className="font-medium">{region.nameUz}</TableCell>
                    <TableCell className="text-muted-foreground">{region.nameRu}</TableCell>
                    <TableCell>
                      {region.code ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {region.code}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {region._count?.districts ?? 0} ta tuman
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RegionDialog region={region} />
                        <DeleteRegionAction region={region} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
