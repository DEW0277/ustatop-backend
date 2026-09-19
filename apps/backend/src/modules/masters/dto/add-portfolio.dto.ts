import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, MaxLength } from 'class-validator';

export class AddPortfolioDto {
  @ApiProperty({ example: 'https://api.ustatop.uz/uploads/images/portfolio1.jpg' })
  @IsUrl({ require_tld: false }, { message: "url to'g'ri URL bo'lishi kerak" })
  @MaxLength(500)
  url!: string;
}
