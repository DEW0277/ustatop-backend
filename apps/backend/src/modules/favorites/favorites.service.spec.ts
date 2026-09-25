import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FavoritesService } from './favorites.service.js';

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
    isVerified: true,
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
        comment: 'Ajoyib usta',
        createdAt: new Date('2026-02-01'),
        user: { name: 'Sardor', avatarUrl: 'https://x/a.jpg' },
      },
    ],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('FavoritesService', () => {
  let prisma: {
    favoriteMaster: {
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    masterProfile: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let service: FavoritesService;

  beforeEach(() => {
    prisma = {
      favoriteMaster: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      masterProfile: {
        findUnique: vi.fn(),
      },
    };
    service = new FavoritesService(prisma as never);
  });

  describe('getFavorites', () => {
    it("foydalanuvchining sevimli ustalari to'liq ro'yxatini toMasterResponse formatida qaytaradi", async () => {
      const mockMaster = masterFixture();
      prisma.favoriteMaster.findMany.mockResolvedValueOnce([
        {
          userId: 'u-current',
          masterId: 'm-1',
          createdAt: new Date(),
          master: mockMaster,
        },
      ]);

      const result = await service.getFavorites('u-current');

      expect(prisma.favoriteMaster.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-current' },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m-1');
      expect(result[0].fullName).toBe('Alisher Valiyev');
      expect(result[0].categoryIds).toEqual(['c-1']);
      expect(result[0].portfolioImages).toEqual(['https://x/y.jpg']);
      expect(result[0].reviews).toHaveLength(1);
    });

    it("agar sevimlilar bo'lmasa, bo'sh massiv qaytaradi", async () => {
      prisma.favoriteMaster.findMany.mockResolvedValueOnce([]);

      const result = await service.getFavorites('u-current');

      expect(result).toEqual([]);
    });
  });

  describe('getFavoriteIds', () => {
    it("faqat sevimli ustalar ID larining massivini qaytaradi", async () => {
      prisma.favoriteMaster.findMany.mockResolvedValueOnce([
        { masterId: 'm-1' },
        { masterId: 'm-2' },
      ]);

      const result = await service.getFavoriteIds('u-current');

      expect(prisma.favoriteMaster.findMany).toHaveBeenCalledWith({
        where: { userId: 'u-current' },
        orderBy: { createdAt: 'desc' },
        select: { masterId: true },
      });

      expect(result).toEqual(['m-1', 'm-2']);
    });
  });

  describe('addFavorite', () => {
    it("usta topilmasa 404 NotFoundException tashlaydi", async () => {
      prisma.masterProfile.findUnique.mockResolvedValueOnce(null);

      await expect(service.addFavorite('u-current', 'm-unknown')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.favoriteMaster.upsert).not.toHaveBeenCalled();
    });

    it("mavjud ustani sevimlilarga qo'shadi va { masterId, isFavorite: true } qaytaradi (idempotent)", async () => {
      prisma.masterProfile.findUnique.mockResolvedValueOnce({ id: 'm-1' });
      prisma.favoriteMaster.upsert.mockResolvedValueOnce({
        userId: 'u-current',
        masterId: 'm-1',
      });

      const result = await service.addFavorite('u-current', 'm-1');

      expect(prisma.favoriteMaster.upsert).toHaveBeenCalledWith({
        where: {
          userId_masterId: {
            userId: 'u-current',
            masterId: 'm-1',
          },
        },
        create: {
          userId: 'u-current',
          masterId: 'm-1',
        },
        update: {},
      });

      expect(result).toEqual({ masterId: 'm-1', isFavorite: true });
    });
  });

  describe('removeFavorite', () => {
    it("sevimlilardan o'chiradi va { masterId, isFavorite: false } qaytaradi (idempotent)", async () => {
      prisma.favoriteMaster.deleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.removeFavorite('u-current', 'm-1');

      expect(prisma.favoriteMaster.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'u-current',
          masterId: 'm-1',
        },
      });

      expect(result).toEqual({ masterId: 'm-1', isFavorite: false });
    });

    it("mavjud bo'lmagan sevimli o'chirilganda ham xato bermasdan { masterId, isFavorite: false } qaytaradi", async () => {
      prisma.favoriteMaster.deleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await service.removeFavorite('u-current', 'm-not-in-favs');

      expect(result).toEqual({ masterId: 'm-not-in-favs', isFavorite: false });
    });
  });
});
