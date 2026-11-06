import { MasterType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class ListMastersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Tasdiqlangan / tasdiqlanmagan' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Viloyat ID' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ enum: MasterType, description: 'Usta turi. Berilmasa barcha turlar (docs/TZ.md §4.4)' })
  @IsOptional()
  @IsEnum(MasterType)
  type?: MasterType;

  @ApiPropertyOptional({ description: 'Qidiruv: ism yoki telefon' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;
}
