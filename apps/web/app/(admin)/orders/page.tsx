import { Suspense } from 'react';
import { OrdersView } from '@/components/orders/orders-view';

export const metadata = { title: "Buyurtmalar — UstaTop Admin" };

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Buyurtmalar</h1>
        <p className="text-sm text-muted-foreground">
          Platformadagi barcha mijoz va usta buyurtmalari monitoringi
        </p>
      </div>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <OrdersView />
      </Suspense>
    </div>
  );
}
