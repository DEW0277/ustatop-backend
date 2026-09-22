'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { usersFilterSchema, type UsersFilterValues } from '@/lib/schemas/users-filter';

const ROLE_LABELS: Record<UsersFilterValues['role'], string> = {
  ALL: 'Barchasi',
  CLIENT: 'Mijoz',
  MASTER: 'Usta',
  ADMIN: 'Administrator',
};

const BLOCKED_LABELS: Record<UsersFilterValues['isBlocked'], string> = {
  ALL: 'Barchasi',
  active: 'Faol',
  blocked: 'Bloklangan',
};

export function UserFilters({
  initial,
  onChange,
}: {
  initial: UsersFilterValues;
  onChange: (filters: UsersFilterValues) => void;
}) {
  const { control } = useForm<UsersFilterValues>({
    resolver: zodResolver(usersFilterSchema),
    defaultValues: initial,
    mode: 'onChange',
  });

  // `watch()` har chaqirilganda yangi funksiya qaytaradi (React Compiler bilan mos emas) —
  // shuning uchun har bir maydon alohida, memoizatsiya qilinadigan tarzda kuzatiladi.
  const query = useWatch({ control, name: 'query' });
  const role = useWatch({ control, name: 'role' });
  const isBlocked = useWatch({ control, name: 'isBlocked' });
  const debouncedQuery = useDebouncedValue(query, 350);

  // Qidiruv debounce bilan, role/holat filtri darhol qo'llanadi. `onChange` deps'ga qo'shilmagan:
  // u har render'da yangi funksiya bo'lishi mumkin, aks holda cheksiz sikl xavfi bo'lardi.
  useEffect(() => {
    onChange({ query: debouncedQuery, role, isBlocked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, role, isBlocked]);

  return (
    <form className="flex flex-wrap items-end gap-4" onSubmit={(event) => event.preventDefault()}>
      <Field className="w-64">
        <FieldLabel htmlFor="query">Qidiruv</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="query"
            render={({ field, fieldState }) => (
              <>
                <Input id="query" placeholder="Ism yoki telefon" {...field} />
                <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
              </>
            )}
          />
        </FieldContent>
      </Field>

      <Field className="w-40">
        <FieldLabel>Rol</FieldLabel>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field className="w-40">
        <FieldLabel>Holat</FieldLabel>
        <Controller
          control={control}
          name="isBlocked"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BLOCKED_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    </form>
  );
}
