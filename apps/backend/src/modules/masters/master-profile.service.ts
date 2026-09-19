import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { AddPortfolioDto } from './dto/add-portfolio.dto.js';
import type { CreateServiceDto } from './dto/create-service.dto.js';
import type { UpdateServiceDto } from './dto/update-service.dto.js';
import type { UpsertMasterProfileDto } from './dto/upsert-master-profile.dto.js';
import { masterDetailInclude, toMasterResponse, toServiceResponse } from './master.mapper.js';

const REQUIRED_ON_CREATE = [
  'firstName',
  'lastName',
  'bio',
  'regionId',
  'districtId',
  'address',
  'workingHours',
] as const;

@Injectable()
export class MasterProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({
      where: { userId },
      include: masterDetailInclude,
    });

    if (!profile) {
      throw new NotFoundException('Usta profili hali yaratilmagan');
    }

    return toMasterResponse(profile);
  }

  async upsert(userId: string, dto: UpsertMasterProfileDto) {
    const [user, existing] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.masterProfile.findUnique({ where: { userId } }),
    ]);

    if (!existing) {
      const missing = REQUIRED_ON_CREATE.filter((field) => dto[field] === undefined);
      if (missing.length > 0) {
        throw new BadRequestException({
          message: "Usta profilini yaratish uchun majburiy maydonlar to'ldirilmagan",
          errors: Object.fromEntries(missing.map((field) => [field, [`${field} majburiy`]])),
        });
      }
    }

    await this.assertLocation(dto, existing);
    if (dto.categoryIds) {
      await this.assertCategoriesExist(dto.categoryIds);
    }

    const workingHours = dto.workingHours
      ? ({
          start: dto.workingHours.start,
          end: dto.workingHours.end,
          workDays: dto.workingHours.workDays,
        } satisfies Prisma.InputJsonObject)
      : undefined;

    const profileId = await this.prisma.$transaction(async (tx) => {
      const profile = existing
        ? await tx.masterProfile.update({
            where: { id: existing.id },
            data: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phone: dto.phone,
              telegram: dto.telegram,
              bio: dto.bio,
              experienceYears: dto.experienceYears,
              regionId: dto.regionId,
              districtId: dto.districtId,
              address: dto.address,
              workingHours,
            },
          })
        : await tx.masterProfile.create({
            data: {
              userId,
              firstName: dto.firstName!,
              lastName: dto.lastName!,
              phone: dto.phone ?? user.phone,
              telegram: dto.telegram,
              bio: dto.bio!,
              experienceYears: dto.experienceYears ?? 0,
              regionId: dto.regionId!,
              districtId: dto.districtId!,
              address: dto.address!,
              workingHours: workingHours!,
            },
          });

      if (dto.categoryIds) {
        await tx.masterCategory.deleteMany({ where: { masterId: profile.id } });
        await tx.masterCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({ masterId: profile.id, categoryId })),
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          name: `${profile.firstName} ${profile.lastName}`,
          ...(user.role === Role.CLIENT ? { role: Role.MASTER } : {}),
        },
      });

      return profile.id;
    });

    const profile = await this.prisma.masterProfile.findUniqueOrThrow({
      where: { id: profileId },
      include: masterDetailInclude,
    });

    return toMasterResponse(profile);
  }

  async addService(userId: string, dto: CreateServiceDto) {
    const profile = await this.requireProfile(userId);

    const service = await this.prisma.masterService.create({
      data: {
        masterId: profile.id,
        title: dto.title,
        price: dto.price,
        priceType: dto.priceType,
        currency: dto.currency,
      },
    });

    return toServiceResponse(service);
  }

  async updateService(userId: string, serviceId: string, dto: UpdateServiceDto) {
    const profile = await this.requireProfile(userId);

    const service = await this.prisma.masterService.findFirst({
      where: { id: serviceId, masterId: profile.id },
    });

    if (!service) {
      throw new NotFoundException(`Xizmat topilmadi: ${serviceId}`);
    }

    const updated = await this.prisma.masterService.update({
      where: { id: service.id },
      data: {
        title: dto.title,
        price: dto.price,
        priceType: dto.priceType,
        currency: dto.currency,
      },
    });

    return toServiceResponse(updated);
  }

  async removeService(userId: string, serviceId: string) {
    const profile = await this.requireProfile(userId);

    const service = await this.prisma.masterService.findFirst({
      where: { id: serviceId, masterId: profile.id },
    });

    if (!service) {
      throw new NotFoundException(`Xizmat topilmadi: ${serviceId}`);
    }

    await this.prisma.masterService.delete({ where: { id: service.id } });

    return { id: service.id };
  }

  async addPortfolioImage(userId: string, dto: AddPortfolioDto) {
    const profile = await this.requireProfile(userId);

    const last = await this.prisma.portfolioImage.aggregate({
      where: { masterId: profile.id },
      _max: { sortOrder: true },
    });

    const image = await this.prisma.portfolioImage.create({
      data: {
        masterId: profile.id,
        url: dto.url,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });

    return { id: image.id, url: image.url, sortOrder: image.sortOrder };
  }

  async removePortfolioImage(userId: string, url: string) {
    const profile = await this.requireProfile(userId);

    const { count } = await this.prisma.portfolioImage.deleteMany({
      where: { masterId: profile.id, url },
    });

    if (count === 0) {
      throw new NotFoundException('Portfolio rasmi topilmadi');
    }

    return { url };
  }

  async setAvailability(userId: string, isAvailable: boolean) {
    const profile = await this.requireProfile(userId);

    const updated = await this.prisma.masterProfile.update({
      where: { id: profile.id },
      data: { isAvailable },
      include: masterDetailInclude,
    });

    return toMasterResponse(updated);
  }

  private async requireProfile(userId: string) {
    const profile = await this.prisma.masterProfile.findUnique({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('Usta profili hali yaratilmagan');
    }

    return profile;
  }

  private async assertLocation(
    dto: UpsertMasterProfileDto,
    existing: { regionId: string; districtId: string } | null,
  ) {
    if (!dto.regionId && !dto.districtId) {
      return;
    }

    const regionId = dto.regionId ?? existing?.regionId;
    const districtId = dto.districtId ?? existing?.districtId;

    const district = districtId
      ? await this.prisma.district.findUnique({ where: { id: districtId } })
      : null;

    if (!district) {
      throw new BadRequestException({
        message: 'Tuman topilmadi',
        errors: { districtId: ['Berilgan tuman mavjud emas'] },
      });
    }

    if (district.regionId !== regionId) {
      throw new BadRequestException({
        message: "Tuman tanlangan viloyatga tegishli emas",
        errors: { districtId: ['Tuman boshqa viloyatga tegishli'] },
      });
    }
  }

  private async assertCategoriesExist(categoryIds: string[]) {
    const found = await this.prisma.category.count({ where: { id: { in: categoryIds } } });

    if (found !== categoryIds.length) {
      throw new BadRequestException({
        message: 'Ba\'zi kategoriyalar topilmadi',
        errors: { categoryIds: ['Ro\'yxatdagi kategoriyalardan biri mavjud emas'] },
      });
    }
  }
}
