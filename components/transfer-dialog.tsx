'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { useYear } from '@/contexts/YearContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Loader2, TriangleAlert } from 'lucide-react';
import { z } from 'zod/v4';

import { getActiveYear, getAllYears } from '@/prisma/services/period';
import { createTransfer } from '@/prisma/services/transfer';

import { CategoryWithAvailableAmountAndYears } from '@/lib/types';
import { formatNumber, handleError, isError } from '@/lib/utils';

import { TransferWarningDialog } from '@/components/transfer-warning-dialog';
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
import { Textarea } from '@/components/ui/textarea';

const schema = z
  .object({
    yearId: z.string().min(1, 'Please select a year'),
    fromCategoryId: z.string().min(1, 'Please select a from category'),
    toCategoryId: z.string().min(1, 'Please select a to category'),
    amount: z.coerce
      .number<number>()
      .min(0.01, 'Amount must be greater than $0.00')
      .multipleOf(0.01, 'Must contain at most 2 decimal places'),
    notes: z.string().optional(),
  })
  .refine((data) => data.fromCategoryId !== data.toCategoryId, {
    message: 'From and To categories must be different',
    path: ['toCategoryId'],
  });

type FormData = z.infer<typeof schema>;

export function TransferDialog({
  categories,
  trigger,
}: {
  categories: CategoryWithAvailableAmountAndYears[];
  trigger?: React.ReactNode;
}) {
  const { selectedYear } = useYear();

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: getAllYears,
  });

  const { data: activeYear } = useQuery({
    queryKey: ['active-year'],
    queryFn: getActiveYear,
  });

  const activeYearId = activeYear?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      yearId: selectedYear?.id ?? '',
      fromCategoryId: '',
      toCategoryId: '',
      amount: 0,
      notes: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const [fromCategoryId, setFromCategoryId] = useState('');
  const [toCategoryId, setToCategoryId] = useState('');
  // eslint-disable-next-line react-hooks/incompatible-library
  const transferAmount = form.watch('amount') ?? 0;
  const selectedYearId = form.watch('yearId') ?? '';

  const isNonActiveYear = !!selectedYearId && selectedYearId !== activeYearId;

  const categoriesForYear = categories.filter((c) =>
    c.yearIds.includes(selectedYearId),
  );

  const fromCategory = categoriesForYear.find((c) => c.id === fromCategoryId);
  const toCategory = categoriesForYear.find((c) => c.id === toCategoryId);
  const toCategoryOptions = categoriesForYear.filter(
    (c) => c.id !== fromCategoryId,
  );

  async function handleSubmit(data: FormData) {
    const from = categories.find((c) => c.id === data.fromCategoryId);
    if (from && data.amount > from.available) {
      setPendingData(data);
      setWarningOpen(true);
      return;
    }
    await performTransfer(data);
  }

  async function performTransfer(data: FormData) {
    const result = await handleError(createTransfer(data), {
      toast: {
        loading: 'Transferring funds...',
        success: 'Funds transferred successfully',
        error: 'Failed to transfer funds',
      },
    });
    if (!isError(result)) {
      form.reset({
        yearId: selectedYear?.id ?? '',
        fromCategoryId: '',
        toCategoryId: '',
        amount: 0,
        notes: '',
      });
      setFromCategoryId('');
      setToCategoryId('');
      setOpen(false);
      router.refresh();
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  }

  function handleWarningConfirm() {
    setWarningOpen(false);
    if (pendingData) {
      setPendingData(null);
      performTransfer(pendingData);
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
  }

  function handleYearChange(value: string) {
    form.setValue('yearId', value);
    const newCategoriesForYear = categories.filter((c) =>
      c.yearIds.includes(value),
    );
    const newFromValid = newCategoriesForYear.some(
      (c) => c.id === fromCategoryId,
    );
    const newToValid = newCategoriesForYear.some((c) => c.id === toCategoryId);
    if (!newFromValid) {
      setFromCategoryId('');
      form.setValue('fromCategoryId', '');
    }
    if (!newToValid) {
      setToCategoryId('');
      form.setValue('toCategoryId', '');
    }
  }

  const yearItems = years.map((y) => ({
    value: y.id,
    label: y.id === activeYearId ? `${y.name} (Active)` : y.name,
  }));

  const fromCategoryItems = categoriesForYear.map((c) => ({
    value: c.id,
    label: `${c.name} (Available: $${formatNumber(c.available)})`,
  }));

  const toCategoryItems = toCategoryOptions.map((c) => ({
    value: c.id,
    label: `${c.name} (Remaining: $${formatNumber(c.available)})`,
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button variant="outline" className="gap-2">
              <ArrowLeftRight className="size-4" />
              Transfer Funds
            </Button>
          )}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Move funds between spending categories in this designation.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="yearId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Combobox
                        data={[{ items: yearItems }]}
                        value={field.value || ''}
                        onChange={(value) => {
                          field.onChange(value);
                          handleYearChange(value);
                        }}
                        name="year"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNonActiveYear && (
                <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <p>
                    You are transferring funds in a non-active year. Please
                    confirm this is intentional.
                  </p>
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
                        data={[{ items: fromCategoryItems }]}
                        value={field.value || ''}
                        onChange={(value) => {
                          field.onChange(value);
                          setFromCategoryId(value);
                          setToCategoryId('');
                          form.setValue('toCategoryId', '');
                        }}
                        name="from category"
                        disabled={!selectedYearId}
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
                        data={[{ items: toCategoryItems }]}
                        value={field.value || ''}
                        onChange={(value) => {
                          field.onChange(value);
                          setToCategoryId(value);
                        }}
                        name="to category"
                        disabled={!fromCategoryId}
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex gap-2">
                      <FormLabel>Notes</FormLabel>
                      <span className="text-muted-foreground text-xs">
                        Optional
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this transfer..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fromCategory && toCategory && transferAmount > 0 && (
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground mb-1 font-medium">
                    After transfer:
                  </p>
                  <p>
                    <span className="font-medium">{fromCategory.name}:</span> $
                    {formatNumber(fromCategory.available - transferAmount)}{' '}
                    remaining
                  </p>
                  <p>
                    <span className="font-medium">{toCategory.name}:</span> $
                    {formatNumber(toCategory.available + transferAmount)}{' '}
                    remaining
                  </p>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Transfer Funds
              </Button>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {fromCategory && pendingData && (
        <TransferWarningDialog
          open={warningOpen}
          onOpenChange={(value) => {
            setWarningOpen(value);
            if (!value) setPendingData(null);
          }}
          categoryName={fromCategory.name}
          availableAmount={fromCategory.available}
          transferAmount={pendingData.amount}
          onConfirm={handleWarningConfirm}
        />
      )}
    </>
  );
}
