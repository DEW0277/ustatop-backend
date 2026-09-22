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
import { categoryFormSchema, type CategoryFormValues } from '@/lib/schemas/category-form';
import type { Category } from '@/lib/types';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[ʻʼ'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CategoryDialog({ category }: { category?: Category }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!category;
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, setValue, getValues } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      nameUz: category?.nameUz ?? '',
      nameRu: category?.nameRu ?? '',
      slug: category?.slug ?? '',
      icon: category?.icon ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      const payload = {
        nameUz: values.nameUz,
        nameRu: values.nameRu,
        slug: values.slug,
        icon: values.icon ? values.icon : undefined,
      };

      if (isEdit) {
        return api<Category>(`/admin/categories/${category.id}`, {
          method: 'PUT',
          body: payload,
        });
      }
      return api<Category>('/admin/categories', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? 'Kategoriya muvaffaqiyatli tahrirlandi'
          : 'Yangi kategoriya muvaffaqiyatli qo‘shildi',
      );
      setOpen(false);
      if (!isEdit) reset();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  function onSubmit(values: CategoryFormValues) {
    mutation.mutate(values);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !isEdit) {
      reset();
    }
  }

  function handleNameUzBlur() {
    if (!isEdit && !getValues('slug')) {
      const name = getValues('nameUz');
      if (name) {
        setValue('slug', generateSlug(name), { shouldValidate: true });
      }
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
              <Plus className="h-4 w-4" /> Kategoriya qo&apos;shish
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo‘shish'}
          </DialogTitle>
          <DialogDescription>
            Xizmat kategoriyasi nomi, unikal slug va belgisini kiriting.
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
                    <Input
                      id="nameUz"
                      placeholder="Masalan: Santexnika"
                      {...field}
                      onBlur={() => {
                        field.onBlur();
                        handleNameUzBlur();
                      }}
                    />
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
                    <Input id="nameRu" placeholder="Masalan: Сантехника" {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="slug">Slug (URL identifikatori)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="slug"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="slug" placeholder="Masalan: santexnika" {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="icon">Ikonka (Ixtiyoriy nom yoki emoji)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="icon"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="icon" placeholder="Masalan: wrench yoki 🔧" {...field} />
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
