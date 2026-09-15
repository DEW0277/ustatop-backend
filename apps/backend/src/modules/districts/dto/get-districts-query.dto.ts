import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetDistrictsQueryDto {
  @ApiPropertyOptional({ description: 'Viloyat ID bo‘yicha filter qilish (UUID)' })
  @IsOptional()
  @IsUUID()
  regionId?: string;
}
