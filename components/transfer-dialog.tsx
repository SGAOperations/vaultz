'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { getCategoriesWithBudgetInYear } from '@/prisma/services/category';
import { createTransfer } from '@/prisma/services/transfer';

import { CategoryWithDesignation, CategoryYearRecord, YearRecord } from '@/lib/types';
import { handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/form-input';
import { FormTextarea } from '@/components/ui/form-textarea';

const schema = z.object({
  yearId: z.string().min(1, 'Please select a year'),
  fromCategoryId: z.string().min(1, 'Please select a source category'),
  toCategoryId: z.string().min(1, 'Please select a destination category'),
  amount: z.coerce
    .number<number>()
    .refine((val) => val > 0, 'Amount must be greater than $0.00')
    .refine(
      (val) => Math.abs(Math.round(val * 100) - val * 100) < 0.001,
      'Must contain at most 2 decimal places',
    ),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateTransferDialogProps {
  years: YearRecord[];
  activeYearId?: string;
}

export function CreateTransferDialog({
  years,
  activeYearId,
}: CreateTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<
    (CategoryWithDesignation & { categoryYears: CategoryYearRecord[] })[]
  >([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      yearId: activeYearId ?? '',
      fromCategoryId: '',
      toCategoryId: '',
      amount: 0,
      notes: '',
    },
  });

  const selectedYearId = form.watch('yearId');
  const selectedFromCategoryId = form.watch('fromCategoryId');
  const selectedToCategoryId = form.watch('toCategoryId');

  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId),
    [years, selectedYearId],
  );

  const isNonActiveYear = selectedYearId !== activeYearId && !!selectedYearId;

  useEffect(() => {
    if (!selectedYearId) {
      setCategories([]);
      return;
    }

    setLoadingCategories(true);
    getCategoriesWithBudgetInYear(selectedYearId)
      .then(setCategories)
      .finally(() => setLoadingCategories(false));
  }, [selectedYearId]);

  useEffect(() => {
    const currentFrom = form.getValues('fromCategoryId');
    const currentTo = form.getValues('toCategoryId');
    const validIds = new Set(categories.map((c) => c.id));

    if (currentFrom && !validIds.has(currentFrom))
      form.setValue('fromCategoryId', '');
    if (currentTo && !validIds.has(currentTo))
      form.setValue('toCategoryId', '');
  }, [categories, form]);

  const categoryComboboxData = useMemo(() => {
    const grouped: Record<string, { label: string; value: string }[]> = {};
    for (const cat of categories) {
      const key = cat.designation.name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ label: cat.name, value: cat.id });
    }
    return Object.entries(grouped).map(([heading, items]) => ({
      heading,
      items,
    }));
  }, [categories]);

  const fromComboboxData = useMemo(
    () =>
      categoryComboboxData.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.value !== selectedToCategoryId),
      })),
    [categoryComboboxData, selectedToCategoryId],
  );

  const toComboboxData = useMemo(
    () =>
      categoryComboboxData.map((group) => ({
        ...group,
        items: group.items.filter((item) => item.value !== selectedFromCategoryId),
      })),
    [categoryComboboxData, selectedFromCategoryId],
  );

  const yearComboboxData = [
    {
      items: years.map((y) => ({ label: y.name, value: y.id })),
    },
  ];

  async function onSubmit(data: FormData) {
    const result = await handleError(
      createTransfer({
        fromCategoryId: data.fromCategoryId,
        toCategoryId: data.toCategoryId,
        amount: data.amount,
        notes: data.notes || undefined,
        yearId: data.yearId,
      }),
      {
        toast: {
          loading: 'Creating transfer...',
          success: 'Transfer created successfully',
          error: 'Failed to create transfer',
        },
      },
    );

    if (!isError(result)) {
      form.reset({
        yearId: activeYearId ?? '',
        fromCategoryId: '',
        toCategoryId: '',
        amount: 0,
        notes: '',
      });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ArrowRightLeft className="size-4" />
          New Transfer
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Transfer</DialogTitle>
          <DialogDescription>
            Move budget between categories within the same fiscal year.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="yearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fiscal Year</FormLabel>
                  <FormControl>
                    <Combobox
                      data={yearComboboxData}
                      value={field.value}
                      onChange={field.onChange}
                      name="year"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isNonActiveYear && selectedYear && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  You are creating a transfer in a non-active year (
                  {selectedYear.name}).
                </span>
              </div>
            )}

            <FormField
              control={form.control}
              name="fromCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Category</FormLabel>
                  <FormControl>
                    <Combobox
                      data={fromComboboxData}
                      value={field.value}
                      onChange={field.onChange}
                      name="source category"
                      disabled={!selectedYearId || loadingCategories}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="toCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Category</FormLabel>
                  <FormControl>
                    <Combobox
                      data={toComboboxData}
                      value={field.value}
                      onChange={field.onChange}
                      name="destination category"
                      disabled={!selectedYearId || loadingCategories}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormInput<FormData>
              name="amount"
              label="Amount"
              placeholder="$0.00"
              currency
            />

            <FormTextarea<FormData>
              name="notes"
              label="Notes"
              placeholder="Optional notes about this transfer..."
            />

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="animate-spin" />
              )}
              Create Transfer
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
