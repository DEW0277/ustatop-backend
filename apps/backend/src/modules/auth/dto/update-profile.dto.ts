import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alisher Valiyev' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://domain.com/uploads/avatar.jpg' })
  @IsOptional()
  @IsUrl({}, { message: "avatarUrl to'g'ri URL bo'lishi kerak" })
  avatarUrl?: string;
}
