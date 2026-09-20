import { OrderStatus, Prisma, Role } from '@prisma/client';

export const orderInclude = {
  master: {
    select: { userId: true, firstName: true, lastName: true, phone: true, user: { select: { avatarUrl: true } } },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithMaster = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

// Matnlar mobil ilovadagi useOrdersStore bilan bir xil.
export function statusTextUz(status: OrderStatus, cancelledBy: Role | null): string {
  switch (status) {
    case OrderStatus.pending:
      return 'Kutilmoqda';
    case OrderStatus.in_progress:
      return 'Qabul qilindi';
    case OrderStatus.completed:
      return 'Bajarildi';
    case OrderStatus.cancelled:
      return cancelledBy === Role.MASTER ? 'Rad etildi' : 'Bekor qilindi';
  }
}

// Mobil ilovadagi `OrderItem` (src/types/index.ts) bilan bir xil shakl.
export function toOrderResponse(order: OrderWithMaster) {
  return {
    id: order.id,
    masterId: order.masterId,
    serviceId: order.serviceId ?? undefined,
    serviceTitle: order.serviceTitle,
    price: order.price,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
    districtId: order.districtId,
    address: order.address,
    preferredDate: order.preferredDate,
    preferredTime: order.preferredTime,
    comment: order.comment ?? undefined,
    status: order.status,
    statusTextUz: statusTextUz(order.status, order.cancelledBy),
    masterName: `${order.master.firstName} ${order.master.lastName}`.trim(),
    masterAvatar: order.master.user.avatarUrl ?? '',
    masterPhone: order.master.phone,
    createdAt: order.createdAt.toISOString(),
  };
}
