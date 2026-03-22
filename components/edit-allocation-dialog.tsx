'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { z } from 'zod/v4';

import { deleteAllocation, updateAllocation } from '@/prisma/services/allocation';

import { Allocation } from '@/lib/types';
import { handleError } from '@/lib/utils';

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
  name: z
    .string()
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot be longer than 50 characters'),
});

export function EditAllocationDialog({
  allocation,
  trigger,
  queryKey,
}: {
  allocation: Pick<Allocation, 'id' | 'name' | 'amount'>;
  trigger: React.ReactNode;
  queryKey?: unknown[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>(String(allocation.amount));
  const [amountError, setAmountError] = useState<string>('');

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: allocation.name },
  });
  const isSubmitting = form.formState.isSubmitting;

  function validateAmount(value: string): number | null {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0.01) {
      setAmountError('Must be at least $0.01');
      return null;
    }
    const rounded = Math.round(parsed * 100) / 100;
    if (Math.abs(rounded - parsed) > 0.000001) {
      setAmountError('Must contain at most 2 decimal places');
      return null;
    }
    setAmountError('');
    return rounded;
  }

  async function onSubmit(data: z.infer<typeof schema>) {
    const parsedAmount = validateAmount(amount);
    if (parsedAmount === null) return;

    await handleError(
      updateAllocation({ id: allocation.id, name: data.name, amount: parsedAmount }),
      {
        toast: {
          loading: 'Updating allocation...',
          success: 'Allocation updated successfully',
          error: 'Failed to update allocation',
        },
        onSuccess: async () => {
          if (queryKey) await queryClient.invalidateQueries({ queryKey });
          setOpen(false);
        },
      },
    );
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    await handleError(deleteAllocation(allocation.id), {
      toast: {
        loading: 'Deleting allocation...',
        success: 'Allocation deleted successfully',
        error: 'Failed to delete allocation',
      },
      onSuccess: async () => {
        if (queryKey) await queryClient.invalidateQueries({ queryKey });
        setOpen(false);
      },
    });
  }

  function handleCancel() {
    handleOpenChange(false);
  }

  function handleCancelDelete() {
    setConfirmDelete(false);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setConfirmDelete(false);
      setAmount(String(allocation.amount));
      setAmountError('');
      form.reset({ name: allocation.name });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Allocation</DialogTitle>
          <DialogDescription>
            Update the allocation details or delete it entirely.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sustainability Tabling" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <div className="flex items-center">
                  <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm">
                    $
                  </span>
                  <Input
                    className="rounded-l-none"
                    placeholder="21.45"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setAmountError('');
                    }}
                    onBlur={() => validateAmount(amount)}
                  />
                </div>
              </FormControl>
              {amountError && (
                <p className="text-destructive text-sm font-medium">
                  {amountError}
                </p>
              )}
            </FormItem>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={confirmDelete ? handleCancelDelete : handleCancel}
                className="flex-1"
                disabled={isSubmitting}
              >
                {confirmDelete ? 'Cancel Delete' : 'Cancel'}
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
                  'Confirm Delete'
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
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
