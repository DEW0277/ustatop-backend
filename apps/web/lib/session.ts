import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { backendRequest } from './backend';
import { TOKEN_COOKIE } from './config';
import type { AdminUser } from './types';

export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

// Haqiqiy tekshiruv: token backend'da hali amal qiladimi (bloklanmaganmi) va role ADMIN'mi.
// proxy.ts faqat cookie mavjudligini ko'radi, shuning uchun himoya shu funksiyaga tayanadi.
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const token = await getToken();

  if (!token) {
    return null;
  }

  const { status, body } = await backendRequest('/auth/me', { token });
  const data = (body as { data?: Partial<AdminUser> } | null)?.data;

  if (status !== 200 || !data || data.role !== 'admin' || !data.id) {
    return null;
  }

  return {
    id: data.id,
    phone: data.phone ?? '',
    name: data.name ?? '',
    role: 'admin',
    avatarUrl: data.avatarUrl,
  };
});
