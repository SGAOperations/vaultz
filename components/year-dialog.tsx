'use client';

import { useEffect, useState } from 'react';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';

import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, TrendingUp } from 'lucide-react';
import { z } from 'zod/v4';

import { Year } from '@/prisma/client';
import { createYear, updateYear } from '@/prisma/services/period';
import { getCategoriesByDesignation } from '@/prisma/services/category';
import {
  getNewYearSuggestions,
  setYearBudgetsForDesignation,
} from '@/prisma/services/category-year';

import { useDesignation } from '@/contexts/DesignationContext';
import { useYear } from '@/contexts/YearContext';

import { formatCurrency, handleError, isError, parseDateOnly } from '@/lib/utils';

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/form-input';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const yearSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startDate: z.date({ error: 'Start date is required' }),
    endDate: z.date({ error: 'End date is required' }),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

const budgetSchema = z.object({
  budgets: z.array(
    z.object({
      categoryId: z.string(),
      name: z.string(),
      amount: z.coerce.number<number>().min(0, 'Must be ≥ 0'),
    }),
  ),
});

type YearFormData = z.infer<typeof yearSchema>;
type BudgetFormData = z.infer<typeof budgetSchema>;
type RolloverHintData = { prevBudget: number; unused: number };

export function YearDialog({
  year,
  children,
}: {
  year?: Year;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'year' | 'budgets'>('year');
  const [createdYear, setCreatedYear] = useState<Year | null>(null);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [rolloverHints, setRolloverHints] = useState<
    Map<string, RolloverHintData>
  >(new Map());

  const { activeDesignation } = useDesignation();
  const { years } = useYear();
  const queryClient = useQueryClient();

  const yearForm = useForm<YearFormData>({
    resolver: zodResolver(yearSchema),
    defaultValues: {
      name: year?.name ?? '',
      startDate: year ? parseDateOnly(year.startDate) : undefined,
      endDate: year ? parseDateOnly(year.endDate) : undefined,
    },
  });

  const budgetForm = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: { budgets: [] as BudgetFormData['budgets'] },
  });

  const { fields, replace } = useFieldArray({
    control: budgetForm.control,
    name: 'budgets',
  });

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setStep('year');
      setCreatedYear(null);
      setRolloverHints(new Map());
      yearForm.reset({
        name: year?.name ?? '',
        startDate: year ? parseDateOnly(year.startDate) : undefined,
        endDate: year ? parseDateOnly(year.endDate) : undefined,
      });
      budgetForm.reset({ budgets: [] });
      replace([]);
    }
  }

  useEffect(() => {
    if (step !== 'budgets' || !createdYear || !activeDesignation) return;
    let cancelled = false;

    async function load() {
      if (!createdYear || !activeDesignation) return;
      const isRollover = activeDesignation.budgetResetBehavior === 'ROLLOVER';
      const newYearStart = new Date(createdYear.startDate);
      const prevYear = [...years]
        .filter((y) => new Date(y.endDate) < newYearStart)
        .sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
        )[0];

      if (isRollover && prevYear) {
        const suggestions = await getNewYearSuggestions({
          designationId: activeDesignation.id,
          prevYearId: prevYear.id,
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
        const categories = await getCategoriesByDesignation({
          designationId: activeDesignation.id,
        });
        if (cancelled) return;
        replace(
          categories.map((c) => ({
            categoryId: c.id,
            name: c.name,
            amount: 0,
          })),
        );
      }
      if (!cancelled) setLoadingBudgets(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [step, createdYear, activeDesignation, years, replace]);

  async function onYearSubmit(data: YearFormData) {
    if (year) {
      const result = await handleError(updateYear({ ...data, id: year.id }), {
        toast: {
          loading: 'Updating year...',
          success: 'Year updated successfully',
          error: 'Failed to update year',
        },
      });
      if (!isError(result)) handleOpenChange(false);
    } else {
      const result = await handleError(createYear(data), {
        toast: {
          loading: 'Creating year...',
          success: 'Year created successfully',
          error: 'Failed to create year',
        },
      });
      if (!isError(result)) {
        yearForm.reset();
        setCreatedYear(result);
        if (activeDesignation) {
          setLoadingBudgets(true);
          replace([]);
          setRolloverHints(new Map());
          setStep('budgets');
        } else {
          handleOpenChange(false);
        }
      }
    }
  }

  async function onBudgetSubmit(data: BudgetFormData) {
    if (!createdYear || !activeDesignation) return;
    const result = await handleError(
      setYearBudgetsForDesignation({
        designationId: activeDesignation.id,
        yearId: createdYear.id,
        budgets: data.budgets.map((b) => ({
          categoryId: b.categoryId,
          amount: Number(b.amount),
        })),
      }),
      {
        toast: {
          loading: 'Saving budgets...',
          success: 'Budgets saved',
          error: 'Failed to save budgets',
        },
      },
    );
    if (!isError(result)) {
      await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
      handleOpenChange(false);
    }
  }

  const isRollover = activeDesignation?.budgetResetBehavior === 'ROLLOVER';
  const newYearStart = createdYear ? new Date(createdYear.startDate) : null;
  const prevYear = newYearStart
    ? [...years]
        .filter((y) => new Date(y.endDate) < newYearStart)
        .sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
        )[0]
    : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className={
          step === 'budgets'
            ? 'max-h-[90vh] overflow-y-auto sm:max-w-lg'
            : undefined
        }
      >
        {step === 'year' ? (
          <>
            <DialogHeader>
              <DialogTitle>{year ? 'Edit Year' : 'Create Year'}</DialogTitle>
              <DialogDescription>
                A year defines a fiscal period with a start and end date. Year
                date ranges cannot overlap.
              </DialogDescription>
            </DialogHeader>

            <FormProvider {...yearForm}>
              <form
                onSubmit={yearForm.handleSubmit(onYearSubmit)}
                className="space-y-6"
              >
                <FormInput<YearFormData>
                  name="name"
                  label="Name"
                  placeholder="FY 2025"
                />

                <Controller
                  control={yearForm.control}
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
                  control={yearForm.control}
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

                <Button
                  type="submit"
                  disabled={yearForm.formState.isSubmitting}
                >
                  {yearForm.formState.isSubmitting && (
                    <Loader2 className="animate-spin" />
                  )}
                  {year ? 'Save Changes' : 'Create Year'}
                </Button>
              </form>
            </FormProvider>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Set Budgets — {createdYear?.name}</DialogTitle>
              <DialogDescription>
                {isRollover && prevYear
                  ? `ROLLOVER: suggested amounts include unused budget from ${prevYear.name}.`
                  : 'Enter the budget for each category for this new year.'}
              </DialogDescription>
            </DialogHeader>

            {loadingBudgets ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Form {...budgetForm}>
                <form
                  onSubmit={budgetForm.handleSubmit(onBudgetSubmit)}
                  className="space-y-4 py-2"
                >
                  {fields.map((field, index) => {
                    const hint = rolloverHints.get(field.categoryId);
                    return (
                      <FormField
                        key={field.id}
                        control={budgetForm.control}
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
                      disabled={budgetForm.formState.isSubmitting}
                    >
                      Skip for Now
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={
                        budgetForm.formState.isSubmitting ||
                        fields.length === 0
                      }
                    >
                      {budgetForm.formState.isSubmitting && (
                        <Loader2 className="animate-spin" />
                      )}
                      Save Budgets
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
