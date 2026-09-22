import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import { AdminService } from './admin.service.js';
import { AdminStatsService } from './admin-stats.service.js';
import { BlockUserDto } from './dto/block-user.dto.js';
import { ListAdminOrdersQueryDto } from './dto/list-admin-orders-query.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { VerifyMasterDto } from './dto/verify-master.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
// Shu controllerdagi BARCHA endpoint uchun umumiy: tokensiz 401, ADMIN bo'lmasa 403.
@ApiErrorResponses(401, 403)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly statsService: AdminStatsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get('stats/dashboard')
  @ApiOperation({ summary: 'Umumiy statistika va so\'nggi 30 kunlik trend (Admin)' })
  getDashboard() {
    return this.statsService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'Foydalanuvchilar ro\'yxati: role, isBlocked, qidiruv (Admin)' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/block')
  @ResponseMessage('Foydalanuvchi holati yangilandi')
  @ApiOperation({ summary: 'Foydalanuvchini bloklash yoki blokdan chiqarish (Admin)' })
  @ApiErrorResponses(400, 404)
  setUserBlocked(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BlockUserDto,
  ) {
    return this.adminService.setUserBlocked(admin, id, dto.isBlocked);
  }

  @Get('masters/pending')
  @ApiOperation({ summary: 'Tasdiqlanmagan ustalar ro\'yxati (Admin)' })
  listPendingMasters(@Query() query: PaginationQueryDto) {
    return this.adminService.listPendingMasters(query);
  }

  @Patch('masters/:id/verify')
  @ResponseMessage('Usta holati yangilandi')
  @ApiOperation({ summary: 'Ustani tasdiqlash (yoki tasdiqni bekor qilish) (Admin)' })
  @ApiErrorResponses(404)
  verifyMaster(@Param('id', ParseUUIDPipe) id: string, @Body() dto: VerifyMasterDto) {
    return this.adminService.setMasterVerified(id, dto.isVerified ?? true);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Barcha buyurtmalar: status, sana oralig\'i, viloyat (Admin)' })
  @ApiErrorResponses(400)
  listOrders(@Query() query: ListAdminOrdersQueryDto) {
    return this.adminService.listOrders(query);
  }

  @Delete('reviews/:id')
  @ResponseMessage('Sharh o\'chirildi')
  @ApiOperation({ summary: 'Nomaqbul sharhni o\'chirish va usta reytingini qayta hisoblash (Admin)' })
  @ApiErrorResponses(404)
  removeReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.remove(id);
  }
}
