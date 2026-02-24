'use client';

import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { Year } from '@/prisma/client';
import { createYear, updateYear } from '@/prisma/services/period';

import { handleError, isError, parseDateOnly } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/form-input';

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startDate: z.date({ error: 'Start date is required' }),
    endDate: z.date({ error: 'End date is required' }),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type FormData = z.infer<typeof schema>;

export function YearDialog({
  year,
  children,
}: {
  year?: Year;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: year?.name ?? '',
      startDate: year ? parseDateOnly(year.startDate) : undefined,
      endDate: year ? parseDateOnly(year.endDate) : undefined,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: FormData) {
    if (year) {
      const result = await handleError(updateYear({ ...data, id: year.id }), {
        toast: {
          loading: 'Updating year...',
          success: 'Year updated successfully',
          error: 'Failed to update year',
        },
      });
      if (!isError(result)) setOpen(false);
    } else {
      const result = await handleError(createYear(data), {
        toast: {
          loading: 'Creating year...',
          success: 'Year created successfully',
          error: 'Failed to create year',
        },
      });
      if (!isError(result)) {
        form.reset();
        setOpen(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{year ? 'Edit Year' : 'Create Year'}</DialogTitle>
          <DialogDescription>
            A year defines a fiscal period with a start and end date. Year date
            ranges cannot overlap.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormInput<FormData>
              name="name"
              label="Name"
              placeholder="FY 2025"
            />

            <Controller
              control={form.control}
              name="startDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />

            <Controller
              control={form.control}
              name="endDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {year ? 'Save Changes' : 'Create Year'}
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
