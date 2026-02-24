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
  FormDescription,
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
  code: z.string().regex(/^\d{4}$/, 'Must be exactly 4 digits'),
  budgetResetBehavior: z.enum(['RESET', 'ROLLOVER']),
});

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
  name,
  code,
  budgetResetBehavior,
  trigger,
}: {
  designationId: string;
  name: string;
  code: string;
  budgetResetBehavior: BudgetResetBehavior;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name, code, budgetResetBehavior },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(data: FormData) {
    await handleError(
      updateDesignation({
        id: designationId,
        name: data.name,
        code: data.code,
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
    if (!newOpen) form.reset({ name, code, budgetResetBehavior });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Designation</DialogTitle>
          <DialogDescription>
            Update the designation details and budget reset behavior.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Budget Designation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <div className="flex items-center">
                      <span className="border-input bg-muted text-muted-foreground flex h-9 items-center rounded-l-md border border-r-0 px-3 text-sm">
                        DN
                      </span>
                      <Input
                        placeholder="XXXX"
                        className="rounded-l-none"
                        maxLength={4}
                        {...field}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          field.onChange(v);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    The designation number to be associated with this
                    designation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
