'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShoppingBag,
  Users,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api } from '@/lib/api-client';
import type { DashboardStats } from '@/lib/types';
import { TrendChart } from './trend-chart';

export const DASHBOARD_STATS_QUERY_KEY = ['admin', 'stats', 'dashboard'] as const;

export function DashboardView() {
  const query = useQuery({
    queryKey: DASHBOARD_STATS_QUERY_KEY,
    queryFn: () => api<DashboardStats>('/admin/stats/dashboard'),
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div className="font-semibold text-destructive">
            {query.error instanceof ApiError ? query.error.message : 'Statistikani yuklashda xatolik'}
          </div>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Qayta urinish
          </Button>
        </CardContent>
      </Card>
    );
  }

  const stats = query.data;
  if (!stats) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* 3 ta asosiy ko'rsatkich kartalari */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Foydalanuvchilar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Foydalanuvchilar
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">{stats.users.total}</div>
              {stats.users.blocked > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <ShieldAlert className="h-3 w-3" />
                  {stats.users.blocked} bloklangan
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 border-t pt-3 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground">{stats.users.clients}</span>
                <span>Mijozlar</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">{stats.users.masters}</span>
                <span>Ustalar</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">{stats.users.admins}</span>
                <span>Adminlar</span>
              </div>
            </div>
            <Link
              href="/users"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Foydalanuvchilar ro&apos;yxati <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Ustalar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ustalar
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">{stats.masters.total}</div>
              {stats.masters.pending > 0 ? (
                <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
                  <Clock className="h-3 w-3" />
                  {stats.masters.pending} kutilmoqda
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Hammasi ko&apos;rilgan
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground">{stats.masters.verified}</span>
                <span>Tasdiqlangan</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">{stats.masters.pending}</span>
                <span>Kutilayotganlar</span>
              </div>
            </div>
            <Link
              href="/masters"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Tasdiqlash bo&apos;limi <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Buyurtmalar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buyurtmalar
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-bold">{stats.orders.total}</div>
              <Badge variant="outline">
                {stats.orders.in_progress} ta faol
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-1 border-t pt-3 text-xs text-muted-foreground">
              <div>
                <span className="block font-medium text-foreground">{stats.orders.pending}</span>
                <span>Kutilmoqda</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">{stats.orders.in_progress}</span>
                <span>Jarayonda</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">{stats.orders.completed}</span>
                <span>Bajarildi</span>
              </div>
              <div>
                <span className="block font-medium text-foreground">{stats.orders.cancelled}</span>
                <span>Bekor</span>
              </div>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Buyurtmalar ro&apos;yxati <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 30 kunlik trend grafigi */}
      <Card>
        <CardHeader>
          <CardTitle>Faollik trendi</CardTitle>
          <p className="text-sm text-muted-foreground">
            So&apos;nggi 30 kunlik buyurtmalar va yangi foydalanuvchilar dinamikasi
          </p>
        </CardHeader>
        <CardContent>
          <TrendChart trend={stats.trend} />
        </CardContent>
      </Card>
    </div>
  );
}
