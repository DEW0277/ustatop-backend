import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { CreateDistrictDto } from './dto/create-district.dto.js';
import type { UpdateDistrictDto } from './dto/update-district.dto.js';

@Injectable()
export class DistrictsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(regionId?: string) {
    return this.prisma.district.findMany({
      where: regionId ? { regionId } : undefined,
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
  }

  async findOne(id: string) {
    const district = await this.prisma.district.findUnique({
      where: { id },
      include: {
        region: true,
      },
    });

    if (!district) {
      throw new NotFoundException(`Tuman topilmadi: ${id}`);
    }

    return district;
  }

  async create(dto: CreateDistrictDto) {
    const region = await this.prisma.region.findUnique({
      where: { id: dto.regionId },
    });

    if (!region) {
      throw new NotFoundException(`Berilgan viloyat topilmadi: ${dto.regionId}`);
    }

    return this.prisma.district.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateDistrictDto) {
    await this.findOne(id);

    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) {
        throw new NotFoundException(`Berilgan viloyat topilmadi: ${dto.regionId}`);
      }
    }

    return this.prisma.district.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.district.delete({
      where: { id },
    });
  }
}
