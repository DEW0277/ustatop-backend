import { Module } from '@nestjs/common';
import { FileCleanupService } from './file-cleanup.service.js';
import { StorageService } from './storage.service.js';
import { UploadController } from './upload.controller.js';
import { UploadService } from './upload.service.js';

@Module({
  controllers: [UploadController],
  providers: [StorageService, UploadService, FileCleanupService],
  exports: [StorageService, UploadService, FileCleanupService],
})
export class UploadModule {}
