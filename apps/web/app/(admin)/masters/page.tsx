import { Suspense } from 'react';
import { MastersView } from '@/components/masters/masters-view';

export const metadata = { title: "Ustalar (Kutilayotganlar) — UstaTop Admin" };

export default function MastersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Kutilayotgan ustalar</h1>
        <p className="text-sm text-muted-foreground">
          Ro&apos;yxatdan o&apos;tib tasdiq kutayotgan usta profillarini tekshirish va tasdiqlash
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <MastersView />
      </Suspense>
    </div>
  );
}
