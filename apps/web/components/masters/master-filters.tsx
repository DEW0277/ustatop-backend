'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  DEFAULT_MASTERS_FILTERS,
  mastersFilterSchema,
  type MastersFilterValues,
} from '@/lib/schemas/masters-filter';
import type { Region } from '@/lib/types';

const VERIFIED_LABELS: Record<MastersFilterValues['isVerified'], string> = {
  ALL: 'Barchasi',
  verified: 'Tasdiqlangan',
  unverified: 'Kutilmoqda',
};

export function MasterFilters({
  initial,
  onChange,
}: {
  initial: MastersFilterValues;
  onChange: (filters: MastersFilterValues) => void;
}) {
  const { control, reset } = useForm<MastersFilterValues>({
    resolver: zodResolver(mastersFilterSchema),
    defaultValues: initial,
    mode: 'onChange',
  });

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api<Region[]>('/regions'),
  });

  const query = useWatch({ control, name: 'query' });
  const isVerified = useWatch({ control, name: 'isVerified' });
  const regionId = useWatch({ control, name: 'regionId' });
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    onChange({ query: debouncedQuery, isVerified, regionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, isVerified, regionId]);

  const regions = useMemo(() => regionsQuery.data ?? [], [regionsQuery.data]);

  const regionItems = useMemo(
    () => ({
      ALL: 'Barcha viloyatlar',
      ...Object.fromEntries(regions.map((reg) => [reg.id, reg.nameUz])),
    }),
    [regions],
  );

  const hasActiveFilters = Boolean(query || isVerified !== 'ALL' || regionId !== 'ALL');

  function handleReset() {
    reset(DEFAULT_MASTERS_FILTERS);
  }

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

      <Field className="w-48">
        <FieldLabel>Holat</FieldLabel>
        <Controller
          control={control}
          name="isVerified"
          render={({ field }) => (
            <Select items={VERIFIED_LABELS} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VERIFIED_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field className="w-48">
        <FieldLabel>Viloyat</FieldLabel>
        <Controller
          control={control}
          name="regionId"
          render={({ field }) => (
            <Select items={regionItems} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barcha viloyatlar</SelectItem>
                {regions.map((reg) => (
                  <SelectItem key={reg.id} value={reg.id}>
                    {reg.nameUz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {hasActiveFilters && (
        <Button variant="ghost" type="button" onClick={handleReset} className="h-9">
          Tozalash
        </Button>
      )}
    </form>
  );
}
