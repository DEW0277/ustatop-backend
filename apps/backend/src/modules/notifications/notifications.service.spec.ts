import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const prisma = { user: { findUnique: vi.fn() } };
  const provider = { send: vi.fn() };
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(prisma as never, provider as never);
  });

  it("fcmToken yo'q foydalanuvchiga hech narsa yubormaydi", async () => {
    prisma.user.findUnique.mockResolvedValue({ fcmToken: null });

    await service.notifyUser('u-1', { title: 't', body: 'b' });

    expect(provider.send).not.toHaveBeenCalled();
  });

  it("tokeni bor foydalanuvchiga provider orqali yuboradi", async () => {
    prisma.user.findUnique.mockResolvedValue({ fcmToken: 'token-123' });

    await service.notifyUser('u-1', { title: 't', body: 'b' });

    expect(provider.send).toHaveBeenCalledWith('token-123', { title: 't', body: 'b' });
  });

  it("provider xato bersa asosiy amalni buzmaydi (xato yutiladi)", async () => {
    prisma.user.findUnique.mockResolvedValue({ fcmToken: 'token-123' });
    provider.send.mockRejectedValue(new Error('FCM down'));

    await expect(service.notifyUser('u-1', { title: 't', body: 'b' })).resolves.toBeUndefined();
  });
});
