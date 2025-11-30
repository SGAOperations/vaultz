'use client';

import * as React from 'react';
import {
  DefaultValues,
  FieldValues,
  FormProvider,
  Resolver,
  useForm,
} from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FormDialogProps<TFieldValues extends FieldValues> {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  schema: z.ZodType<TFieldValues>;
  defaultValues: DefaultValues<TFieldValues>;
  onSubmit: (data: TFieldValues) => Promise<boolean>;
  submitLabel?: string;
  children: React.ReactNode;
}

function FormDialog<TFieldValues extends FieldValues>({
  trigger,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = 'Submit',
  children,
}: FormDialogProps<TFieldValues>) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<TFieldValues>({
    /* eslint-disable @typescript-eslint/no-explicit-any */
    resolver: zodResolver(schema as any) as Resolver<TFieldValues>,
    /* eslint-enable @typescript-eslint/no-explicit-any */
    defaultValues,
  });

  async function handleSubmit(data: TFieldValues) {
    const success = await onSubmit(data);
    if (success) {
      form.reset();
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8"
          >
            {children}
            <Button type="submit">{submitLabel}</Button>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export { FormDialog };
export type { FormDialogProps };
