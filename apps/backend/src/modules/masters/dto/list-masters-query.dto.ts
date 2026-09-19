import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export enum MasterSortBy {
  rating = 'rating',
  reviews = 'reviews',
  orders = 'orders',
  experience = 'experience',
  newest = 'newest',
}

export class ListMastersQueryDto {
  @ApiPropertyOptional({ description: 'Viloyat ID (UUID)' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ description: 'Tuman ID (UUID)' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ description: 'Kategoriya ID (UUID)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Qidiruv: ism, familiya, bio yoki xizmat nomi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiPropertyOptional({ enum: MasterSortBy, default: MasterSortBy.rating })
  @IsOptional()
  @IsEnum(MasterSortBy)
  sortBy?: MasterSortBy;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
