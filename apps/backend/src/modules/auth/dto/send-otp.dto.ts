import { ApiProperty } from '@nestjs/swagger';
import { NormalizedPhone } from '../../../common/decorators/normalized-phone.decorator.js';

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @NormalizedPhone()
  phone!: string;
}
