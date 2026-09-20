export const reviewUserSelect = { select: { name: true, avatarUrl: true } } as const;

export interface ReviewWithUser {
  id: string;
  masterId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  user: { name: string; avatarUrl: string | null };
}

// Mobil ilovadagi `Review` (src/types/index.ts) bilan bir xil shakl.
export function toReviewResponse(review: ReviewWithUser) {
  return {
    id: review.id,
    masterId: review.masterId,
    userId: review.userId,
    userName: review.user.name,
    userAvatar: review.user.avatarUrl ?? '',
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
  };
}
