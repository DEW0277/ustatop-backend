import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { ListAdminReviewsQueryDto } from '../admin/dto/list-admin-reviews-query.dto.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { ListReviewsQueryDto } from './dto/list-reviews-query.dto.js';
import { reviewUserSelect, toReviewResponse } from './review.mapper.js';

const DEFAULT_LIMIT = 50;
const DEFAULT_ADMIN_LIMIT = 20;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(query: ListAdminReviewsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_ADMIN_LIMIT;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      ...(query.masterId ? { masterId: query.masterId } : {}),
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
    };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          master: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: reviews.map((review) => ({
        id: review.id,
        masterId: review.masterId,
        masterName: `${review.master.firstName} ${review.master.lastName}`.trim(),
        masterPhone: review.master.phone,
        userId: review.userId,
        userName: review.user.name,
        userPhone: review.user.phone,
        userAvatar: review.user.avatarUrl ?? undefined,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async findByMaster(masterId: string, query: ListReviewsQueryDto) {
    await this.requireMaster(masterId);

    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const reviews = await this.prisma.review.findMany({
      where: { masterId },
      include: { user: reviewUserSelect },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return reviews.map(toReviewResponse);
  }

  // Bitta foydalanuvchi bitta ustaga bitta sharh qoldiradi: qayta yuborsa avvalgisi yangilanadi
  // (reytingni takroriy ovozlar bilan buzib bo'lmasligi uchun).
  async createOrUpdate(userId: string, masterId: string, dto: CreateReviewDto) {
    const master = await this.requireMaster(masterId);

    if (master.userId === userId) {
      throw new BadRequestException("O'zingizga sharh qoldira olmaysiz");
    }

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.upsert({
        where: { masterId_userId: { masterId, userId } },
        create: { masterId, userId, rating: dto.rating, comment: dto.comment },
        update: { rating: dto.rating, comment: dto.comment },
        include: { user: reviewUserSelect },
      });

      await this.recalculateRating(tx, masterId);

      return toReviewResponse(review);
    });
  }

  // Moderatsiya: nomaqbul sharhni o'chiradi va usta reytingini qayta hisoblaydi.
  async remove(reviewId: string): Promise<{ id: string; masterId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({ where: { id: reviewId }, select: { id: true, masterId: true } });

      if (!review) {
        throw new NotFoundException(`Sharh topilmadi: ${reviewId}`);
      }

      await tx.review.delete({ where: { id: reviewId } });
      await this.recalculateRating(tx, review.masterId);

      return review;
    });
  }

  private async recalculateRating(tx: Prisma.TransactionClient, masterId: string): Promise<void> {
    const stats = await tx.review.aggregate({
      where: { masterId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.masterProfile.update({
      where: { id: masterId },
      data: {
        rating: Math.round((stats._avg.rating ?? 0) * 100) / 100,
        reviewCount: stats._count._all,
      },
    });
  }

  private async requireMaster(masterId: string) {
    const master = await this.prisma.masterProfile.findFirst({
      where: { id: masterId, user: { isBlocked: false } },
      select: { id: true, userId: true },
    });

    if (!master) {
      throw new NotFoundException(`Usta topilmadi: ${masterId}`);
    }

    return master;
  }
}
