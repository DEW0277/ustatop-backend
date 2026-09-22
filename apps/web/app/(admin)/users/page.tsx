import { Suspense } from 'react';
import { UsersView } from '@/components/users/users-view';

export const metadata = { title: "Foydalanuvchilar — UstaTop Admin" };

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
      <Suspense fallback={<div className="text-muted-foreground">Yuklanmoqda...</div>}>
        <UsersView />
      </Suspense>
    </div>
  );
}
