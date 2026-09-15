import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegionsService } from './regions.service.js';

function createDeps() {
  const prisma = {
    region: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma };
}

describe('RegionsService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: RegionsService;

  beforeEach(() => {
    deps = createDeps();
    service = new RegionsService(deps.prisma as never);
  });

  describe('findAll', () => {
    it('viloyatlar ro‘yxatini qaytaradi', async () => {
      const mockRegions = [
        { id: '1', nameUz: 'Toshkent shahri', nameRu: 'г. Ташкент', code: 'TAS' },
      ];
      deps.prisma.region.findMany.mockResolvedValue(mockRegions);

      const result = await service.findAll();
      expect(result).toEqual(mockRegions);
      expect(deps.prisma.region.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('mavjud viloyatni qaytaradi', async () => {
      const mockRegion = {
        id: '1',
        nameUz: 'Toshkent shahri',
        nameRu: 'г. Ташкент',
        code: 'TAS',
        districts: [],
      };
      deps.prisma.region.findUnique.mockResolvedValue(mockRegion);

      const result = await service.findOne('1');
      expect(result).toEqual(mockRegion);
    });

    it('viloyat topilmasa NotFoundException otadi', async () => {
      deps.prisma.region.findUnique.mockResolvedValue(null);

      await expect(service.findOne('not-exist')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('yangi viloyat yaratadi', async () => {
      const dto = { nameUz: 'Samarqand viloyati', nameRu: 'Самаркандская область', code: 'SAM' };
      deps.prisma.region.findUnique.mockResolvedValue(null);
      deps.prisma.region.create.mockResolvedValue({ id: '2', ...dto });

      const result = await service.create(dto);
      expect(result.id).toBe('2');
      expect(deps.prisma.region.create).toHaveBeenCalledWith({ data: dto });
    });

    it('agar kod band bo‘lsa ConflictException otadi', async () => {
      const dto = { nameUz: 'Samarqand', nameRu: 'Самарканд', code: 'SAM' };
      deps.prisma.region.findUnique.mockResolvedValue({ id: 'existing', code: 'SAM' });

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.prisma.region.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('viloyatni yangilaydi', async () => {
      deps.prisma.region.findUnique.mockResolvedValueOnce({ id: '1', code: 'TAS' }); // findOne
      deps.prisma.region.findUnique.mockResolvedValueOnce(null); // code check
      deps.prisma.region.update.mockResolvedValue({ id: '1', nameUz: 'Yangilangan Toshkent' });

      const result = await service.update('1', { nameUz: 'Yangilangan Toshkent' });
      expect(result.nameUz).toBe('Yangilangan Toshkent');
    });
  });

  describe('remove', () => {
    it('viloyatni o‘chiradi', async () => {
      deps.prisma.region.findUnique.mockResolvedValue({ id: '1' });
      deps.prisma.region.delete.mockResolvedValue({ id: '1' });

      const result = await service.remove('1');
      expect(result.id).toBe('1');
      expect(deps.prisma.region.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
