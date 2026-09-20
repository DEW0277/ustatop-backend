import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class ListAdminOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Viloyat ID — buyurtma manzili (tuman) shu viloyatda' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (ISO, shu kun ham kiradi)', example: '2026-09-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ description: 'Tugash sanasi (ISO, shu kun ham kiradi)', example: '2026-09-30' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
