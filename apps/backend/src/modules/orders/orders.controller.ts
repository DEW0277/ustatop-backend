import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { ApiErrorResponses } from '../../common/swagger/api-error-responses.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiErrorResponses(401)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi buyurtma yaratish (ustaga push yuboriladi)' })
  @ApiErrorResponses(400)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: "Mening buyurtmalarim (usta uchun — kelib tushganlar)" })
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrdersQueryDto) {
    return this.ordersService.findMine(user, query);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: "Buyurtma statusini o'zgartirish (usta: qabul/yakunlash/rad; mijoz: faqat kutilayotganini bekor qilish)",
  })
  // 404: begonaga (buyurtma tegishli bo'lmagan foydalanuvchiga) mavjudligi ham bildirilmaydi.
  // 409: status parallel so'rov tomonidan allaqachon o'zgartirilgan.
  @ApiErrorResponses(400, 404, 409)
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, id, dto.status);
  }
}
