import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { MasterProfileService } from '../masters/master-profile.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { CreateMasterDto } from './dto/create-master.dto.js';
import type { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto.js';
import type { ListMastersQueryDto } from './dto/list-masters-query.dto.js';
import type { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import type { PaginationQueryDto } from './dto/pagination-query.dto.js';

const DEFAULT_LIMIT = 20;
const MAX_SEARCH_TERMS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function paginate(query: PaginationQueryDto) {
  const page = query.page ?? 1;
  const limit = query.limit ?? DEFAULT_LIMIT;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

const pendingMasterSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  phone: true,
  telegram: true,
  bio: true,
  experienceYears: true,
  isVerified: true,
  address: true,
  createdAt: true,
  region: { select: { id: true, nameUz: true } },
  district: { select: { id: true, nameUz: true } },
  categories: { select: { category: { select: { id: true, nameUz: true } } } },
  user: { select: { avatarUrl: true, isBlocked: true } },
} satisfies Prisma.MasterProfileSelect;

type MasterRow = Prisma.MasterProfileGetPayload<{ select: typeof pendingMasterSelect }>;

const masterWithStatsSelect = {
  ...pendingMasterSelect,
  rating: true,
  reviewCount: true,
  completedOrdersCount: true,
  isAvailable: true,
} satisfies Prisma.MasterProfileSelect;

type MasterWithStatsRow = Prisma.MasterProfileGetPayload<{ select: typeof masterWithStatsSelect }>;

function toAdminMaster(master: MasterRow) {
  return {
    id: master.id,
    userId: master.userId,
    fullName: `${master.firstName} ${master.lastName}`.trim(),
    phone: master.phone,
    telegram: master.telegram ?? undefined,
    avatarUrl: master.user.avatarUrl ?? undefined,
    bio: master.bio,
    experienceYears: master.experienceYears,
    isVerified: master.isVerified,
    isBlocked: master.user.isBlocked,
    region: master.region,
    district: master.district,
    address: master.address,
    categories: master.categories.map((item) => item.category),
    createdAt: master.createdAt.toISOString(),
  };
}

function toAdminMasterWithStats(master: MasterWithStatsRow) {
  return {
    ...toAdminMaster(master),
    rating: master.rating,
    reviewCount: master.reviewCount,
    completedOrdersCount: master.completedOrdersCount,
    isAvailable: master.isAvailable,
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly masterProfiles: MasterProfileService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const { page, limit, skip, take } = paginate(query);
    const search = query.query?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isBlocked !== undefined ? { isBlocked: query.isBlocked } : {}),
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          role: true,
          avatarUrl: true,
          isBlocked: true,
          isPhoneVerified: true,
          deletedAt: true,
          createdAt: true,
          masterProfile: { select: { id: true, isVerified: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map(({ masterProfile, avatarUrl, createdAt, deletedAt, ...user }) => ({
        ...user,
        avatarUrl: avatarUrl ?? undefined,
        masterId: masterProfile?.id,
        deletedAt: deletedAt?.toISOString(),
        createdAt: createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async setUserBlocked(admin: AuthenticatedUser, userId: string, isBlocked: boolean) {
    if (admin.id === userId) {
      throw new BadRequestException("O'zingizni bloklab bo'lmaydi");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException(`Foydalanuvchi topilmadi: ${userId}`);
    }

    // Admin akkauntlari faqat DB orqali boshqariladi — panel orqali boshqa adminni chetlatib bo'lmaydi.
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException("Administratorni bloklab bo'lmaydi");
    }

    // O'chirilgan (anonimlashtirilgan) akkaunt doim bloklangan qoladi — blokdan chiqarish uni "tiriltirmasin".
    if (user.deletedAt) {
      throw new ConflictException("Foydalanuvchi akkauntini o'chirgan — holatini o'zgartirib bo'lmaydi");
    }

    await this.prisma.user.update({ where: { id: userId }, data: { isBlocked } });

    return { id: userId, isBlocked };
  }

  async listPendingMasters(query: PaginationQueryDto) {
    const { page, limit, skip, take } = paginate(query);
    const where: Prisma.MasterProfileWhereInput = { isVerified: false };

    const [masters, total] = await Promise.all([
      this.prisma.masterProfile.findMany({
        where,
        select: pendingMasterSelect,
        orderBy: { createdAt: 'asc' }, // eng eski so'rov birinchi
        skip,
        take,
      }),
      this.prisma.masterProfile.count({ where }),
    ]);

    return { items: masters.map(toAdminMaster), total, page, limit };
  }

  async listMasters(query: ListMastersQueryDto) {
    const { page, limit, skip, take } = paginate(query);
    // Ism ikki ustunda (firstName/lastName) saqlanadi, jadvalda esa to'liq ism ko'rinadi — butun
    // qatorni bitta `contains` bilan qidirsak "Ali Valiyev" hech narsa topmaydi. Shuning uchun
    // har bir so'z alohida mos kelishi kerak (bo'shliqli telefon "+998 90 123" ham shu tufayli ishlaydi).
    const terms = (query.query ?? '').split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);

    const where: Prisma.MasterProfileWhereInput = {
      ...(query.isVerified !== undefined ? { isVerified: query.isVerified } : {}),
      ...(query.regionId ? { regionId: query.regionId } : {}),
      ...(terms.length > 0
        ? {
            AND: terms.map((term) => ({
              OR: [
                { firstName: { contains: term, mode: 'insensitive' as const } },
                { lastName: { contains: term, mode: 'insensitive' as const } },
                { phone: { contains: term } },
              ],
            })),
          }
        : {}),
    };

    const [masters, total] = await this.prisma.$transaction([
      this.prisma.masterProfile.findMany({
        where,
        select: masterWithStatsSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.masterProfile.count({ where }),
    ]);

    return {
      items: masters.map(toAdminMasterWithStats),
      total,
      page,
      limit,
    };
  }

  async createMaster(dto: CreateMasterDto) {
    const id = await this.masterProfiles.createByAdmin(dto);

    const master = await this.prisma.masterProfile.findUniqueOrThrow({
      where: { id },
      select: masterWithStatsSelect,
    });

    return toAdminMasterWithStats(master);
  }

  async setMasterVerified(masterId: string, isVerified: boolean) {
    const master = await this.prisma.masterProfile.findUnique({
      where: { id: masterId },
      select: { id: true, userId: true, isVerified: true },
    });

    if (!master) {
      throw new NotFoundException(`Usta topilmadi: ${masterId}`);
    }

    await this.prisma.masterProfile.update({ where: { id: masterId }, data: { isVerified } });

    if (isVerified && !master.isVerified) {
      await this.notifications.notifyUser(master.userId, {
        title: 'Profilingiz tasdiqlandi',
        body: 'Tabriklaymiz! Endi profilingiz "Tasdiqlangan" belgisi bilan ko\'rinadi.',
        data: { type: 'master_verified', masterId },
      });
    }

    return { id: masterId, isVerified };
  }

  async listOrders(query: ListAdminOrdersQueryDto) {
    const { page, limit, skip, take } = paginate(query);

    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException("`from` sanasi `to` sanasidan keyin bo'lishi mumkin emas");
    }

    // `to=2026-09-30` (00:00 UTC) butun kunni qamrab olishi uchun keyingi kun boshigacha (exclusive).
    const upperBound = query.to
      ? new Date(query.to.getTime() % DAY_MS === 0 ? query.to.getTime() + DAY_MS : query.to.getTime())
      : undefined;

    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.regionId ? { district: { regionId: query.regionId } } : {}),
      ...(query.from || upperBound
        ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(upperBound ? { lt: upperBound } : {}) } }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          master: { select: { firstName: true, lastName: true, phone: true } },
          district: { select: { nameUz: true, region: { select: { id: true, nameUz: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        masterId: order.masterId,
        masterName: `${order.master.firstName} ${order.master.lastName}`.trim(),
        masterPhone: order.master.phone,
        clientId: order.clientId ?? undefined,
        clientName: order.clientName,
        clientPhone: order.clientPhone,
        serviceTitle: order.serviceTitle,
        price: order.price,
        region: order.district.region,
        districtId: order.districtId,
        districtName: order.district.nameUz,
        address: order.address,
        preferredDate: order.preferredDate,
        preferredTime: order.preferredTime,
        comment: order.comment ?? undefined,
        status: order.status,
        cancelledBy: order.cancelledBy ?? undefined,
        createdAt: order.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}
