import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alisher Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'https://ustatop.example/uploads/images/0b9f8c2e-4a8d-4c55-9a43-7e3c3f1a2b10.jpg',
    description: 'Faqat `POST /upload/single` qaytargan URL (boshqasi 400).',
  })
  @IsOptional()
  // Format shu yerda; URL bizning omborimizga tegishliligi `AuthService.updateProfile`da tekshiriladi.
  // `require_tld: false` — dev'da fayl ombori `http://localhost:9000/...` (avval dev'da avatar 400 olardi).
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { message: "avatarUrl http(s):// bilan boshlanadigan to'g'ri URL bo'lishi kerak" },
  )
  @MaxLength(500)
  avatarUrl?: string;
}
