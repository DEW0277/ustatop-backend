import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { InvalidPushTokenError, PushMessage, PushProvider } from './push.provider.js';

const FIREBASE_APP_NAME = 'ustatop-push';

// FCM shu kodlarni qaytarsa token qayta ishlatib bo'lmaydi; qolgan xatolar (kvota, tarmoq, 5xx) vaqtinchalik.
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

export type FcmMessaging = Pick<Messaging, 'send'>;

@Injectable()
export class FcmPushProvider extends PushProvider {
  constructor(private readonly messaging: FcmMessaging) {
    super();
  }

  // Kalitlar to'liq bo'lmasa ilova ishga tushmasligi kerak — aks holda push'lar jimgina yo'qoladi.
  static fromConfig(configService: ConfigService): FcmPushProvider {
    const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
    // .env'da kalit bitta qatorda, `\n` ketma-ketliklari bilan saqlanadi.
    const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'PUSH_PROVIDER=fcm uchun FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL va FIREBASE_PRIVATE_KEY majburiy',
      );
    }

    const app =
      getApps().find((existing) => existing.name === FIREBASE_APP_NAME) ??
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, FIREBASE_APP_NAME);

    return new FcmPushProvider(getMessaging(app));
  }

  async send(fcmToken: string, message: PushMessage): Promise<void> {
    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title: message.title, body: message.body },
        ...(message.data ? { data: message.data } : {}),
      });
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      if (typeof code === 'string' && INVALID_TOKEN_CODES.has(code)) {
        throw new InvalidPushTokenError(code);
      }
      throw error;
    }
  }
}
