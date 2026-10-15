'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from 'cn';
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
import {
  DEFAULT_MASTER_FORM,
  MASTER_API_FIELD_TO_FORM,
  MAX_MASTER_CATEGORIES,
  WEEK_DAYS,
  WEEK_DAY_LABELS,
  masterFormSchema,
  masterFormToApiBody,
  type MasterFormValues,
} from '@/lib/schemas/master-form';
import type { AdminMaster, Category, District, Region } from '@/lib/types';
import { DASHBOARD_STATS_QUERY_KEY } from '../dashboard/dashboard-view';
import { USERS_QUERY_KEY } from '../users/users-query';
import { MASTERS_QUERY_KEY } from './masters-query';

const TEXTAREA_CLASS =
  'min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function ToggleChip({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        pressed
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-transparent text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

export function CreateMasterDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, setError, setValue } = useForm<MasterFormValues>({
    resolver: zodResolver(masterFormSchema),
    defaultValues: DEFAULT_MASTER_FORM,
  });

  const regionId = useWatch({ control, name: 'regionId' });

  const regionsQuery = useQuery({
    queryKey: ['regions'],
    queryFn: () => api<Region[]>('/regions'),
    enabled: open,
  });
  const districtsQuery = useQuery({
    queryKey: ['districts', regionId],
    queryFn: () => api<District[]>('/districts', { query: { regionId } }),
    enabled: open && !!regionId,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
    enabled: open,
  });

  const regions = useMemo(() => regionsQuery.data ?? [], [regionsQuery.data]);
  const districts = useMemo(() => districtsQuery.data ?? [], [districtsQuery.data]);
  const categories = categoriesQuery.data ?? [];

  const regionItems = useMemo(
    () => Object.fromEntries(regions.map((region) => [region.id, region.nameUz])),
    [regions],
  );
  const districtItems = useMemo(
    () => Object.fromEntries(districts.map((district) => [district.id, district.nameUz])),
    [districts],
  );

  const mutation = useMutation({
    mutationFn: (values: MasterFormValues) =>
      api<AdminMaster>('/admin/masters', { method: 'POST', body: masterFormToApiBody(values) }),
    onSuccess: (master) => {
      toast.success(`Usta qo'shildi: ${master.fullName}`);
      setOpen(false);
      reset(DEFAULT_MASTER_FORM);
      queryClient.invalidateQueries({ queryKey: MASTERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_STATS_QUERY_KEY });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        // Server validatsiyasi (400) — xabarni tegishli maydon ostida ko'rsatamiz.
        for (const [apiField, messages] of Object.entries(error.errors ?? {})) {
          const field = MASTER_API_FIELD_TO_FORM[apiField];
          if (field && messages[0]) setError(field, { message: messages[0] });
        }
        // 409: shu raqamda usta bor / foydalanuvchi bloklangan — telefon maydoniga bog'laymiz.
        if (error.status === 409) setError('phone', { message: error.message });
      }
      toast.error(error instanceof ApiError ? error.message : 'Kutilmagan xatolik');
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset(DEFAULT_MASTER_FORM);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Usta qo&apos;shish
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Yangi usta qo&apos;shish</DialogTitle>
          <DialogDescription>
            Usta keyin shu telefon raqami bilan ilovaga SMS-kod orqali kiradi va profilini o&apos;zi
            boshqaradi (xizmatlar, portfolio).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="grid gap-4 py-2 sm:grid-cols-2"
          noValidate
        >
          <Field>
            <FieldLabel htmlFor="master-firstName">Ism</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="firstName"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="master-firstName" placeholder="Alisher" aria-invalid={fieldState.invalid} {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="master-lastName">Familiya</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="lastName"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="master-lastName" placeholder="Valiyev" aria-invalid={fieldState.invalid} {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="master-phone">Telefon</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="phone"
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="master-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="+998 90 123 45 67"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="master-telegram">Telegram (ixtiyoriy)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="telegram"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="master-telegram" placeholder="@alisher_usta" aria-invalid={fieldState.invalid} {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="master-bio">Usta haqida</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="bio"
                render={({ field, fieldState }) => (
                  <>
                    <textarea
                      id="master-bio"
                      rows={3}
                      placeholder="Masalan: 10 yillik tajribaga ega elektrik, uy va ofislarda ishlaydi"
                      aria-invalid={fieldState.invalid}
                      className={TEXTAREA_CLASS}
                      {...field}
                    />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="master-region">Viloyat</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="regionId"
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      items={regionItems}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Tuman avvalgi viloyatga tegishli — backend bunday juftlikni rad etadi.
                        setValue('districtId', '');
                      }}
                    >
                      <SelectTrigger id="master-region" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Viloyatni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.nameUz}
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
            <FieldLabel htmlFor="master-district">Tuman</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="districtId"
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      items={districtItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!regionId || districtsQuery.isLoading}
                    >
                      <SelectTrigger id="master-district" className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue
                          placeholder={
                            !regionId
                              ? 'Avval viloyatni tanlang'
                              : districtsQuery.isLoading
                                ? 'Yuklanmoqda...'
                                : 'Tumanni tanlang'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id}>
                            {district.nameUz}
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
            <FieldLabel htmlFor="master-address">Manzil</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="address"
                render={({ field, fieldState }) => (
                  <>
                    <Input id="master-address" placeholder="Chilonzor 9-daha, 12-uy" aria-invalid={fieldState.invalid} {...field} />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="master-experience">Tajriba (yil)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="experienceYears"
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="master-experience"
                      inputMode="numeric"
                      placeholder="0"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="master-workStart">Ish vaqti</FieldLabel>
            <FieldContent>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="workStart"
                  render={({ field, fieldState }) => (
                    <Input id="master-workStart" type="time" aria-label="Ish boshlanishi" aria-invalid={fieldState.invalid} {...field} />
                  )}
                />
                <span className="text-muted-foreground">—</span>
                <Controller
                  control={control}
                  name="workEnd"
                  render={({ field, fieldState }) => (
                    <Input type="time" aria-label="Ish tugashi" aria-invalid={fieldState.invalid} {...field} />
                  )}
                />
              </div>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Ish kunlari</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="workDays"
                render={({ field, fieldState }) => (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEK_DAYS.map((day) => (
                        <ToggleChip
                          key={day}
                          pressed={field.value.includes(day)}
                          onClick={() => field.onChange(toggle(field.value, day))}
                        >
                          {WEEK_DAY_LABELS[day]}
                        </ToggleChip>
                      ))}
                    </div>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel>Kategoriyalar (ixtiyoriy, ko&apos;pi bilan {MAX_MASTER_CATEGORIES} ta)</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="categoryIds"
                render={({ field, fieldState }) => (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {categoriesQuery.isLoading && (
                        <span className="text-xs text-muted-foreground">Yuklanmoqda...</span>
                      )}
                      {categoriesQuery.isError && (
                        <span className="text-xs text-destructive">Kategoriyalarni yuklab bo&apos;lmadi</span>
                      )}
                      {categories.map((category) => {
                        const pressed = field.value.includes(category.id);
                        return (
                          <ToggleChip
                            key={category.id}
                            pressed={pressed}
                            disabled={!pressed && field.value.length >= MAX_MASTER_CATEGORIES}
                            onClick={() => field.onChange(toggle(field.value, category.id))}
                          >
                            {category.nameUz}
                          </ToggleChip>
                        );
                      })}
                    </div>
                    <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
                  </>
                )}
              />
            </FieldContent>
          </Field>

          <Field className="sm:col-span-2">
            <Controller
              control={control}
              name="isVerified"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">Darhol tasdiqlangan</span>
                    <span className="text-muted-foreground">
                      O&apos;chirilsa, usta &laquo;Kutilayotganlar&raquo; ro&apos;yxatiga tushadi.
                    </span>
                  </span>
                </label>
              )}
            />
          </Field>

          <DialogFooter showCloseButton className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saqlanmoqda...' : "Usta qo'shish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
