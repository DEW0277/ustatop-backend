import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from './admin.service.js';

function createDeps() {
  const prisma = {
    user: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findUnique: vi.fn(), update: vi.fn() },
    masterProfile: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findUnique: vi.fn(), update: vi.fn() },
    order: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  };
  const notifications = { notifyUser: vi.fn() };
  return { prisma, notifications };
}

describe('AdminService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: AdminService;
  const admin = { id: 'admin-1', phone: '+998900000001', role: 'ADMIN' as const };

  beforeEach(() => {
    deps = createDeps();
    service = new AdminService(deps.prisma as never, deps.notifications as never);
  });

  describe('setUserBlocked', () => {
    it("o'zini bloklashga ruxsat bermaydi", async () => {
      await expect(service.setUserBlocked(admin, 'admin-1', true)).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.prisma.user.update).not.toHaveBeenCalled();
    });

    it("boshqa administratorni bloklashga ruxsat bermaydi", async () => {
      deps.prisma.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'ADMIN' });
      await expect(service.setUserBlocked(admin, 'admin-2', true)).rejects.toBeInstanceOf(ForbiddenException);
      expect(deps.prisma.user.update).not.toHaveBeenCalled();
    });

    it("mavjud bo'lmagan foydalanuvchi uchun 404 qaytaradi", async () => {
      deps.prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setUserBlocked(admin, 'nope', true)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('oddiy foydalanuvchini bloklaydi va blokdan chiqaradi', async () => {
      deps.prisma.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'CLIENT' });
      expect(await service.setUserBlocked(admin, 'u-1', true)).toEqual({ id: 'u-1', isBlocked: true });
      expect(deps.prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { isBlocked: true } });
      expect(await service.setUserBlocked(admin, 'u-1', false)).toEqual({ id: 'u-1', isBlocked: false });
    });
  });

  describe('setMasterVerified', () => {
    it("mavjud bo'lmagan usta uchun 404 qaytaradi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue(null);
      await expect(service.setMasterVerified('nope', true)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('birinchi tasdiqlashda ustaga bildirishnoma yuboradi', async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', userId: 'mu-1', isVerified: false });
      expect(await service.setMasterVerified('m-1', true)).toEqual({ id: 'm-1', isVerified: true });
      expect(deps.notifications.notifyUser).toHaveBeenCalledWith('mu-1', expect.objectContaining({ data: { type: 'master_verified', masterId: 'm-1' } }));
    });

    it("allaqachon tasdiqlangan ustaga qayta bildirishnoma yubormaydi, tasdiqni bekor qilishda ham", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', userId: 'mu-1', isVerified: true });
      await service.setMasterVerified('m-1', true);
      await service.setMasterVerified('m-1', false);
      expect(deps.notifications.notifyUser).not.toHaveBeenCalled();
      expect(deps.prisma.masterProfile.update).toHaveBeenLastCalledWith({ where: { id: 'm-1' }, data: { isVerified: false } });
    });
  });

  describe('listOrders', () => {
    it("`from` > `to` bo'lsa 400 qaytaradi", async () => {
      await expect(
        service.listOrders({ from: new Date('2026-09-10'), to: new Date('2026-09-01') }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("`to` sanasi (00:00 UTC) butun kunni qamrab oladi", async () => {
      await service.listOrders({ from: new Date('2026-09-01'), to: new Date('2026-09-30') });
      const where = deps.prisma.order.findMany.mock.calls[0]![0].where;
      expect(where.createdAt).toEqual({ gte: new Date('2026-09-01'), lt: new Date('2026-10-01') });
    });

    it("aniq vaqtli `to` o'zgartirilmaydi va status/viloyat filtrlari qo'llanadi", async () => {
      await service.listOrders({ to: new Date('2026-09-30T12:30:00.000Z'), status: 'pending', regionId: 'r-1', page: 2, limit: 10 });
      const args = deps.prisma.order.findMany.mock.calls[0]![0];
      expect(args.where).toEqual({
        status: 'pending',
        district: { regionId: 'r-1' },
        createdAt: { lt: new Date('2026-09-30T12:30:00.000Z') },
      });
      expect(args).toMatchObject({ skip: 10, take: 10 });
    });
  });

  describe('listUsers', () => {
    it('qidiruv, role va isBlocked=false filtrlarini qo\'llaydi', async () => {
      await service.listUsers({ role: 'MASTER', isBlocked: false, query: ' Ali ' });
      const where = deps.prisma.user.findMany.mock.calls[0]![0].where;
      expect(where).toEqual({
        role: 'MASTER',
        isBlocked: false,
        OR: [{ name: { contains: 'Ali', mode: 'insensitive' } }, { phone: { contains: 'Ali' } }],
      });
    });

    it("natijani sahifalangan shaklda va ISO sana bilan qaytaradi", async () => {
      deps.prisma.user.count.mockResolvedValue(41);
      deps.prisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1', phone: '+998901234567', name: 'Ali', role: 'MASTER', avatarUrl: null, isBlocked: false,
          isPhoneVerified: true, createdAt: new Date('2026-09-01T00:00:00.000Z'), masterProfile: { id: 'm-1', isVerified: false },
        },
      ]);
      const result = await service.listUsers({ page: 3 });
      expect(result.total).toBe(41);
      expect(result).toMatchObject({ page: 3, limit: 20 });
      expect(result.items[0]).toMatchObject({ id: 'u-1', masterId: 'm-1', createdAt: '2026-09-01T00:00:00.000Z' });
      expect(result.items[0]).not.toHaveProperty('masterProfile');
    });
  });

  it('kutilayotgan ustalarni faqat isVerified=false bo\'yicha, eng eskisi birinchi qaytaradi', async () => {
    await service.listPendingMasters({});
    expect(deps.prisma.masterProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isVerified: false }, orderBy: { createdAt: 'asc' }, skip: 0, take: 20 }),
    );
  });
});
