'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ApiError, api } from '@/lib/api-client';
import { regionFormSchema, type RegionFormValues } from '@/lib/schemas/region-form';
import type { Region } from '@/lib/types';

export function RegionDialog({ region }: { region?: Region }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!region;
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset } = useForm<RegionFormValues>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      nameUz: region?.nameUz ?? '',
      nameRu: region?.nameRu ?? '',
      code: region?.code ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RegionFormValues) => {
      const payload = {
        nameUz: values.nameUz,
        nameRu: values.nameRu,
        code: values.code ? values.code : undefined,
      };

      if (isEdit) {
        return api<Region>(`/admin/regions/${region.id}`, {
          method: 'PUT',
          body: payload,
        });
      }
      return api<Region>('/admin/regions', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? 'Viloyat muvaffaqiyatli tahrirlandi'
          : 'Yangi viloyat muvaffaqiyatli qo‘shildi',
      );
      setOpen(false);
      if (!isEdit) reset();
      queryClient.invalidateQueries({ queryKey: ['regions'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  function onSubmit(values: RegionFormValues) {
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
              <Plus className="h-4 w-4" /> Viloyat qo&apos;shish
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Viloyatni tahrirlash' : 'Yangi viloyat qo‘shish'}
          </DialogTitle>
          <DialogDescription>
            Viloyat nomlari va kodini kiriting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <Field>
            <FieldLabel htmlFor="nameUz">Nomi (O&apos;zbekcha)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="nameUz"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="nameUz" placeholder="Masalan: Toshkent viloyati" {...field} />
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
                    <Input id="nameRu" placeholder="Masalan: Ташкентская область" {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="code">Kodi (Ixtiyoriy)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="code"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="code" placeholder="Masalan: TAS" {...field} />
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
