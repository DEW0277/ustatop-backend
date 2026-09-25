import { ApiProperty } from '@nestjs/swagger';

export class ToggleFavoriteResponseDto {
  @ApiProperty({
    description: 'Usta profili identifikatori',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  masterId!: string;

  @ApiProperty({
    description: "Sevimli holati (true: qo'shildi, false: o'chirildi)",
    example: true,
  })
  isFavorite!: boolean;
}
