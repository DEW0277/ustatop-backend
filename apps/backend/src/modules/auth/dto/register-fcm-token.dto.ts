import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({ description: 'Firebase qurilma tokeni (ilovadagi `getToken()` natijasi)' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  fcmToken!: string;
}
