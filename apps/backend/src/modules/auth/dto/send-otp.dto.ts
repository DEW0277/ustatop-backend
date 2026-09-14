import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { UZ_PHONE_REGEX } from '../../../common/constants/phone.constant.js';

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @Matches(UZ_PHONE_REGEX, { message: "Telefon raqami formati noto'g'ri (+998XXXXXXXXX)" })
  phone!: string;
}
