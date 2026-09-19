import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MasterSortBy } from './dto/list-masters-query.dto.js';
import { MastersService } from './masters.service.js';

function masterFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm-1',
    userId: 'u-1',
    firstName: 'Alisher',
    lastName: 'Valiyev',
    phone: '+998901234567',
    telegram: null,
    bio: 'Tajribali elektrik',
    experienceYears: 5,
    rating: 4.5,
    reviewCount: 2,
    completedOrdersCount: 7,
    isVerified: false,
    isAvailable: true,
    user: { avatarUrl: null },
    regionId: 'r-1',
    districtId: 'd-1',
    address: 'Chilonzor 9',
    workingHours: { start: '09:00', end: '18:00', workDays: ['mon'] },
    categories: [{ categoryId: 'c-1' }],
    services: [{ id: 's-1', title: 'Rozetka', price: 50000, priceType: 'fixed', currency: 'UZS' }],
    portfolio: [{ id: 'p-1', url: 'https://x/y.jpg', sortOrder: 0 }],
    reviews: [
      {
        id: 'rv-1',
        masterId: 'm-1',
        userId: 'u-9',
        rating: 5,
        comment: 'Zo`r',
        createdAt: new Date('2026-02-01'),
        user: { name: 'Sardor', avatarUrl: 'https://x/a.jpg' },
      },
    ],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('MastersService', () => {
  let prisma: { masterProfile: { findMany: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> } };
  let service: MastersService;

  beforeEach(() => {
    prisma = { masterProfile: { findMany: vi.fn(), findFirst: vi.fn() } };
    service = new MastersService(prisma as never);
  });

  describe('findAll', () => {
    it("standart bo'yicha reyting bo'yicha saralaydi va 1-sahifa/20 limit qo'llaydi", async () => {
      prisma.masterProfile.findMany.mockResolvedValue([masterFixture()]);

      await service.findAll({});

      const args = prisma.masterProfile.findMany.mock.calls[0][0];
      expect(args.orderBy[0]).toEqual({ rating: 'desc' });
      expect(args.skip).toBe(0);
      expect(args.take).toBe(20);
      expect(args.where.user).toEqual({ isBlocked: false });
    });

    it('mobil ilovadagi Master tipi shaklida javob qaytaradi', async () => {
      prisma.masterProfile.findMany.mockResolvedValue([masterFixture({ telegram: null })]);

      const [master] = await service.findAll({});

      expect(master).toMatchObject({
        id: 'm-1',
        fullName: 'Alisher Valiyev',
        avatarUrl: '',
        regionId: 'r-1',
        districtId: 'd-1',
        categoryIds: ['c-1'],
        portfolioImages: ['https://x/y.jpg'],
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(master.telegram).toBeUndefined();
      expect(master.reviews[0]).toEqual({
        id: 'rv-1',
        masterId: 'm-1',
        userId: 'u-9',
        userName: 'Sardor',
        userAvatar: 'https://x/a.jpg',
        rating: 5,
        comment: 'Zo`r',
        createdAt: '2026-02-01T00:00:00.000Z',
      });
      expect(master).not.toHaveProperty('region');
    });

    it('filtrlar va sahifalashni where/skip/take ga aylantiradi', async () => {
      prisma.masterProfile.findMany.mockResolvedValue([]);

      await service.findAll({
        regionId: 'r-1',
        districtId: 'd-1',
        categoryId: 'c-1',
        sortBy: MasterSortBy.experience,
        page: 3,
        limit: 10,
      });

      const args = prisma.masterProfile.findMany.mock.calls[0][0];
      expect(args.where.regionId).toBe('r-1');
      expect(args.where.districtId).toBe('d-1');
      expect(args.where.categories).toEqual({ some: { categoryId: 'c-1' } });
      expect(args.orderBy[0]).toEqual({ experienceYears: 'desc' });
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
    });

    it("qidiruv so'zi ism, familiya, bio va xizmat nomi bo'yicha OR shart yaratadi", async () => {
      prisma.masterProfile.findMany.mockResolvedValue([]);

      await service.findAll({ query: '  rozetka ' });

      const or = prisma.masterProfile.findMany.mock.calls[0][0].where.OR;
      expect(or).toHaveLength(4);
      expect(or[3]).toEqual({ services: { some: { title: { contains: 'rozetka', mode: 'insensitive' } } } });
    });

    it("bo'sh qidiruv (faqat bo'shliq) OR shartini qo'shmaydi", async () => {
      prisma.masterProfile.findMany.mockResolvedValue([]);

      await service.findAll({ query: '   ' });

      expect(prisma.masterProfile.findMany.mock.calls[0][0].where.OR).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('bloklanmagan ustani qaytaradi', async () => {
      prisma.masterProfile.findFirst.mockResolvedValue(masterFixture());

      const result = await service.findOne('m-1');

      expect(prisma.masterProfile.findFirst.mock.calls[0][0].where).toEqual({
        id: 'm-1',
        user: { isBlocked: false },
      });
      expect(result.id).toBe('m-1');
    });

    it('topilmasa NotFoundException otadi', async () => {
      prisma.masterProfile.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
