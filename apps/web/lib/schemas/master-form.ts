import { z } from 'zod';

// `POST /admin/masters` (docs/TZ.md §4.1). Qoidalar backend `CreateMasterDto` bilan bir xil bo'lishi shart —
// aks holda forma o'tkazib yuborgan qiymat serverda 400 bilan tugaydi.
export const WEEK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  mon: 'Du',
  tue: 'Se',
  wed: 'Chor',
  thu: 'Pay',
  fri: 'Ju',
  sat: 'Sha',
  sun: 'Yak',
};

export const MAX_MASTER_CATEGORIES = 8;

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// "+998 90 123 45 67", "998901234567", "901234567" → "+998901234567"; boshqasi — null.
export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

export const masterFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((value) => normalizeUzPhone(value) !== null, "Telefon raqami noto'g'ri (+998 XX XXX XX XX)"),
  firstName: z.string().trim().min(2, 'Ism kamida 2 belgi').max(50, 'Ism 50 belgidan oshmasin'),
  lastName: z.string().trim().min(2, 'Familiya kamida 2 belgi').max(50, 'Familiya 50 belgidan oshmasin'),
  telegram: z.string().trim().max(64, 'Telegram 64 belgidan oshmasin'),
  bio: z.string().trim().min(10, "Tavsif kamida 10 belgi").max(1000, 'Tavsif 1000 belgidan oshmasin'),
  // Input qiymati matn — songa `masterFormToApiBody` aylantiradi (bo'sh = 0).
  experienceYears: z
    .string()
    .trim()
    .refine((value) => value === '' || (/^\d{1,2}$/.test(value) && Number(value) <= 60), 'Tajriba 0–60 yil'),
  regionId: z.string().min(1, 'Viloyat tanlanishi shart'),
  districtId: z.string().min(1, 'Tuman tanlanishi shart'),
  address: z.string().trim().min(3, 'Manzil kamida 3 belgi').max(200, 'Manzil 200 belgidan oshmasin'),
  workStart: z.string().regex(TIME_REGEX, 'Vaqt HH:mm formatida'),
  workEnd: z.string().regex(TIME_REGEX, 'Vaqt HH:mm formatida'),
  workDays: z.array(z.enum(WEEK_DAYS)).min(1, 'Kamida bitta ish kuni tanlang'),
  categoryIds: z.array(z.string()).max(MAX_MASTER_CATEGORIES, `Ko'pi bilan ${MAX_MASTER_CATEGORIES} ta kategoriya`),
  isVerified: z.boolean(),
});

export type MasterFormValues = z.infer<typeof masterFormSchema>;

export const DEFAULT_MASTER_FORM: MasterFormValues = {
  phone: '+998',
  firstName: '',
  lastName: '',
  telegram: '',
  bio: '',
  experienceYears: '',
  regionId: '',
  districtId: '',
  address: '',
  workStart: '09:00',
  workEnd: '18:00',
  workDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  categoryIds: [],
  isVerified: true,
};

export function masterFormToApiBody(values: MasterFormValues) {
  return {
    phone: normalizeUzPhone(values.phone) ?? values.phone,
    firstName: values.firstName,
    lastName: values.lastName,
    telegram: values.telegram || undefined,
    bio: values.bio,
    experienceYears: values.experienceYears === '' ? 0 : Number(values.experienceYears),
    regionId: values.regionId,
    districtId: values.districtId,
    address: values.address,
    workingHours: {
      start: values.workStart,
      end: values.workEnd,
      // Tanlash tartibidan qat'i nazar hafta tartibida yuboriladi.
      workDays: WEEK_DAYS.filter((day) => values.workDays.includes(day)),
    },
    categoryIds: values.categoryIds,
    isVerified: values.isVerified,
  };
}

// Backend maydon nomlari → forma maydonlari (server 400 `errors`ini tegishli input ostida ko'rsatish uchun).
export const MASTER_API_FIELD_TO_FORM: Record<string, keyof MasterFormValues> = {
  phone: 'phone',
  firstName: 'firstName',
  lastName: 'lastName',
  telegram: 'telegram',
  bio: 'bio',
  experienceYears: 'experienceYears',
  regionId: 'regionId',
  districtId: 'districtId',
  address: 'address',
  categoryIds: 'categoryIds',
};
