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
    const rawEndpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number | string>('MINIO_PORT', 9000);
    const useSsl = String(this.configService.get<string | boolean>('MINIO_USE_SSL', false)) === 'true';
    const accessKeyId = this.configService.get<string>('MINIO_ACCESS_KEY', 'ustatop');
    const secretAccessKey = this.configService.get<string>('MINIO_SECRET_KEY', 'ustatop_dev_secret');

    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'ustatop-uploads');
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

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureBucket();
    } catch (error: any) {
      this.logger.error(`MinIO ulanishida xatolik yuz berdi: ${error?.message}`);
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

    await this.s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: this.bucketName,
        Policy: JSON.stringify(policy),
      }),
    );
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

    const baseUrl = this.publicUrl.replace(/\/+$/, '');
    return `${baseUrl}/${key}`;
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
