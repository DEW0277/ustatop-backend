import { Suspense } from 'react';
import { CategoriesView } from '@/components/categories/categories-view';

export const metadata = { title: "Kategoriyalar — UstaTop Admin" };

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Kategoriyalar</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi barcha xizmat sohalari va yo&apos;nalishlarini boshqarish
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <CategoriesView />
      </Suspense>
    </div>
  );
}
