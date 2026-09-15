import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { CreateRegionDto } from './dto/create-region.dto.js';
import type { UpdateRegionDto } from './dto/update-region.dto.js';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.region.findMany({
      orderBy: { nameUz: 'asc' },
      include: {
        _count: {
          select: { districts: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: {
        districts: {
          orderBy: { nameUz: 'asc' },
        },
      },
    });

    if (!region) {
      throw new NotFoundException(`Viloyat topilmadi: ${id}`);
    }

    return region;
  }

  async create(dto: CreateRegionDto) {
    if (dto.code) {
      const existing = await this.prisma.region.findUnique({
        where: { code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Ushbu kodli viloyat allaqachon mavjud: ${dto.code}`);
      }
    }

    return this.prisma.region.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateRegionDto) {
    await this.findOne(id);

    if (dto.code) {
      const existing = await this.prisma.region.findUnique({
        where: { code: dto.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ushbu kodli viloyat allaqachon mavjud: ${dto.code}`);
      }
    }

    return this.prisma.region.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.region.delete({
      where: { id },
    });
  }
}
