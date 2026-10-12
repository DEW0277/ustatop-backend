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

// `GET /admin/masters`
export interface AdminMaster extends PendingMaster {
  rating: number;
  reviewCount: number;
  completedOrdersCount: number;
  isAvailable: boolean;
}

// `GET /admin/stats/dashboard`
export interface DashboardStats {
  users: {
    total: number;
    clients: number;
    masters: number;
    admins: number;
    blocked: number;
  };
  masters: {
    total: number;
    verified: number;
    pending: number;
  };
  orders: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  trend: {
    date: string;
    orders: number;
    newUsers: number;
  }[];
}

// `GET /admin/masters/pending`
export interface PendingMaster {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  telegram?: string;
  avatarUrl?: string;
  bio: string;
  experienceYears: number;
  isVerified: boolean;
  isBlocked: boolean;
  region: { id: string; nameUz: string };
  district: { id: string; nameUz: string };
  address: string;
  categories: { id: string; nameUz: string }[];
  createdAt: string;
}

// `GET /admin/orders`
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  masterId: string;
  masterName: string;
  masterPhone: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  serviceTitle: string;
  price: number;
  region: { id: string; nameUz: string };
  districtId: string;
  districtName: string;
  address: string;
  preferredDate: string;
  preferredTime: string;
  comment?: string;
  status: OrderStatus;
  cancelledBy?: string;
  createdAt: string;
}

// `GET /regions`, `POST/PUT/DELETE /admin/regions`
export interface Region {
  id: string;
  nameUz: string;
  nameRu: string;
  code: string | null;
  createdAt: string;
  _count?: {
    districts: number;
  };
}

// `GET /districts`, `POST/PUT/DELETE /admin/districts`
export interface District {
  id: string;
  nameUz: string;
  nameRu: string;
  regionId: string;
  createdAt: string;
  region?: {
    id: string;
    nameUz: string;
    nameRu: string;
    code: string | null;
  };
}

// `GET /categories`, `POST/PUT/DELETE /admin/categories`
export interface Category {
  id: string;
  nameUz: string;
  nameRu: string;
  slug: string;
  icon: string;
  description: string;
}

// `GET /admin/reviews`
export interface AdminReview {
  id: string;
  masterId: string;
  masterName: string;
  masterPhone: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}


