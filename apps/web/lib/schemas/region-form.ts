import { z } from 'zod';

export const regionFormSchema = z.object({
  nameUz: z.string().trim().min(2, "Viloyat nomi (o'zbekcha) kiritilishi shart"),
  nameRu: z.string().trim().min(2, "Viloyat nomi (ruscha) kiritilishi shart"),
  code: z.string().trim().optional(),
});

export type RegionFormValues = z.infer<typeof regionFormSchema>;
