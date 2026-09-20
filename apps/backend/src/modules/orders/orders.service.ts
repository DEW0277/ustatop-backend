import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto, OrdersView } from './dto/list-orders-query.dto.js';
import { orderInclude, toOrderResponse } from './order.mapper.js';

const DEFAULT_LIMIT = 100;

type Transitions = Partial<Record<OrderStatus, OrderStatus[]>>;

const MASTER_TRANSITIONS: Transitions = {
  [OrderStatus.pending]: [OrderStatus.in_progress, OrderStatus.cancelled],
  [OrderStatus.in_progress]: [OrderStatus.completed, OrderStatus.cancelled],
};

const CLIENT_TRANSITIONS: Transitions = {
  [OrderStatus.pending]: [OrderStatus.cancelled],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const master = await this.prisma.masterProfile.findFirst({
      where: { id: dto.masterId, user: { isBlocked: false } },
      select: { id: true, userId: true, isAvailable: true },
    });

    if (!master) {
      throw new NotFoundException(`Usta topilmadi: ${dto.masterId}`);
    }
    if (master.userId === userId) {
      throw new BadRequestException("O'zingizga buyurtma bera olmaysiz");
    }
    if (!master.isAvailable) {
      throw new BadRequestException('Usta hozir band, keyinroq urinib ko‘ring');
    }

    const district = await this.prisma.district.findUnique({ where: { id: dto.districtId }, select: { id: true } });
    if (!district) {
      throw new BadRequestException({
        message: 'Tuman topilmadi',
        errors: { districtId: ['Berilgan tuman mavjud emas'] },
      });
    }

    let serviceTitle = dto.serviceTitle;
    let price = dto.price;

    if (dto.serviceId) {
      const service = await this.prisma.masterService.findFirst({
        where: { id: dto.serviceId, masterId: master.id },
      });
      if (!service) {
        throw new BadRequestException({
          message: 'Xizmat topilmadi',
          errors: { serviceId: ["Bu xizmat tanlangan ustaga tegishli emas"] },
        });
      }
      // Narxni mijoz yuborgan qiymatga ishonmasdan, ustaning haqiqiy xizmatidan olamiz.
      serviceTitle = service.title;
      price = service.price;
    }

    const order = await this.prisma.order.create({
      data: {
        masterId: master.id,
        clientId: userId,
        serviceId: dto.serviceId,
        serviceTitle,
        price,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        districtId: dto.districtId,
        address: dto.address,
        preferredDate: dto.preferredDate,
        preferredTime: dto.preferredTime,
        comment: dto.comment,
      },
      include: orderInclude,
    });

    await this.notifications.notifyUser(master.userId, {
      title: 'Yangi buyurtma keldi!',
      body: `${order.clientName}: ${order.serviceTitle}`,
      data: { orderId: order.id, type: 'order_created' },
    });

    return toOrderResponse(order);
  }

  async findMine(user: AuthenticatedUser, query: ListOrdersQueryDto) {
    const view = query.as ?? (user.role === Role.MASTER ? OrdersView.master : OrdersView.client);
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where: Prisma.OrderWhereInput =
      view === OrdersView.master ? { master: { userId: user.id } } : { clientId: user.id };

    const orders = await this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return orders.map(toOrderResponse);
  }

  async updateStatus(user: AuthenticatedUser, orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });

    const isMaster = order?.master.userId === user.id;
    const isClient = order?.clientId === user.id;

    // Begonaga buyurtma mavjudligini ham bildirmaymiz.
    if (!order || (!isMaster && !isClient)) {
      throw new NotFoundException(`Buyurtma topilmadi: ${orderId}`);
    }

    const allowed = (isMaster ? MASTER_TRANSITIONS : CLIENT_TRANSITIONS)[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Buyurtma statusini "${order.status}" dan "${status}" ga o'zgartirib bo'lmaydi`,
      );
    }

    const actorRole = isMaster ? Role.MASTER : Role.CLIENT;

    await this.prisma.$transaction(async (tx) => {
      // Status hali o'zgarmaganini tekshiramiz: parallel so'rovlarda completedOrdersCount ikki marta oshmasin.
      const { count } = await tx.order.updateMany({
        where: { id: orderId, status: order.status },
        data: { status, cancelledBy: status === OrderStatus.cancelled ? actorRole : undefined },
      });

      if (count === 0) {
        throw new ConflictException("Buyurtma statusi boshqa so'rov tomonidan o'zgartirilgan, qayta urinib ko'ring");
      }

      if (status === OrderStatus.completed) {
        await tx.masterProfile.update({
          where: { id: order.masterId },
          data: { completedOrdersCount: { increment: 1 } },
        });
      }
    });

    await this.notifyStatusChange(order.clientId, order.master.userId, order.id, status, isMaster);

    return { orderId: order.id, status };
  }

  private async notifyStatusChange(
    clientId: string | null,
    masterUserId: string,
    orderId: string,
    status: OrderStatus,
    changedByMaster: boolean,
  ) {
    const data = { orderId, type: 'order_status', status };

    if (changedByMaster && clientId) {
      const texts: Partial<Record<OrderStatus, string>> = {
        [OrderStatus.in_progress]: 'Buyurtmangiz qabul qilindi',
        [OrderStatus.completed]: 'Buyurtmangiz bajarildi',
        [OrderStatus.cancelled]: 'Buyurtmangiz rad etildi',
      };
      await this.notifications.notifyUser(clientId, { title: 'Buyurtma yangilandi', body: texts[status] ?? status, data });
    } else if (!changedByMaster) {
      await this.notifications.notifyUser(masterUserId, {
        title: 'Buyurtma bekor qilindi',
        body: 'Mijoz buyurtmani bekor qildi',
        data,
      });
    }
  }
}
