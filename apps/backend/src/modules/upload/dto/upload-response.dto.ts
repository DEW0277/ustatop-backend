import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    description: "Yuklangan rasmning to'liq ochiq (public) URL manzili",
    example: 'http://localhost:9000/ustatop-uploads/images/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d.jpg',
  })
  url!: string;
}
