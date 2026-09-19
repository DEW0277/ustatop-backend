import type { Prisma } from '@prisma/client';

export function buildMasterInclude(reviewsTake: number, portfolioTake?: number) {
  return {
    region: { select: { id: true, nameUz: true, nameRu: true, code: true } },
    district: { select: { id: true, regionId: true, nameUz: true, nameRu: true } },
    categories: {
      include: { category: { select: { id: true, nameUz: true, nameRu: true, icon: true, slug: true } } },
    },
    services: { orderBy: { createdAt: 'asc' } },
    portfolio: { orderBy: { sortOrder: 'asc' }, take: portfolioTake },
    reviews: {
      orderBy: { createdAt: 'desc' },
      take: reviewsTake,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    },
  } satisfies Prisma.MasterProfileInclude;
}

export const masterDetailInclude = buildMasterInclude(10);
export const masterListInclude = buildMasterInclude(3, 3);

export type MasterWithRelations = Prisma.MasterProfileGetPayload<{
  include: typeof masterDetailInclude;
}>;

export function toMasterResponse(master: MasterWithRelations) {
  return {
    id: master.id,
    userId: master.userId,
    firstName: master.firstName,
    lastName: master.lastName,
    phone: master.phone,
    telegram: master.telegram,
    bio: master.bio,
    experienceYears: master.experienceYears,
    rating: master.rating,
    reviewCount: master.reviewCount,
    completedOrdersCount: master.completedOrdersCount,
    isVerified: master.isVerified,
    isAvailable: master.isAvailable,
    region: master.region,
    district: master.district,
    address: master.address,
    workingHours: master.workingHours,
    categories: master.categories.map((item) => item.category),
    services: master.services.map((service) => ({
      id: service.id,
      title: service.title,
      price: service.price,
      priceType: service.priceType,
      currency: service.currency,
    })),
    portfolioImages: master.portfolio.map((image) => ({
      id: image.id,
      url: image.url,
      sortOrder: image.sortOrder,
    })),
    reviews: master.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      user: review.user,
    })),
    createdAt: master.createdAt,
  };
}
