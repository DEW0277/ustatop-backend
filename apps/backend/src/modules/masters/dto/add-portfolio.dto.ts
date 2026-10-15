import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, MaxLength } from 'class-validator';

export class AddPortfolioDto {
  @ApiProperty({ example: 'https://api.ustatop.uz/uploads/images/portfolio1.jpg' })
  // `require_tld: false` — dev'da MinIO `http://localhost:9000/...`; protokol esa majburiy, aks holda
  // "rasm" kabi oddiy so'z ham hostname sifatida URL deb qabul qilinardi.
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { message: "url http(s):// bilan boshlanadigan to'g'ri URL bo'lishi kerak" },
  )
  @MaxLength(500)
  url!: string;
}
