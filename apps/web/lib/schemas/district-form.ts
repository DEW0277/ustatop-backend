import { z } from 'zod';

export const districtFormSchema = z.object({
  nameUz: z.string().trim().min(2, "Tuman nomi (o'zbekcha) kiritilishi shart"),
  nameRu: z.string().trim().min(2, "Tuman nomi (ruscha) kiritilishi shart"),
  regionId: z.string().min(1, 'Viloyat tanlanishi shart'),
});

export type DistrictFormValues = z.infer<typeof districtFormSchema>;
