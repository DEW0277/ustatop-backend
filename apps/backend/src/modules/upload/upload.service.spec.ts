import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service.js';
import { MAX_FILE_SIZE } from './upload.constants.js';
import { UploadService } from './upload.service.js';

describe('UploadService', () => {
  let uploadService: UploadService;
  let storageService: { uploadFile: ReturnType<typeof vi.fn> };

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);

  const validWebpBuffer = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);

  beforeEach(() => {
    storageService = {
      uploadFile: vi.fn().mockImplementation((key: string) => {
        return Promise.resolve(`http://localhost:9000/ustatop-uploads/${key}`);
      }),
    };

    uploadService = new UploadService(storageService as unknown as StorageService);
  });

  it("fayl yuborilmaganda BadRequestException tashlaydi ('Fayl yuborilmadi')", async () => {
    await expect(uploadService.uploadSingle(undefined)).rejects.toThrow(
      new BadRequestException('Fayl yuborilmadi'),
    );
  });

  it("fayl bufferi bo'sh bo'lganda BadRequestException tashlaydi", async () => {
    const file = {
      buffer: Buffer.from([]),
      size: 0,
      mimetype: 'image/jpeg',
      originalname: 'test.jpg',
    } as Express.Multer.File;

    await expect(uploadService.uploadSingle(file)).rejects.toThrow(
      new BadRequestException('Fayl yuborilmadi'),
    );
  });

  it("fayl hajmi 10MB dan oshganda PayloadTooLargeException tashlaydi", async () => {
    const file = {
      buffer: Buffer.alloc(MAX_FILE_SIZE + 1),
      size: MAX_FILE_SIZE + 1,
      mimetype: 'image/jpeg',
      originalname: 'huge.jpg',
    } as Express.Multer.File;

    await expect(uploadService.uploadSingle(file)).rejects.toThrow(
      new PayloadTooLargeException('Fayl hajmi 10MB dan oshmasligi kerak'),
    );
  });

  it("ruxsat etilmagan mimetype bo'lganda BadRequestException tashlaydi", async () => {
    const file = {
      buffer: Buffer.from('hello world content text'),
      size: 24,
      mimetype: 'text/plain',
      originalname: 'hello.txt',
    } as Express.Multer.File;

    await expect(uploadService.uploadSingle(file)).rejects.toThrow(
      new BadRequestException('Faqat JPEG, PNG va WEBP formatidagi rasmlar qabul qilinadi'),
    );
  });

  it("magic bytes mos kelmasa (soxta mimetype) BadRequestException tashlaydi", async () => {
    const file = {
      buffer: Buffer.from('soxta rasm mazmuni matn'),
      size: 24,
      mimetype: 'image/jpeg',
      originalname: 'fake.jpg',
    } as Express.Multer.File;

    await expect(uploadService.uploadSingle(file)).rejects.toThrow(
      new BadRequestException('Faqat JPEG, PNG va WEBP formatidagi rasmlar qabul qilinadi'),
    );
  });

  it("mimetype JPEG lekin fayl ichi PNG bo'lsa BadRequestException tashlaydi", async () => {
    const file = {
      buffer: validPngBuffer,
      size: validPngBuffer.length,
      mimetype: 'image/jpeg',
      originalname: 'mismatched.jpg',
    } as Express.Multer.File;

    await expect(uploadService.uploadSingle(file)).rejects.toThrow(
      new BadRequestException('Faqat JPEG, PNG va WEBP formatidagi rasmlar qabul qilinadi'),
    );
  });

  it("yaroqli JPEG rasm muvaffaqiyatli yuklanadi va UUID nomi bilan URL qaytaradi", async () => {
    const file = {
      buffer: validJpegBuffer,
      size: validJpegBuffer.length,
      mimetype: 'image/jpeg',
      originalname: 'original-name-should-be-ignored.jpg',
    } as Express.Multer.File;

    const result = await uploadService.uploadSingle(file);

    expect(storageService.uploadFile).toHaveBeenCalledTimes(1);
    const [key, buffer, mime] = storageService.uploadFile.mock.calls[0];

    expect(key).toMatch(/^images\/[0-9a-f-]{36}\.jpg$/);
    expect(key).not.toContain('original-name');
    expect(buffer).toBe(validJpegBuffer);
    expect(mime).toBe('image/jpeg');
    expect(result.url).toBe(`http://localhost:9000/ustatop-uploads/${key}`);
  });

  it("image/jpg mimetype ham to'g'ri qabul qilinadi", async () => {
    const file = {
      buffer: validJpegBuffer,
      size: validJpegBuffer.length,
      mimetype: 'image/jpg',
      originalname: 'photo.jpg',
    } as Express.Multer.File;

    const result = await uploadService.uploadSingle(file);

    const [key, , mime] = storageService.uploadFile.mock.calls[0];
    expect(key).toMatch(/^images\/[0-9a-f-]{36}\.jpg$/);
    expect(mime).toBe('image/jpeg');
    expect(result.url).toContain('images/');
  });

  it("yaroqli PNG rasm muvaffaqiyatli yuklanadi", async () => {
    const file = {
      buffer: validPngBuffer,
      size: validPngBuffer.length,
      mimetype: 'image/png',
      originalname: 'graphic.png',
    } as Express.Multer.File;

    const result = await uploadService.uploadSingle(file);

    const [key, buffer, mime] = storageService.uploadFile.mock.calls[0];
    expect(key).toMatch(/^images\/[0-9a-f-]{36}\.png$/);
    expect(buffer).toBe(validPngBuffer);
    expect(mime).toBe('image/png');
    expect(result.url).toBe(`http://localhost:9000/ustatop-uploads/${key}`);
  });

  it("yaroqli WEBP rasm muvaffaqiyatli yuklanadi", async () => {
    const file = {
      buffer: validWebpBuffer,
      size: validWebpBuffer.length,
      mimetype: 'image/webp',
      originalname: 'banner.webp',
    } as Express.Multer.File;

    const result = await uploadService.uploadSingle(file);

    const [key, buffer, mime] = storageService.uploadFile.mock.calls[0];
    expect(key).toMatch(/^images\/[0-9a-f-]{36}\.webp$/);
    expect(buffer).toBe(validWebpBuffer);
    expect(mime).toBe('image/webp');
    expect(result.url).toBe(`http://localhost:9000/ustatop-uploads/${key}`);
  });
});
