import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin' })
  // Login registrga bog'liq emas — bazada kichik harfda saqlanadi.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9._-]{3,32}$/, { message: "Login 3–32 belgi: lotin harflari, raqam, nuqta, chiziqcha" })
  login!: string;

  @ApiProperty({ example: '••••••••' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
