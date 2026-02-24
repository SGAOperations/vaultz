'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod/v4';

import { BudgetResetBehavior } from '@/prisma/client';
import { updateDesignation } from '@/prisma/services/designation';

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

const schema = z.object({ budgetResetBehavior: z.enum(['RESET', 'ROLLOVER']) });

type FormData = z.infer<typeof schema>;

const behaviors: {
  value: BudgetResetBehavior;
  label: string;
  description: string;
}[] = [
  {
    value: 'RESET',
    label: 'Reset',
    description:
      'Category budgets start fresh each year. Unused funds are not carried forward.',
  },
  {
    value: 'ROLLOVER',
    label: 'Rollover',
    description:
      "Unused funds from previous year added to next year's budgets.",
  },
];

export function EditDesignationDialog({
  designationId,
  budgetResetBehavior,
  trigger,
}: {
  designationId: string;
  budgetResetBehavior: BudgetResetBehavior;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { budgetResetBehavior },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: FormData) {
    await handleError(
      updateDesignation({
        id: designationId,
        budgetResetBehavior: data.budgetResetBehavior as BudgetResetBehavior,
      }),
      {
        toast: {
          loading: 'Updating designation...',
          success: 'Designation updated successfully',
          error: 'Failed to update designation',
        },
        onSuccess: () => {
          setOpen(false);
        },
      },
    );
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) form.reset({ budgetResetBehavior });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Designation</DialogTitle>
          <DialogDescription>
            Configure how unused category budgets are handled at year end.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="budgetResetBehavior"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Reset Behavior</FormLabel>
                  <FormControl>
                    <div className="flex flex-col gap-3">
                      {behaviors.map((behavior) => (
                        <label
                          key={behavior.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${field.value === behavior.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                        >
                          <input
                            type="radio"
                            value={behavior.value}
                            checked={field.value === behavior.value}
                            onChange={() => field.onChange(behavior.value)}
                            className="accent-primary mt-0.5"
                          />
                          <div>
                            <p className="font-medium">{behavior.label}</p>
                            <p className="text-muted-foreground text-sm">
                              {behavior.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
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
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
