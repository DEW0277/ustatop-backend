import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ListMastersQueryDto, MasterSortBy } from './dto/list-masters-query.dto.js';
import { masterDetailInclude, masterListInclude, toMasterResponse } from './master.mapper.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const SORT_ORDERS: Record<MasterSortBy, Prisma.MasterProfileOrderByWithRelationInput> = {
  [MasterSortBy.rating]: { rating: 'desc' },
  [MasterSortBy.reviews]: { reviewCount: 'desc' },
  [MasterSortBy.orders]: { completedOrdersCount: 'desc' },
  [MasterSortBy.experience]: { experienceYears: 'desc' },
  [MasterSortBy.newest]: { createdAt: 'desc' },
};

@Injectable()
export class MastersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListMastersQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const search = query.query?.trim();

    const where: Prisma.MasterProfileWhereInput = {
      user: { isBlocked: false },
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(query.districtId ? { districtId: query.districtId } : {}),
      ...(query.categoryId ? { categories: { some: { categoryId: query.categoryId } } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { bio: { contains: search, mode: 'insensitive' } },
              { services: { some: { title: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const masters = await this.prisma.masterProfile.findMany({
      where,
      include: masterListInclude,
      orderBy: [SORT_ORDERS[query.sortBy ?? MasterSortBy.rating], { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return masters.map(toMasterResponse);
  }

  async findOne(id: string) {
    const master = await this.prisma.masterProfile.findFirst({
      where: { id, user: { isBlocked: false } },
      include: masterDetailInclude,
    });

    if (!master) {
      throw new NotFoundException(`Usta topilmadi: ${id}`);
    }

    return toMasterResponse(master);
  }
}
