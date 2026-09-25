import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { masterListInclude, toMasterResponse } from '../masters/master.mapper.js';
import type { ToggleFavoriteResponseDto } from './dto/toggle-favorite-response.dto.js';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favoriteMaster.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        master: {
          include: masterListInclude,
        },
      },
    });

    return favorites.map((fav) => toMasterResponse(fav.master));
  }

  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favoriteMaster.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { masterId: true },
    });

    return favorites.map((fav) => fav.masterId);
  }

  async addFavorite(userId: string, masterId: string): Promise<ToggleFavoriteResponseDto> {
    const master = await this.prisma.masterProfile.findUnique({
      where: { id: masterId },
      select: { id: true },
    });

    if (!master) {
      throw new NotFoundException(`Usta topilmadi: ${masterId}`);
    }

    await this.prisma.favoriteMaster.upsert({
      where: {
        userId_masterId: {
          userId,
          masterId,
        },
      },
      create: {
        userId,
        masterId,
      },
      update: {},
    });

    return { masterId, isFavorite: true };
  }

  async removeFavorite(userId: string, masterId: string): Promise<ToggleFavoriteResponseDto> {
    await this.prisma.favoriteMaster.deleteMany({
      where: {
        userId,
        masterId,
      },
    });

    return { masterId, isFavorite: false };
  }
}
