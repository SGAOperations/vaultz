'use client';

import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { createTransfer } from '@/prisma/services/transfer';

import { CategoryWithAvailableAmount } from '@/lib/types';
import { formatNumber, handleError, isError } from '@/lib/utils';

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
  categories: CategoryWithAvailableAmount[];
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromCategoryId: '',
      toCategoryId: '',
      amount: 0,
      notes: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const [fromCategoryId, setFromCategoryId] = useState('');

  const toCategoryOptions = categories.filter((c) => c.id !== fromCategoryId);

  async function handleSubmit(data: FormData) {
    const result = await handleError(createTransfer(data), {
      toast: {
        loading: 'Transferring funds...',
        success: 'Funds transferred successfully',
        error: 'Failed to transfer funds',
      },
    });
    if (!isError(result)) {
      form.reset();
      setOpen(false);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      form.reset();
      setFromCategoryId('');
    }
    setOpen(value);
  }

  const fromCategoryItems = categories.map((c) => ({
    value: c.id,
    label: `${c.name} (Available: $${formatNumber(c.available)})`,
  }));

  const toCategoryItems = toCategoryOptions.map((c) => ({
    value: c.id,
    label: `${c.name} (Available: $${formatNumber(c.available)})`,
  }));

  return (
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
                        form.setValue('toCategoryId', '');
                      }}
                      name="from category"
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
                      {...field}
                      value={field.value || ''}
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

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Transfer Funds
            </Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
