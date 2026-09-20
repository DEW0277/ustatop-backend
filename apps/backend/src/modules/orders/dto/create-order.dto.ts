import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { NormalizedPhone } from '../../../common/decorators/normalized-phone.decorator.js';

// Mobil ilovadagi `BookingRequest` (src/types/index.ts). preferredDate/preferredTime ilovada
// erkin matn ("Bugun", "12:00 - 15:00"), shuning uchun format emas, faqat uzunlik tekshiriladi.
export class CreateOrderDto {
  @ApiProperty({ description: 'MasterProfile ID' })
  @IsUUID()
  masterId!: string;

  @ApiPropertyOptional({ description: "Berilsa xizmat shu ustaniki bo'lishi kerak; sarlavha va narx bazadan olinadi" })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiProperty({ example: "Rozetka o'rnatish" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  serviceTitle!: string;

  @ApiProperty({ example: 50000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000_000)
  price!: number;

  @ApiProperty({ example: 'Jasur Rahimov' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  clientName!: string;

  @ApiProperty({ example: '+998 90 123 45 67' })
  @NormalizedPhone()
  clientPhone!: string;

  @ApiProperty()
  @IsUUID()
  districtId!: string;

  @ApiProperty({ example: 'Chilonzor 9-daha, 12-uy' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  address!: string;

  @ApiProperty({ example: 'Bugun' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  preferredDate!: string;

  @ApiProperty({ example: '12:00 - 15:00' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  preferredTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
