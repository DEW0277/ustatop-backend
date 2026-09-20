import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrdersView } from './dto/list-orders-query.dto.js';
import { OrdersService } from './orders.service.js';

const dto = {
  masterId: 'm-1',
  serviceTitle: 'Xizmat',
  price: 1,
  clientName: 'Jasur',
  clientPhone: '+998901234567',
  districtId: 'd-1',
  address: 'Chilonzor 9',
  preferredDate: 'Bugun',
  preferredTime: '12:00 - 15:00',
} as never;

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o-1',
    masterId: 'm-1',
    clientId: 'client-1',
    serviceId: null,
    serviceTitle: 'Rozetka',
    price: 50000,
    clientName: 'Jasur',
    clientPhone: '+998901234567',
    districtId: 'd-1',
    address: 'Chilonzor 9',
    preferredDate: 'Bugun',
    preferredTime: '12:00 - 15:00',
    comment: null,
    status: 'pending',
    cancelledBy: null,
    createdAt: new Date('2026-03-01T10:00:00.000Z'),
    master: { userId: 'master-user', firstName: 'Alisher', lastName: 'Qodirov', phone: '+998901112233', user: { avatarUrl: null } },
    ...overrides,
  };
}

function createDeps() {
  const tx = { order: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, masterProfile: { update: vi.fn() } };
  const prisma = {
    masterProfile: { findFirst: vi.fn() },
    district: { findUnique: vi.fn() },
    masterService: { findFirst: vi.fn() },
    order: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const notifications = { notifyUser: vi.fn() };
  return { prisma, tx, notifications };
}

describe('OrdersService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: OrdersService;
  const master = { id: 'm-1', userId: 'master-user', isAvailable: true };
  const clientUser = { id: 'client-1', phone: '+998901234567', role: 'CLIENT' as const };
  const masterUser = { id: 'master-user', phone: '+998901112233', role: 'MASTER' as const };
  const stranger = { id: 'stranger', phone: '+998900000000', role: 'CLIENT' as const };

  beforeEach(() => {
    deps = createDeps();
    service = new OrdersService(deps.prisma as never, deps.notifications as never);
  });

  describe('create', () => {
    beforeEach(() => {
      deps.prisma.masterProfile.findFirst.mockResolvedValue(master);
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'd-1' });
      deps.prisma.order.create.mockResolvedValue(orderRow());
    });

    it("mavjud bo'lmagan ustaga buyurtma berib bo'lmaydi", async () => {
      deps.prisma.masterProfile.findFirst.mockResolvedValue(null);

      await expect(service.create('client-1', dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("o'ziga buyurtma bera olmaydi", async () => {
      await expect(service.create('master-user', dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(deps.prisma.order.create).not.toHaveBeenCalled();
    });

    it('band ustaga buyurtma rad etiladi', async () => {
      deps.prisma.masterProfile.findFirst.mockResolvedValue({ ...master, isAvailable: false });

      await expect(service.create('client-1', dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("boshqa ustaning xizmatini ko'rsatish rad etiladi", async () => {
      deps.prisma.masterService.findFirst.mockResolvedValue(null);

      await expect(service.create('client-1', { ...(dto as object), serviceId: 's-x' } as never)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(deps.prisma.masterService.findFirst).toHaveBeenCalledWith({ where: { id: 's-x', masterId: 'm-1' } });
    });

    it('serviceId berilsa narx va sarlavha bazadan olinadi (mijoz yuborgani emas)', async () => {
      deps.prisma.masterService.findFirst.mockResolvedValue({ id: 's-1', title: 'Haqiqiy nom', price: 90000 });

      await service.create('client-1', { ...(dto as object), serviceId: 's-1', price: 1 } as never);

      const data = deps.prisma.order.create.mock.calls[0][0].data;
      expect(data.price).toBe(90000);
      expect(data.serviceTitle).toBe('Haqiqiy nom');
      expect(data.clientId).toBe('client-1');
    });

    it("mobil OrderItem shaklida javob qaytaradi va ustaga push yuboradi", async () => {
      const result = await service.create('client-1', dto);

      expect(result).toMatchObject({
        id: 'o-1',
        status: 'pending',
        statusTextUz: 'Kutilmoqda',
        masterName: 'Alisher Qodirov',
        masterAvatar: '',
        masterPhone: '+998901112233',
        createdAt: '2026-03-01T10:00:00.000Z',
      });
      expect(result.comment).toBeUndefined();
      expect(deps.notifications.notifyUser).toHaveBeenCalledWith(
        'master-user',
        expect.objectContaining({ title: 'Yangi buyurtma keldi!' }),
      );
    });
  });

  describe('findMine', () => {
    beforeEach(() => deps.prisma.order.findMany.mockResolvedValue([]));

    it('MASTER roli uchun kelib tushgan buyurtmalar', async () => {
      await service.findMine(masterUser, {});

      expect(deps.prisma.order.findMany.mock.calls[0][0].where).toEqual({ master: { userId: 'master-user' } });
    });

    it("mijoz uchun o'zi bergan buyurtmalar", async () => {
      await service.findMine(clientUser, {});

      expect(deps.prisma.order.findMany.mock.calls[0][0].where).toEqual({ clientId: 'client-1' });
    });

    it("usta as=client bilan o'zi bergan buyurtmalarni ko'ra oladi", async () => {
      await service.findMine(masterUser, { as: OrdersView.client });

      expect(deps.prisma.order.findMany.mock.calls[0][0].where).toEqual({ clientId: 'master-user' });
    });
  });

  describe('updateStatus', () => {
    it("begona foydalanuvchiga buyurtma mavjudligi bildirilmaydi (404)", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow());

      await expect(service.updateStatus(stranger, 'o-1', 'cancelled')).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.prisma.$transaction).not.toHaveBeenCalled();
    });

    it("mijoz buyurtmani qabul qila olmaydi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow());

      await expect(service.updateStatus(clientUser, 'o-1', 'in_progress')).rejects.toBeInstanceOf(BadRequestException);
    });

    it("mijoz faqat kutilayotgan buyurtmani bekor qila oladi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow({ status: 'in_progress' }));

      await expect(service.updateStatus(clientUser, 'o-1', 'cancelled')).rejects.toBeInstanceOf(BadRequestException);
    });

    it("usta pending'ni to'g'ridan-to'g'ri yakunlay olmaydi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow());

      await expect(service.updateStatus(masterUser, 'o-1', 'completed')).rejects.toBeInstanceOf(BadRequestException);
    });

    it("tugagan (completed/cancelled) buyurtmani qayta o'zgartirib bo'lmaydi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow({ status: 'completed' }));

      await expect(service.updateStatus(masterUser, 'o-1', 'cancelled')).rejects.toBeInstanceOf(BadRequestException);
    });

    it("usta qabul qiladi: status o'zgaradi, mijozga push, completedOrdersCount tegilmaydi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow());

      const result = await service.updateStatus(masterUser, 'o-1', 'in_progress');

      expect(result).toEqual({ orderId: 'o-1', status: 'in_progress' });
      expect(deps.tx.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'o-1', status: 'pending' },
        data: { status: 'in_progress', cancelledBy: undefined },
      });
      expect(deps.tx.masterProfile.update).not.toHaveBeenCalled();
      expect(deps.notifications.notifyUser).toHaveBeenCalledWith('client-1', expect.anything());
    });

    it("yakunlanganda completedOrdersCount +1 oshadi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow({ status: 'in_progress' }));

      await service.updateStatus(masterUser, 'o-1', 'completed');

      expect(deps.tx.masterProfile.update).toHaveBeenCalledWith({
        where: { id: 'm-1' },
        data: { completedOrdersCount: { increment: 1 } },
      });
    });

    it("parallel so'rov statusni allaqachon o'zgartirgan bo'lsa 409 va hisoblagich oshmaydi", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow({ status: 'in_progress' }));
      deps.tx.order.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.updateStatus(masterUser, 'o-1', 'completed')).rejects.toBeInstanceOf(ConflictException);
      expect(deps.tx.masterProfile.update).not.toHaveBeenCalled();
    });

    it("usta rad etsa cancelledBy=MASTER va 'Rad etildi' matni; mijoz bekor qilsa ustaga push", async () => {
      deps.prisma.order.findUnique.mockResolvedValue(orderRow());
      await service.updateStatus(masterUser, 'o-1', 'cancelled');
      expect(deps.tx.order.updateMany.mock.calls[0][0].data).toEqual({ status: 'cancelled', cancelledBy: 'MASTER' });

      deps.notifications.notifyUser.mockClear();
      await service.updateStatus(clientUser, 'o-1', 'cancelled');
      expect(deps.tx.order.updateMany.mock.calls[1][0].data.cancelledBy).toBe('CLIENT');
      expect(deps.notifications.notifyUser).toHaveBeenCalledWith('master-user', expect.anything());
    });
  });
});
