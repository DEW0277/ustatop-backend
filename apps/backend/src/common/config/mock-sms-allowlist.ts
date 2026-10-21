import { UZ_PHONE_REGEX } from '../constants/phone.constant.js';
import { normalizeUzPhone } from '../decorators/normalized-phone.decorator.js';

export interface MockSmsAllowlist {
  // Cheklov amalda faqat production + mock SMS da (OTP doim 123456) — dev/test va haqiqiy provider o'zgarmaydi.
  active: boolean;
  phones: ReadonlySet<string>;
  // Kanonik formatga kelmagan elementlar (asl qiymati) — production-guard shularni rad etadi.
  invalid: string[];
}

// `MOCK_SMS_ALLOWED_PHONES`: vergul bilan ajratilgan raqamlar (`+998901234567`, `+998 90 123 45 67`, `998901234567`, `901234567`).
export function parseMockSmsAllowlist(env: Record<string, string | undefined>): MockSmsAllowlist {
  const active = env.NODE_ENV === 'production' && (env.SMS_MODE ?? 'mock') === 'mock';
  const raw = env.MOCK_SMS_ALLOWED_PHONES;
  const phones = new Set<string>();
  const invalid: string[] = [];

  for (const item of typeof raw === 'string' ? raw.split(',') : []) {
    const value = item.trim();

    if (!value) {
      continue;
    }

    const phone = normalizeUzPhone(value);

    if (UZ_PHONE_REGEX.test(phone)) {
      phones.add(phone);
    } else {
      invalid.push(value);
    }
  }

  return { active, phones, invalid };
}
