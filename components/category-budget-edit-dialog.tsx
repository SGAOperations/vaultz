'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { updateCategoryYearBudget } from '@/prisma/services/category-year';

import { formatCurrency, handleError, isError } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const schema = z.object({
  amount: z.coerce.number<number>().min(0, 'Must be ≥ 0'),
});

type FormData = z.infer<typeof schema>;

interface CategoryBudgetEditDialogProps {
  trigger: React.ReactNode;
  categoryId: string;
  categoryName: string;
  yearId: string;
  yearName: string;
  currentBudget: number;
  spent: number;
}

export function CategoryBudgetEditDialog({
  trigger,
  categoryId,
  categoryName,
  yearId,
  yearName,
  currentBudget,
  spent,
}: CategoryBudgetEditDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: currentBudget },
  });

  const isSubmitting = form.formState.isSubmitting;

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) form.reset({ amount: currentBudget });
  }

  async function onSubmit(data: FormData) {
    const result = await handleError(
      updateCategoryYearBudget({
        categoryId,
        yearId,
        amount: data.amount,
      }),
      {
        toast: {
          loading: 'Updating budget…',
          success: 'Budget updated',
          error: 'Failed to update budget',
        },
      },
    );
    if (!isError(result)) {
      await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Budget — {categoryName}</DialogTitle>
          <DialogDescription>
            Update the budget for {yearName}. Currently spent:{' '}
            {formatCurrency(spent)}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 py-2"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
