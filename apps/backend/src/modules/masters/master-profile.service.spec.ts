import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    user: { update: vi.fn() },
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
    masterService: { create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    portfolioImage: { aggregate: vi.fn(), create: vi.fn() },
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
  region: null,
  district: null,
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

  describe('upsert (yaratish)', () => {
    beforeEach(() => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u-1', phone: '+998901234567', role: 'CLIENT' });
      deps.prisma.masterProfile.findUnique.mockResolvedValue(null);
    });

    it("majburiy maydonlar yetishmasa maydon nomlari bilan BadRequest qaytaradi", async () => {
      await expect(service.upsert('u-1', { firstName: 'Ali' } as never)).rejects.toMatchObject({
        response: { errors: expect.objectContaining({ lastName: expect.any(Array), workingHours: expect.any(Array) }) },
      });
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("tuman boshqa viloyatga tegishli bo'lsa rad etadi", async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-1', regionId: 'OTHER' });

      await expect(service.upsert('u-1', validCreate)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("mavjud bo'lmagan kategoriya berilsa rad etadi", async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-1', regionId: 'r-1' });
      deps.prisma.category.count.mockResolvedValue(1);

      await expect(
        service.upsert('u-1', { ...(validCreate as object), categoryIds: ['c-1', 'c-2'] } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("profil yaratadi, telefonni userdan oladi, CLIENT ni MASTER ga o'tkazadi", async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-1', regionId: 'r-1' });
      deps.prisma.category.count.mockResolvedValue(1);
      deps.tx.masterProfile.create.mockResolvedValue({ id: 'm-1', firstName: 'Alisher', lastName: 'Valiyev' });
      deps.prisma.masterProfile.findUniqueOrThrow.mockResolvedValue(fullProfile);

      await service.upsert('u-1', { ...(validCreate as object), categoryIds: ['c-1'] } as never);

      const createData = deps.tx.masterProfile.create.mock.calls[0][0].data;
      expect(createData.phone).toBe('+998901234567');
      expect(createData.userId).toBe('u-1');
      expect(deps.tx.masterCategory.createMany).toHaveBeenCalledWith({
        data: [{ masterId: 'm-1', categoryId: 'c-1' }],
      });
      expect(deps.tx.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { name: 'Alisher Valiyev', role: 'MASTER' },
      });
    });
  });

  describe('upsert (yangilash)', () => {
    it("mavjud profilni qisman yangilaydi va rolni qayta o'zgartirmaydi", async () => {
      deps.prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u-1', phone: '+998901234567', role: 'MASTER' });
      deps.prisma.masterProfile.findUnique.mockResolvedValue({ id: 'm-1', regionId: 'r-1', districtId: 'd-1' });
      deps.tx.masterProfile.update.mockResolvedValue({ id: 'm-1', firstName: 'Alisher', lastName: 'Valiyev' });
      deps.prisma.masterProfile.findUniqueOrThrow.mockResolvedValue(fullProfile);

      await service.upsert('u-1', { bio: 'Yangi bio matni bu yerda' } as never);

      expect(deps.tx.masterProfile.create).not.toHaveBeenCalled();
      expect(deps.tx.masterCategory.deleteMany).not.toHaveBeenCalled();
      expect(deps.tx.user.update.mock.calls[0][0].data).toEqual({ name: 'Alisher Valiyev' });
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

  describe('portfolio', () => {
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
