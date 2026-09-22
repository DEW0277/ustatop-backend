import { Suspense } from 'react';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata = { title: "Bosh sahifa — UstaTop Admin" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Bosh sahifa</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi asosiy ko&apos;rsatkichlar va dinamika
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <DashboardView />
      </Suspense>
    </div>
  );
}

