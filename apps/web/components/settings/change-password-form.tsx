'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError, api } from '@/lib/api-client';
import {
  changePasswordSchema,
  EMPTY_CHANGE_PASSWORD,
  type ChangePasswordValues,
} from '@/lib/schemas/change-password';

const FIELDS: { name: keyof ChangePasswordValues; label: string; autoComplete: string }[] = [
  { name: 'currentPassword', label: 'Joriy parol', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Yangi parol (kamida 12 belgi)', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Yangi parolni takrorlang', autoComplete: 'new-password' },
];

export function ChangePasswordForm() {
  const { control, handleSubmit, reset, setError } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY_CHANGE_PASSWORD,
  });

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordValues) =>
      api<{ changed: true }>('/admin/me/password', { method: 'PUT', body: { currentPassword, newPassword } }),
    onSuccess: () => {
      toast.success('Parol almashtirildi');
      reset(EMPTY_CHANGE_PASSWORD);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        for (const field of ['currentPassword', 'newPassword'] as const) {
          const message = error.errors?.[field]?.[0];
          if (message) setError(field, { message });
        }
      }
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  return (
    <Card className="max-w-md">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="flex flex-col gap-4" noValidate>
          {FIELDS.map(({ name, label, autoComplete }) => (
            <Field key={name}>
              <FieldLabel htmlFor={name}>{label}</FieldLabel>
              <FieldContent>
                <Controller
                  control={control}
                  name={name}
                  render={({ field, fieldState }) => (
                    <>
                      <Input
                        id={name}
                        type="password"
                        autoComplete={autoComplete}
                        aria-invalid={fieldState.invalid}
                        {...field}
                      />
                      <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                    </>
                  )}
                />
              </FieldContent>
            </Field>
          ))}
          <p className="text-xs text-muted-foreground">
            Boshqa qurilmalardagi ochiq sessiyalar muddati tugaguncha amal qiladi. Parol oshkor bo&apos;lgan deb
            gumon qilsangiz, server administratoriga murojaat qiling (DEPLOY.md §11).
          </p>
          <Button type="submit" disabled={mutation.isPending} className="self-start">
            {mutation.isPending ? 'Saqlanmoqda...' : 'Parolni almashtirish'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
