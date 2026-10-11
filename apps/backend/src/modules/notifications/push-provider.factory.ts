import type { ConfigService } from '@nestjs/config';
import { FcmPushProvider } from './fcm-push.provider.js';
import { LogPushProvider } from './log-push.provider.js';
import type { PushProvider } from './push.provider.js';

// PUSH_PROVIDER: `log` (standart, mock) | `fcm`. Noma'lum qiymat xato — imlo xatosi sabab
// production'da push'lar jimgina mock'ga tushib qolmasin.
export function createPushProvider(configService: ConfigService): PushProvider {
  const mode = (configService.get<string>('PUSH_PROVIDER') || 'log').trim().toLowerCase();

  switch (mode) {
    case 'log':
      return new LogPushProvider();
    case 'fcm':
      return FcmPushProvider.fromConfig(configService);
    default:
      throw new Error(`PUSH_PROVIDER noto'g'ri: "${mode}" (ruxsat etilgan: log, fcm)`);
  }
}
