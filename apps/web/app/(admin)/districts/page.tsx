import { Suspense } from 'react';
import { DistrictsView } from '@/components/districts/districts-view';

export const metadata = { title: "Tumanlar — UstaTop Admin" };

export default function DistrictsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Tumanlar</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi tumanlar va shaharlarni viloyatlar kesimida boshqarish
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <DistrictsView />
      </Suspense>
    </div>
  );
}
