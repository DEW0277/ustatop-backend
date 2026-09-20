import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { safeNextPath } from '@/lib/request-guard';
import { getAdminUser } from '@/lib/session';

export const metadata = { title: 'Kirish — UstaTop Admin' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(Array.isArray(next) ? next[0] : next);

  // Faqat haqiqiy (backend tasdiqlagan) admin sessiyasi bo'lsa qayta yo'naltiramiz — eskirgan cookie login'ni to'sib qo'ymasin.
  if (await getAdminUser()) {
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
