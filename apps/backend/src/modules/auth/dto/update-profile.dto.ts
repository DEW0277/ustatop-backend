import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alisher Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://domain.com/uploads/avatar.jpg' })
  @IsOptional()
  // `require_tld: false` — dev'da fayl ombori `http://localhost:9000/...` (avval dev'da avatar 400 olardi).
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { message: "avatarUrl http(s):// bilan boshlanadigan to'g'ri URL bo'lishi kerak" },
  )
  @MaxLength(500)
  avatarUrl?: string;
}
