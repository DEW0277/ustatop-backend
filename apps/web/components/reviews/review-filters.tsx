'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
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
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import {
  DEFAULT_REVIEWS_FILTERS,
  reviewsFilterSchema,
  type ReviewsFilterValues,
} from '@/lib/schemas/reviews-filter';

const RATING_LABELS: Record<ReviewsFilterValues['rating'], string> = {
  ALL: 'Barcha reytinglar',
  '5': '5 yulduz (★★★★★)',
  '4': '4 yulduz (★★★★)',
  '3': '3 yulduz (★★★)',
  '2': '2 yulduz (★★)',
  '1': '1 yulduz (★)',
};

export function ReviewFilters({
  initial,
  onChange,
}: {
  initial: ReviewsFilterValues;
  onChange: (filters: ReviewsFilterValues) => void;
}) {
  const { control, reset, setValue } = useForm<ReviewsFilterValues>({
    resolver: zodResolver(reviewsFilterSchema),
    defaultValues: initial,
    mode: 'onChange',
  });

  const masterId = useWatch({ control, name: 'masterId' });
  const rating = useWatch({ control, name: 'rating' });
  const debouncedMasterId = useDebouncedValue(masterId, 350);

  useEffect(() => {
    onChange({ masterId: debouncedMasterId, rating });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMasterId, rating]);

  const hasActiveFilters = Boolean(masterId || rating !== 'ALL');

  function handleReset() {
    reset(DEFAULT_REVIEWS_FILTERS);
    setValue('masterId', '');
    setValue('rating', 'ALL');
  }

  return (
    <form className="flex flex-wrap items-end gap-4" onSubmit={(event) => event.preventDefault()}>
      <Field className="w-80">
        <FieldLabel htmlFor="masterId">Usta bo&apos;yicha filtr</FieldLabel>
        <FieldContent>
          <Controller
            control={control}
            name="masterId"
            render={({ field, fieldState }) => (
              <>
                <Input
                  id="masterId"
                  placeholder="Usta ID (UUID)"
                  {...field}
                />
                <FieldError errors={fieldState.error ? [fieldState.error] : undefined} />
              </>
            )}
          />
        </FieldContent>
      </Field>

      <Field className="w-52">
        <FieldLabel>Reyting</FieldLabel>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RATING_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
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
