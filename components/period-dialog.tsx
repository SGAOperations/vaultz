'use client';

import { useState } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { Period, Year } from '@/prisma/client';
import { createPeriod, updatePeriod } from '@/prisma/services/period';

import { handleError, isError, parseDateOnly } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    yearId: z.string().min(1, 'Year is required'),
    startDate: z.date({ error: 'Start date is required' }),
    endDate: z.date({ error: 'End date is required' }),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type FormData = z.infer<typeof schema>;

export function PeriodDialog({
  period,
  years,
  defaultYearId,
  children,
}: {
  period?: Period;
  years: Year[];
  defaultYearId?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: period?.name ?? '',
      yearId: period?.yearId ?? defaultYearId ?? '',
      startDate: period ? parseDateOnly(period.startDate) : undefined,
      endDate: period ? parseDateOnly(period.endDate) : undefined,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  function getExceedsYear(data: FormData): Year | undefined {
    const year = years.find((y) => y.id === data.yearId);
    if (!year) return undefined;
    const yearStart = parseDateOnly(year.startDate);
    const yearEnd = parseDateOnly(year.endDate);
    if (data.startDate < yearStart || data.endDate > yearEnd) return year;
    return undefined;
  }

  async function onSubmit(data: FormData) {
    const exceedsYear = getExceedsYear(data);
    if (exceedsYear && !pendingData) {
      setPendingData(data);
      return;
    }
    await doSave(data);
  }

  async function doSave(data: FormData) {
    if (period) {
      const result = await handleError(
        updatePeriod({ ...data, id: period.id }),
        {
          toast: {
            loading: 'Updating period...',
            success: 'Period updated successfully',
            error: 'Failed to update period',
          },
        },
      );
      if (!isError(result)) {
        setPendingData(null);
        setOpen(false);
      }
    } else {
      const result = await handleError(createPeriod(data), {
        toast: {
          loading: 'Creating period...',
          success: 'Period created successfully',
          error: 'Failed to create period',
        },
      });
      if (!isError(result)) {
        form.reset();
        setPendingData(null);
        setOpen(false);
      }
    }
  }

  const watchedYearId = useWatch({ control: form.control, name: 'yearId' });
  const watchedStartDate = useWatch({
    control: form.control,
    name: 'startDate',
  });
  const watchedEndDate = useWatch({ control: form.control, name: 'endDate' });

  const selectedYear = years.find((y) => y.id === watchedYearId);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {period ? 'Edit Period' : 'Create Period'}
            </DialogTitle>
            <DialogDescription>
              A period is a sub-interval within a year used for budget
              allocations. Period date ranges cannot overlap.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormInput<FormData>
                name="name"
                label="Name"
                placeholder="Q1 2025"
              />

              <Controller
                control={form.control}
                name="yearId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <select
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <option value="">Select year...</option>
                        {years.map((y) => (
                          <option key={y.id} value={y.id}>
                            {y.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                )}
              />

              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
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
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    {fieldState.error && (
                      <FormMessage>{fieldState.error.message}</FormMessage>
                    )}
                  </FormItem>
                )}
              />

              {selectedYear &&
                watchedStartDate &&
                watchedEndDate &&
                getExceedsYear(form.getValues()) && (
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                    These dates extend beyond the selected year&apos;s range.
                    You will be asked to confirm.
                  </p>
                )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {period ? 'Save Changes' : 'Create Period'}
              </Button>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingData !== null}
        onOpenChange={(o) => {
          if (!o) setPendingData(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Period Extends Beyond Year
            </DialogTitle>
            <DialogDescription>
              The period dates you selected extend beyond the date range of the
              parent year. Are you sure you want to save?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingData(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (pendingData) await doSave(pendingData);
              }}
            >
              Save Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
