import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NormalizedPhone } from '../../../common/decorators/normalized-phone.decorator.js';
import { WorkingHoursDto } from '../../masters/dto/upsert-master-profile.dto.js';

// Maydon qoidalari `UpsertMasterProfileDto` bilan bir xil, lekin yaratish uchun majburiylari bu yerda
// DTO darajasida majburiy, `phone` esa akkauntni aniqlaydi (docs/TZ.md §4.1).
export class CreateMasterDto {
  @ApiProperty({ example: '+998901234567', description: 'Usta shu raqam bilan OTP orqali kiradi' })
  @NormalizedPhone()
  phone!: string;

  @ApiProperty({ example: 'Alisher' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiPropertyOptional({ example: '@alisher_usta' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telegram?: string;

  @ApiProperty({ example: '10 yillik tajribaga ega elektrik' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  bio!: string;

  @ApiPropertyOptional({ example: 10, minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @ApiProperty()
  @IsUUID()
  regionId!: string;

  @ApiProperty()
  @IsUUID()
  districtId!: string;

  @ApiProperty({ example: 'Chilonzor 9-daha, 12-uy' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  address!: string;

  @ApiProperty({ type: WorkingHoursDto })
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours!: WorkingHoursDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(8)
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ default: true, description: 'false — tasdiqlanmagan holda qo\'shish' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
