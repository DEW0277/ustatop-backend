export interface UserSession {
  id: string;
  phone: string;
  name: string;
  role: 'client' | 'master' | 'admin';
  avatarUrl?: string;
  // ADMIN uchun `/auth/me` va `/auth/profile` javobida yo'q (sessiya yangilanmaydi) — faqat kirish javoblarida.
  token?: string;
  createdAt: string;
}
