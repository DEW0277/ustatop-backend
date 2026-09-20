import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum OrdersView {
  client = 'client',
  master = 'master',
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    enum: OrdersView,
    description: "Standart: MASTER roli uchun kelib tushganlar, boshqalar uchun o'zi bergan buyurtmalar. `client` — usta ham o'zi bergan buyurtmalarni ko'ra oladi.",
  })
  @IsOptional()
  @IsEnum(OrdersView)
  as?: OrdersView;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
