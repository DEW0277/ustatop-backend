import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { UZ_PHONE_REGEX } from '../constants/phone.constant.js';

// Mobil ilova telefonni "+998 90 123 45 67" ko'rinishida yuboradi; bazada esa
// yagona "+998901234567" formatda saqlaymiz.
export function normalizeUzPhone(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.length === 9) {
    return `+998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }

  return input;
}

export function NormalizedPhone() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalizeUzPhone(value) : value)),
    Matches(UZ_PHONE_REGEX, { message: "Telefon raqami formati noto'g'ri (+998XXXXXXXXX)" }),
  );
}
