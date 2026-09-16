import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Elektrik xizmati', description: "Kategoriya nomi o'zbek tilida" })
  @IsString()
  @IsNotEmpty()
  nameUz!: string;

  @ApiProperty({ example: 'Услуги электрика', description: 'Kategoriya nomi rus tilida' })
  @IsString()
  @IsNotEmpty()
  nameRu!: string;

  @ApiProperty({ example: 'flash-outline', description: 'Kategoriya ikonka nomi' })
  @IsString()
  @IsNotEmpty()
  icon!: string;

  @ApiProperty({ example: 'Elektr montaj, rozetka va tuzatishlar', description: 'Tavsif' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'electrician', description: 'Unikal slug' })
  @IsString()
  @IsNotEmpty()
  slug!: string;
}
