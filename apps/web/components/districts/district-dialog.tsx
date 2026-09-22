'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Plus, SquarePen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError, api } from '@/lib/api-client';
import { districtFormSchema, type DistrictFormValues } from '@/lib/schemas/district-form';
import type { District, Region } from '@/lib/types';

export function DistrictDialog({
  district,
  defaultRegionId,
}: {
  district?: District;
  defaultRegionId?: string;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!district;
  const queryClient = useQueryClient();

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api<Region[]>('/regions'),
  });

  const regions = regionsQuery.data ?? [];

  const { control, handleSubmit, reset } = useForm<DistrictFormValues>({
    resolver: zodResolver(districtFormSchema),
    defaultValues: {
      nameUz: district?.nameUz ?? '',
      nameRu: district?.nameRu ?? '',
      regionId: district?.regionId ?? (defaultRegionId && defaultRegionId !== 'ALL' ? defaultRegionId : ''),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: DistrictFormValues) => {
      if (isEdit) {
        return api<District>(`/admin/districts/${district.id}`, {
          method: 'PUT',
          body: values,
        });
      }
      return api<District>('/admin/districts', {
        method: 'POST',
        body: values,
      });
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? 'Tuman muvaffaqiyatli tahrirlandi'
          : 'Yangi tuman muvaffaqiyatli qo‘shildi',
      );
      setOpen(false);
      if (!isEdit) reset();
      queryClient.invalidateQueries({ queryKey: ['districts'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  function onSubmit(values: DistrictFormValues) {
    mutation.mutate(values);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !isEdit) {
      reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <SquarePen className="h-4 w-4" />
              <span className="sr-only">Tahrirlash</span>
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Tuman qo&apos;shish
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Tumanni tahrirlash' : 'Yangi tuman qo‘shish'}
          </DialogTitle>
          <DialogDescription>
            Tuman nomi va qaysi viloyatga tegishli ekanligini belgilang.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <Field>
            <FieldLabel htmlFor="regionId">Viloyat</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="regionId"
                render={({ field, fieldState }) => (
                  <>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Viloyatni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((reg) => (
                          <SelectItem key={reg.id} value={reg.id}>
                            {reg.nameUz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="nameUz">Nomi (O&apos;zbekcha)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="nameUz"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="nameUz" placeholder="Masalan: Chilonzor tumani" {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="nameRu">Nomi (Ruscha)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="nameRu"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="nameRu" placeholder="Masalan: Чиланзарский район" {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
