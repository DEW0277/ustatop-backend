import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ example: 'Toshkent shahri', description: "Viloyat/shahar nomi o'zbek tilida" })
  @IsString()
  @IsNotEmpty()
  nameUz!: string;

  @ApiProperty({ example: 'г. Ташкент', description: 'Viloyat/shahar nomi rus tilida' })
  @IsString()
  @IsNotEmpty()
  nameRu!: string;

  @ApiPropertyOptional({ example: 'TAS', description: 'Viloyat kodi' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;
}
