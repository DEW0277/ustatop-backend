import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class VerifyMasterDto {
  @ApiPropertyOptional({ default: true, description: 'false — tasdiqni bekor qilish' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
