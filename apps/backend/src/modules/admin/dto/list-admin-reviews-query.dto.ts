import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class ListAdminReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Usta ID bo'yicha filtr" })
  @IsOptional()
  @IsUUID()
  masterId?: string;

  @ApiPropertyOptional({ description: "Reyting bo'yicha filtr (1-5)", minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}
