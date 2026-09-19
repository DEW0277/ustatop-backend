import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { AddPortfolioDto } from './dto/add-portfolio.dto.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { RemovePortfolioQueryDto } from './dto/remove-portfolio-query.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';
import { UpsertMasterProfileDto } from './dto/upsert-master-profile.dto.js';
import { MasterProfileService } from './master-profile.service.js';

@ApiTags('masters/me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('masters/me')
export class MyMasterController {
  constructor(private readonly masterProfileService: MasterProfileService) {}

  @Get('profile')
  @Roles(Role.CLIENT, Role.MASTER)
  @ApiOperation({ summary: "O'z usta profilimni olish" })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.masterProfileService.getMine(user.id);
  }

  @Put('profile')
  @Roles(Role.CLIENT, Role.MASTER)
  @ApiOperation({
    summary: "Usta profilini yaratish/tahrirlash (birinchi marta yaratilganda foydalanuvchi MASTER roliga o'tadi)",
  })
  upsertProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertMasterProfileDto) {
    return this.masterProfileService.upsert(user.id, dto);
  }

  @Post('services')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: "Profilga yangi xizmat qo'shish" })
  addService(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceDto) {
    return this.masterProfileService.addService(user.id, dto);
  }

  @Put('services/:serviceId')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: "O'z xizmatini tahrirlash" })
  updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.masterProfileService.updateService(user.id, serviceId, dto);
  }

  @Delete('services/:serviceId')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: "O'z xizmatini o'chirish" })
  removeService(@CurrentUser() user: AuthenticatedUser, @Param('serviceId') serviceId: string) {
    return this.masterProfileService.removeService(user.id, serviceId);
  }

  @Post('portfolio')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: "Portfolio rasmini ro'yxatga qo'shish" })
  addPortfolio(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddPortfolioDto) {
    return this.masterProfileService.addPortfolioImage(user.id, dto);
  }

  @Delete('portfolio')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: "Portfolio rasmini URL bo'yicha o'chirish (?url=...)" })
  removePortfolio(@CurrentUser() user: AuthenticatedUser, @Query() query: RemovePortfolioQueryDto) {
    return this.masterProfileService.removePortfolioImage(user.id, query.url);
  }

  @Patch('availability')
  @Roles(Role.MASTER)
  @ApiOperation({ summary: 'Mavjud/band holatini almashtirish' })
  setAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvailabilityDto) {
    return this.masterProfileService.setAvailability(user.id, dto.isAvailable);
  }
}
