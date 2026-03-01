'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, TrendingUp } from 'lucide-react';
import { z } from 'zod/v4';

import { BudgetResetBehavior } from '@/prisma/client';
import { getCategoriesByDesignation } from '@/prisma/services/category';
import {
  getNewYearSuggestions,
  setYearBudgetsForDesignation,
} from '@/prisma/services/category-year';

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
import { Skeleton } from '@/components/ui/skeleton';

const schema = z.object({
  budgets: z.array(
    z.object({
      categoryId: z.string(),
      name: z.string(),
      amount: z.coerce.number<number>().min(0, 'Must be ≥ 0'),
    }),
  ),
});

type FormData = z.infer<typeof schema>;

type RolloverHintData = { prevBudget: number; unused: number };

interface CategoryYearBudgetsDialogProps {
  trigger: React.ReactNode;
  designationId: string;
  yearId: string;
  yearName: string;
  budgetResetBehavior: BudgetResetBehavior;
  prevYearId?: string;
  prevYearName?: string;
}

export function CategoryYearBudgetsDialog({
  trigger,
  designationId,
  yearId,
  yearName,
  budgetResetBehavior,
  prevYearId,
  prevYearName,
}: CategoryYearBudgetsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rolloverHints, setRolloverHints] = useState<
    Map<string, RolloverHintData>
  >(new Map());

  const isRollover = budgetResetBehavior === 'ROLLOVER';

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { budgets: [] as FormData['budgets'] },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'budgets',
  });

  const queryClient = useQueryClient();
  const isSubmitting = form.formState.isSubmitting;

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      setLoading(true);
      replace([]);
      setRolloverHints(new Map());
    } else {
      form.reset();
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      if (isRollover && prevYearId) {
        const suggestions = await getNewYearSuggestions({
          designationId,
          prevYearId,
        });
        if (cancelled) return;
        replace(
          suggestions.map((s) => ({
            categoryId: s.categoryId,
            name: s.name,
            amount: s.suggestedAmount,
          })),
        );
        setRolloverHints(
          new Map(
            suggestions.map((s) => [
              s.categoryId,
              { prevBudget: s.prevBudget, unused: s.unused },
            ]),
          ),
        );
      } else {
        const categories = await getCategoriesByDesignation({ designationId });
        if (cancelled) return;
        replace(
          categories.map((c) => ({
            categoryId: c.id,
            name: c.name,
            amount: 0,
          })),
        );
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, isRollover, prevYearId, designationId, replace]);

  async function onSubmit(data: FormData) {
    const result = await handleError(
      setYearBudgetsForDesignation({
        designationId,
        yearId,
        budgets: data.budgets.map((b) => ({
          categoryId: b.categoryId,
          amount: Number(b.amount),
        })),
      }),
      {
        toast: {
          loading: `Saving budgets for ${yearName}…`,
          success: `Budgets for ${yearName} saved`,
          error: `Failed to save budgets for ${yearName}`,
        },
      },
    );
    if (!isError(result)) {
      await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
      handleOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Budgets — {yearName}</DialogTitle>
          <DialogDescription>
            {isRollover
              ? `ROLLOVER: suggested amounts include unused budget from ${prevYearName ?? 'the previous year'}.`
              : 'RESET: enter fresh budgets for each category.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-2"
            >
              {fields.map((field, index) => {
                const hint = rolloverHints.get(field.categoryId);
                return (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`budgets.${index}.amount`}
                    render={({ field: f }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm">
                            {fields[index].name}
                          </FormLabel>
                          {isRollover && hint && (
                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <TrendingUp className="size-3" />
                              prev {formatCurrency(hint.prevBudget)} +{' '}
                              {formatCurrency(hint.unused)} unused
                            </span>
                          )}
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            {...f}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}

              {fields.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No categories found for this designation.
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || fields.length === 0}
                >
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  Save Budgets
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
