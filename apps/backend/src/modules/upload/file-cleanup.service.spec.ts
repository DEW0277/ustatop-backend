import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCleanupService } from './file-cleanup.service.js';

const OWN_URL = 'http://localhost:9000/ustatop-uploads/images/0b9f8c2e-4a8d-4c55-9a43-7e3c3f1a2b10.png';
const OWN_KEY = 'images/0b9f8c2e-4a8d-4c55-9a43-7e3c3f1a2b10.png';

describe('FileCleanupService', () => {
  let prisma: { portfolioImage: { count: ReturnType<typeof vi.fn> }; user: { count: ReturnType<typeof vi.fn> } };
  let storage: { keyFromPublicUrl: ReturnType<typeof vi.fn>; deleteFile: ReturnType<typeof vi.fn> };
  let service: FileCleanupService;

  beforeEach(() => {
    prisma = { portfolioImage: { count: vi.fn().mockResolvedValue(0) }, user: { count: vi.fn().mockResolvedValue(0) } };
    storage = {
      keyFromPublicUrl: vi.fn((url: string) => (url === OWN_URL ? OWN_KEY : null)),
      deleteFile: vi.fn(),
    };
    service = new FileCleanupService(prisma as never, storage as never);
  });

  it("hech qayerda ishlatilmayotgan o'z faylimizni o'chiradi", async () => {
    await service.deleteIfUnreferenced(OWN_URL);

    expect(prisma.portfolioImage.count).toHaveBeenCalledWith({ where: { url: OWN_URL } });
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { avatarUrl: OWN_URL } });
    expect(storage.deleteFile).toHaveBeenCalledWith(OWN_KEY);
  });

  it("fayl boshqa portfolio yoki avatarda ishlatilsa o'chirmaydi", async () => {
    prisma.portfolioImage.count.mockResolvedValueOnce(1);
    await service.deleteIfUnreferenced(OWN_URL);

    prisma.user.count.mockResolvedValueOnce(1);
    await service.deleteIfUnreferenced(OWN_URL);

    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  it("begona URL yoki bo'sh qiymat uchun bazaga ham, omborga ham murojaat qilmaydi", async () => {
    await service.deleteIfUnreferenced('https://example.com/rasm.png');
    await service.deleteIfUnreferenced(null);
    await service.deleteIfUnreferenced(undefined);

    expect(prisma.portfolioImage.count).not.toHaveBeenCalled();
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  it("ombor xatosi tashqariga chiqmaydi (asosiy amal buzilmasin)", async () => {
    storage.deleteFile.mockRejectedValue(new Error('S3 down'));

    await expect(service.deleteIfUnreferenced(OWN_URL)).resolves.toBeUndefined();
  });
});
