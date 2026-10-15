import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from './admin.service.js';

function createDeps() {
  const prisma = {
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    user: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findUnique: vi.fn(), update: vi.fn() },
    masterProfile: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    order: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  };
  const notifications = { notifyUser: vi.fn() };
  const masterProfiles = { createByAdmin: vi.fn() };
  return { prisma, notifications, masterProfiles };
}

describe('AdminService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: AdminService;
  const admin = { id: 'admin-1', phone: '+998900000001', role: 'ADMIN' as const };

  beforeEach(() => {
    deps = createDeps();
    service = new AdminService(deps.prisma as never, deps.notifications as never, deps.masterProfiles as never);
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

  describe('createMaster', () => {
    it("profilni yaratib, ro'yxatdagi bilan bir xil shaklda qaytaradi va bildirishnoma yubormaydi", async () => {
      const dto = { phone: '+998901112233', firstName: 'Ali', lastName: 'Valiyev' } as never;
      deps.masterProfiles.createByAdmin.mockResolvedValue('m-9');
      deps.prisma.masterProfile.findUniqueOrThrow.mockResolvedValue({
        id: 'm-9',
        userId: 'u-9',
        firstName: 'Ali',
        lastName: 'Valiyev',
        phone: '+998901112233',
        telegram: null,
        bio: 'Tajribali usta',
        experienceYears: 3,
        isVerified: true,
        address: 'Manzil',
        createdAt: new Date('2026-10-12T10:00:00.000Z'),
        region: { id: 'r-1', nameUz: 'Toshkent' },
        district: { id: 'd-1', nameUz: 'Chilonzor' },
        categories: [{ category: { id: 'c-1', nameUz: 'Elektrik' } }],
        user: { avatarUrl: null, isBlocked: false },
        rating: 0,
        reviewCount: 0,
        completedOrdersCount: 0,
        isAvailable: true,
      });

      const result = await service.createMaster(dto);

      expect(deps.masterProfiles.createByAdmin).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject({
        id: 'm-9',
        fullName: 'Ali Valiyev',
        isVerified: true,
        isBlocked: false,
        categories: [{ id: 'c-1', nameUz: 'Elektrik' }],
        rating: 0,
        createdAt: '2026-10-12T10:00:00.000Z',
      });
      expect(result).not.toHaveProperty('telegram', null);
      expect(deps.notifications.notifyUser).not.toHaveBeenCalled();
    });

    it("yaratishdagi xatoni (masalan 409) o'zgartirmasdan uzatadi", async () => {
      deps.masterProfiles.createByAdmin.mockRejectedValue(new ForbiddenException('x'));
      await expect(service.createMaster({} as never)).rejects.toBeInstanceOf(ForbiddenException);
      expect(deps.prisma.masterProfile.findUniqueOrThrow).not.toHaveBeenCalled();
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

  describe('listPendingMasters', () => {
    it('kutilayotgan ustalarni faqat isVerified=false bo\'yicha, eng eskisi birinchi qaytaradi', async () => {
      await service.listPendingMasters({});
      expect(deps.prisma.masterProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isVerified: false }, orderBy: { createdAt: 'asc' }, skip: 0, take: 20 }),
      );
    });
  });

  describe('listMasters', () => {
    it('qidiruv, isVerified va regionId filtrlarini qo\'llaydi va createdAt desc tartibida qaytaradi', async () => {
      await service.listMasters({ isVerified: true, regionId: 'r-1', query: ' Ali ', page: 2, limit: 10 });
      expect(deps.prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(deps.prisma.masterProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isVerified: true,
            regionId: 'r-1',
            AND: [
              {
                OR: [
                  { firstName: { contains: 'Ali', mode: 'insensitive' } },
                  { lastName: { contains: 'Ali', mode: 'insensitive' } },
                  { phone: { contains: 'Ali' } },
                ],
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('to\'liq ism ("Ali  Valiyev") har bir so\'z bo\'yicha alohida qidiriladi, 5 tadan ortiq so\'z tashlab yuboriladi', async () => {
      await service.listMasters({ query: 'Ali  Valiyev' });
      const { where } = deps.prisma.masterProfile.findMany.mock.calls[0]![0];
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0].OR[0]).toEqual({ firstName: { contains: 'Ali', mode: 'insensitive' } });
      expect(where.AND[1].OR[1]).toEqual({ lastName: { contains: 'Valiyev', mode: 'insensitive' } });
      expect(where.AND[1].OR[2]).toEqual({ phone: { contains: 'Valiyev' } });

      await service.listMasters({ query: 'a b c d e f g' });
      expect(deps.prisma.masterProfile.findMany.mock.calls[1]![0].where.AND).toHaveLength(5);
    });

    it('isVerified=false filtri tushib qolmaydi (falsy qiymat)', async () => {
      await service.listMasters({ isVerified: false });
      expect(deps.prisma.masterProfile.findMany.mock.calls[0]![0].where).toEqual({ isVerified: false });
    });

    it('bo\'sh yoki faqat probeldan iborat query uchun OR filtri qo\'shilmaydi', async () => {
      await service.listMasters({ query: '   ' });
      const args = deps.prisma.masterProfile.findMany.mock.calls[0]![0];
      expect(args.where).toEqual({});
    });

    it('barcha ustalar ro\'yxatini stats maydonlari (rating, reviewCount, completedOrdersCount, isAvailable) bilan qaytaradi', async () => {
      deps.prisma.masterProfile.count.mockResolvedValue(15);
      deps.prisma.masterProfile.findMany.mockResolvedValue([
        {
          id: 'm-1',
          userId: 'u-1',
          firstName: 'Usta',
          lastName: 'Aliyev',
          phone: '+998901234567',
          telegram: 'usta_ali',
          bio: 'Tajribali usta',
          experienceYears: 5,
          isVerified: true,
          rating: 4.8,
          reviewCount: 12,
          completedOrdersCount: 25,
          isAvailable: true,
          address: 'Chilonzor',
          createdAt: new Date('2026-09-01T00:00:00.000Z'),
          region: { id: 'r-1', nameUz: 'Toshkent' },
          district: { id: 'd-1', nameUz: 'Chilonzor' },
          categories: [{ category: { id: 'c-1', nameUz: 'Santexnik' } }],
          user: { avatarUrl: 'https://example.com/avatar.jpg', isBlocked: false },
        },
      ]);

      const result = await service.listMasters({ page: 1 });
      expect(result.total).toBe(15);
      expect(result.items[0]).toEqual({
        id: 'm-1',
        userId: 'u-1',
        fullName: 'Usta Aliyev',
        phone: '+998901234567',
        telegram: 'usta_ali',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Tajribali usta',
        experienceYears: 5,
        isVerified: true,
        isBlocked: false,
        rating: 4.8,
        reviewCount: 12,
        completedOrdersCount: 25,
        isAvailable: true,
        region: { id: 'r-1', nameUz: 'Toshkent' },
        district: { id: 'd-1', nameUz: 'Chilonzor' },
        address: 'Chilonzor',
        categories: [{ id: 'c-1', nameUz: 'Santexnik' }],
        createdAt: '2026-09-01T00:00:00.000Z',
      });
    });
  });
});
