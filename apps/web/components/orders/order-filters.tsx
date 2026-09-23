'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import {
  ordersFilterSchema,
  type OrdersFilterValues,
} from '@/lib/schemas/orders-filter';
import type { OrderStatus, Region } from '@/lib/types';

const STATUS_LABELS: Record<'ALL' | OrderStatus, string> = {
  ALL: 'Barcha holatlar',
  pending: 'Kutilmoqda',
  in_progress: 'Jarayonda',
  completed: 'Bajarildi',
  cancelled: 'Bekor qilingan',
};

export function OrderFilters({
  initial,
  onChange,
}: {
  initial: OrdersFilterValues;
  onChange: (filters: OrdersFilterValues) => void;
}) {
  const { control } = useForm<OrdersFilterValues>({
    resolver: zodResolver(ordersFilterSchema),
    defaultValues: initial,
    mode: 'onChange',
  });

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api<Region[]>('/regions'),
  });

  const status = useWatch({ control, name: 'status' });
  const regionId = useWatch({ control, name: 'regionId' });
  const from = useWatch({ control, name: 'from' });
  const to = useWatch({ control, name: 'to' });

  useEffect(() => {
    onChange({ status, regionId, from, to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, regionId, from, to]);

  const regions = regionsQuery.data ?? [];

  return (
    <form
      className="flex flex-wrap items-end gap-4"
      onSubmit={(e) => e.preventDefault()}
    >
      <Field className="w-48">
        <FieldLabel>Holat</FieldLabel>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
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
            <Select value={field.value} onValueChange={field.onChange}>
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

      <Field className="w-40">
        <FieldLabel htmlFor="from">Boshlanish sanasi</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="from"
            render={({ field }) => (
              <Input id="from" type="date" {...field} />
            )}
          />
        </FieldContent>
      </Field>

      <Field className="w-40">
        <FieldLabel htmlFor="to">Tugash sanasi</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="to"
            render={({ field }) => (
              <Input id="to" type="date" {...field} />
            )}
          />
        </FieldContent>
      </Field>
    </form>
  );
}
