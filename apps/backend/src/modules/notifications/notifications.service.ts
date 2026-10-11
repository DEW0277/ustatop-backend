import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvalidPushTokenError, PushMessage, PushProvider } from './push.provider.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushProvider: PushProvider,
  ) {}

  // Bildirishnoma yuborilmasa ham asosiy amal (buyurtma yaratish/status o'zgartirish) muvaffaqiyatli bo'lishi kerak.
  async notifyUser(userId: string, message: PushMessage): Promise<void> {
    let fcmToken: string | null | undefined;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });

      fcmToken = user?.fcmToken;
      if (!fcmToken) {
        return;
      }

      await this.pushProvider.send(fcmToken, message);
    } catch (error) {
      if (error instanceof InvalidPushTokenError && fcmToken) {
        await this.forgetToken(userId, fcmToken);
        return;
      }

      this.logger.warn(`Push yuborilmadi (user ${userId}): ${(error as Error).message}`);
    }
  }

  // Shart `fcmToken` bo'yicha ham qo'yiladi: foydalanuvchi shu orada yangi token ro'yxatdan o'tkazgan
  // bo'lsa, yangisi o'chib ketmasin.
  private async forgetToken(userId: string, fcmToken: string): Promise<void> {
    try {
      await this.prisma.user.updateMany({ where: { id: userId, fcmToken }, data: { fcmToken: null } });
      this.logger.log(`Yaroqsiz push token o'chirildi (user ${userId})`);
    } catch (error) {
      this.logger.warn(`Yaroqsiz push tokenni o'chirib bo'lmadi (user ${userId}): ${(error as Error).message}`);
    }
  }
}
