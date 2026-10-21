import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, MaxLength } from 'class-validator';

export class AddPortfolioDto {
  @ApiProperty({
    example: 'https://ustatop.example/uploads/images/0b9f8c2e-4a8d-4c55-9a43-7e3c3f1a2b10.jpg',
    description: "Faqat `POST /upload/single` qaytargan URL (boshqasi 400). Portfolio'da ko'pi bilan 20 ta rasm.",
  })
  // Format shu yerda tekshiriladi; URL bizning omborimizga tegishliligi va 20 ta limit — `MasterProfileService`da.
  // `require_tld: false` — dev'da fayl ombori `http://localhost:9000/...`; protokol esa majburiy, aks holda
  // "rasm" kabi oddiy so'z ham hostname sifatida URL deb qabul qilinardi.
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { message: "url http(s):// bilan boshlanadigan to'g'ri URL bo'lishi kerak" },
  )
  @MaxLength(500)
  url!: string;
}
