import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Qidiruv: ism yoki telefon' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;
}
