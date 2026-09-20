import { Module } from '@nestjs/common';
import { LogPushProvider } from './log-push.provider.js';
import { NotificationsService } from './notifications.service.js';
import { PushProvider } from './push.provider.js';

@Module({
  // FCM ulanganda faqat shu useClass FcmPushProvider'ga almashtiriladi.
  providers: [NotificationsService, { provide: PushProvider, useClass: LogPushProvider }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
