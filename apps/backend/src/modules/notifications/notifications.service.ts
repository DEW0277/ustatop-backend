import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PushMessage, PushProvider } from './push.provider.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushProvider: PushProvider,
  ) {}

  // Bildirishnoma yuborilmasa ham asosiy amal (buyurtma yaratish/status o'zgartirish) muvaffaqiyatli bo'lishi kerak.
  async notifyUser(userId: string, message: PushMessage): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });

      if (!user?.fcmToken) {
        return;
      }

      await this.pushProvider.send(user.fcmToken, message);
    } catch (error) {
      this.logger.warn(`Push yuborilmadi (user ${userId}): ${(error as Error).message}`);
    }
  }
}
