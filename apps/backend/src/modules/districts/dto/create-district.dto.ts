import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateDistrictDto {
  @ApiProperty({ example: 'Chilonzor tumani', description: "Tuman nomi o'zbek tilida" })
  @IsString()
  @IsNotEmpty()
  nameUz!: string;

  @ApiProperty({ example: 'Чиланзарский район', description: 'Tuman nomi rus tilida' })
  @IsString()
  @IsNotEmpty()
  nameRu!: string;

  @ApiProperty({ example: 'b9f9ff22-49da-41c1-9038-f9b31d86d634', description: 'Tegishli viloyat ID raqami' })
  @IsUUID()
  @IsNotEmpty()
  regionId!: string;
}
