import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, Length } from 'class-validator';
import { NormalizedPhone } from '../../../common/decorators/normalized-phone.decorator.js';

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @NormalizedPhone()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsNumberString({}, { message: 'Kod faqat raqamlardan iborat bo\'lishi kerak' })
  @Length(4, 6, { message: 'Kod 4-6 xonali bo\'lishi kerak' })
  code!: string;
}
