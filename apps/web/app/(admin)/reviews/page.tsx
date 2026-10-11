import { Suspense } from 'react';
import { ReviewsView } from '@/components/reviews/reviews-view';

export const metadata = { title: 'Sharhlar — UstaTop Admin' };

export default function ReviewsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Sharhlar</h1>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <ReviewsView />
      </Suspense>
    </div>
  );
}
