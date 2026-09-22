import { z } from 'zod';

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
  icon: z.string().trim().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
