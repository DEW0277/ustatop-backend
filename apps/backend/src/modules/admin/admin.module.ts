import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminStatsService } from './admin-stats.service.js';

@Module({
  imports: [NotificationsModule, ReviewsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminStatsService],
})
export class AdminModule {}
