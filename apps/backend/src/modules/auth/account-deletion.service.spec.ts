import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionService, DELETED_USER_NAME } from './account-deletion.service.js';

function createDeps() {
  const tx = {
    user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    order: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    masterService: { deleteMany: vi.fn() },
    masterCategory: { deleteMany: vi.fn() },
    portfolioImage: { deleteMany: vi.fn() },
    favoriteMaster: { deleteMany: vi.fn() },
    masterProfile: { update: vi.fn() },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  const notifications = { notifyUser: vi.fn() };
  const fileCleanup = { deleteIfUnreferenced: vi.fn() };
  return { tx, prisma, notifications, fileCleanup };
}

describe('AccountDeletionService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: AccountDeletionService;

  beforeEach(() => {
    deps = createDeps();
    service = new AccountDeletionService(deps.prisma as never, deps.notifications as never, deps.fileCleanup as never);
  });

  it("ADMIN akkauntini o'chirmaydi (403) va hech narsaga tegmaydi", async () => {
    deps.tx.user.findUniqueOrThrow.mockResolvedValue({ role: 'ADMIN', avatarUrl: null, masterProfile: null });

    await expect(service.deleteAccount('a-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(deps.tx.user.update).not.toHaveBeenCalled();
    expect(deps.tx.order.updateMany).not.toHaveBeenCalled();
  });

  it("mijoz: faol buyurtmalarni bekor qiladi, buyurtmalardagi shaxsiy ma'lumotni va akkauntni anonimlashtiradi", async () => {
    deps.tx.user.findUniqueOrThrow.mockResolvedValue({ role: 'CLIENT', avatarUrl: 'http://s/a.png', masterProfile: null });
    deps.tx.order.findMany.mockResolvedValueOnce([{ id: 'o-1', master: { userId: 'mu-1' } }]);

    expect(await service.deleteAccount('u-1')).toEqual({ deleted: true });

    expect(deps.tx.order.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: { in: ['o-1'] } },
      data: { status: 'cancelled', cancelledBy: 'CLIENT' },
    });
    expect(deps.tx.order.updateMany).toHaveBeenNthCalledWith(2, {
      where: { clientId: 'u-1' },
      data: { clientName: DELETED_USER_NAME, clientPhone: '', address: '—', comment: null },
    });
    expect(deps.tx.favoriteMaster.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });

    const userData = deps.tx.user.update.mock.calls[0][0].data;
    expect(userData).toMatchObject({
      phone: 'deleted:u-1',
      name: DELETED_USER_NAME,
      avatarUrl: null,
      fcmToken: null,
      login: null,
      passwordHash: null,
      isBlocked: true,
    });
    expect(userData.deletedAt).toBeInstanceOf(Date);
    expect(deps.tx.masterProfile.update).not.toHaveBeenCalled();

    expect(deps.fileCleanup.deleteIfUnreferenced).toHaveBeenCalledWith('http://s/a.png');
    expect(deps.notifications.notifyUser).toHaveBeenCalledWith(
      'mu-1',
      expect.objectContaining({ data: { type: 'order_status', orderId: 'o-1', status: 'cancelled' } }),
    );
  });

  it("usta: kelgan faol buyurtmalarni usta nomidan bekor qiladi, profil mazmuni va portfolio fayllarini tozalaydi", async () => {
    deps.tx.user.findUniqueOrThrow.mockResolvedValue({
      role: 'MASTER',
      avatarUrl: null,
      masterProfile: { id: 'm-1', portfolio: [{ url: 'http://s/p1.png' }, { url: 'http://s/p2.png' }] },
    });
    deps.tx.order.findMany
      .mockResolvedValueOnce([]) // mijoz sifatida faol buyurtmalar yo'q
      .mockResolvedValueOnce([{ id: 'o-2', clientId: 'c-1' }, { id: 'o-3', clientId: null }]);

    await service.deleteAccount('u-2');

    expect(deps.tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['o-2', 'o-3'] } },
      data: { status: 'cancelled', cancelledBy: 'MASTER' },
    });
    for (const model of ['masterService', 'masterCategory', 'portfolioImage', 'favoriteMaster'] as const) {
      expect(deps.tx[model].deleteMany).toHaveBeenCalledWith({ where: { masterId: 'm-1' } });
    }
    expect(deps.tx.masterProfile.update.mock.calls[0][0].data).toMatchObject({
      phone: '',
      telegram: null,
      isAvailable: false,
      isVerified: false,
    });
    expect(deps.fileCleanup.deleteIfUnreferenced).toHaveBeenCalledWith('http://s/p1.png');
    expect(deps.fileCleanup.deleteIfUnreferenced).toHaveBeenCalledWith('http://s/p2.png');
    // Mijozsiz (clientId=null) buyurtma uchun bildirishnoma yo'q.
    expect(deps.notifications.notifyUser).toHaveBeenCalledTimes(1);
    expect(deps.notifications.notifyUser).toHaveBeenCalledWith('c-1', expect.anything());
  });

  it("bildirishnoma xatosi o'chirishni buzmaydi", async () => {
    deps.tx.user.findUniqueOrThrow.mockResolvedValue({ role: 'CLIENT', avatarUrl: null, masterProfile: null });
    deps.tx.order.findMany.mockResolvedValueOnce([{ id: 'o-1', master: { userId: 'mu-1' } }]);
    deps.notifications.notifyUser.mockRejectedValue(new Error('push down'));

    await expect(service.deleteAccount('u-1')).resolves.toEqual({ deleted: true });
  });
});
