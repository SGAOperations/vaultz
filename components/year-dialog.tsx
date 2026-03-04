'use client';

import { useEffect, useState } from 'react';
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
} from 'react-hook-form';

import { useDesignation } from '@/contexts/DesignationContext';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { z } from 'zod/v4';

import { Year } from '@/prisma/client';
import { getCategoriesByDesignation } from '@/prisma/services/category';
import {
  getNewYearSuggestions,
  setYearBudgetsForDesignation,
} from '@/prisma/services/category-year';
import { createYear, getAllYears, updateYear } from '@/prisma/services/period';

import { handleError, parseDateOnly } from '@/lib/utils';

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

const resetEntrySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string(),
  amount: z.coerce.number<number>().min(0, 'Must be ≥ 0'),
});

const resetBudgetSchema = z.object({ entries: z.array(resetEntrySchema) });

type YearFormData = z.infer<typeof yearSchema>;
type ResetBudgetFormData = z.infer<typeof resetBudgetSchema>;

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

  const { selectedDesignation } = useDesignation();
  const queryClient = useQueryClient();

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: getAllYears,
  });

  const yearForm = useForm<YearFormData>({
    resolver: zodResolver(yearSchema),
    defaultValues: {
      name: year?.name ?? '',
      startDate: year ? parseDateOnly(year.startDate) : undefined,
      endDate: year ? parseDateOnly(year.endDate) : undefined,
    },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetBudgetSchema),
    defaultValues: { entries: [] as ResetBudgetFormData['entries'] },
  });

  const { fields, replace, remove } = useFieldArray({
    control: resetForm.control,
    name: 'entries',
  });

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      yearForm.reset({
        name: year?.name ?? '',
        startDate: year ? parseDateOnly(year.startDate) : undefined,
        endDate: year ? parseDateOnly(year.endDate) : undefined,
      });
    } else {
      setStep('year');
      setCreatedYear(null);
      resetForm.reset({ entries: [] });
      replace([]);
    }
  }

  // Load categories when the RESET budget step opens
  useEffect(() => {
    if (step !== 'budgets' || !createdYear || !selectedDesignation) return;
    let cancelled = false;

    async function load() {
      if (!createdYear || !selectedDesignation) return;
      const categories = await getCategoriesByDesignation({
        designationId: selectedDesignation.id,
      });
      if (cancelled) return;
      replace(
        categories.map((c) => ({ categoryId: c.id, name: c.name, amount: 0 })),
      );
      if (!cancelled) setLoadingBudgets(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [step, createdYear, selectedDesignation, replace]);

  async function onYearSubmit(data: YearFormData) {
    if (year) {
      await handleError(updateYear({ ...data, id: year.id }), {
        toast: {
          loading: 'Updating year...',
          success: 'Year updated successfully',
          error: 'Failed to update year',
        },
        onSuccess: async (result) => {
          yearForm.reset({
            name: result.name,
            startDate: parseDateOnly(result.startDate),
            endDate: parseDateOnly(result.endDate),
          });
          await queryClient.invalidateQueries({ queryKey: ['years'] });
          handleOpenChange(false);
        },
      });
      return;
    }

    await handleError(createYear(data), {
      toast: {
        loading: 'Creating year...',
        success: 'Year created successfully',
        error: 'Failed to create year',
      },
      onSuccess: async (newYear) => {
        yearForm.reset();
        setCreatedYear(newYear);

        if (!selectedDesignation) {
          handleOpenChange(false);
          return;
        }

        if (selectedDesignation.budgetResetBehavior === 'ROLLOVER') {
          // Automatic: calculate and save budgets without any user input
          const newYearStart = new Date(newYear.startDate);
          const prevYear = [...years]
            .filter((y) => new Date(y.endDate) < newYearStart)
            .sort(
              (a, b) =>
                new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
            )[0];

          let budgets: Array<{ categoryId: string; amount: number }>;
          if (prevYear) {
            const suggestions = await getNewYearSuggestions({
              designationId: selectedDesignation.id,
              prevYearId: prevYear.id,
            });
            budgets = suggestions.map((s) => ({
              categoryId: s.categoryId,
              amount: s.suggestedAmount,
            }));
          } else {
            const categories = await getCategoriesByDesignation({
              designationId: selectedDesignation.id,
            });
            budgets = categories.map((c) => ({ categoryId: c.id, amount: 0 }));
          }

          await handleError(
            setYearBudgetsForDesignation({
              designationId: selectedDesignation.id,
              yearId: newYear.id,
              budgets,
            }),
            {
              toast: {
                loading: 'Rolling over budgets...',
                success: 'Budgets rolled over automatically',
                error: 'Failed to roll over budgets',
              },
              onSuccess: async () => {
                await queryClient.invalidateQueries({
                  queryKey: ['categories-budget'],
                });
                await queryClient.invalidateQueries({ queryKey: ['years'] });
                handleOpenChange(false);
              },
            },
          );
        } else {
          // RESET: go to budget step
          setLoadingBudgets(true);
          replace([]);
          setStep('budgets');
        }
      },
    });
  }

  async function onResetSubmit(data: ResetBudgetFormData) {
    if (!createdYear || !selectedDesignation) return;

    await handleError(
      setYearBudgetsForDesignation({
        designationId: selectedDesignation.id,
        yearId: createdYear.id,
        budgets: data.entries.map((e) => ({
          categoryId: e.categoryId,
          amount: e.amount,
        })),
      }),
      {
        toast: {
          loading: 'Saving budgets...',
          success: 'Budgets saved',
          error: 'Failed to save budgets',
        },
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: ['categories-budget'],
          });
          await queryClient.invalidateQueries({ queryKey: ['years'] });
          handleOpenChange(false);
        },
      },
    );
  }

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
                Enter the budget for each category. Remove any categories not
                needed this year. Additional categories can be added later from
                the Categories page.
              </DialogDescription>
            </DialogHeader>

            {loadingBudgets ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Form {...resetForm}>
                <form
                  onSubmit={resetForm.handleSubmit(onResetSubmit)}
                  className="space-y-3 py-2"
                >
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <FormField
                          control={resetForm.control}
                          name={`entries.${index}.amount`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                {field.name}
                              </FormLabel>
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
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-6 shrink-0"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <p className="text-muted-foreground py-2 text-center text-sm">
                      All categories removed. You can add categories later from
                      the Categories page.
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleOpenChange(false)}
                      disabled={resetForm.formState.isSubmitting}
                    >
                      Skip for Now
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={resetForm.formState.isSubmitting}
                    >
                      {resetForm.formState.isSubmitting && (
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
