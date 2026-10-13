import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterProfileService } from './master-profile.service.js';

const validCreate = {
  firstName: 'Alisher',
  lastName: 'Valiyev',
  bio: 'Tajribali elektrik usta',
  regionId: 'r-1',
  districtId: 'd-1',
  address: 'Chilonzor 9-daha',
  workingHours: { start: '09:00', end: '18:00', workDays: ['mon', 'tue'] },
} as never;

function createDeps() {
  const tx = {
    masterProfile: { update: vi.fn(), create: vi.fn() },
    masterCategory: { deleteMany: vi.fn(), createMany: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  };
  const prisma = {
    user: { findUniqueOrThrow: vi.fn() },
    masterProfile: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    district: { findUnique: vi.fn() },
    category: { count: vi.fn() },
    masterService: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    portfolioImage: { aggregate: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

const fullProfile = {
  id: 'm-1',
  userId: 'u-1',
  firstName: 'Alisher',
  lastName: 'Valiyev',
  phone: '+998901234567',
  telegram: null,
  bio: 'x',
  experienceYears: 0,
  rating: 0,
  reviewCount: 0,
  completedOrdersCount: 0,
  isVerified: false,
  isAvailable: true,
  user: { avatarUrl: null },
  regionId: 'r-1',
  districtId: 'd-1',
  address: 'a',
  workingHours: {},
  categories: [],
  services: [],
  portfolio: [],
  reviews: [],
  createdAt: new Date(),
};

describe('MasterProfileService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: MasterProfileService;

  beforeEach(() => {
    deps = createDeps();
    service = new MasterProfileService(deps.prisma as never);
  });

  describe('getMine', () => {
    it('profil bo`lmasa NotFoundException otadi', async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMine('u-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it("profili yo'q foydalanuvchi o'zi usta bo'la olmaydi (403) — profilni faqat admin yaratadi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue(null);

      await expect(service.update('u-1', validCreate)).rejects.toBeInstanceOf(ForbiddenException);
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
      expect(deps.tx.masterProfile.create).not.toHaveBeenCalled();
    });

    it("tuman boshqa viloyatga tegishli bo'lsa rad etadi (faqat tuman yuborilsa mavjud viloyat bilan solishtiriladi)", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', regionId: 'r-1', districtId: 'd-1' });
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-2', regionId: 'OTHER' });

      await expect(service.update('u-1', { districtId: 'd-2' } as never)).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("mavjud bo'lmagan kategoriya berilsa rad etadi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', regionId: 'r-1', districtId: 'd-1' });
      deps.prisma.category.count.mockResolvedValue(1);

      await expect(service.update('u-1', { categoryIds: ['c-1', 'c-2'] } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("mavjud profilni qisman yangilaydi, kategoriyalarga tegmaydi va rolni o'zgartirmaydi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', regionId: 'r-1', districtId: 'd-1' });
      deps.tx.masterProfile.update.mockResolvedValue({ id: 'm-1', firstName: 'Alisher', lastName: 'Valiyev' });
      deps.prisma.masterProfile.findUniqueOrThrow.mockResolvedValue(fullProfile);

      await service.update('u-1', { bio: 'Yangi bio matni bu yerda' } as never);

      expect(deps.tx.masterProfile.create).not.toHaveBeenCalled();
      expect(deps.tx.masterCategory.deleteMany).not.toHaveBeenCalled();
      expect(deps.tx.user.update.mock.calls[0][0].data).toEqual({ name: 'Alisher Valiyev' });
    });

    it("categoryIds berilsa kategoriyalarni to'liq almashtiradi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', regionId: 'r-1', districtId: 'd-1' });
      deps.prisma.category.count.mockResolvedValue(1);
      deps.tx.masterProfile.update.mockResolvedValue({ id: 'm-1', firstName: 'Alisher', lastName: 'Valiyev' });
      deps.prisma.masterProfile.findUniqueOrThrow.mockResolvedValue(fullProfile);

      await service.update('u-1', { categoryIds: ['c-1'] } as never);

      expect(deps.tx.masterCategory.deleteMany).toHaveBeenCalledWith({ where: { masterId: 'm-1' } });
      expect(deps.tx.masterCategory.createMany).toHaveBeenCalledWith({ data: [{ masterId: 'm-1', categoryId: 'c-1' }] });
    });
  });

  describe('createByAdmin', () => {
    const input = { ...(validCreate as object), phone: '+998901112233' } as never;

    beforeEach(() => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-1', regionId: 'r-1' });
      deps.tx.user.findUnique.mockResolvedValue(null);
      deps.tx.user.create.mockResolvedValue({ id: 'u-new' });
      deps.tx.user.update.mockResolvedValue({ id: 'u-1' });
      deps.tx.masterProfile.create.mockResolvedValue({ id: 'm-new' });
    });

    it("akkaunt yo'q bo'lsa MASTER rolida yaratadi va profilni standart tasdiqlangan holda qo'shadi", async () => {
      expect(await service.createByAdmin(input)).toBe('m-new');

      expect(deps.tx.user.create).toHaveBeenCalledWith({
        data: { phone: '+998901112233', name: 'Alisher Valiyev', role: 'MASTER' },
      });
      expect(deps.tx.masterProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u-new', phone: '+998901112233', isVerified: true, experienceYears: 0 }),
      });
      expect(deps.tx.masterCategory.createMany).not.toHaveBeenCalled();
    });

    it("mavjud CLIENT'ga profil biriktiradi, rolni MASTER qiladi; isVerified=false va kategoriyalar saqlanadi", async () => {
      deps.tx.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'CLIENT', isBlocked: false, masterProfile: null });
      deps.prisma.category.count.mockResolvedValue(2);

      await service.createByAdmin({ ...(input as object), isVerified: false, categoryIds: ['c-1', 'c-2'] } as never);

      expect(deps.tx.user.create).not.toHaveBeenCalled();
      expect(deps.tx.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { name: 'Alisher Valiyev', role: 'MASTER' },
      });
      expect(deps.tx.masterProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u-1', isVerified: false }),
      });
      expect(deps.tx.masterCategory.createMany).toHaveBeenCalledWith({
        data: [
          { masterId: 'm-new', categoryId: 'c-1' },
          { masterId: 'm-new', categoryId: 'c-2' },
        ],
      });
    });

    it("usta profili bor raqam uchun 409, hech narsa yaratilmaydi", async () => {
      deps.tx.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'MASTER', isBlocked: false, masterProfile: { id: 'm-1' } });

      await expect(service.createByAdmin(input)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.tx.masterProfile.create).not.toHaveBeenCalled();
      expect(deps.tx.user.update).not.toHaveBeenCalled();
    });

    it("administrator raqamini rad etadi (400) va uning rolini o'zgartirmaydi", async () => {
      deps.tx.user.findUnique.mockResolvedValue({ id: 'a-1', role: 'ADMIN', isBlocked: false, masterProfile: null });

      await expect(service.createByAdmin(input)).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.tx.user.update).not.toHaveBeenCalled();
    });

    it("bloklangan foydalanuvchi uchun 409", async () => {
      deps.tx.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'CLIENT', isBlocked: true, masterProfile: null });

      await expect(service.createByAdmin(input)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.tx.masterProfile.create).not.toHaveBeenCalled();
    });

    it("tuman boshqa viloyatga tegishli bo'lsa tranzaksiyani boshlamaydi", async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-1', regionId: 'r-OTHER' });

      await expect(service.createByAdmin(input)).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("parallel so'rov raqamni band qilgan bo'lsa (P2002) 500 emas, 409 qaytaradi", async () => {
      deps.tx.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
      );

      await expect(service.createByAdmin(input)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('xizmatlar', () => {
    it("profili yo'q foydalanuvchi xizmat qo'sha olmaydi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue(null);

      await expect(service.addService('u-1', { title: 'x', price: 1 })).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.prisma.masterService.create).not.toHaveBeenCalled();
    });

    it("boshqa ustaning xizmatini o'chirishga urinish NotFound bo'ladi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.masterService.findFirst.mockResolvedValue(null);

      await expect(service.removeService('u-1', 's-other')).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.prisma.masterService.findFirst).toHaveBeenCalledWith({
        where: { id: 's-other', masterId: 'm-1' },
      });
      expect(deps.prisma.masterService.delete).not.toHaveBeenCalled();
    });

    it("o'z xizmatini o'chiradi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.masterService.findFirst.mockResolvedValue({ id: 's-1' });

      const result = await service.removeService('u-1', 's-1');

      expect(result).toEqual({ id: 's-1' });
      expect(deps.prisma.masterService.delete).toHaveBeenCalledWith({ where: { id: 's-1' } });
    });
  });

  describe('xizmatni tahrirlash', () => {
    it("boshqa ustaning xizmatini tahrirlab bo'lmaydi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.masterService.findFirst.mockResolvedValue(null);

      await expect(service.updateService('u-1', 's-other', { price: 1 })).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.prisma.masterService.update).not.toHaveBeenCalled();
    });

    it("o'z xizmatini qisman yangilaydi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.masterService.findFirst.mockResolvedValue({ id: 's-1' });
      deps.prisma.masterService.update.mockResolvedValue({
        id: 's-1',
        title: 'Rozetka',
        price: 70000,
        priceType: 'fixed',
        currency: 'UZS',
      });

      const result = await service.updateService('u-1', 's-1', { price: 70000 });

      expect(deps.prisma.masterService.update.mock.calls[0][0].where).toEqual({ id: 's-1' });
      expect(result.price).toBe(70000);
    });
  });

  describe('portfolio', () => {
    it("URL bo'yicha faqat o'z rasmini o'chiradi, topilmasa NotFound", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.portfolioImage.deleteMany.mockResolvedValueOnce({ count: 1 });
      deps.prisma.portfolioImage.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.removePortfolioImage('u-1', 'https://x/y.jpg')).resolves.toEqual({ url: 'https://x/y.jpg' });
      expect(deps.prisma.portfolioImage.deleteMany).toHaveBeenCalledWith({
        where: { masterId: 'm-1', url: 'https://x/y.jpg' },
      });
      await expect(service.removePortfolioImage('u-1', 'https://x/none.jpg')).rejects.toBeInstanceOf(NotFoundException);
    });

    it("sortOrder ni mavjud maksimumdan keyingisiga qo'yadi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.portfolioImage.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
      deps.prisma.portfolioImage.create.mockResolvedValue({ id: 'p-1', url: 'https://x/y.jpg', sortOrder: 5 });

      await service.addPortfolioImage('u-1', { url: 'https://x/y.jpg' });

      expect(deps.prisma.portfolioImage.create.mock.calls[0][0].data.sortOrder).toBe(5);
    });

    it("birinchi rasm uchun sortOrder 0 bo'ladi", async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.portfolioImage.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      deps.prisma.portfolioImage.create.mockResolvedValue({ id: 'p-1', url: 'u', sortOrder: 0 });

      await service.addPortfolioImage('u-1', { url: 'https://x/y.jpg' });

      expect(deps.prisma.portfolioImage.create.mock.calls[0][0].data.sortOrder).toBe(0);
    });
  });

  describe('availability', () => {
    it('holatni yangilab to`liq profilni qaytaradi', async () => {
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1' });
      deps.prisma.masterProfile.update.mockResolvedValue({ ...fullProfile, isAvailable: false });

      const result = await service.setAvailability('u-1', false);

      expect(deps.prisma.masterProfile.update.mock.calls[0][0].data).toEqual({ isAvailable: false });
      expect(result.isAvailable).toBe(false);
    });
  });
});
