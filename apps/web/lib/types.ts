// Backend javob konverti (apps/backend/src/common/interceptors/response.interceptor.ts).
export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export interface AdminUser {
  id: string;
  phone: string;
  name: string;
  role: 'admin';
  avatarUrl?: string;
}

// Admin ro'yxat endpointlari (docs/TZ.md §4.1).
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type UserRole = 'CLIENT' | 'MASTER' | 'ADMIN';

// `GET /admin/users` qatori.
export interface ManagedUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  isBlocked: boolean;
  isPhoneVerified: boolean;
  masterId?: string;
  createdAt: string;
}
