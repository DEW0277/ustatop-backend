import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { FileCleanupService } from '../upload/file-cleanup.service.js';

export const DELETED_USER_NAME = "O'chirilgan foydalanuvchi";
const REDACTED = '—';
const ACTIVE_STATUSES = [OrderStatus.pending, OrderStatus.in_progress];

interface CancelledOrder {
  orderId: string;
  notifyUserId: string | null;
}

// `DELETE /auth/me` — jismonan o'chirish emas, anonimlashtirish (docs/TZ.md §4.3): buyurtma va sharh tarixi
// ikkinchi tomon uchun saqlanadi, shaxsiy ma'lumot esa tozalanadi va akkauntga qayta kirib bo'lmaydi.
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly fileCleanup: FileCleanupService,
  ) {}

  async deleteAccount(userId: string): Promise<{ deleted: true }> {
    const { filesToRemove, cancelled } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          role: true,
          avatarUrl: true,
          masterProfile: { select: { id: true, portfolio: { select: { url: true } } } },
        },
      });

      if (user.role === Role.ADMIN) {
        throw new ForbiddenException("Administrator akkauntini ilova orqali o'chirib bo'lmaydi");
      }

      const masterId = user.masterProfile?.id;
      const cancelled: CancelledOrder[] = [];

      // 1) Faol buyurtmalar bekor qilinadi — ikkinchi tomon "yo'q" odamni kutib qolmasin.
      const activeAsClient = await tx.order.findMany({
        where: { clientId: userId, status: { in: ACTIVE_STATUSES } },
        select: { id: true, master: { select: { userId: true } } },
      });
      if (activeAsClient.length > 0) {
        await tx.order.updateMany({
          where: { id: { in: activeAsClient.map((order) => order.id) } },
          data: { status: OrderStatus.cancelled, cancelledBy: Role.CLIENT },
        });
        cancelled.push(...activeAsClient.map((order) => ({ orderId: order.id, notifyUserId: order.master.userId })));
      }

      if (masterId) {
        const activeAsMaster = await tx.order.findMany({
          where: { masterId, status: { in: ACTIVE_STATUSES } },
          select: { id: true, clientId: true },
        });
        if (activeAsMaster.length > 0) {
          await tx.order.updateMany({
            where: { id: { in: activeAsMaster.map((order) => order.id) } },
            data: { status: OrderStatus.cancelled, cancelledBy: Role.MASTER },
          });
          cancelled.push(...activeAsMaster.map((order) => ({ orderId: order.id, notifyUserId: order.clientId })));
        }
      }

      // 2) Mijoz sifatidagi buyurtmalarda shaxsiy ma'lumot (ism, telefon, manzil, izoh) tozalanadi.
      await tx.order.updateMany({
        where: { clientId: userId },
        data: { clientName: DELETED_USER_NAME, clientPhone: '', address: REDACTED, comment: null },
      });

      // 3) Usta profili: qator buyurtma/sharh FK'lari uchun qoladi, mazmuni tozalanadi.
      if (masterId) {
        await tx.masterService.deleteMany({ where: { masterId } });
        await tx.masterCategory.deleteMany({ where: { masterId } });
        await tx.portfolioImage.deleteMany({ where: { masterId } });
        await tx.favoriteMaster.deleteMany({ where: { masterId } });
        await tx.masterProfile.update({
          where: { id: masterId },
          data: {
            firstName: "O'chirilgan",
            lastName: 'usta',
            phone: '',
            telegram: null,
            bio: REDACTED,
            address: REDACTED,
            isAvailable: false,
            isVerified: false,
          },
        });
      }

      // 4) Foydalanuvchining o'z sevimlilari va akkaunt ma'lumotlari.
      await tx.favoriteMaster.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          // Unikal va telefon formatiga mos emas — raqam bo'shaydi, shu raqam bilan yangi akkaunt ochiladi.
          phone: `deleted:${userId}`,
          name: DELETED_USER_NAME,
          avatarUrl: null,
          fcmToken: null,
          login: null,
          passwordHash: null,
          isBlocked: true,
          isPhoneVerified: false,
          deletedAt: new Date(),
        },
      });

      const filesToRemove = [user.avatarUrl, ...(user.masterProfile?.portfolio.map((image) => image.url) ?? [])];
      return { filesToRemove, cancelled };
    });

    for (const url of filesToRemove) {
      await this.fileCleanup.deleteIfUnreferenced(url);
    }

    for (const { orderId, notifyUserId } of cancelled) {
      if (!notifyUserId) continue;
      try {
        await this.notifications.notifyUser(notifyUserId, {
          title: 'Buyurtma bekor qilindi',
          body: "Ikkinchi tomon akkauntini o'chirdi, buyurtma bekor qilindi",
          data: { type: 'order_status', orderId, status: OrderStatus.cancelled },
        });
      } catch (error) {
        this.logger.warn(`Bildirishnoma yuborilmadi (${orderId}): ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { deleted: true };
  }
}
