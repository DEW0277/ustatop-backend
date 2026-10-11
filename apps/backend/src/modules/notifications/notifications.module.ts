import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service.js';
import { createPushProvider } from './push-provider.factory.js';
import { PushProvider } from './push.provider.js';

@Module({
  providers: [
    NotificationsService,
    { provide: PushProvider, useFactory: createPushProvider, inject: [ConfigService] },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
