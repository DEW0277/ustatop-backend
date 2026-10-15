import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module.js';
import { MasterProfileService } from './master-profile.service.js';
import { MastersController } from './masters.controller.js';
import { MastersService } from './masters.service.js';
import { MyMasterController } from './my-master.controller.js';

@Module({
  imports: [UploadModule],
  controllers: [MyMasterController, MastersController],
  providers: [MastersService, MasterProfileService],
  exports: [MastersService, MasterProfileService],
})
export class MastersModule {}
