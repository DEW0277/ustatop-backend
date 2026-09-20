import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'Bloklangan / bloklanmagan' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  isBlocked?: boolean;

  @ApiPropertyOptional({ description: 'Qidiruv: ism yoki telefon' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;
}
