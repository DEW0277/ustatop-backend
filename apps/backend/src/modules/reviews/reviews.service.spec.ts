import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewsService } from './reviews.service.js';

const reviewRow = {
  id: 'rv-1',
  masterId: 'm-1',
  userId: 'u-1',
  rating: 4,
  comment: 'Yaxshi',
  createdAt: new Date('2026-04-01T00:00:00.000Z'),
  user: { name: 'Sardor', avatarUrl: null },
};

const adminReviewRow = {
  id: 'rv-1',
  masterId: 'm-1',
  userId: 'u-1',
  rating: 4,
  comment: 'Yaxshi',
  createdAt: new Date('2026-04-01T00:00:00.000Z'),
  user: { id: 'u-1', name: 'Sardor', phone: '+998901112233', avatarUrl: null },
  master: { id: 'm-1', firstName: 'Ali', lastName: 'Valiyev', phone: '+998909998877' },
};

function createDeps() {
  const tx = {
    review: { upsert: vi.fn().mockResolvedValue(reviewRow), aggregate: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    masterProfile: { update: vi.fn() },
  };
  const prisma = {
    masterProfile: { findFirst: vi.fn().mockResolvedValue({ id: 'm-1', userId: 'master-user' }) },
    review: { findMany: vi.fn().mockResolvedValue([reviewRow]), count: vi.fn().mockResolvedValue(1) },
    order: { findFirst: vi.fn().mockResolvedValue({ id: 'o-1' }) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

describe('ReviewsService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: ReviewsService;

  beforeEach(() => {
    deps = createDeps();
    service = new ReviewsService(deps.prisma as never);
  });

  describe('findByMaster', () => {
    it('mobil Review shaklida, yangisi birinchi, sahifalab qaytaradi', async () => {
      const result = await service.findByMaster('m-1', { page: 2, limit: 10 });

      expect(result[0]).toEqual({
        id: 'rv-1',
        masterId: 'm-1',
        userId: 'u-1',
        userName: 'Sardor',
        userAvatar: '',
        rating: 4,
        comment: 'Yaxshi',
        createdAt: '2026-04-01T00:00:00.000Z',
      });
      const args = deps.prisma.review.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
    });

    it("mavjud bo'lmagan usta uchun 404", async () => {
      deps.prisma.masterProfile.findFirst.mockResolvedValue(null);

      await expect(service.findByMaster('nope', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createOrUpdate', () => {
    it("o'z profiliga sharh qoldira olmaydi", async () => {
      await expect(service.createOrUpdate('master-user', 'm-1', { rating: 5, comment: 'Zo`r' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("shu ustada tugallangan buyurtmasi yo'q foydalanuvchi sharh qoldira olmaydi (403)", async () => {
      deps.prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.createOrUpdate('u-1', 'm-1', { rating: 5, comment: 'Zo`r' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("buyurtma aynan shu usta, shu mijoz va completed holati bo'yicha qidiriladi", async () => {
      deps.tx.review.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 1 } });

      await service.createOrUpdate('u-1', 'm-1', { rating: 4, comment: 'Yaxshi' });

      expect(deps.prisma.order.findFirst.mock.calls[0][0].where).toEqual({
        masterId: 'm-1',
        clientId: 'u-1',
        status: 'completed',
      });
    });

    it("bir foydalanuvchi bir usta uchun upsert qiladi (dublikat yaratmaydi)", async () => {
      deps.tx.review.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 1 } });

      await service.createOrUpdate('u-1', 'm-1', { rating: 4, comment: 'Yaxshi' });

      expect(deps.tx.review.upsert.mock.calls[0][0].where).toEqual({ masterId_userId: { masterId: 'm-1', userId: 'u-1' } });
    });

    it("reyting va sharhlar sonini qayta hisoblaydi (2 xonagacha yaxlitlab)", async () => {
      deps.tx.review.aggregate.mockResolvedValue({ _avg: { rating: 4.3333333 }, _count: { _all: 3 } });

      await service.createOrUpdate('u-1', 'm-1', { rating: 4, comment: 'Yaxshi' });

      expect(deps.tx.masterProfile.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: { rating: 4.33, reviewCount: 3 },
      });
    });
  });

  describe('remove (moderatsiya)', () => {
    it("mavjud bo'lmagan sharh uchun 404 va hech narsa o'chirilmaydi", async () => {
      deps.tx.review.findUnique.mockResolvedValue(null);

      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.tx.review.delete).not.toHaveBeenCalled();
    });

    it("sharhni o'chirib, usta reytingini qayta hisoblaydi", async () => {
      deps.tx.review.findUnique.mockResolvedValue({ id: 'rv-1', masterId: 'm-1' });
      deps.tx.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 2 } });

      expect(await service.remove('rv-1')).toEqual({ id: 'rv-1', masterId: 'm-1' });
      expect(deps.tx.review.delete).toHaveBeenCalledWith({ where: { id: 'rv-1' } });
      expect(deps.tx.masterProfile.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: { rating: 4.5, reviewCount: 2 },
      });
    });

    it("oxirgi sharh o'chirilganda reyting 0 ga tushadi", async () => {
      deps.tx.review.findUnique.mockResolvedValue({ id: 'rv-1', masterId: 'm-1' });
      deps.tx.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });

      await service.remove('rv-1');

      expect(deps.tx.masterProfile.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: { rating: 0, reviewCount: 0 },
      });
    });
  });

  describe('listForAdmin', () => {
    it('admin uchun sharhlar ro`yxatini sahifalab va formatlab qaytaradi', async () => {
      deps.prisma.review.findMany.mockResolvedValue([adminReviewRow]);
      deps.prisma.review.count.mockResolvedValue(1);

      const result = await service.listForAdmin({});

      expect(result).toEqual({
        items: [
          {
            id: 'rv-1',
            masterId: 'm-1',
            masterName: 'Ali Valiyev',
            masterPhone: '+998909998877',
            userId: 'u-1',
            userName: 'Sardor',
            userPhone: '+998901112233',
            userAvatar: undefined,
            rating: 4,
            comment: 'Yaxshi',
            createdAt: '2026-04-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      expect(deps.prisma.review.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          master: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('masterId va rating bo`yicha filtrlaydi va sahifalash parametrlarini hisobga oladi', async () => {
      deps.prisma.review.findMany.mockResolvedValue([]);
      deps.prisma.review.count.mockResolvedValue(0);

      await service.listForAdmin({ masterId: 'm-1', rating: 5, page: 3, limit: 10 });

      expect(deps.prisma.review.findMany).toHaveBeenCalledWith({
        where: { masterId: 'm-1', rating: 5 },
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          master: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: 20,
        take: 10,
      });
      expect(deps.prisma.review.count).toHaveBeenCalledWith({
        where: { masterId: 'm-1', rating: 5 },
      });
    });
  });
});
