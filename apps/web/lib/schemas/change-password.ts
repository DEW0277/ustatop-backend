import { z } from 'zod';

// `PUT /admin/me/password` (docs/TZ.md §4.1) — chegaralar backend `ChangePasswordDto` bilan bir xil.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Joriy parolni kiriting').max(128),
    newPassword: z
      .string()
      .min(12, "Yangi parol kamida 12 belgidan iborat bo'lishi kerak")
      .max(128, 'Parol 128 belgidan oshmasin'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar mos kelmadi',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Yangi parol joriy paroldan farq qilishi kerak',
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const EMPTY_CHANGE_PASSWORD: ChangePasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};
