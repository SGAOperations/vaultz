'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, TriangleAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod/v4';

import { deleteCategory, updateCategory } from '@/prisma/services/category';
import {
  deleteCategoryYear,
  updateCategoryYearBudget,
} from '@/prisma/services/category-year';

import { Category } from '@/lib/types';
import { handleError, isError } from '@/lib/utils';

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormInput } from '@/components/ui/form-input';
import { Input } from '@/components/ui/input';

const schema = z.object({
  code: z
    .string()
    .length(3, 'Must be exactly 3 numbers')
    .regex(/^\d{3}$/, 'Must be 3 numeric digits'),
  ledgerCode: z.string().length(4, 'Must be exactly 4 characters long'),
  name: z.string().min(1, 'Please enter a category name'),
  amount: z.coerce.number<number>().min(0, 'Must be ≥ 0').optional(),
});

export function EditCategoryDialog({
  category,
  trigger,
  categoryYearId,
  yearId,
  yearName,
  amount,
}: {
  category: Pick<Category, 'id' | 'code' | 'ledgerCode' | 'name'>;
  trigger: React.ReactNode;
  categoryYearId?: string;
  yearId?: string;
  yearName?: string;
  amount?: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const canEditBudget = !!categoryYearId && !!yearId;
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: category.code,
      ledgerCode: category.ledgerCode,
      name: category.name,
      amount: amount ?? 0,
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: z.infer<typeof schema>) {
    if (canEditBudget && data.amount !== undefined) {
      const toastId = toast.loading('Updating spending category...');
      try {
        const [categoryResult, budgetResult] = await Promise.all([
          updateCategory({
            id: category.id,
            code: data.code,
            ledgerCode: data.ledgerCode,
            name: data.name,
          }),
          updateCategoryYearBudget({
            categoryId: category.id,
            yearId: yearId!,
            amount: data.amount,
          }),
        ]);
        if (isError(categoryResult)) {
          toast.error(categoryResult.error, { id: toastId });
          return;
        }
        if (isError(budgetResult)) {
          toast.error(budgetResult.error, { id: toastId });
          return;
        }
        toast.success('Spending category updated successfully', {
          id: toastId,
        });
        await queryClient.invalidateQueries({ queryKey: ['categories-budget'] });
        setOpen(false);
      } catch {
        toast.error('Failed to update spending category', { id: toastId });
      }
    } else {
      await handleError(
        updateCategory({
          id: category.id,
          code: data.code,
          ledgerCode: data.ledgerCode,
          name: data.name,
        }),
        {
          toast: {
            loading: 'Updating spending category...',
            success: 'Spending category updated successfully',
            error: 'Failed to update spending category',
          },
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey: ['categories-budget'],
            });
            setOpen(false);
          },
        },
      );
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    if (categoryYearId) {
      await handleError(deleteCategoryYear(categoryYearId), {
        toast: {
          loading: 'Removing category from year...',
          success: 'Category removed from year successfully',
          error: 'Failed to remove category from year',
        },
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: ['categories-budget'],
          });
          setOpen(false);
        },
      });
    } else {
      await handleError(deleteCategory(category.id), {
        toast: {
          loading: 'Deleting spending category...',
          success: 'Spending category deleted successfully',
          error: 'Failed to delete spending category',
        },
        onSuccess: () => {
          setOpen(false);
          // Navigate to the parent designation page
          router.push(`/designation`);
        },
      });
    }
  }

  function handleCancel() {
    handleOpenChange(false);
    setConfirmDelete(false);
    form.reset();
  }

  function handleCancelDelete() {
    setConfirmDelete(false);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmDelete(false);
      form.reset({
        code: category.code,
        ledgerCode: category.ledgerCode,
        name: category.name,
        amount: amount ?? 0,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Spending Category</DialogTitle>
          <DialogDescription>
            {categoryYearId
              ? 'Update the spending category details or remove it from this year.'
              : 'Update the spending category details or delete it entirely.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Food" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormInput<z.infer<typeof schema>>
              name="code"
              label="Spending Category Code"
              placeholder="123"
              prefix="SC"
              numbersOnly
              description="The spending category code associated with this category."
            />
            <FormField
              control={form.control}
              name="ledgerCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ledger Code</FormLabel>
                  <FormControl>
                    <Input placeholder="7XXX" {...field} />
                  </FormControl>
                  <FormDescription>
                    The ledger code to be associated with this category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canEditBudget && (
              <>
                <div className="bg-warning/10 border-warning/30 flex items-start gap-2 rounded-md border p-3">
                  <TriangleAlert className="text-warning mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-warning text-sm font-medium">
                      Before changing the budget amount
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Consider whether this change should instead be recorded as
                      a <strong>purchase</strong> or a{' '}
                      <strong>transfer</strong>. Only update the budget amount
                      to correct the original allocation, not to account for
                      spending.
                    </p>
                  </div>
                </div>
                <FormInput<z.infer<typeof schema>>
                  name="amount"
                  label={`Budget Amount${yearName ? ` for ${yearName}` : ''}`}
                  placeholder="0.00"
                  currency
                  type="number"
                  min={0}
                  step="0.01"
                />
              </>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={confirmDelete ? handleCancelDelete : handleCancel}
                className="flex-1"
                disabled={isSubmitting}
              >
                {confirmDelete
                  ? categoryYearId
                    ? 'Cancel Remove'
                    : 'Cancel Delete'
                  : 'Cancel'}
              </Button>
              {!confirmDelete && (
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="animate-spin" />}
                  Save Changes
                </Button>
              )}
              <Button
                type="button"
                variant={confirmDelete ? 'destructive' : 'outline'}
                onClick={handleDelete}
                className="flex-1"
                disabled={isSubmitting}
              >
                {confirmDelete ? (
                  categoryYearId ? (
                    'Confirm Remove'
                  ) : (
                    'Confirm Delete'
                  )
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {categoryYearId ? 'Remove from Year' : 'Delete'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
