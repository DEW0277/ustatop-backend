import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, Length, Matches } from 'class-validator';
import { UZ_PHONE_REGEX } from '../../../common/constants/phone.constant.js';

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @Matches(UZ_PHONE_REGEX, { message: "Telefon raqami formati noto'g'ri (+998XXXXXXXXX)" })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsNumberString({}, { message: 'Kod faqat raqamlardan iborat bo\'lishi kerak' })
  @Length(6, 6, { message: 'Kod 6 xonali bo\'lishi kerak' })
  code!: string;
}
