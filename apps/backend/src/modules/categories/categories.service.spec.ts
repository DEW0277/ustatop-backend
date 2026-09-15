import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from './categories.service.js';

function createDeps() {
  const prisma = {
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { prisma };
}

describe('CategoriesService', () => {
  let deps: ReturnType<typeof createDeps>;
  let service: CategoriesService;

  beforeEach(() => {
    deps = createDeps();
    service = new CategoriesService(deps.prisma as never);
  });

  describe('findAll', () => {
    it('barcha kategoriyalarni qaytaradi', async () => {
      const mockCategories = [{ id: '1', nameUz: 'Elektrik', slug: 'electrician' }];
      deps.prisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll();
      expect(result).toEqual(mockCategories);
      expect(deps.prisma.category.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('mavjud kategoriyani qaytaradi', async () => {
      const mockCategory = { id: '1', nameUz: 'Elektrik', slug: 'electrician' };
      deps.prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('1');
      expect(result).toEqual(mockCategory);
    });

    it('kategoriya topilmasa NotFoundException otadi', async () => {
      deps.prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('not-found')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('yangi kategoriya yaratadi', async () => {
      const dto = {
        nameUz: 'Santexnik',
        nameRu: 'Сантехник',
        icon: 'water-outline',
        description: 'Suv ta’miri',
        slug: 'plumber',
      };
      deps.prisma.category.findUnique.mockResolvedValue(null);
      deps.prisma.category.create.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await service.create(dto);
      expect(result.id).toBe('cat-1');
      expect(deps.prisma.category.create).toHaveBeenCalledWith({ data: dto });
    });

    it('agar slug band bo‘lsa ConflictException otadi', async () => {
      const dto = {
        nameUz: 'Santexnik',
        nameRu: 'Сантехник',
        icon: 'water-outline',
        description: 'Suv ta’miri',
        slug: 'plumber',
      };
      deps.prisma.category.findUnique.mockResolvedValue({ id: 'existing', slug: 'plumber' });

      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(deps.prisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('kategoriyani yangilaydi', async () => {
      deps.prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', slug: 'plumber' });
      deps.prisma.category.update.mockResolvedValue({ id: 'cat-1', nameUz: 'Yangi Santexnik' });

      const result = await service.update('cat-1', { nameUz: 'Yangi Santexnik' });
      expect(result.nameUz).toBe('Yangi Santexnik');
    });

    it('agar slug boshqa kategoriya tomonidan band bo‘lsa ConflictException otadi', async () => {
      deps.prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', slug: 'plumber' }); // findOne
      deps.prisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-2', slug: 'electrician' }); // slug check

      await expect(service.update('cat-1', { slug: 'electrician' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(deps.prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('kategoriyani o‘chiradi', async () => {
      deps.prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      deps.prisma.category.delete.mockResolvedValue({ id: 'cat-1' });

      const result = await service.remove('cat-1');
      expect(result.id).toBe('cat-1');
      expect(deps.prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });
});
