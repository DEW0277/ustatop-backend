import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          MINIO_ENDPOINT: 'localhost',
          MINIO_PORT: 9000,
          MINIO_USE_SSL: 'false',
          MINIO_ACCESS_KEY: 'ustatop',
          MINIO_SECRET_KEY: 'ustatop_dev_secret',
          MINIO_BUCKET: 'ustatop-uploads',
          STORAGE_PUBLIC_URL: 'http://localhost:9000/ustatop-uploads',
        };
        return config[key] ?? defaultValue;
      }),
    };

    storageService = new StorageService(mockConfigService as unknown as ConfigService);
    mockSend = vi.fn();
    (storageService.getS3Client() as unknown as { send: typeof mockSend }).send = mockSend;
  });

  describe('ensureBucket', () => {
    it("agar bucket allaqachon mavjud bo'lsa, uni yaratmasdan public policy o'rnatadi", async () => {
      mockSend.mockResolvedValueOnce({}); // HeadBucketCommand muvaffaqiyatli
      mockSend.mockResolvedValueOnce({}); // PutBucketPolicyCommand muvaffaqiyatli

      await storageService.ensureBucket();

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
      expect(mockSend.mock.calls[1][0]).toBeInstanceOf(PutBucketPolicyCommand);
    });

    it("agar bucket topilmasa (404 / NotFound), uni yaratadi va public policy o'rnatadi", async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.name = 'NotFound';
      (notFoundError as unknown as { $metadata: { httpStatusCode: number } }).$metadata = {
        httpStatusCode: 404,
      };

      mockSend.mockRejectedValueOnce(notFoundError); // HeadBucketCommand topilmadi
      mockSend.mockResolvedValueOnce({}); // CreateBucketCommand muvaffaqiyatli
      mockSend.mockResolvedValueOnce({}); // PutBucketPolicyCommand muvaffaqiyatli

      await storageService.ensureBucket();

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(mockSend.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
      expect(mockSend.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
      expect(mockSend.mock.calls[2][0]).toBeInstanceOf(PutBucketPolicyCommand);
    });

    it("boshqa xatolik bo'lsa xatoni qayta tashlaydi", async () => {
      const authError = new Error('AccessDenied');
      authError.name = 'AccessDenied';
      mockSend.mockRejectedValueOnce(authError);

      await expect(storageService.ensureBucket()).rejects.toThrow('AccessDenied');
    });
  });

  describe('uploadFile', () => {
    it("faylni S3 ga yuklaydi va to'liq public URL qaytaradi", async () => {
      mockSend.mockResolvedValueOnce({});

      const key = 'images/test-uuid.jpg';
      const buffer = Buffer.from([0xff, 0xd8, 0xff]);
      const mimetype = 'image/jpeg';

      const url = await storageService.uploadFile(key, buffer, mimetype);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input.Bucket).toBe('ustatop-uploads');
      expect(command.input.Key).toBe(key);
      expect(command.input.Body).toBe(buffer);
      expect(command.input.ContentType).toBe(mimetype);

      expect(url).toBe(`http://localhost:9000/ustatop-uploads/${key}`);
    });
  });

  describe('keyFromPublicUrl / deleteFile', () => {
    const uuid = '0b9f8c2e-4a8d-4c55-9a43-7e3c3f1a2b10';

    it("faqat shu bucket'dagi o'zimiz yuklagan fayl uchun kalit qaytaradi", () => {
      expect(storageService.keyFromPublicUrl(`http://localhost:9000/ustatop-uploads/images/${uuid}.webp`)).toBe(
        `images/${uuid}.webp`,
      );
      expect(storageService.keyFromPublicUrl(`https://example.com/ustatop-uploads/images/${uuid}.png`)).toBeNull();
      expect(storageService.keyFromPublicUrl('http://localhost:9000/ustatop-uploads/images/qo-lda-nom.png')).toBeNull();
      expect(storageService.keyFromPublicUrl(`http://localhost:9000/ustatop-uploads/../secret/${uuid}.png`)).toBeNull();
      expect(storageService.keyFromPublicUrl(`http://localhost:9000/ustatop-uploads-other/images/${uuid}.png`)).toBeNull();
    });

    it("DeleteObjectCommand'ni bucket va kalit bilan yuboradi", async () => {
      mockSend.mockResolvedValueOnce({});

      await storageService.deleteFile(`images/${uuid}.png`);

      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toEqual({ Bucket: 'ustatop-uploads', Key: `images/${uuid}.png` });
    });
  });

  describe('S3-mos serverlar (Garage)', () => {
    it("bucket policy qo'llab-quvvatlanmasa (NotImplemented) xato otmaydi", async () => {
      mockSend.mockResolvedValueOnce({}); // HeadBucket
      mockSend.mockRejectedValueOnce(Object.assign(new Error('Unimplemented action: PutBucketPolicy'), { name: 'NotImplemented' }));

      await expect(storageService.ensureBucket()).resolves.toBeUndefined();
    });

    it("boshqa policy xatolari yashirilmaydi", async () => {
      mockSend.mockResolvedValueOnce({});
      mockSend.mockRejectedValueOnce(Object.assign(new Error('Access Denied'), { name: 'AccessDenied' }));

      await expect(storageService.ensureBucket()).rejects.toThrow('Access Denied');
    });

    it("S3_* sozlamalari eski MINIO_* nomlaridan ustun", async () => {
      const config: Record<string, unknown> = {
        S3_BUCKET: 'yangi-bucket',
        MINIO_BUCKET: 'eski-bucket',
        STORAGE_PUBLIC_URL: 'http://localhost:9000/yangi-bucket',
      };
      const service = new StorageService({ get: (key: string) => config[key] } as unknown as ConfigService);
      const send = vi.fn().mockResolvedValue({});
      (service.getS3Client() as unknown as { send: typeof send }).send = send;

      await service.deleteFile('images/x.png');

      expect(send.mock.calls[0][0].input.Bucket).toBe('yangi-bucket');
    });
  });
});
