import type { Prisma } from '@prisma/client';
import { reviewUserSelect, toReviewResponse } from '../reviews/review.mapper.js';

export function buildMasterInclude(reviewsTake: number, portfolioTake?: number) {
  return {
    user: { select: { avatarUrl: true } },
    categories: { select: { categoryId: true } },
    services: { orderBy: { createdAt: 'asc' } },
    portfolio: { orderBy: { sortOrder: 'desc' }, take: portfolioTake },
    reviews: {
      orderBy: { createdAt: 'desc' },
      take: reviewsTake,
      include: { user: reviewUserSelect },
    },
  } satisfies Prisma.MasterProfileInclude;
}

export const masterDetailInclude = buildMasterInclude(10);
export const masterListInclude = buildMasterInclude(3, 3);

export type MasterWithRelations = Prisma.MasterProfileGetPayload<{
  include: typeof masterDetailInclude;
}>;

// Mobil ilovadagi `Master` (src/types/index.ts) bilan bir xil shakl.
export function toMasterResponse(master: MasterWithRelations) {
  return {
    id: master.id,
    firstName: master.firstName,
    lastName: master.lastName,
    fullName: `${master.firstName} ${master.lastName}`.trim(),
    phone: master.phone,
    telegram: master.telegram ?? undefined,
    avatarUrl: master.user.avatarUrl ?? '',
    bio: master.bio,
    experienceYears: master.experienceYears,
    rating: master.rating,
    reviewCount: master.reviewCount,
    completedOrdersCount: master.completedOrdersCount,
    isVerified: master.isVerified,
    isAvailable: master.isAvailable,
    regionId: master.regionId,
    districtId: master.districtId,
    address: master.address,
    categoryIds: master.categories.map((item) => item.categoryId),
    services: master.services.map(toServiceResponse),
    workingHours: master.workingHours,
    portfolioImages: master.portfolio.map((image) => image.url),
    reviews: master.reviews.map(toReviewResponse),
    createdAt: master.createdAt.toISOString(),
  };
}

export function toServiceResponse(service: {
  id: string;
  title: string;
  price: number;
  priceType: string;
  currency: string;
}) {
  return {
    id: service.id,
    title: service.title,
    price: service.price,
    priceType: service.priceType,
    currency: service.currency,
  };
}
