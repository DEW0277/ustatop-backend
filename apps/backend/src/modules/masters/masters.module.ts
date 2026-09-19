import { Module } from '@nestjs/common';
import { MasterProfileService } from './master-profile.service.js';
import { MastersController } from './masters.controller.js';
import { MastersService } from './masters.service.js';
import { MyMasterController } from './my-master.controller.js';

@Module({
  controllers: [MyMasterController, MastersController],
  providers: [MastersService, MasterProfileService],
  exports: [MastersService],
})
export class MastersModule {}
