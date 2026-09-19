import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, MaxLength } from 'class-validator';

export class RemovePortfolioQueryDto {
  @ApiProperty({ description: "O'chiriladigan rasm URL'i (mobil ilovada rasmlar ID'siz, URL bilan boshqariladi)" })
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  url!: string;
}
