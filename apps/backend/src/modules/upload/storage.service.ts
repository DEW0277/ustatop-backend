import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const OWN_KEY_REGEX = /^images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const rawEndpoint = this.env('S3_ENDPOINT', 'MINIO_ENDPOINT') ?? 'localhost';
    const port = this.env('S3_PORT', 'MINIO_PORT') ?? '3900';
    const useSsl = this.env('S3_USE_SSL', 'MINIO_USE_SSL') === 'true';
    const accessKeyId = this.env('S3_ACCESS_KEY', 'MINIO_ACCESS_KEY') ?? '';
    const secretAccessKey = this.env('S3_SECRET_KEY', 'MINIO_SECRET_KEY') ?? '';

    this.bucketName = this.env('S3_BUCKET', 'MINIO_BUCKET') ?? 'ustatop-uploads';
    this.publicUrl = this.configService.get<string>(
      'STORAGE_PUBLIC_URL',
      `http://${rawEndpoint}:${port}/${this.bucketName}`,
    );

    let endpoint: string;
    if (rawEndpoint.startsWith('http://') || rawEndpoint.startsWith('https://')) {
      endpoint = rawEndpoint;
    } else {
      const protocol = useSsl ? 'https' : 'http';
      endpoint = `${protocol}://${rawEndpoint}:${port}`;
    }

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  // Fayl ombori S3-mos istalgan server (hozir Garage). `MINIO_*` — eski nomlar, faqat moslik uchun o'qiladi.
  private env(name: string, legacyName: string): string | undefined {
    const value = this.configService.get<string | number | boolean>(name) ?? this.configService.get(legacyName);
    return value === undefined || value === '' ? undefined : String(value);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
    } catch (error: any) {
      this.logger.error(`Fayl omboriga (S3) ulanishda xatolik yuz berdi: ${error?.message}`);
    }
  }

  async ensureBucket(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error: any) {
      if (
        error?.name === 'NotFound' ||
        error?.name === 'NoSuchBucket' ||
        error?.$metadata?.httpStatusCode === 404
      ) {
        this.logger.log(`Bucket "${this.bucketName}" topilmadi. Yaratilmoqda...`);
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket "${this.bucketName}" muvaffaqiyatli yaratildi.`);
      } else {
        throw error;
      }
    }

    await this.ensurePublicPolicy();
  }

  async ensurePublicPolicy(): Promise<void> {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicRead',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        },
      ],
    };

    try {
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (error: any) {
      // Garage bucket policy'ni qo'llab-quvvatlamaydi — public o'qish uning "website" rejimi orqali
      // (`deploy/garage/init.sh` yoqadi). Bu xato emas.
      if (error?.name === 'NotImplemented' || error?.Code === 'NotImplemented') {
        this.logger.log(`Bucket policy qo'llab-quvvatlanmaydi — public o'qish ombor tomonida sozlangan.`);
        return;
      }
      throw error;
    }
    this.logger.log(`Bucket "${this.bucketName}" uchun public-read policy o'rnatildi.`);
  }

  async uploadFile(key: string, buffer: Buffer, mimetype: string): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return this.publicUrlForKey(key);
  }

  // Kalitdan ommaviy URL (`keyFromPublicUrl` ning teskarisi).
  publicUrlForKey(key: string): string {
    return `${this.publicUrl.replace(/\/+$/, '')}/${key}`;
  }

  // Faqat shu bucket'ga o'zimiz yuklagan fayllar (`UploadService` kalit formati: images/<uuid>.<ext>) uchun kalit
  // qaytaradi; begona yoki qo'lda kiritilgan URL — null (ularni o'chirishga urinmaymiz).
  keyFromPublicUrl(url: string): string | null {
    const prefix = `${this.publicUrl.replace(/\/+$/, '')}/`;

    if (!url.startsWith(prefix)) {
      return null;
    }

    const key = url.slice(prefix.length);
    return OWN_KEY_REGEX.test(key) ? key : null;
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
  }

  getS3Client(): S3Client {
    return this.s3Client;
  }
}
