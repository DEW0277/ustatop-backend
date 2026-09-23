'use client';

import { useSyncExternalStore } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardStats } from '@/lib/types';

function subscribe() {
  return () => {};
}

function useIsMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function formatTickDate(dateStr: string) {
  // "YYYY-MM-DD" -> "DD.MM"
  if (!dateStr || dateStr.length < 10) return dateStr;
  const parts = dateStr.split('-');
  return `${parts[2]}.${parts[1]}`;
}

export function TrendChart({ trend }: { trend: DashboardStats['trend'] }) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return <div className="h-72 w-full animate-pulse rounded-md bg-muted/30" />;
  }

  return (
    <div className="h-80 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatTickDate}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            labelFormatter={(label) => `Sana: ${label}`}
            formatter={(value: unknown, name: unknown) => [
              String(value),
              name === 'orders' ? 'Buyurtmalar' : 'Yangi foydalanuvchilar',
            ]}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            formatter={(value: unknown) =>
              value === 'orders' ? 'Buyurtmalar' : 'Yangi foydalanuvchilar'
            }
          />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorOrders)"
          />
          <Area
            type="monotone"
            dataKey="newUsers"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorUsers)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
