import { Injectable } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';

const TREND_DAYS = 30;
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000; // Asia/Tashkent — UTC+5, yozgi vaqt yo'q
const DAY_MS = 24 * 60 * 60 * 1000;

interface DailyCount {
  day: string;
  count: number;
}

// Toshkent vaqti bo'yicha "YYYY-MM-DD".
export function toTashkentDay(date: Date): string {
  return new Date(date.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(now = new Date()) {
    const days = Array.from({ length: TREND_DAYS }, (_, index) =>
      toTashkentDay(new Date(now.getTime() - (TREND_DAYS - 1 - index) * DAY_MS)),
    );
    // Birinchi kunning Toshkent vaqtidagi 00:00 payti (UTC'da).
    const since = new Date(Date.parse(`${days[0]}T00:00:00.000Z`) - TASHKENT_OFFSET_MS);

    const [usersByRole, blockedUsers, verifiedMasters, pendingMasters, ordersByStatus, dailyOrders, dailyUsers] =
      await Promise.all([
        this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
        this.prisma.user.count({ where: { isBlocked: true } }),
        this.prisma.masterProfile.count({ where: { isVerified: true } }),
        this.prisma.masterProfile.count({ where: { isVerified: false } }),
        this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
        this.prisma.$queryRaw<DailyCount[]>`
          SELECT to_char("createdAt" AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
          FROM "orders" WHERE "createdAt" >= ${since} GROUP BY day`,
        this.prisma.$queryRaw<DailyCount[]>`
          SELECT to_char("createdAt" AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
          FROM "users" WHERE "createdAt" >= ${since} GROUP BY day`,
      ]);

    const roleCount = (role: Role) => usersByRole.find((row) => row.role === role)?._count._all ?? 0;
    const statusCount = (status: OrderStatus) => ordersByStatus.find((row) => row.status === status)?._count._all ?? 0;
    const orderTotals = Object.fromEntries(dailyOrders.map((row) => [row.day, row.count]));
    const userTotals = Object.fromEntries(dailyUsers.map((row) => [row.day, row.count]));

    return {
      users: {
        total: usersByRole.reduce((sum, row) => sum + row._count._all, 0),
        clients: roleCount(Role.CLIENT),
        masters: roleCount(Role.MASTER),
        admins: roleCount(Role.ADMIN),
        blocked: blockedUsers,
      },
      masters: {
        total: verifiedMasters + pendingMasters,
        verified: verifiedMasters,
        pending: pendingMasters,
      },
      orders: {
        total: ordersByStatus.reduce((sum, row) => sum + row._count._all, 0),
        pending: statusCount(OrderStatus.pending),
        in_progress: statusCount(OrderStatus.in_progress),
        completed: statusCount(OrderStatus.completed),
        cancelled: statusCount(OrderStatus.cancelled),
      },
      // So'nggi 30 kun (bugun ham), bo'sh kunlar 0 bilan to'ldirilgan.
      trend: days.map((day) => ({ date: day, orders: orderTotals[day] ?? 0, newUsers: userTotals[day] ?? 0 })),
    };
  }
}
