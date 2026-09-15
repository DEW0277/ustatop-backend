import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { nameUz: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Kategoriya topilmadi: ${id}`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Ushbu slug bilan kategoriya allaqachon mavjud: ${dto.slug}`);
    }

    return this.prisma.category.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ushbu slug bilan kategoriya allaqachon mavjud: ${dto.slug}`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
