import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { NavLinks } from '@/components/nav-links';
import { getAdminUser } from '@/lib/session';

// Barcha panel sahifalari uchun haqiqiy auth-to'siq: sessiya yaroqsiz yoki ADMIN emas bo'lsa login'ga qaytadi.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-slate-200 p-4 md:flex dark:border-slate-800">
        <div className="px-3 text-lg font-bold text-indigo-600">UstaTop Admin</div>
        <NavLinks />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-3 dark:border-slate-800">
          <span className="font-semibold text-indigo-600 md:hidden">UstaTop</span>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{user.name}</div>
              <div className="text-slate-500">{user.phone}</div>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
