import { Module } from '@nestjs/common';
import { AdminDistrictsController } from './admin-districts.controller.js';
import { DistrictsController } from './districts.controller.js';
import { DistrictsService } from './districts.service.js';

@Module({
  controllers: [DistrictsController, AdminDistrictsController],
  providers: [DistrictsService],
  exports: [DistrictsService],
})
export class DistrictsModule {}
