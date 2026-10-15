import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { StorageService } from './storage.service.js';

// Portfolio rasmi o'chirilganda yoki avatar almashtirilganda fayl omborda yetim bo'lib qolmasligi uchun.
// Fayl faqat (1) bizning bucket'imizdagi o'zimiz yuklagan fayl bo'lsa va (2) bazada boshqa hech qayerda
// (portfolio yoki avatar) ishlatilmayotgan bo'lsa o'chiriladi. Xato asosiy amalni hech qachon buzmaydi.
@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async deleteIfUnreferenced(url: string | null | undefined): Promise<void> {
    if (!url) {
      return;
    }

    const key = this.storage.keyFromPublicUrl(url);
    if (!key) {
      return;
    }

    try {
      const [portfolioRefs, avatarRefs] = await Promise.all([
        this.prisma.portfolioImage.count({ where: { url } }),
        this.prisma.user.count({ where: { avatarUrl: url } }),
      ]);

      if (portfolioRefs + avatarRefs > 0) {
        return;
      }

      await this.storage.deleteFile(key);
    } catch (error) {
      this.logger.warn(`Faylni o'chirib bo'lmadi (${key}): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
