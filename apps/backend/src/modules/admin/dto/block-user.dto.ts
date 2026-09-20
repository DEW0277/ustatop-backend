import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ description: 'true — bloklash, false — blokdan chiqarish' })
  @IsBoolean()
  isBlocked!: boolean;
}
