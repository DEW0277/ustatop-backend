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
import type { Category } from '@/lib/types';
import { CategoryDialog } from './category-dialog';
import { DeleteCategoryAction } from './delete-category-action';

const SKELETON_ROWS = 6;

export function CategoriesView() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });

  const items = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CategoryDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi (O&apos;zbekcha)</TableHead>
                <TableHead>Nomi (Ruscha)</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Ikonka</TableHead>
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
                    Kategoriyalar topilmadi
                  </TableCell>
                </TableRow>
              )}

              {!query.isLoading &&
                items.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.nameUz}</TableCell>
                    <TableCell className="text-muted-foreground">{cat.nameRu}</TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {cat.slug}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cat.icon ? (
                        <span className="text-sm">{cat.icon}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <CategoryDialog category={cat} />
                        <DeleteCategoryAction category={cat} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Jami: {items.length} ta kategoriya
      </div>
    </div>
  );
}
