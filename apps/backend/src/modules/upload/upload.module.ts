import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';

@Module({
  controllers: [UploadController],
  providers: [StorageService, UploadService],
  exports: [StorageService, UploadService],
})
export class UploadModule {}
