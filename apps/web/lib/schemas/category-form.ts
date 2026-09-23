import { z } from 'zod';

// Backend (`CreateCategoryDto`) `icon` va `description`ni ham majburiy (`@IsNotEmpty()`) qiladi —
// shu ikkalasi ham shu yerda talab qilinishi shart, aks holda "Qo'shish" har doim 400 bilan tugaydi.
export const categoryFormSchema = z.object({
  nameUz: z.string().trim().min(2, "Kategoriya nomi (o'zbekcha) kiritilishi shart"),
  nameRu: z.string().trim().min(2, "Kategoriya nomi (ruscha) kiritilishi shart"),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug kiritilishi shart')
    .regex(
      /^[a-z0-9-]+$/,
      "Slug faqat kichik lotin harflari, raqamlar va chiziqcha (-) dan iborat bo'lishi kerak",
    ),
  icon: z.string().trim().min(1, "Ikonka kiritilishi shart"),
  description: z.string().trim().min(3, "Tavsif kiritilishi shart (kamida 3 belgi)"),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
