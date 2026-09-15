export interface UserSession {
  id: string;
  phone: string;
  name: string;
  role: 'client' | 'master' | 'admin';
  avatarUrl: string | null;
  token: string;
}
