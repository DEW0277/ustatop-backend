import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WeekDay } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NormalizedPhone } from '../../../common/decorators/normalized-phone.decorator.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WorkingHoursDto {
  @ApiProperty({ example: '09:00' })
  @Matches(TIME_REGEX, { message: "start HH:mm formatida bo'lishi kerak" })
  start!: string;

  @ApiProperty({ example: '18:00' })
  @Matches(TIME_REGEX, { message: "end HH:mm formatida bo'lishi kerak" })
  end!: string;

  @ApiProperty({ enum: WeekDay, isArray: true, example: ['mon', 'tue', 'wed', 'thu', 'fri'] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(WeekDay, { each: true })
  workDays!: WeekDay[];
}

export class UpsertMasterProfileDto {
  @ApiPropertyOptional({ example: 'Alisher' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: "Berilmasa foydalanuvchi telefoni ishlatiladi" })
  @IsOptional()
  @NormalizedPhone()
  phone?: string;

  @ApiPropertyOptional({ example: '@alisher_usta' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegram?: string;

  @ApiPropertyOptional({ example: "10 yillik tajribaga ega elektrik" })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({ example: 'Chilonzor 9-daha, 12-uy' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ type: WorkingHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @ApiPropertyOptional({ type: [String], description: "To'liq ro'yxat: mavjud kategoriyalar shu bilan almashtiriladi" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(8)
  @IsUUID('all', { each: true })
  categoryIds?: string[];
}
