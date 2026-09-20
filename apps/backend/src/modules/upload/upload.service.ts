import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import 'multer';
import { randomUUID } from 'node:crypto';
import { UploadResponseDto } from './dto/upload-response.dto.js';
import { StorageService } from './storage.service.js';
import {
  ALLOWED_MIME_TYPES,
  detectImageFormat,
  MAX_FILE_SIZE,
  MIME_TO_EXTENSION,
} from './upload.constants.js';

@Injectable()
export class UploadService {
  constructor(private readonly storageService: StorageService) {}

  async uploadSingle(file?: Express.Multer.File): Promise<UploadResponseDto> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Fayl yuborilmadi');
    }

    if (file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Fayl hajmi 10MB dan oshmasligi kerak');
    }

    const rawMime = file.mimetype?.toLowerCase();
    const normalizedMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;

    if (!ALLOWED_MIME_TYPES.includes(normalizedMime as any)) {
      throw new BadRequestException('Faqat JPEG, PNG va WEBP formatidagi rasmlar qabul qilinadi');
    }

    const detectedMime = detectImageFormat(file.buffer);
    if (!detectedMime || detectedMime !== normalizedMime) {
      throw new BadRequestException('Faqat JPEG, PNG va WEBP formatidagi rasmlar qabul qilinadi');
    }

    const ext = MIME_TO_EXTENSION[detectedMime];
    const key = `images/${randomUUID()}.${ext}`;

    const url = await this.storageService.uploadFile(key, file.buffer, detectedMime);

    return { url };
  }
}
