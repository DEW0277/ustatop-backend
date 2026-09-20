import { describe, expect, it, vi } from 'vitest';
import { AdminStatsService, toTashkentDay } from './admin-stats.service.js';

describe('toTashkentDay', () => {
  it('UTC 19:30 Toshkentda ertasi kun hisoblanadi', () => {
    expect(toTashkentDay(new Date('2026-09-20T19:30:00.000Z'))).toBe('2026-09-21');
    expect(toTashkentDay(new Date('2026-09-20T18:59:00.000Z'))).toBe('2026-09-20');
  });
});

describe('AdminStatsService.getDashboard', () => {
  it("guruhlangan hisoblarni yig'adi va trendni 30 kunga to'ldiradi", async () => {
    const prisma = {
      user: {
        groupBy: vi.fn().mockResolvedValue([
          { role: 'CLIENT', _count: { _all: 10 } },
          { role: 'MASTER', _count: { _all: 4 } },
        ]),
        count: vi.fn().mockResolvedValue(2),
      },
      masterProfile: { count: vi.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1) },
      order: { groupBy: vi.fn().mockResolvedValue([{ status: 'pending', _count: { _all: 5 } }, { status: 'completed', _count: { _all: 7 } }]) },
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ day: '2026-09-20', count: 4 }])
        .mockResolvedValueOnce([{ day: '2026-09-01', count: 2 }]),
    };
    const service = new AdminStatsService(prisma as never);

    const result = await service.getDashboard(new Date('2026-09-20T10:00:00.000Z'));

    expect(result.users).toEqual({ total: 14, clients: 10, masters: 4, admins: 0, blocked: 2 });
    expect(result.masters).toEqual({ total: 4, verified: 3, pending: 1 });
    expect(result.orders).toEqual({ total: 12, pending: 5, in_progress: 0, completed: 7, cancelled: 0 });
    expect(result.trend).toHaveLength(30);
    expect(result.trend[0]).toEqual({ date: '2026-08-22', orders: 0, newUsers: 0 });
    expect(result.trend[29]).toEqual({ date: '2026-09-20', orders: 4, newUsers: 0 });
    expect(result.trend.find((day) => day.date === '2026-09-01')?.newUsers).toBe(2);
  });
});
