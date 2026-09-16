import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DistrictsService } from './districts.service.js';

function createDeps() {
  const prisma = {
    district: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    region: {
      findUnique: vi.fn(),
    },
  };
  return { prisma };
}

describe('DistrictsService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: DistrictsService;

  beforeEach(() => {
    deps = createDeps();
    service = new DistrictsService(deps.prisma as never);
  });

  describe('findAll', () => {
    it('barcha tumanlarni qaytaradi', async () => {
      const mockDistricts = [
        { id: '1', nameUz: 'Chilonzor tumani', nameRu: 'Чиланзарский район', regionId: 'reg-1' },
      ];
      deps.prisma.district.findMany.mockResolvedValue(mockDistricts);

      const result = await service.findAll();
      expect(result).toEqual(mockDistricts);
      expect(deps.prisma.district.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { nameUz: 'asc' },
        include: {
          region: {
            select: {
              id: true,
              nameUz: true,
              nameRu: true,
              code: true,
            },
          },
        },
      });
    });

    it('regionId bo‘yicha filter qilib qaytaradi', async () => {
      deps.prisma.district.findMany.mockResolvedValue([]);

      await service.findAll('reg-1');
      expect(deps.prisma.district.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { regionId: 'reg-1' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('mavjud tumanni qaytaradi', async () => {
      const mockDistrict = { id: '1', nameUz: 'Chilonzor tumani', region: { id: 'reg-1' } };
      deps.prisma.district.findUnique.mockResolvedValue(mockDistrict);

      const result = await service.findOne('1');
      expect(result).toEqual(mockDistrict);
    });

    it('tuman topilmasa NotFoundException otadi', async () => {
      deps.prisma.district.findUnique.mockResolvedValue(null);

      await expect(service.findOne('not-found')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('viloyat mavjud bo‘lsa yangi tuman yaratadi', async () => {
      const dto = { nameUz: 'Chilonzor', nameRu: 'Чиланзар', regionId: 'reg-1' };
      deps.prisma.region.findUnique.mockResolvedValue({ id: 'reg-1' });
      deps.prisma.district.create.mockResolvedValue({ id: 'dist-1', ...dto });

      const result = await service.create(dto);
      expect(result.id).toBe('dist-1');
      expect(deps.prisma.district.create).toHaveBeenCalledWith({ data: dto });
    });

    it('viloyat topilmasa NotFoundException otadi', async () => {
      const dto = { nameUz: 'Chilonzor', nameRu: 'Чиланзар', regionId: 'not-exist' };
      deps.prisma.region.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.prisma.district.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('tumanni yangilaydi', async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'dist-1' });
      deps.prisma.district.update.mockResolvedValue({ id: 'dist-1', nameUz: 'Yangilangan tuman' });

      const result = await service.update('dist-1', { nameUz: 'Yangilangan tuman' });
      expect(result.nameUz).toBe('Yangilangan tuman');
    });

    it('agar regionId o‘zgarsa va topilmasa NotFoundException otadi', async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'dist-1' });
      deps.prisma.region.findUnique.mockResolvedValue(null);

      await expect(
        service.update('dist-1', { regionId: 'bad-reg' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(deps.prisma.district.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('tumanni o‘chiradi', async () => {
      deps.prisma.district.findUnique.mockResolvedValue({ id: 'dist-1' });
      deps.prisma.district.delete.mockResolvedValue({ id: 'dist-1' });

      const result = await service.remove('dist-1');
      expect(result.id).toBe('dist-1');
      expect(deps.prisma.district.delete).toHaveBeenCalledWith({ where: { id: 'dist-1' } });
    });
  });
});
