import { Suspense } from 'react';
import { RegionsView } from '@/components/regions/regions-view';

export const metadata = { title: "Viloyatlar — UstaTop Admin" };

export default function RegionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Viloyatlar</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi viloyatlar va ma&apos;muriy hududlarni boshqarish
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <RegionsView />
      </Suspense>
    </div>
  );
}
